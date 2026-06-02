import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getMiembroGrupoAutenticado } from '@/lib/grupo/auth'

/**
 * GET /api/grupo/locales
 * Lista de los locales del grupo (en el alcance del miembro) con métricas
 * básicas del mes en curso: ingresos y entradas.
 */
export async function GET(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const svc = createServiceRoleClient()
  const ids = ctx.localesIds
  if (ids.length === 0) return NextResponse.json({ locales: [] })

  const { data: locales } = await svc
    .from('locales')
    .select('id, nombre, ciudad, tipo_local, tier, estado, imagenes, num_suscriptores')
    .in('id', ids)
    .order('nombre', { ascending: true })

  const desde = `${new Date().toISOString().slice(0, 7)}-01T00:00:00.000Z`
  const [{ data: entradas }, { data: pedidos }] = await Promise.all([
    svc.from('entradas').select('local_id, precio_total').in('local_id', ids).gte('created_at', desde),
    svc.from('pedidos_bar').select('local_id, precio_total').in('local_id', ids).gte('created_at', desde),
  ])

  const ingresos = new Map<string, number>()
  const entradasCount = new Map<string, number>()
  for (const e of entradas ?? []) {
    ingresos.set(e.local_id, (ingresos.get(e.local_id) ?? 0) + Number(e.precio_total || 0))
    entradasCount.set(e.local_id, (entradasCount.get(e.local_id) ?? 0) + 1)
  }
  for (const p of pedidos ?? []) {
    ingresos.set(p.local_id, (ingresos.get(p.local_id) ?? 0) + Number(p.precio_total || 0))
  }

  const out = (locales ?? []).map(l => ({
    id: l.id, nombre: l.nombre, ciudad: l.ciudad, tipo_local: l.tipo_local,
    tier: l.tier, estado: l.estado, imagen: l.imagenes?.[0] ?? null,
    suscriptores: Number(l.num_suscriptores) || 0,
    ingresos_mes: Math.round((ingresos.get(l.id) ?? 0) * 100) / 100,
    entradas_mes: entradasCount.get(l.id) ?? 0,
  }))

  return NextResponse.json({ locales: out })
}
