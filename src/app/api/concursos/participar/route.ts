import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'
import { moderarImagen } from '@/lib/moderacion-imagen'

/**
 * Crea una participación de concurso. Si hay imagen, la pasa por Sightengine.
 * - Si el modelo la rechaza con confianza, queda 'rechazada' con motivo.
 * - Si Sightengine no está configurado o falla, queda 'pendiente_moderacion'
 *   y entra a la cola manual de /admin/moderacion.
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    concurso_id?: string
    contenido_url?: string
    instagram_post_url?: string
  } | null
  if (!body?.concurso_id || (!body.contenido_url && !body.instagram_post_url)) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin.from('usuarios').select('id, estado_cuenta').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.estado_cuenta !== 'activa') {
    return NextResponse.json({ error: 'Cuenta no activa' }, { status: 403 })
  }

  // Moderación automática previa (solo si hay URL directa, no Instagram)
  let estadoInicial: 'pendiente_moderacion' | 'rechazada' = 'pendiente_moderacion'
  let motivo: string | undefined
  let detalles: Record<string, number> | undefined

  if (body.contenido_url) {
    const moderacion = await moderarImagen(body.contenido_url)
    if (!moderacion.aprobada) {
      estadoInicial = 'rechazada'
      motivo = moderacion.motivo
      detalles = moderacion.detalles
    }
  }

  const { data, error } = await admin
    .from('participaciones_concurso')
    .insert({
      concurso_id: body.concurso_id,
      usuario_id: usuario.id,
      contenido_url: body.contenido_url || null,
      instagram_post_url: body.instagram_post_url || null,
      estado: estadoInicial,
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Ya has participado en este concurso' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    participacion: data,
    moderacion_auto: { rechazada: estadoInicial === 'rechazada', motivo, detalles },
  })
}
