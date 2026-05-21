import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// Corrección manual del aforo desde el panel local.
// Doc4 §5.3: expira automáticamente a las 6:00 AM del día siguiente.
function calcularExpiracion6AM(): string {
  const ahora = new Date()
  const expira = new Date(ahora)
  expira.setHours(6, 0, 0, 0)
  // Si ya son más de las 6 AM, expira mañana a las 6 AM
  if (ahora.getHours() >= 6) {
    expira.setDate(expira.getDate() + 1)
  }
  return expira.toISOString()
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { local_id, porcentaje } = await req.json()
  if (!local_id || porcentaje === undefined) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  if (porcentaje < 0 || porcentaje > 100) return NextResponse.json({ error: 'Porcentaje inválido' }, { status: 400 })

  const { data: trabajador } = await supabase
    .from('usuario_local')
    .select('id, rol')
    .eq('local_id', local_id)
    .eq('email', user.email!)
    .eq('activo', true)
    .single()

  if (!trabajador) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const expires = calcularExpiracion6AM()
  const valor = Math.round(porcentaje)

  const { error } = await supabase
    .from('locales')
    .update({
      aforo_estimado_porcentaje: valor,
      aforo_correccion_manual: valor,
      aforo_correccion_manual_expires: expires,
    })
    .eq('id', local_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, expires })
}
