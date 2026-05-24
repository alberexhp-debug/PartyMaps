import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Diagnóstico de configuración de SMS OTP. Solo accesible a admins.
 * Hace una llamada signInWithOtp a un número inválido y clasifica el error
 * que devuelve Supabase para decir si Twilio está conectado.
 */
export async function GET(_req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: ad } = await admin
    .from('administradores')
    .select('id, rol')
    .eq('email', user.email).eq('activo', true).maybeSingle()
  if (!ad) return NextResponse.json({ error: 'Solo admins' }, { status: 403 })

  // Probamos con un número manifiestamente inválido para forzar error 4xx
  const { error } = await admin.auth.signInWithOtp({ phone: '+34000000000' })

  if (!error) {
    return NextResponse.json({ provider_ok: true, mensaje: 'SMS provider configurado (la llamada fue aceptada)' })
  }

  const m = error.message.toLowerCase()
  if (m.includes('phone provider') || m.includes('not configured') || m.includes('not enabled')) {
    return NextResponse.json({ provider_ok: false, mensaje: 'Provider de SMS NO configurado en Supabase Auth', detalle: error.message })
  }
  if (m.includes('invalid') || m.includes('phone number')) {
    return NextResponse.json({ provider_ok: true, mensaje: 'Provider configurado (rechazó número inválido)', detalle: error.message })
  }
  return NextResponse.json({ provider_ok: 'unknown', mensaje: 'Respuesta no clasificable', detalle: error.message })
}
