import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/usuario/auth'
import { enviarPushAUsuario } from '@/lib/push'

type FilaAmistad = { id: string; solicitante_id: string; receptor_id: string; estado: string; created_at: string }
type UsuarioMin = { id: string; nombre: string; foto_perfil_url: string | null }

/**
 * GET /api/amigos — el grafo del usuario:
 *  - amigos: amistades aceptadas (datos del otro)
 *  - recibidas: solicitudes pendientes donde soy receptor
 *  - enviadas: solicitudes pendientes que envié yo
 * Todo por service_role tras resolver identidad (la RLS deniega acceso directo).
 */
export async function GET() {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: aceptadas } = await db.from('amistades')
    .select('id, solicitante_id, receptor_id, estado, created_at')
    .eq('estado', 'aceptada').or(`solicitante_id.eq.${yo.id},receptor_id.eq.${yo.id}`)
  const { data: recibidas } = await db.from('amistades')
    .select('id, solicitante_id, receptor_id, estado, created_at')
    .eq('estado', 'pendiente').eq('receptor_id', yo.id)
  const { data: enviadas } = await db.from('amistades')
    .select('id, solicitante_id, receptor_id, estado, created_at')
    .eq('estado', 'pendiente').eq('solicitante_id', yo.id)

  const ace = (aceptadas ?? []) as FilaAmistad[]
  const rec = (recibidas ?? []) as FilaAmistad[]
  const env = (enviadas ?? []) as FilaAmistad[]

  const otroId = (a: FilaAmistad) => (a.solicitante_id === yo.id ? a.receptor_id : a.solicitante_id)
  const ids = [...new Set([
    ...ace.map(otroId), ...rec.map(a => a.solicitante_id), ...env.map(a => a.receptor_id),
  ])]
  const { data: usuarios } = ids.length
    ? await db.from('usuarios').select('id, nombre, foto_perfil_url').in('id', ids)
    : { data: [] as UsuarioMin[] }
  const uMap = new Map((usuarios ?? []).map(u => [u.id as string, u as UsuarioMin]))
  const info = (id: string) => uMap.get(id) ?? { id, nombre: 'Usuario', foto_perfil_url: null }

  return NextResponse.json({
    amigos: ace.map(a => ({ amistad_id: a.id, ...info(otroId(a)) })),
    recibidas: rec.map(a => ({ amistad_id: a.id, ...info(a.solicitante_id), created_at: a.created_at })),
    enviadas: env.map(a => ({ amistad_id: a.id, ...info(a.receptor_id) })),
  })
}

/**
 * POST /api/amigos { destino_id } — enviar solicitud (desde el enlace de
 * invitación /amigo/[id]). Si ya existe una pendiente en sentido contrario,
 * la acepta (amistad mutua). Idempotente y simétrico.
 */
export async function POST(req: NextRequest) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { destino_id?: string } | null
  const destino = (body?.destino_id || '').trim()
  if (!destino) return NextResponse.json({ error: 'Falta el destinatario' }, { status: 400 })
  if (destino === yo.id) return NextResponse.json({ error: 'No puedes añadirte a ti mismo' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: existeDestino } = await db.from('usuarios').select('id, nombre').eq('id', destino).maybeSingle()
  if (!existeDestino) return NextResponse.json({ error: 'Esa persona no existe' }, { status: 404 })

  // ¿Ya hay relación en cualquier sentido?
  const { data: previa } = await db.from('amistades')
    .select('id, solicitante_id, receptor_id, estado')
    .or(`and(solicitante_id.eq.${yo.id},receptor_id.eq.${destino}),and(solicitante_id.eq.${destino},receptor_id.eq.${yo.id})`)
    .maybeSingle()

  if (previa) {
    if (previa.estado === 'aceptada') return NextResponse.json({ ok: true, estado: 'aceptada', nombre: existeDestino.nombre })
    // Pendiente: si la envió el otro, la acepto → mutua.
    if (previa.receptor_id === yo.id) {
      await db.from('amistades').update({ estado: 'aceptada', updated_at: new Date().toISOString() }).eq('id', previa.id)
      enviarPushAUsuario(destino, { title: '¡Nueva amistad!', body: `${yo.nombre} y tú ya sois amigos en Torneum`, url: '/amigos' }).catch(() => {})
      return NextResponse.json({ ok: true, estado: 'aceptada', nombre: existeDestino.nombre })
    }
    return NextResponse.json({ ok: true, estado: 'pendiente', nombre: existeDestino.nombre })
  }

  const { error } = await db.from('amistades').insert({ solicitante_id: yo.id, receptor_id: destino, estado: 'pendiente' })
  if (error) {
    if (error.code === '42P01') return NextResponse.json({ error: 'Los amigos se activan muy pronto.' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  enviarPushAUsuario(destino, { title: 'Nueva solicitud de amistad', body: `${yo.nombre} quiere ser tu amigo en Torneum`, url: '/amigos' }).catch(() => {})
  return NextResponse.json({ ok: true, estado: 'pendiente', nombre: existeDestino.nombre })
}

/** PATCH /api/amigos { amistad_id, accion: 'aceptar' | 'rechazar' } — responder a una solicitud recibida. */
export async function PATCH(req: NextRequest) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { amistad_id?: string; accion?: string } | null
  if (!body?.amistad_id || !['aceptar', 'rechazar'].includes(body.accion || '')) {
    return NextResponse.json({ error: 'Petición no válida' }, { status: 400 })
  }
  const db = createServiceRoleClient()
  const { data: am } = await db.from('amistades').select('id, solicitante_id, receptor_id, estado').eq('id', body.amistad_id).maybeSingle()
  if (!am || am.receptor_id !== yo.id) return NextResponse.json({ error: 'Solicitud no encontrada' }, { status: 404 })

  if (body.accion === 'aceptar') {
    await db.from('amistades').update({ estado: 'aceptada', updated_at: new Date().toISOString() }).eq('id', am.id)
    enviarPushAUsuario(am.solicitante_id, { title: 'Solicitud aceptada', body: `${yo.nombre} ha aceptado tu solicitud de amistad`, url: '/amigos' }).catch(() => {})
  } else {
    await db.from('amistades').delete().eq('id', am.id)
  }
  return NextResponse.json({ ok: true })
}

/** DELETE /api/amigos?amigo_id= — deshacer amistad (o cancelar solicitud enviada) con esa persona. */
export async function DELETE(req: NextRequest) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const amigoId = new URL(req.url).searchParams.get('amigo_id') || ''
  if (!amigoId) return NextResponse.json({ error: 'Falta amigo_id' }, { status: 400 })
  const db = createServiceRoleClient()
  await db.from('amistades').delete()
    .or(`and(solicitante_id.eq.${yo.id},receptor_id.eq.${amigoId}),and(solicitante_id.eq.${amigoId},receptor_id.eq.${yo.id})`)
  return NextResponse.json({ ok: true })
}
