import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES = ['dueno', 'gestor', 'barman']

// Fecha de la "noche" actual: hoy, o ayer si es de madrugada (antes de las 6).
// Sirve para marcar una mesa como "reservada" esta noche.
function fechaNoche(): string {
  const d = new Date()
  if (d.getHours() < 6) d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

/**
 * GET  /api/local-panel/mesas-sesiones — mesas del local con su estado
 *      (libre / ocupada / reservada), la sesión abierta y sus pedidos.
 * POST /api/local-panel/mesas-sesiones — { accion: 'sentar' | 'liberar', ... }
 *      Sentar abre una sesión de mesa (walk-in o desde reserva); liberar la cierra.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !ROLES.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const [{ data: mesas }, { data: sesiones }, { data: pedidos }, { data: reservas }] = await Promise.all([
    db.from('mesas').select('id, codigo, tipo, zona, capacidad').eq('local_id', t.local_id).eq('activa', true).order('codigo'),
    db.from('mesa_sesiones').select('id, mesa_id, personas, nombre, abierta_at').eq('local_id', t.local_id).is('cerrada_at', null),
    db.from('pedidos_bar').select('mesa_sesion_id, estado, precio_total').eq('local_id', t.local_id).not('mesa_sesion_id', 'is', null),
    db.from('reservas').select('mesa_id, nombre_contacto, personas').eq('local_id', t.local_id).eq('fecha_noche', fechaNoche()).eq('estado', 'confirmada'),
  ])

  const sesionPorMesa = new Map<string, { id: string; personas: number; nombre: string | null; abierta_at: string }>()
  for (const s of sesiones ?? []) sesionPorMesa.set(s.mesa_id, s)

  const aggSesion = new Map<string, { pendientes: number; total: number }>()
  for (const p of pedidos ?? []) {
    if (!p.mesa_sesion_id) continue
    const a = aggSesion.get(p.mesa_sesion_id) || { pendientes: 0, total: 0 }
    if (p.estado === 'pagado') a.pendientes++
    if (p.estado !== 'cancelado' && p.estado !== 'expirado') a.total += Number(p.precio_total || 0)
    aggSesion.set(p.mesa_sesion_id, a)
  }

  const reservaPorMesa = new Map<string, { nombre: string; personas: number }>()
  for (const r of reservas ?? []) reservaPorMesa.set(r.mesa_id, { nombre: r.nombre_contacto, personas: r.personas })

  const out = (mesas ?? []).map(m => {
    const sesion = sesionPorMesa.get(m.id) || null
    const agg = sesion ? aggSesion.get(sesion.id) : null
    const reserva = reservaPorMesa.get(m.id) || null
    return {
      id: m.id, codigo: m.codigo, tipo: m.tipo, zona: m.zona, capacidad: m.capacidad,
      estado: sesion ? 'ocupada' : reserva ? 'reservada' : 'libre',
      sesion: sesion ? {
        id: sesion.id, personas: sesion.personas, nombre: sesion.nombre, abierta_at: sesion.abierta_at,
        pedidos_pendientes: agg?.pendientes || 0, total_noche: agg?.total || 0,
      } : null,
      reserva,
    }
  })

  return NextResponse.json({ mesas: out })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !ROLES.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as {
    accion?: 'sentar' | 'liberar'
    mesa_id?: string; personas?: number; nombre?: string; telefono?: string; reserva_id?: string
    sesion_id?: string
  } | null
  if (!body?.accion) return NextResponse.json({ error: 'Falta acción' }, { status: 400 })
  const db = createServiceRoleClient()

  if (body.accion === 'sentar') {
    if (!body.mesa_id) return NextResponse.json({ error: 'Falta la mesa' }, { status: 400 })
    const { data: mesa } = await db.from('mesas').select('id, local_id').eq('id', body.mesa_id).maybeSingle()
    if (!mesa || mesa.local_id !== t.local_id) return NextResponse.json({ error: 'Mesa no válida' }, { status: 400 })
    const personas = Math.max(1, Math.min(50, Math.floor(Number(body.personas) || 2)))
    const { data, error } = await db.from('mesa_sesiones').insert({
      local_id: t.local_id, mesa_id: body.mesa_id, reserva_id: body.reserva_id || null,
      personas, nombre: body.nombre?.trim().slice(0, 80) || null, telefono: body.telefono?.trim().slice(0, 30) || null,
      abierta_por: t.id,
    }).select('id').single()
    if (error) {
      const ocupada = /uq_mesa_sesion_abierta|duplicate key/i.test(error.message)
      return NextResponse.json({ error: ocupada ? 'Esa mesa ya está ocupada' : error.message }, { status: ocupada ? 409 : 500 })
    }
    if (body.reserva_id) {
      await db.from('reservas').update({ estado: 'sentada' }).eq('id', body.reserva_id).eq('local_id', t.local_id)
    }
    return NextResponse.json({ ok: true, sesion_id: data.id })
  }

  if (body.accion === 'liberar') {
    if (!body.sesion_id) return NextResponse.json({ error: 'Falta la sesión' }, { status: 400 })
    const { data: ses } = await db.from('mesa_sesiones').select('id, local_id, cerrada_at').eq('id', body.sesion_id).maybeSingle()
    if (!ses || ses.local_id !== t.local_id) return NextResponse.json({ error: 'Sesión no válida' }, { status: 400 })
    if (ses.cerrada_at) return NextResponse.json({ ok: true, ya_cerrada: true })
    const { data: peds } = await db.from('pedidos_bar').select('precio_total, estado').eq('mesa_sesion_id', ses.id)
    const total = (peds ?? []).filter(p => p.estado !== 'cancelado' && p.estado !== 'expirado').reduce((s, p) => s + Number(p.precio_total || 0), 0)
    await db.from('mesa_sesiones').update({ cerrada_at: new Date().toISOString(), cerrada_por: t.id }).eq('id', ses.id).is('cerrada_at', null)
    return NextResponse.json({ ok: true, total, pedidos: (peds ?? []).length })
  }

  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
