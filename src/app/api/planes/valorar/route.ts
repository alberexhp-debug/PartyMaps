import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Envía valoraciones de un plan en bloque.
 * Body: { plan_id: UUID, valoraciones: { valorado_id: UUID, puntuacion: 1-5 }[] }
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    plan_id?: string
    valoraciones?: { valorado_id: string; puntuacion: number }[]
  } | null
  if (!body?.plan_id || !Array.isArray(body.valoraciones) || body.valoraciones.length === 0) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  for (const v of body.valoraciones) {
    if (!v.valorado_id || v.puntuacion < 1 || v.puntuacion > 5) {
      return NextResponse.json({ error: 'Valoraciones inválidas' }, { status: 400 })
    }
  }

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  // Verificar que el usuario participó en el plan
  const { data: parti } = await admin
    .from('participantes_plan')
    .select('id')
    .eq('plan_id', body.plan_id)
    .eq('usuario_id', usuario.id)
    .eq('estado', 'aceptada')
    .maybeSingle()
  if (!parti) {
    return NextResponse.json({ error: 'No participaste en este plan' }, { status: 403 })
  }

  // Insertar (ignorar conflict — ya valorado)
  const rows = body.valoraciones.map(v => ({
    plan_id: body.plan_id,
    valorador_id: usuario.id,
    valorado_id: v.valorado_id,
    puntuacion: v.puntuacion,
  }))
  const { error } = await admin.from('valoraciones_plan').insert(rows)
  if (error && error.code !== '23505') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Actualizar reputación agregada de cada usuario valorado
  for (const v of body.valoraciones) {
    const { data: agg } = await admin
      .from('valoraciones_plan')
      .select('puntuacion')
      .eq('valorado_id', v.valorado_id)
    if (agg && agg.length > 0) {
      const media = agg.reduce((s, r) => s + r.puntuacion, 0) / agg.length
      await admin
        .from('usuarios')
        .update({
          reputacion_puntuacion: Math.round(media * 10) / 10,
          reputacion_num_valoraciones: agg.length,
        })
        .eq('id', v.valorado_id)
    }
  }

  return NextResponse.json({ ok: true, contadas: rows.length })
}
