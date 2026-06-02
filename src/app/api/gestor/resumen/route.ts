import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado } from '@/lib/gestor/auth'

/**
 * GET /api/gestor/resumen
 * KPIs de cabecera del Panel del Gestor + serie temporal para las gráficas:
 *  - tamaño de cartera y RRPP activos
 *  - comisión generada por la cartera este mes y el incentivo del gestor
 *  - serie de los últimos 6 meses (comisión generada e incentivo)
 *  - desglose por local del mes en curso (top de la cartera)
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const incentivoPct = ctx.gestor.incentivo_pct

  const { count: localesTotal } = await admin
    .from('locales')
    .select('id', { count: 'exact', head: true })
    .eq('gestor_id', ctx.gestor.id)
    .neq('estado', 'eliminado')

  const { count: localesActivos } = await admin
    .from('locales')
    .select('id', { count: 'exact', head: true })
    .eq('gestor_id', ctx.gestor.id)
    .eq('estado', 'activo')

  // Locales de la cartera (id + nombre para el desglose).
  const { data: misLocales } = await admin
    .from('locales').select('id, nombre').eq('gestor_id', ctx.gestor.id).neq('estado', 'eliminado')
  const localIds = (misLocales ?? []).map(l => l.id)
  const nombrePorLocal = new Map((misLocales ?? []).map(l => [l.id as string, l.nombre as string]))

  let rrppActivos = 0
  let comisionGeneradaMes = 0
  const serieMeses = ultimosMeses(6).map(m => ({ mes: m.label, periodo: m.periodo, comision: 0, incentivo: 0 }))
  const porLocalMap = new Map<string, number>()

  if (localIds.length) {
    const { data: rels } = await admin
      .from('rrpp_venue').select('rrpp_id').in('local_id', localIds).eq('estado', 'activa')
    rrppActivos = new Set((rels ?? []).map(r => r.rrpp_id)).size

    const periodoActual = new Date().toISOString().slice(0, 7)
    const periodoDesde = serieMeses[0].periodo // el más antiguo de la ventana

    // Una sola lectura de liquidaciones desde el inicio de la ventana de 6 meses.
    const { data: liqs } = await admin
      .from('liquidacion_rrpp')
      .select('monto_total, periodo, local_id')
      .in('local_id', localIds)
      .gte('periodo', periodoDesde)

    for (const l of liqs ?? []) {
      const monto = Number(l.monto_total || 0)
      const fila = serieMeses.find(s => s.periodo === l.periodo)
      if (fila) fila.comision += monto
      if (l.periodo === periodoActual) {
        comisionGeneradaMes += monto
        porLocalMap.set(l.local_id, (porLocalMap.get(l.local_id) ?? 0) + monto)
      }
    }
    // Redondeos finales + incentivo por mes.
    for (const s of serieMeses) {
      s.comision = redondear(s.comision)
      s.incentivo = redondear(s.comision * (incentivoPct / 100))
    }
    comisionGeneradaMes = redondear(comisionGeneradaMes)
  }

  const porLocal = [...porLocalMap.entries()]
    .map(([id, monto]) => ({ nombre: nombrePorLocal.get(id) ?? 'Local', comision: redondear(monto) }))
    .sort((a, b) => b.comision - a.comision)
    .slice(0, 6)

  const incentivoGanadoMes = redondear(comisionGeneradaMes * (incentivoPct / 100))

  return NextResponse.json({
    locales_total: localesTotal ?? 0,
    locales_activos: localesActivos ?? 0,
    rrpp_activos: rrppActivos,
    incentivo_pct: incentivoPct,
    comision_generada_mes: comisionGeneradaMes,
    incentivo_ganado_mes: incentivoGanadoMes,
    serie_meses: serieMeses.map(({ mes, comision, incentivo }) => ({ mes, comision, incentivo })),
    por_local: porLocal,
  })
}

function redondear(n: number) { return Math.round(n * 100) / 100 }

/** Ventana de los últimos `n` meses (incluido el actual), del más antiguo al más reciente. */
function ultimosMeses(n: number): { periodo: string; label: string }[] {
  const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const hoy = new Date()
  const out: { periodo: string; label: string }[] = []
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1)
    const periodo = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    out.push({ periodo, label: meses[d.getMonth()] })
  }
  return out
}
