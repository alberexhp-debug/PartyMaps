import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Manual occupancy override from local panel
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { local_id, porcentaje, duracion_minutos = 30 } = await req.json()
  if (!local_id || porcentaje === undefined) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  if (porcentaje < 0 || porcentaje > 100) return NextResponse.json({ error: 'Porcentaje inválido' }, { status: 400 })

  // Verify the user works at this local
  const { data: trabajador } = await supabase
    .from('usuario_local')
    .select('id, rol')
    .eq('local_id', local_id)
    .eq('email', user.email!)
    .eq('activo', true)
    .single()

  if (!trabajador) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const expires = new Date(Date.now() + duracion_minutos * 60 * 1000).toISOString()

  const { error } = await supabase
    .from('locales')
    .update({
      aforo_estimado_porcentaje: Math.round(porcentaje),
      aforo_correccion_manual: Math.round(porcentaje),
      aforo_correccion_manual_expires: expires,
    })
    .eq('id', local_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, expires })
}
