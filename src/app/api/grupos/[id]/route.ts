import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/usuario/auth'

type UsuarioMin = { id: string; nombre: string; foto_perfil_url: string | null }

async function esMiembro(db: SupabaseClient, grupoId: string, usuarioId: string): Promise<boolean> {
  const { data } = await db.from('grupo_amigos_miembros').select('grupo_id').eq('grupo_id', grupoId).eq('usuario_id', usuarioId).maybeSingle()
  return !!data
}

/** GET /api/grupos/[id] — detalle del grupo (solo miembros). */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const db = createServiceRoleClient()
  if (!(await esMiembro(db, id, yo.id))) return NextResponse.json({ error: 'No perteneces a este grupo' }, { status: 403 })

  const { data: grupo } = await db.from('grupos_amigos').select('id, nombre, emoji, creador_id, created_at').eq('id', id).maybeSingle()
  if (!grupo) return NextResponse.json({ error: 'Grupo no encontrado' }, { status: 404 })
  const { data: miembros } = await db.from('grupo_amigos_miembros').select('usuario_id').eq('grupo_id', id)
  const ids = (miembros ?? []).map(m => m.usuario_id as string)
  const { data: usuarios } = ids.length
    ? await db.from('usuarios').select('id, nombre, foto_perfil_url').in('id', ids)
    : { data: [] as UsuarioMin[] }
  return NextResponse.json({ grupo, miembros: (usuarios ?? []) as UsuarioMin[] })
}

/** POST /api/grupos/[id] { miembros: [ids] } — añadir amigos al grupo (solo miembros). */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const db = createServiceRoleClient()
  if (!(await esMiembro(db, id, yo.id))) return NextResponse.json({ error: 'No perteneces a este grupo' }, { status: 403 })

  const body = await req.json().catch(() => null) as { miembros?: string[] } | null
  const candidatos = [...new Set((body?.miembros ?? []).filter(x => x && x !== yo.id))]
  if (!candidatos.length) return NextResponse.json({ error: 'No hay a quién añadir' }, { status: 400 })

  const { data: am } = await db.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada')
    .or(`solicitante_id.eq.${yo.id},receptor_id.eq.${yo.id}`)
  const amigosSet = new Set((am ?? []).map(a => (a.solicitante_id === yo.id ? a.receptor_id : a.solicitante_id) as string))
  const validos = candidatos.filter(x => amigosSet.has(x))
  if (validos.length) {
    await db.from('grupo_amigos_miembros').upsert(validos.map(uid => ({ grupo_id: id, usuario_id: uid })), { onConflict: 'grupo_id,usuario_id' })
  }
  return NextResponse.json({ ok: true, añadidos: validos.length })
}

/** DELETE /api/grupos/[id] — salir del grupo; si queda vacío, se elimina. */
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const db = createServiceRoleClient()

  await db.from('grupo_amigos_miembros').delete().eq('grupo_id', id).eq('usuario_id', yo.id)
  const { count } = await db.from('grupo_amigos_miembros').select('usuario_id', { count: 'exact', head: true }).eq('grupo_id', id)
  if ((count ?? 0) === 0) await db.from('grupos_amigos').delete().eq('id', id)
  return NextResponse.json({ ok: true })
}
