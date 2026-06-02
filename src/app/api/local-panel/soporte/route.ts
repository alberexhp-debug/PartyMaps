import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const CATEGORIAS = ['general', 'tecnico', 'facturacion', 'cuenta', 'sugerencia', 'otro']
const PRIORIDADES = ['baja', 'normal', 'alta', 'urgente']

/**
 * GET /api/local-panel/soporte
 * Tickets de soporte del local del trabajador autenticado.
 * Si la tabla aún no existe (migración 028 sin aplicar), devuelve lista vacía
 * con un aviso, en vez de 500.
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('tickets_soporte')
    .select('id, asunto, categoria, prioridad, estado, no_leido_local, ultimo_mensaje_at, created_at')
    .eq('local_id', t.local_id)
    .order('ultimo_mensaje_at', { ascending: false })

  if (error) {
    // Tabla inexistente u otro fallo de esquema → degradamos.
    return NextResponse.json({ tickets: [], pendiente_migracion: true })
  }
  return NextResponse.json({ tickets: data ?? [] })
}

/**
 * POST /api/local-panel/soporte
 * Abre un ticket nuevo con su primer mensaje. Solo dueño/encargado.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (t.rol !== 'dueno' && t.rol !== 'gestor') {
    return NextResponse.json({ error: 'Solo el dueño o el encargado pueden abrir tickets' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const asunto = String(body.asunto || '').trim()
  const mensaje = String(body.mensaje || '').trim()
  const categoria = CATEGORIAS.includes(body.categoria) ? body.categoria : 'general'
  const prioridad = PRIORIDADES.includes(body.prioridad) ? body.prioridad : 'normal'
  if (asunto.length < 3) return NextResponse.json({ error: 'Pon un asunto' }, { status: 400 })
  if (mensaje.length < 3) return NextResponse.json({ error: 'Describe tu consulta' }, { status: 400 })

  const admin = createServiceRoleClient()
  const { data: ticket, error } = await admin
    .from('tickets_soporte')
    .insert({
      local_id: t.local_id,
      abierto_por_email: t.email,
      asunto, categoria, prioridad,
      estado: 'abierto',
      no_leido_admin: true,
      no_leido_local: false,
    })
    .select('id')
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'No se pudo crear el ticket. ¿Está aplicada la migración 028?' }, { status: 500 })
  }

  await admin.from('ticket_mensajes').insert({
    ticket_id: ticket.id, autor: 'local', autor_email: t.email, mensaje,
  })

  return NextResponse.json({ ok: true, id: ticket.id })
}
