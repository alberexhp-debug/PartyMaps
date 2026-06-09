import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getUsuarioAutenticado } from '@/lib/usuario/auth'
import { enviarPushAUsuario } from '@/lib/push'

/**
 * POST /api/planes/[id]/invitar { usuario_ids: [] }
 * El organizador invita a AMIGOS suyos a su plan: los añade ya aceptados
 * (vouching), descuenta huecos (igual que aceptar una solicitud) y les notifica.
 * Cierra el bucle social: añadir amigos → salir juntos a un local.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const yo = await getUsuarioAutenticado()
  if (!yo) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => null) as { usuario_ids?: string[] } | null
  const candidatos = [...new Set((body?.usuario_ids ?? []).filter(x => x && x !== yo.id))]
  if (!candidatos.length) return NextResponse.json({ error: 'No hay a quién invitar' }, { status: 400 })

  const db = createServiceRoleClient()
  const { data: plan } = await db.from('planes_publicos')
    .select('id, creador_id, huecos_disponibles, estado, locales!inner(nombre)')
    .eq('id', id).maybeSingle()
  if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 })
  if (plan.creador_id !== yo.id) return NextResponse.json({ error: 'Solo el organizador puede invitar' }, { status: 403 })
  if (plan.estado !== 'activo') return NextResponse.json({ error: 'El plan ya no está activo' }, { status: 400 })

  // Solo amigos aceptados (no desconocidos).
  const { data: am } = await db.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada')
    .or(`solicitante_id.eq.${yo.id},receptor_id.eq.${yo.id}`)
  const amigos = new Set((am ?? []).map(a => (a.solicitante_id === yo.id ? a.receptor_id : a.solicitante_id) as string))
  const validos = candidatos.filter(x => amigos.has(x))

  // Quitar los que ya están en el plan.
  const { data: yaPart } = await db.from('participantes_plan').select('usuario_id').eq('plan_id', id)
  const existentes = new Set((yaPart ?? []).map(p => p.usuario_id as string))
  const nuevos = validos.filter(x => !existentes.has(x))

  // Respetar los huecos disponibles.
  const huecos = plan.huecos_disponibles ?? 0
  const aInvitar = nuevos.slice(0, Math.max(0, huecos))
  if (!aInvitar.length) {
    return NextResponse.json({ invitados: 0, sin_hueco: nuevos.length, ya_estaban: validos.length - nuevos.length })
  }

  const { error } = await db.from('participantes_plan')
    .insert(aInvitar.map(uid => ({ plan_id: id, usuario_id: uid, estado: 'aceptada' })))
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  await db.from('planes_publicos').update({ huecos_disponibles: Math.max(0, huecos - aInvitar.length) }).eq('id', id)

  const localNombre = (plan as unknown as { locales?: { nombre?: string } }).locales?.nombre || 'un local'
  for (const uid of aInvitar) {
    enviarPushAUsuario(uid, { title: 'Te han invitado a un plan', body: `${yo.nombre} te invita a salir a ${localNombre}`, url: `/planes/${id}` }).catch(() => {})
  }
  return NextResponse.json({ invitados: aInvitar.length, sin_hueco: nuevos.length - aInvitar.length, ya_estaban: validos.length - nuevos.length })
}
