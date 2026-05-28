import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /api/r/[slug]
 * Endpoint público: devuelve el perfil de un RRPP por su slug + los locales
 * donde trabaja activamente + sus próximos eventos.
 * Sin autenticación. Cumple RLS (rrpp.activo = true visible para anon).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const admin = await createAdminSupabaseClient()

  const { data: rrpp } = await admin
    .from('rrpp')
    .select('id, slug, nombre_publico, foto_url, bio, instagram, tiktok')
    .eq('slug', slug).eq('activo', true).maybeSingle()
  if (!rrpp) return NextResponse.json({ error: 'RRPP no encontrado' }, { status: 404 })

  // Locales donde trabaja
  const { data: venues } = await admin
    .from('rrpp_venue')
    .select(`
      local_id,
      locales!inner(id, nombre, foto_url, tier)
    `)
    .eq('rrpp_id', rrpp.id).eq('estado', 'activa')

  // Próximos eventos en esos locales (en los próximos 30 días)
  const localIds = (venues ?? []).map(v => v.local_id)
  let eventos: unknown[] = []
  if (localIds.length > 0) {
    const ahora = new Date().toISOString()
    const masTreinta = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await admin
      .from('eventos')
      .select('id, local_id, nombre, fecha_inicio, fecha_fin, foto_url, precio')
      .in('local_id', localIds)
      .gte('fecha_inicio', ahora)
      .lte('fecha_inicio', masTreinta)
      .eq('estado', 'publicado')
      .order('fecha_inicio', { ascending: true })
      .limit(20)
    eventos = data ?? []
  }

  // Followers count
  const { count: numFollowers } = await admin
    .from('rrpp_seguidor')
    .select('*', { head: true, count: 'exact' })
    .eq('rrpp_id', rrpp.id)

  return NextResponse.json({
    rrpp,
    venues: venues ?? [],
    eventos,
    num_followers: numFollowers ?? 0,
  })
}
