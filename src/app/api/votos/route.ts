import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Inserta un voto en un concurso capturando IP y user-agent para antifraude.
 * Body: { participacion_id: UUID, concurso_id: UUID }
 * Idempotente — si el usuario ya votó en esa participación devuelve 200 sin duplicar.
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { participacion_id?: string; concurso_id?: string } | null
  if (!body?.participacion_id || !body?.concurso_id) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin.from('usuarios').select('id, estado_cuenta').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.estado_cuenta !== 'activa') {
    return NextResponse.json({ error: 'Cuenta no activa' }, { status: 403 })
  }

  // Extraer IP real respetando proxy de Vercel/Cloudflare
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim()
    || req.headers.get('x-real-ip')
    || null
  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null

  const { error } = await admin
    .from('votos_concurso')
    .insert({
      participacion_id: body.participacion_id,
      concurso_id: body.concurso_id,
      usuario_id: usuario.id,
      ip_address: ip,
      user_agent: userAgent,
    })

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ ok: true, ya_voto: true })
    }
    console.error('[votos] insert', error)
    return NextResponse.json({ error: 'No se pudo registrar el voto' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
