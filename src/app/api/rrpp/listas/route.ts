import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * GET  /api/rrpp/listas?evento_id=...
 * POST /api/rrpp/listas { local_id, evento_id, nombre?, tipo?, cupo_max?, precio?, hora_limite? }
 */
export async function GET(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = await createAdminSupabaseClient()
  const url = new URL(req.url)
  const eventoId = url.searchParams.get('evento_id')

  let q = admin.from('lista_rrpp').select('*').eq('rrpp_id', ctx.rrpp.id).eq('activa', true)
  if (eventoId) q = q.eq('evento_id', eventoId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // contar items por lista (cuántos invitados tiene cada una)
  const ids = (data ?? []).map(l => l.id)
  let conteos: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: items } = await admin
      .from('lista_rrpp_item').select('lista_id').in('lista_id', ids)
    conteos = (items ?? []).reduce<Record<string, number>>((acc, it) => {
      acc[it.lista_id] = (acc[it.lista_id] ?? 0) + 1
      return acc
    }, {})
  }
  const listas = (data ?? []).map(l => ({ ...l, num_invitados: conteos[l.id] ?? 0 }))
  return NextResponse.json({ listas })
}

export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as Partial<{
    local_id: string; evento_id: string;
    nombre: string; tipo: 'cerrada' | 'abierta';
    cupo_max: number; precio: number; hora_limite: string;
  }> | null
  if (!body?.local_id || !body.evento_id) {
    return NextResponse.json({ error: 'local_id y evento_id obligatorios' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  // Verificar relación activa
  const { data: relacion } = await admin
    .from('rrpp_venue').select('id, estado')
    .eq('rrpp_id', ctx.rrpp.id).eq('local_id', body.local_id).maybeSingle()
  if (!relacion || relacion.estado !== 'activa') {
    return NextResponse.json({ error: 'Sin relación activa con este local' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('lista_rrpp')
    .insert({
      rrpp_id: ctx.rrpp.id,
      local_id: body.local_id,
      evento_id: body.evento_id,
      nombre: body.nombre || 'Lista principal',
      tipo: body.tipo || 'cerrada',
      cupo_max: body.cupo_max || null,
      precio: body.precio ?? 0,
      hora_limite: body.hora_limite || null,
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ lista: data })
}
