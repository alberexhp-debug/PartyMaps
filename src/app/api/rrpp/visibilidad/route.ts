import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * PUT /api/rrpp/visibilidad { visible_en_busqueda: boolean }
 * Cambia la visibilidad del RRPP en el buscador del panel local.
 * La página pública /r/[slug] sigue siendo pública siempre que el RRPP esté activo.
 */
export async function PUT(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { visible_en_busqueda?: boolean } | null
  if (typeof body?.visible_en_busqueda !== 'boolean') {
    return NextResponse.json({ error: 'visible_en_busqueda boolean obligatorio' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('rrpp')
    .update({ visible_en_busqueda: body.visible_en_busqueda })
    .eq('id', ctx.rrpp.id)
    .select('id, visible_en_busqueda').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rrpp: data })
}
