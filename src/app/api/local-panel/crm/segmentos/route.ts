import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTION = ['dueno', 'gestor']

/**
 * Segmentos PROPIOS del local (los pre-creados viven en código). Los counts se calculan
 * en cliente sobre la lista ya cargada (segmentos "vivos"). Solo dueño/gestor.
 * GET → { segmentos }. POST { nombre, emoji?, filtros } → crea. DELETE ?id= → borra.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data } = await db.from('crm_segmentos').select('id, nombre, emoji, filtros').eq('local_id', t.local_id).order('created_at', { ascending: true })
  return NextResponse.json({ segmentos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { nombre?: string; emoji?: string; filtros?: unknown[] } | null
  if (!body?.nombre?.trim() || !Array.isArray(body.filtros) || body.filtros.length === 0) {
    return NextResponse.json({ error: 'Falta nombre o filtros' }, { status: 400 })
  }
  const db = createServiceRoleClient()
  const { data, error } = await db.from('crm_segmentos').insert({
    local_id: t.local_id, nombre: body.nombre.trim().slice(0, 60), emoji: body.emoji?.slice(0, 8) || '⭐', filtros: body.filtros,
  }).select('id, nombre, emoji, filtros').single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar (¿migración 043?)' }, { status: 500 })
  return NextResponse.json({ segmento: data })
}

export async function DELETE(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceRoleClient()
  await db.from('crm_segmentos').delete().eq('id', id).eq('local_id', t.local_id)
  return NextResponse.json({ ok: true })
}
