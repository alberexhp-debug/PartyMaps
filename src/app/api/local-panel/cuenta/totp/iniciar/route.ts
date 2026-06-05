import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { generateSecret, generateURI } from 'otplib'

/**
 * POST /api/local-panel/cuenta/totp/iniciar — genera un secreto de authenticator
 * para el trabajador autenticado y devuelve el otpauth:// (para el QR) + el
 * secreto manual. No activa el 2FA hasta confirmar un código (totp/confirmar).
 */
export async function POST() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const svc = createServiceRoleClient()
  const { data: yo } = await svc.from('usuario_local').select('username, totp_activado').eq('id', t.id).maybeSingle()
  if (yo?.totp_activado) {
    return NextResponse.json({ error: 'Ya tienes authenticator configurado. Pide a tu encargado que lo reinicie.' }, { status: 409 })
  }
  const { data: local } = await svc.from('locales').select('nombre').eq('id', t.local_id).maybeSingle()

  const secret = generateSecret()
  await svc.from('trabajador_totp').upsert({ usuario_local_id: t.id, secret }, { onConflict: 'usuario_local_id' })

  const label = yo?.username || 'trabajador'
  const issuer = local?.nombre ? `Rumbo · ${local.nombre}` : 'Rumbo'
  const otpauth = generateURI({ strategy: 'totp', issuer, label, secret })
  return NextResponse.json({ otpauth, secret })
}
