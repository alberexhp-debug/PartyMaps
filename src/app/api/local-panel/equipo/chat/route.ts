import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTORES = ['dueno', 'gestor']

/**
 * Chat del LOCAL (dueño/gestor) con un trabajador.
 * GET  ?trabajador_id=  → hilo (marca como leídos los del trabajador)
 * POST { trabajador_id, mensaje } → envía como 'local'
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/encargado' }, { status: 403 })
  const trabajadorId = new URL(req.url).searchParams.get('trabajador_id') || ''
  if (!trabajadorId) return NextResponse.json({ error: 'Falta trabajador_id' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: target } = await db.from('usuario_local').select('id').eq('id', trabajadorId).eq('local_id', t.local_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })

  const { data } = await db.from('mensajes_trabajador')
    .select('id, emisor, mensaje, created_at')
    .eq('local_id', t.local_id).eq('trabajador_id', trabajadorId)
    .order('created_at', { ascending: true }).limit(200)
  await db.from('mensajes_trabajador').update({ leido: true })
    .eq('local_id', t.local_id).eq('trabajador_id', trabajadorId).eq('emisor', 'trabajador').eq('leido', false)
  return NextResponse.json({ mensajes: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/encargado' }, { status: 403 })
  const body = await req.json().catch(() => null) as { trabajador_id?: string; mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!body?.trabajador_id || !mensaje) return NextResponse.json({ error: 'Falta trabajador_id o mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: target } = await db.from('usuario_local').select('id').eq('id', body.trabajador_id).eq('local_id', t.local_id).maybeSingle()
  if (!target) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })

  const { data, error } = await db.from('mensajes_trabajador')
    .insert({ local_id: t.local_id, trabajador_id: body.trabajador_id, emisor: 'local', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mensaje: data })
}
