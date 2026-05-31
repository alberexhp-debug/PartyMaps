import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * GET /auth/callback?code=...&next=/mapa
 * Punto de retorno de los accesos OAuth (Google) y de los enlaces de
 * recuperación de contraseña. Intercambia el código por sesión y:
 *   - si el usuario aún no tiene perfil en `usuarios` → /completar-perfil
 *   - si ya lo tiene → al destino indicado (por defecto /mapa)
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') || '/mapa'

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.exchangeCodeForSession(code)

  if (error || !data?.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`)
  }

  // ¿Tiene ya perfil en la tabla usuarios?
  const admin = await createAdminSupabaseClient()
  const { data: perfil } = await admin
    .from('usuarios')
    .select('id')
    .eq('auth_id', data.user.id)
    .maybeSingle()

  if (!perfil) {
    return NextResponse.redirect(`${origin}/completar-perfil`)
  }

  return NextResponse.redirect(`${origin}${next}`)
}
