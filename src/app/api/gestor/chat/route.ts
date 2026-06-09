import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, gestorPoseeLocal } from '@/lib/gestor/auth'

/**
 * Chat del GESTOR con un local de su cartera (lado gestor del chat local↔gestor).
 * GET  ?local_id= → hilo (marca como leídos los del local).
 * POST { local_id, mensaje } → envía como 'gestor'.
 * Siempre verifica que el local es de la cartera del gestor (gestorPoseeLocal).
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const localId = new URL(req.url).searchParams.get('local_id') || ''
  if (!localId) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, localId))) {
    return NextResponse.json({ error: 'Ese local no es de tu cartera' }, { status: 403 })
  }

  const db = createServiceRoleClient()
  const { data } = await db.from('mensajes_gestor')
    .select('id, emisor, mensaje, created_at')
    .eq('local_id', localId).eq('gestor_id', ctx.gestor.id)
    .order('created_at', { ascending: true }).limit(200)
  await db.from('mensajes_gestor').update({ leido: true })
    .eq('local_id', localId).eq('gestor_id', ctx.gestor.id).eq('emisor', 'local').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { local_id?: string; mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!body?.local_id || !mensaje) return NextResponse.json({ error: 'Falta local_id o mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, body.local_id))) {
    return NextResponse.json({ error: 'Ese local no es de tu cartera' }, { status: 403 })
  }

  const db = createServiceRoleClient()
  const { data, error } = await db.from('mensajes_gestor')
    .insert({ local_id: body.local_id, gestor_id: ctx.gestor.id, emisor: 'gestor', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ error: 'El chat se activará muy pronto.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ mensaje: data })
}
