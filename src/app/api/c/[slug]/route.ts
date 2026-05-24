import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!slug || slug.length > 20) return NextResponse.json({ error: 'Slug inválido' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('usuarios')
    .select('nombre, foto_perfil_url, fecha_nacimiento, carta_frase, carta_estilo, carta_apodo, carta_slug, carta_publica, reputacion_puntuacion, reputacion_num_valoraciones, estado_cuenta')
    .eq('carta_slug', slug)
    .maybeSingle()

  if (error) {
    console.error('[c] lookup', error)
    return NextResponse.json({ error: 'Error' }, { status: 500 })
  }
  if (!data || !data.carta_publica || data.estado_cuenta !== 'activa') {
    return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    nombre: data.nombre,
    apodo: data.carta_apodo,
    foto: data.foto_perfil_url,
    fecha_nacimiento: data.fecha_nacimiento,
    frase: data.carta_frase,
    estilo: data.carta_estilo,
    slug: data.carta_slug,
    reputacion: data.reputacion_num_valoraciones > 0
      ? { puntuacion: data.reputacion_puntuacion ?? 0, total: data.reputacion_num_valoraciones }
      : null,
  })
}
