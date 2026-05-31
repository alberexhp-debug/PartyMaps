import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * Chat del RRPP con los locales.
 * GET            → lista de conversaciones (locales con relación o mensajes)
 * GET ?local_id= → hilo con ese local (marca leídos los del local)
 * POST { local_id, mensaje } → envía como 'rrpp'
 */
export async function GET(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const rrppId = ctx.rrpp.id
  const localId = new URL(req.url).searchParams.get('local_id')

  if (localId) {
    const { data } = await db.from('mensajes_rrpp')
      .select('id, emisor, mensaje, created_at')
      .eq('rrpp_id', rrppId).eq('local_id', localId)
      .order('created_at', { ascending: true }).limit(200)
    await db.from('mensajes_rrpp').update({ leido: true })
      .eq('rrpp_id', rrppId).eq('local_id', localId).eq('emisor', 'local').eq('leido', false)
    return NextResponse.json({ mensajes: data ?? [] })
  }

  // Lista de conversaciones: locales con relación + locales que han escrito.
  const [{ data: rels }, { data: msgs }] = await Promise.all([
    db.from('rrpp_venue').select('local_id').eq('rrpp_id', rrppId).in('estado', ['pendiente', 'activa', 'pausada']),
    db.from('mensajes_rrpp').select('local_id').eq('rrpp_id', rrppId),
  ])
  const localIds = [...new Set([...(rels ?? []).map(r => r.local_id), ...(msgs ?? []).map(m => m.local_id)])]
  if (localIds.length === 0) return NextResponse.json({ conversaciones: [] })

  const { data: locales } = await db.from('locales').select('id, nombre, foto_url').in('id', localIds)
  const nombreById = Object.fromEntries((locales ?? []).map(l => [l.id, l]))

  const conversaciones = await Promise.all(localIds.map(async lid => {
    const { data: ult } = await db.from('mensajes_rrpp')
      .select('mensaje, created_at, emisor').eq('rrpp_id', rrppId).eq('local_id', lid)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    const { count } = await db.from('mensajes_rrpp')
      .select('id', { count: 'exact', head: true })
      .eq('rrpp_id', rrppId).eq('local_id', lid).eq('emisor', 'local').eq('leido', false)
    const l = nombreById[lid]
    return {
      local_id: lid,
      nombre: l?.nombre ?? 'Local',
      foto_url: l?.foto_url ?? null,
      ultimo: ult?.mensaje ?? null,
      ultimo_at: ult?.created_at ?? null,
      no_leidos: count ?? 0,
    }
  }))
  conversaciones.sort((a, b) => (b.ultimo_at ?? '').localeCompare(a.ultimo_at ?? ''))
  return NextResponse.json({ conversaciones })
}

export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { local_id?: string; mensaje?: string } | null
  const mensaje = (body?.mensaje || '').trim()
  if (!body?.local_id || !mensaje) return NextResponse.json({ error: 'Falta local_id o mensaje' }, { status: 400 })
  if (mensaje.length > 1000) return NextResponse.json({ error: 'Mensaje demasiado largo' }, { status: 400 })

  const db = createServiceRoleClient()
  // Solo puede escribir a locales con los que tiene relación o un hilo abierto.
  const [{ data: rel }, { data: prev }] = await Promise.all([
    db.from('rrpp_venue').select('id').eq('rrpp_id', ctx.rrpp.id).eq('local_id', body.local_id).maybeSingle(),
    db.from('mensajes_rrpp').select('id').eq('rrpp_id', ctx.rrpp.id).eq('local_id', body.local_id).limit(1).maybeSingle(),
  ])
  if (!rel && !prev) return NextResponse.json({ error: 'No tienes conversación con este local' }, { status: 403 })

  const { data, error } = await db.from('mensajes_rrpp')
    .insert({ local_id: body.local_id, rrpp_id: ctx.rrpp.id, emisor: 'rrpp', mensaje })
    .select('id, emisor, mensaje, created_at').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ mensaje: data })
}
