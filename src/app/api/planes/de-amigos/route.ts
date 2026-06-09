import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/usuario/auth'

type UsuarioMin = { id: string; nombre: string; foto_perfil_url: string | null }

/**
 * GET /api/planes/de-amigos — prueba social: planes ACTIVOS y FUTUROS donde un
 * amigo del usuario es organizador o participante aceptado. Devuelve el plan,
 * su local y qué amigos van. Pensado para "tus amigos salen esta noche".
 */
export async function GET() {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  // Amigos aceptados.
  const { data: am } = await db.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada')
    .or(`solicitante_id.eq.${yo.id},receptor_id.eq.${yo.id}`)
  const amigos = [...new Set((am ?? []).map(a => (a.solicitante_id === yo.id ? a.receptor_id : a.solicitante_id) as string))]
  if (!amigos.length) return NextResponse.json({ planes: [] })

  const ahora = new Date().toISOString()
  const amigosSet = new Set(amigos)

  // Planes donde un amigo participa aceptado (para sus plan_id).
  const { data: parts } = await db.from('participantes_plan').select('plan_id, usuario_id').in('usuario_id', amigos).eq('estado', 'aceptada')
  const planIdsPart = [...new Set((parts ?? []).map(p => p.plan_id as string))]

  // Planes creados por un amigo + planes donde un amigo participa.
  const sel = 'id, creador_id, local_id, hora_llegada, total_personas, huecos_disponibles, estado, locales!inner(id, nombre, ciudad, imagenes)'
  const [creados, participa] = await Promise.all([
    db.from('planes_publicos').select(sel).in('creador_id', amigos).eq('estado', 'activo').gt('hora_llegada', ahora),
    planIdsPart.length ? db.from('planes_publicos').select(sel).in('id', planIdsPart).eq('estado', 'activo').gt('hora_llegada', ahora) : Promise.resolve({ data: [] }),
  ])

  type Plan = { id: string; creador_id: string; local_id: string; hora_llegada: string; total_personas: number; huecos_disponibles: number; estado: string; locales?: { id: string; nombre: string; ciudad: string | null; imagenes: string[] | null } }
  const porId = new Map<string, Plan>()
  for (const p of ([...(creados.data ?? []), ...(participa.data ?? [])] as unknown as Plan[])) porId.set(p.id, p)

  // ¿En cuáles estoy yo ya? (para no ofrecer "unirse").
  const idsPlanes = [...porId.keys()]
  const { data: misPart } = idsPlanes.length
    ? await db.from('participantes_plan').select('plan_id, estado').eq('usuario_id', yo.id).in('plan_id', idsPlanes)
    : { data: [] as { plan_id: string; estado: string }[] }
  const miEstadoEnPlan = new Map((misPart ?? []).map(p => [p.plan_id as string, p.estado as string]))

  // Amigos que van a cada plan (creador si es amigo + participantes aceptados amigos).
  const amigosPorPlan = new Map<string, Set<string>>()
  for (const p of porId.values()) {
    const s = amigosPorPlan.get(p.id) ?? new Set<string>()
    if (amigosSet.has(p.creador_id)) s.add(p.creador_id)
    amigosPorPlan.set(p.id, s)
  }
  for (const pr of (parts ?? [])) {
    if (porId.has(pr.plan_id as string)) amigosPorPlan.get(pr.plan_id as string)!.add(pr.usuario_id as string)
  }

  // Info de los amigos implicados.
  const amigoIds = [...new Set([...amigosPorPlan.values()].flatMap(s => [...s]))]
  const { data: usuarios } = amigoIds.length
    ? await db.from('usuarios').select('id, nombre, foto_perfil_url').in('id', amigoIds)
    : { data: [] as UsuarioMin[] }
  const uMap = new Map((usuarios ?? []).map(u => [u.id as string, u as UsuarioMin]))

  const planes = [...porId.values()].map(p => ({
    id: p.id,
    local: p.locales ? { id: p.locales.id, nombre: p.locales.nombre, ciudad: p.locales.ciudad, imagen: Array.isArray(p.locales.imagenes) ? (p.locales.imagenes[0] ?? null) : null } : null,
    hora_llegada: p.hora_llegada,
    plazas: p.total_personas - p.huecos_disponibles,
    total_personas: p.total_personas,
    huecos_disponibles: p.huecos_disponibles,
    soy_creador: p.creador_id === yo.id,
    mi_estado: miEstadoEnPlan.get(p.id) ?? null,
    amigos: [...(amigosPorPlan.get(p.id) ?? [])].map(id => uMap.get(id)).filter(Boolean),
  })).sort((a, b) => a.hora_llegada.localeCompare(b.hora_llegada))

  return NextResponse.json({ planes })
}
