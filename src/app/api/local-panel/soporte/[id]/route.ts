import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * GET /api/local-panel/soporte/[id]
 * Detalle de un ticket del local + su hilo de mensajes. Marca como leído por
 * el local (no_leido_local = false).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTrabajadorLocal(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: ticket } = await admin
    .from('tickets_soporte')
    .select('*')
    .eq('id', id)
    .eq('local_id', t.local_id)
    .maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const { data: mensajes } = await admin
    .from('ticket_mensajes')
    .select('id, autor, autor_nombre, mensaje, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (ticket.no_leido_local) {
    await admin.from('tickets_soporte').update({ no_leido_local: false }).eq('id', id)
  }

  return NextResponse.json({ ticket, mensajes: mensajes ?? [] })
}

/**
 * POST /api/local-panel/soporte/[id]
 * El local responde en el hilo. Reactiva el ticket si estaba resuelto y avisa
 * al admin (no_leido_admin = true).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const t = await getTrabajadorLocal(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (t.rol !== 'dueno' && t.rol !== 'gestor') {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const mensaje = String(body.mensaje || '').trim()
  if (mensaje.length < 1) return NextResponse.json({ error: 'Escribe un mensaje' }, { status: 400 })

  const admin = createServiceRoleClient()
  const { data: ticket } = await admin
    .from('tickets_soporte').select('id, estado').eq('id', id).eq('local_id', t.local_id).maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  await admin.from('ticket_mensajes').insert({
    ticket_id: id, autor: 'local', autor_email: t.email, mensaje,
  })
  const nuevoEstado = (ticket.estado === 'resuelto' || ticket.estado === 'cerrado') ? 'abierto' : ticket.estado
  await admin.from('tickets_soporte').update({
    no_leido_admin: true, estado: nuevoEstado,
    ultimo_mensaje_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}
