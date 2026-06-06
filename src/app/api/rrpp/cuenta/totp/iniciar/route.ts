import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { generateSecret, generateURI } from 'otplib'

/**
 * POST /api/rrpp/cuenta/totp/iniciar — genera el secreto del authenticator del
 * RRPP autenticado y devuelve el otpauth:// (QR) + la clave manual. No activa el
 * 2FA hasta confirmar un código (totp/confirmar).
 */
export async function POST() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (ctx.rrpp.totp_activado) {
    return NextResponse.json({ error: 'Ya tienes authenticator configurado. Pide a tu local/admin que lo reinicie.' }, { status: 409 })
  }
  const svc = createServiceRoleClient()
  const secret = generateSecret()
  await svc.from('rrpp_totp').upsert({ rrpp_id: ctx.rrpp.id, secret }, { onConflict: 'rrpp_id' })

  const label = ctx.rrpp.username || ctx.rrpp.slug || 'rrpp'
  const otpauth = generateURI({ strategy: 'totp', issuer: 'Rumbo · RRPP', label, secret })
  return NextResponse.json({ otpauth, secret })
}
