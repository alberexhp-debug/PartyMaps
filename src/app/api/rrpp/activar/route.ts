import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/rrpp/auth'

/**
 * POST /api/rrpp/activar
 * Activa el rol RRPP sobre la cuenta del usuario autenticado.
 * Body: { nombre_publico, slug?, bio?, instagram?, tiktok?, edad_18_confirmada: true }
 * - Si ya existe rrpp para este usuario, se reactiva (activo=true) y actualiza
 *   los campos pasados. Idempotente.
 * - Si slug colisiona, devuelve 409 con sugerencias.
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin
    .from('usuarios').select('id, nombre, foto_perfil_url')
    .eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })

  const body = await req.json().catch(() => null) as Partial<{
    nombre_publico: string; slug: string;
    bio: string; instagram: string; tiktok: string;
    edad_18_confirmada: boolean;
  }> | null
  if (!body?.nombre_publico) {
    return NextResponse.json({ error: 'nombre_publico obligatorio' }, { status: 400 })
  }
  if (!body.edad_18_confirmada) {
    return NextResponse.json({ error: 'Debes confirmar que eres mayor de 18 años' }, { status: 400 })
  }

  // ¿Ya tiene perfil RRPP?
  const { data: existente } = await admin
    .from('rrpp').select('*').eq('usuario_id', usuario.id).maybeSingle()

  if (existente) {
    const patch: Record<string, unknown> = {
      nombre_publico: body.nombre_publico,
      bio: body.bio ?? existente.bio,
      instagram: body.instagram ?? existente.instagram,
      tiktok: body.tiktok ?? existente.tiktok,
      activo: true,
    }
    const { data, error } = await admin
      .from('rrpp').update(patch).eq('id', existente.id).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ rrpp: data, reactivado: true })
  }

  // Resolver slug único
  const slugBase = body.slug ? slugify(body.slug) : slugify(body.nombre_publico)
  if (!slugBase) {
    return NextResponse.json({ error: 'slug inválido' }, { status: 400 })
  }
  const slug = await resolverSlugUnico(admin, slugBase)

  const { data: nuevo, error: errIns } = await admin
    .from('rrpp')
    .insert({
      usuario_id: usuario.id,
      slug,
      nombre_publico: body.nombre_publico,
      foto_url: usuario.foto_perfil_url || null,
      bio: body.bio || null,
      instagram: body.instagram || null,
      tiktok: body.tiktok || null,
      edad_declarada_18: true,
    })
    .select().single()
  if (errIns) {
    if (errIns.code === '23505') {
      return NextResponse.json({ error: 'slug colisionado, intenta otro', slug_intentado: slug }, { status: 409 })
    }
    return NextResponse.json({ error: errIns.message }, { status: 500 })
  }
  return NextResponse.json({ rrpp: nuevo, creado: true })
}

async function resolverSlugUnico(admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>, base: string): Promise<string> {
  // Intentar base, base-2, base-3, ... hasta encontrar libre
  for (let i = 0; i < 50; i++) {
    const candidato = i === 0 ? base : `${base}-${i + 1}`
    const { data } = await admin.from('rrpp').select('id').eq('slug', candidato).maybeSingle()
    if (!data) return candidato
  }
  return `${base}-${Date.now().toString(36)}`
}
