import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * Chat del TRABAJADOR con su local (el otro lado de /equipo/chat).
 * GET  → su hilo (marca como leídos los del local)
 * POST { mensaje } → envía como 'trabajador'
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data } = await db.from('mensajes_trabajador')
    .select('id, emisor, mensaje, created_at')
    .eq('local_id', t.local_id).eq('trabajador_id', t.id)
    .order('created_at', { ascending: true }).limit(200)
  await db.from('mensajes_trabajador').update({ leido: true })
    .eq('trabajador_id', t.id).eq('emisor', 'local').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!mensaje) return NextResponse.json({ error: 'Falta mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data, error } = await db.from('mensajes_trabajador')
    .insert({ local_id: t.local_id, trabajador_id: t.id, emisor: 'trabajador', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mensaje: data })
}
