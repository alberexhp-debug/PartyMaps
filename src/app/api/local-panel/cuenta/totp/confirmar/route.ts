import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { verifySync } from 'otplib'

/**
 * POST /api/local-panel/cuenta/totp/confirmar — el trabajador valida el primer
 * código de su authenticator. Si es correcto, activa el 2FA. Body: { code }.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { code } = await req.json().catch(() => ({})) as { code?: string }
  if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: row } = await svc.from('trabajador_totp').select('secret').eq('usuario_local_id', t.id).maybeSingle()
  if (!row?.secret) return NextResponse.json({ error: 'Primero genera el código (vuelve a escanear el QR)' }, { status: 400 })

  const result = verifySync({ secret: row.secret, token: String(code).trim(), strategy: 'totp', epochTolerance: 30 } as Parameters<typeof verifySync>[0])
  if (!result.valid) return NextResponse.json({ valid: false, error: 'Código incorrecto o caducado' }, { status: 400 })

  await svc.from('usuario_local').update({ totp_activado: true }).eq('id', t.id)
  return NextResponse.json({ valid: true })
}
