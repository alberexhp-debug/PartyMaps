import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * PUT /api/admin/rrpp/[id]
 *   Suspende, reactiva o cambia visibilidad de un RRPP.
 *   Body: { activo?, visible_en_busqueda? }
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params

  const body = await req.json().catch(() => null) as Partial<{
    activo: boolean; visible_en_busqueda: boolean;
  }> | null
  if (!body) return NextResponse.json({ error: 'body vacío' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.activo === 'boolean') patch.activo = body.activo
  if (typeof body.visible_en_busqueda === 'boolean') patch.visible_en_busqueda = body.visible_en_busqueda
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'nada que actualizar' }, { status: 400 })
  }

  const svc = await createAdminSupabaseClient()
  const { data, error } = await svc
    .from('rrpp').update(patch).eq('id', id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ rrpp: data })
}
