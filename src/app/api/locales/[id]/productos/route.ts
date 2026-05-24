import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/locales/[id]/productos
 * Devuelve el catálogo público de productos disponibles del local.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('productos_local')
    .select('*')
    .eq('local_id', id)
    .eq('disponible', true)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ productos: data ?? [] })
}
