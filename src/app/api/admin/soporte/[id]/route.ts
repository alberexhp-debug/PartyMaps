import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

const ESTADOS = ['abierto', 'en_curso', 'resuelto', 'cerrado']

/**
 * GET /api/admin/soporte/[id]
 * Detalle del ticket + hilo + datos del local. Marca leído por el admin.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminAutenticado(req)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const svc = createServiceRoleClient()
  const { data: ticket } = await svc
    .from('tickets_soporte')
    .select('*, locales(id, nombre, tier, estado)')
    .eq('id', id)
    .maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const { data: mensajes } = await svc
    .from('ticket_mensajes')
    .select('id, autor, autor_nombre, mensaje, created_at')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (ticket.no_leido_admin) {
    await svc.from('tickets_soporte').update({ no_leido_admin: false }).eq('id', id)
  }

  return NextResponse.json({ ticket, mensajes: mensajes ?? [] })
}

/**
 * POST /api/admin/soporte/[id]
 * El admin responde en el hilo. Pasa el ticket a 'en_curso' si estaba abierto y
 * avisa al local (no_leido_local = true).
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminAutenticado(req)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const mensaje = String(body.mensaje || '').trim()
  if (mensaje.length < 1) return NextResponse.json({ error: 'Escribe un mensaje' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: ticket } = await svc.from('tickets_soporte').select('id, estado').eq('id', id).maybeSingle()
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  await svc.from('ticket_mensajes').insert({
    ticket_id: id, autor: 'admin', autor_email: admin.email, autor_nombre: admin.nombre, mensaje,
  })
  const nuevoEstado = ticket.estado === 'abierto' ? 'en_curso' : ticket.estado
  await svc.from('tickets_soporte').update({
    no_leido_local: true, estado: nuevoEstado,
    ultimo_mensaje_at: new Date().toISOString(), updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ ok: true })
}

/**
 * PATCH /api/admin/soporte/[id]
 * Cambia el estado del ticket (en_curso/resuelto/cerrado…).
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const admin = await getAdminAutenticado(req)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (!ESTADOS.includes(body.estado)) return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { error } = await svc.from('tickets_soporte')
    .update({ estado: body.estado, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
