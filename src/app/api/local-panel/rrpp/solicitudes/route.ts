import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * GET /api/local-panel/rrpp/solicitudes
 * RRPP que han marcado "me interesa trabajar contigo" desde el mapa.
 * Degrada a lista vacía si la migración 030 no está aplicada.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }
  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('rrpp_solicitud')
    .select('id, rrpp_id, mensaje, estado, created_at, rrpp!inner(id, slug, nombre_publico, foto_url, instagram, bio)')
    .eq('local_id', t.local_id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ solicitudes: [], pendiente_migracion: true })
  return NextResponse.json({ solicitudes: data ?? [] })
}

/**
 * POST /api/local-panel/rrpp/solicitudes  { id, accion: 'aceptar'|'rechazar', comision_pct? }
 * Aceptar crea/activa la relación rrpp_venue.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  const accion = body.accion === 'aceptar' ? 'aceptar' : body.accion === 'rechazar' ? 'rechazar' : null
  if (!id || !accion) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const { data: sol } = await admin
    .from('rrpp_solicitud').select('id, rrpp_id, local_id, estado').eq('id', id).maybeSingle()
  if (!sol || sol.local_id !== t.local_id) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })
  if (sol.estado !== 'pendiente') return NextResponse.json({ error: 'Ya respondida' }, { status: 409 })

  if (accion === 'rechazar') {
    await admin.from('rrpp_solicitud').update({ estado: 'rechazada', respondido_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ ok: true })
  }

  // Aceptar → crear/activar la relación.
  const comision = typeof body.comision_pct === 'number' ? body.comision_pct : 0
  const { data: existente } = await admin
    .from('rrpp_venue').select('id').eq('rrpp_id', sol.rrpp_id).eq('local_id', t.local_id).maybeSingle()
  if (existente) {
    await admin.from('rrpp_venue').update({ estado: 'activa' }).eq('id', existente.id)
  } else {
    await admin.from('rrpp_venue').insert({
      rrpp_id: sol.rrpp_id, local_id: t.local_id, estado: 'activa', iniciado_por: 'rrpp',
      comision_pct: comision, triggers_activos: { entrada_vendida: true, escaneada_en_puerta: false, consumo_bar: false },
    })
  }
  await admin.from('rrpp_solicitud').update({ estado: 'aceptada', respondido_at: new Date().toISOString() }).eq('id', id)
  return NextResponse.json({ ok: true, aceptada: true })
}
