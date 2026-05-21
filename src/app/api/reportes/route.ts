import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// Reportes de contenido por usuarios (Doc5 §7.3).
// POST: registra el reporte. Si un mismo contenido acumula >5 reportes, pasa
// automáticamente a estado pendiente_moderacion / censurada.

const TIPOS_VALIDOS = ['review', 'participacion_concurso', 'participacion_reto', 'plan_publico'] as const
const MOTIVOS_VALIDOS = ['inapropiado', 'spam', 'falso', 'otro'] as const

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const body = await req.json()
  const { tipo_contenido, contenido_id, motivo, descripcion } = body
  if (!(TIPOS_VALIDOS as readonly string[]).includes(tipo_contenido)) {
    return NextResponse.json({ error: 'tipo_contenido inválido' }, { status: 400 })
  }
  if (!(MOTIVOS_VALIDOS as readonly string[]).includes(motivo)) {
    return NextResponse.json({ error: 'motivo inválido' }, { status: 400 })
  }
  if (!contenido_id) return NextResponse.json({ error: 'Falta contenido_id' }, { status: 400 })

  // Insertar reporte (sin duplicados del mismo usuario sobre el mismo contenido)
  const { error: insertErr } = await supabase
    .from('reportes_contenido')
    .insert({
      reportado_por: usuario.id,
      tipo_contenido,
      contenido_id,
      motivo,
      descripcion: descripcion?.trim() || null,
      estado: 'pendiente',
    })
  if (insertErr && insertErr.code !== '23505') {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  // Si el contenido acumula >5 reportes pendientes, lo enviamos a revisión manual
  const admin = await createAdminSupabaseClient()
  const { count } = await admin
    .from('reportes_contenido')
    .select('id', { count: 'exact', head: true })
    .eq('contenido_id', contenido_id)
    .eq('tipo_contenido', tipo_contenido)
    .eq('estado', 'pendiente')

  if ((count ?? 0) >= 5) {
    if (tipo_contenido === 'review') {
      await admin.from('reviews').update({ censurada: true, motivo_censura: 'Múltiples reportes' }).eq('id', contenido_id)
    } else if (tipo_contenido === 'participacion_concurso') {
      await admin.from('participaciones_concurso').update({ estado: 'pendiente_moderacion' }).eq('id', contenido_id)
    } else if (tipo_contenido === 'participacion_reto') {
      await admin.from('participaciones_reto').update({ estado: 'pendiente_moderacion' }).eq('id', contenido_id)
    }
  }

  return NextResponse.json({ ok: true, reportes_acumulados: count ?? 0 })
}
