import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES = ['dueno', 'gestor']

/**
 * Chat del LOCAL con su RumboGestor (el gestor de Rumbo que lleva su cartera).
 * GET  → hilo con el gestor del local (marca como leídos los del gestor).
 * POST { mensaje } → envía como 'local'.
 * Graceful: si el local no tiene gestor asignado o la migración 053 aún no se
 * aplicó (tabla mensajes_gestor inexistente, 42P01), responde sin romper.
 */
async function gestorDelLocal(db: SupabaseClient, localId: string): Promise<string | null> {
  const { data } = await db.from('locales').select('gestor_id').eq('id', localId).maybeSingle()
  return (data?.gestor_id as string | null) || null
}

export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })

  const db = createServiceRoleClient()
  const gestorId = await gestorDelLocal(db, t.local_id)
  if (!gestorId) return NextResponse.json({ mensajes: [], sin_gestor: true })

  const { data } = await db.from('mensajes_gestor')
    .select('id, emisor, mensaje, created_at')
    .eq('local_id', t.local_id).eq('gestor_id', gestorId)
    .order('created_at', { ascending: true }).limit(200)
  // Marca como leídos los mensajes que envió el gestor.
  await db.from('mensajes_gestor').update({ leido: true })
    .eq('local_id', t.local_id).eq('gestor_id', gestorId).eq('emisor', 'gestor').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })

  const body = await req.json().catch(() => null) as { mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!mensaje) return NextResponse.json({ error: 'Falta el mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  const gestorId = await gestorDelLocal(db, t.local_id)
  if (!gestorId) return NextResponse.json({ error: 'Tu local aún no tiene un gestor de Rumbo asignado.' }, { status: 409 })

  const { data, error } = await db.from('mensajes_gestor')
    .insert({ local_id: t.local_id, gestor_id: gestorId, emisor: 'local', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ error: 'El chat con tu gestor se activará muy pronto.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ mensaje: data })
}
