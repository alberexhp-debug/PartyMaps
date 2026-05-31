import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/rrpp/auth'

/**
 * POST /api/rrpp/activar
 *
 * Completa el perfil de un RRPP que YA fue invitado (por un local o el admin).
 * Esto YA NO es auto-onboarding — sólo termina lo que un local/admin empezó.
 *
 * Si el usuario autenticado no tiene un rrpp row asociado, o el rrpp existe
 * pero estado_alta='completo', responde 403 — no puede activarse a sí mismo.
 *
 * Body: { nombre_publico, slug?, bio?, instagram?, tiktok?, edad_18_confirmada }
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

  // ¿Existe rrpp row para este usuario?
  const { data: existente } = await admin
    .from('rrpp').select('*').eq('usuario_id', usuario.id).maybeSingle()

  if (!existente) {
    return NextResponse.json({
      error: 'No tienes ninguna invitación activa. Para ser RRPP en Rumbo necesitas que un local te invite o que el administrador te dé de alta.',
      code: 'NO_INVITATION'
    }, { status: 403 })
  }

  if (existente.estado_alta === 'completo' && existente.activo) {
    return NextResponse.json({
      error: 'Tu perfil de RRPP ya está completo. Edita los campos desde tu panel.',
      code: 'ALREADY_COMPLETE'
    }, { status: 409 })
  }

  // Estado 'invitado' → completar perfil
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

  // Resolver slug: el venue/admin puede haber puesto un slug placeholder
  // (ej. 'pendiente-xxxxx'). Lo sustituimos por el del usuario.
  const slugBase = body.slug ? slugify(body.slug) : slugify(body.nombre_publico)
  if (!slugBase) return NextResponse.json({ error: 'slug inválido' }, { status: 400 })
  const slugFinal = await resolverSlugUnico(admin, slugBase, existente.id)

  const { data, error } = await admin
    .from('rrpp')
    .update({
      slug: slugFinal,
      nombre_publico: body.nombre_publico,
      foto_url: usuario.foto_perfil_url || existente.foto_url,
      bio: body.bio || existente.bio,
      instagram: body.instagram || existente.instagram,
      tiktok: body.tiktok || existente.tiktok,
      estado_alta: 'completo',
      completado_at: new Date().toISOString(),
      activo: true,
    })
    .eq('id', existente.id)
    .select().single()
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug ya en uso. Prueba otro.', code: 'SLUG_TAKEN' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ rrpp: data, completado: true })
}

async function resolverSlugUnico(
  admin: Awaited<ReturnType<typeof createAdminSupabaseClient>>,
  base: string,
  excluirId: string,
): Promise<string> {
  for (let i = 0; i < 50; i++) {
    const candidato = i === 0 ? base : `${base}-${i + 1}`
    const { data } = await admin
      .from('rrpp').select('id').eq('slug', candidato).neq('id', excluirId).maybeSingle()
    if (!data) return candidato
  }
  return `${base}-${Date.now().toString(36)}`
}
