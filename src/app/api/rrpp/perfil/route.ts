import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createAdminSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado, slugify } from '@/lib/rrpp/auth'

/**
 * GET /api/rrpp/perfil
 * Devuelve el perfil RRPP del usuario autenticado + sus venues activos
 * + sumario rápido (ventas mes, pendiente de liquidar).
 */
export async function GET() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: venuesRaw } = await admin
    .from('rrpp_venue')
    .select('*, locales!inner(id, nombre, imagenes, tier)')
    .eq('rrpp_id', ctx.rrpp.id)
    .in('estado', ['pendiente', 'activa', 'pausada'])

  // locales usa `imagenes` (array), no `foto_url`. Normalizamos para la UI.
  const venues = (venuesRaw ?? []).map(v => {
    const loc = v.locales as { id: string; nombre: string; imagenes?: string[]; tier: string } | null
    return { ...v, locales: loc ? { id: loc.id, nombre: loc.nombre, tier: loc.tier, foto_url: loc.imagenes?.[0] ?? null } : null }
  })

  // Liquidaciones de este mes (formato yyyy-mm)
  const periodo = new Date().toISOString().slice(0, 7)
  const { data: liquidaciones } = await admin
    .from('liquidacion_rrpp')
    .select('*')
    .eq('rrpp_id', ctx.rrpp.id)
    .gte('periodo', periodo)

  return NextResponse.json({
    rrpp: ctx.rrpp,
    venues: venues ?? [],
    liquidaciones: liquidaciones ?? [],
  })
}

/**
 * PUT /api/rrpp/perfil
 * El RRPP edita su perfil público: nombre, bio, redes, foto y slug.
 * El slug debe ser único (si cambia).
 */
export async function PUT(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const db = createServiceRoleClient()

  const patch: Record<string, unknown> = {}
  if (typeof body.nombre_publico === 'string' && body.nombre_publico.trim()) patch.nombre_publico = body.nombre_publico.trim().slice(0, 60)
  if (typeof body.bio === 'string') patch.bio = body.bio.trim().slice(0, 280) || null
  if (typeof body.instagram === 'string') patch.instagram = body.instagram.trim().replace(/^@/, '') || null
  if (typeof body.tiktok === 'string') patch.tiktok = body.tiktok.trim().replace(/^@/, '') || null
  if (typeof body.foto_url === 'string') patch.foto_url = body.foto_url || null

  // Slug: validar formato y unicidad si cambia.
  if (typeof body.slug === 'string' && body.slug.trim()) {
    const nuevo = slugify(body.slug)
    if (!nuevo) return NextResponse.json({ error: 'URL inválida' }, { status: 400 })
    if (nuevo !== ctx.rrpp.slug) {
      const { data: existe } = await db.from('rrpp').select('id').eq('slug', nuevo).maybeSingle()
      if (existe) return NextResponse.json({ error: 'Esa URL ya está en uso' }, { status: 409 })
      patch.slug = nuevo
    }
  }

  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 })

  const { data, error } = await db.from('rrpp').update(patch).eq('id', ctx.rrpp.id).select('*').single()
  if (error) return NextResponse.json({ error: 'No se pudo guardar: ' + error.message }, { status: 500 })
  return NextResponse.json({ ok: true, rrpp: data })
}
