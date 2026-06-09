import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/usuario/auth'

type UsuarioMin = { id: string; nombre: string; foto_perfil_url: string | null }

/** GET /api/grupos — los grupos donde soy miembro, con sus integrantes. */
export async function GET() {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: mis } = await db.from('grupo_miembros').select('grupo_id').eq('usuario_id', yo.id)
  const grupoIds = [...new Set((mis ?? []).map(m => m.grupo_id as string))]
  if (!grupoIds.length) return NextResponse.json({ grupos: [] })

  const { data: grupos } = await db.from('grupos_amigos')
    .select('id, nombre, emoji, creador_id, created_at').in('id', grupoIds).order('created_at', { ascending: false })
  const { data: miembros } = await db.from('grupo_miembros').select('grupo_id, usuario_id').in('grupo_id', grupoIds)
  const userIds = [...new Set((miembros ?? []).map(m => m.usuario_id as string))]
  const { data: usuarios } = userIds.length
    ? await db.from('usuarios').select('id, nombre, foto_perfil_url').in('id', userIds)
    : { data: [] as UsuarioMin[] }
  const uMap = new Map((usuarios ?? []).map(u => [u.id as string, u as UsuarioMin]))

  const porGrupo = new Map<string, UsuarioMin[]>()
  for (const m of (miembros ?? [])) {
    const arr = porGrupo.get(m.grupo_id as string) ?? []
    const u = uMap.get(m.usuario_id as string)
    if (u) arr.push(u)
    porGrupo.set(m.grupo_id as string, arr)
  }
  return NextResponse.json({
    grupos: (grupos ?? []).map(g => ({ ...g, miembros: porGrupo.get(g.id as string) ?? [] })),
  })
}

/** POST /api/grupos { nombre, emoji?, miembros: [ids] } — crear grupo con amigos. */
export async function POST(req: NextRequest) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { nombre?: string; emoji?: string; miembros?: string[] } | null
  const nombre = (body?.nombre || '').trim()
  if (!nombre) return NextResponse.json({ error: 'Ponle un nombre al grupo' }, { status: 400 })
  if (nombre.length > 60) return NextResponse.json({ error: 'Nombre demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  // Solo se pueden añadir amigos aceptados (no desconocidos).
  const candidatos = [...new Set((body?.miembros ?? []).filter(id => id && id !== yo.id))]
  let amigosValidos: string[] = []
  if (candidatos.length) {
    const { data: am } = await db.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada')
      .or(`solicitante_id.eq.${yo.id},receptor_id.eq.${yo.id}`)
    const amigosSet = new Set((am ?? []).map(a => (a.solicitante_id === yo.id ? a.receptor_id : a.solicitante_id) as string))
    amigosValidos = candidatos.filter(id => amigosSet.has(id))
  }

  const { data: grupo, error } = await db.from('grupos_amigos')
    .insert({ nombre, emoji: (body?.emoji || '').slice(0, 8) || null, creador_id: yo.id })
    .select('id, nombre, emoji, creador_id, created_at').single()
  if (error || !grupo) {
    if (error?.code === '42P01') return NextResponse.json({ error: 'Los grupos se activan muy pronto.' }, { status: 409 })
    return NextResponse.json({ error: error?.message || 'No se pudo crear el grupo' }, { status: 500 })
  }
  const filas = [{ grupo_id: grupo.id, usuario_id: yo.id }, ...amigosValidos.map(id => ({ grupo_id: grupo.id, usuario_id: id }))]
  await db.from('grupo_miembros').insert(filas)
  return NextResponse.json({ ok: true, grupo })
}
