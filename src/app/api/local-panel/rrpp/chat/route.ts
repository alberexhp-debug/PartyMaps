import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { enviarPushARRPP } from '@/lib/push'

const ROLES = ['dueno', 'gestor']

/**
 * Chat del LOCAL con un RRPP.
 * GET  ?rrpp_id=  → hilo (y marca como leídos los del RRPP)
 * POST { rrpp_id, mensaje } → envía como 'local'
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  const rrppId = new URL(req.url).searchParams.get('rrpp_id') || ''
  if (!rrppId) return NextResponse.json({ error: 'Falta rrpp_id' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data } = await db
    .from('mensajes_rrpp')
    .select('id, emisor, mensaje, created_at')
    .eq('local_id', t.local_id).eq('rrpp_id', rrppId)
    .order('created_at', { ascending: true }).limit(200)
  // Marca como leídos los mensajes que envió el RRPP
  await db.from('mensajes_rrpp').update({ leido: true })
    .eq('local_id', t.local_id).eq('rrpp_id', rrppId).eq('emisor', 'rrpp').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  const body = await req.json().catch(() => null) as { rrpp_id?: string; mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!body?.rrpp_id || !mensaje) return NextResponse.json({ error: 'Falta rrpp_id o mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data, error } = await db.from('mensajes_rrpp')
    .insert({ local_id: t.local_id, rrpp_id: body.rrpp_id, emisor: 'local', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Avisar al RRPP del nuevo mensaje.
  const { data: local } = await db.from('locales').select('nombre').eq('id', t.local_id).maybeSingle()
  await enviarPushARRPP(body.rrpp_id, {
    title: local?.nombre ? `Mensaje de ${local.nombre}` : 'Nuevo mensaje de un local',
    body: mensaje.slice(0, 120),
    url: '/rrpp',
  })
  return NextResponse.json({ mensaje: data })
}
