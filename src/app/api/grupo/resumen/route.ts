import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getMiembroGrupoAutenticado } from '@/lib/grupo/auth'

/**
 * GET /api/grupo/resumen
 * Métricas agregadas de los locales del grupo (en el alcance del miembro):
 * nº de locales, suscriptores, entradas e ingresos del mes, serie de 6 meses
 * (entradas + barra) y desglose de ingresos por local.
 */
export async function GET(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const svc = createServiceRoleClient()
  const ids = ctx.localesIds

  const vacio = {
    grupo: ctx.grupo.nombre, rol: ctx.miembro.rol,
    locales_total: 0, locales_activos: 0, suscriptores: 0,
    entradas_mes: 0, ingresos_mes: 0,
    serie_meses: ultimosMeses(6).map(m => ({ mes: m.label, ingresos: 0 })),
    por_local: [] as { nombre: string; ingresos: number }[],
  }
  if (ids.length === 0) return NextResponse.json(vacio)

  const { data: locales } = await svc
    .from('locales').select('id, nombre, estado, num_suscriptores').in('id', ids)
  const nombrePorLocal = new Map((locales ?? []).map(l => [l.id as string, l.nombre as string]))
  const localesActivos = (locales ?? []).filter(l => l.estado === 'activo').length
  const suscriptores = (locales ?? []).reduce((s, l) => s + (Number(l.num_suscriptores) || 0), 0)

  const ventana = ultimosMeses(6)
  const desde = `${ventana[0].periodo}-01T00:00:00.000Z`
  const serie = ventana.map(m => ({ mes: m.label, periodo: m.periodo, ingresos: 0 }))
  const periodoActual = new Date().toISOString().slice(0, 7)
  const porLocalMap = new Map<string, number>()
  let entradasMes = 0
  let ingresosMes = 0

  // Ingresos = entradas (precio_total) + pedidos de barra (precio_total) desde la ventana.
  const [{ data: entradas }, { data: pedidos }] = await Promise.all([
    svc.from('entradas').select('local_id, precio_total, created_at').in('local_id', ids).gte('created_at', desde),
    svc.from('pedidos_bar').select('local_id, precio_total, created_at').in('local_id', ids).gte('created_at', desde),
  ])

  const acumular = (rows: { local_id: string; precio_total: unknown; created_at: string }[] | null, esEntrada: boolean) => {
    for (const r of rows ?? []) {
      const monto = Number(r.precio_total || 0)
      const periodo = r.created_at.slice(0, 7)
      const fila = serie.find(s => s.periodo === periodo)
      if (fila) fila.ingresos += monto
      if (periodo === periodoActual) {
        ingresosMes += monto
        porLocalMap.set(r.local_id, (porLocalMap.get(r.local_id) ?? 0) + monto)
        if (esEntrada) entradasMes += 1
      }
    }
  }
  acumular(entradas as never, true)
  acumular(pedidos as never, false)

  const por_local = [...porLocalMap.entries()]
    .map(([id, monto]) => ({ nombre: nombrePorLocal.get(id) ?? 'Local', ingresos: redondear(monto) }))
    .sort((a, b) => b.ingresos - a.ingresos)
    .slice(0, 8)

  return NextResponse.json({
    grupo: ctx.grupo.nombre,
    rol: ctx.miembro.rol,
    locales_total: ids.length,
    locales_activos: localesActivos,
    suscriptores,
    entradas_mes: entradasMes,
    ingresos_mes: redondear(ingresosMes),
    serie_meses: serie.map(({ mes, ingresos }) => ({ mes, ingresos: redondear(ingresos) })),
    por_local,
  })
}

function redondear(n: number) { return Math.round(n * 100) / 100 }

function ultimosMeses(n: number): { periodo: string; label: string }[] {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hoy = new Date()
  const out: { periodo: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    out.push({ periodo: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: meses[d.getMonth()] })
  }
  return out
}
