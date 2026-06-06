import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { tieneRespuestaConsentimiento, consentimientoVigente } from '@/lib/consentimiento'

/**
 * GET /api/consentimiento?local_id= — para el usuario autenticado, dice si YA
 * respondió sobre este local (para no repetir el checkbox en la barra) y si su
 * consentimiento vigente es "acepta".
 */
export async function GET(req: NextRequest) {
  const localId = new URL(req.url).searchParams.get('local_id') || ''
  if (!localId) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })

  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ respondido: false, vigente: false })

  const svc = createServiceRoleClient()
  const { data: usuario } = await svc.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ respondido: false, vigente: false })

  const respondido = await tieneRespuestaConsentimiento(svc, usuario.id, localId)
  const vigente = respondido ? await consentimientoVigente(svc, usuario.id, localId) : false
  return NextResponse.json({ respondido, vigente })
}
