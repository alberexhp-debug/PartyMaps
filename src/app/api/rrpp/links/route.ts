import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * GET  /api/rrpp/links?local_id=...
 * POST /api/rrpp/links { local_id, evento_id?, codigo_manual? }
 *   - Si evento_id es null, link general del RRPP en ese local.
 *   - codigo_manual: ej. "leo10", único por local.
 */
export async function GET(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = await createAdminSupabaseClient()
  const url = new URL(req.url)
  const localId = url.searchParams.get('local_id')

  let q = admin.from('link_rrpp').select('*').eq('rrpp_id', ctx.rrpp.id).eq('activo', true)
  if (localId) q = q.eq('local_id', localId)
  const { data, error } = await q.order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ links: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as Partial<{
    local_id: string; evento_id: string; codigo_manual: string;
  }> | null
  if (!body?.local_id) {
    return NextResponse.json({ error: 'local_id obligatorio' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  // Verificar que existe relación activa con ese local
  const { data: relacion } = await admin
    .from('rrpp_venue')
    .select('id, estado')
    .eq('rrpp_id', ctx.rrpp.id).eq('local_id', body.local_id)
    .maybeSingle()
  if (!relacion || relacion.estado !== 'activa') {
    return NextResponse.json({ error: 'No tienes relación activa con este local' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('link_rrpp')
    .insert({
      rrpp_id: ctx.rrpp.id,
      local_id: body.local_id,
      evento_id: body.evento_id || null,
      codigo_manual: body.codigo_manual?.trim().toLowerCase() || null,
    })
    .select().single()
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Código manual ya usado en este local' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ link: data })
}
