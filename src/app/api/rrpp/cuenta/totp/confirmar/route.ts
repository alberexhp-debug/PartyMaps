import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { verifySync } from 'otplib'

/**
 * POST /api/rrpp/cuenta/totp/confirmar — valida el primer código y activa el 2FA.
 * Body: { code }.
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { code } = await req.json().catch(() => ({})) as { code?: string }
  if (!code) return NextResponse.json({ error: 'Falta el código' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: row } = await svc.from('rrpp_totp').select('secret').eq('rrpp_id', ctx.rrpp.id).maybeSingle()
  if (!row?.secret) return NextResponse.json({ error: 'Primero genera el código (vuelve a escanear el QR)' }, { status: 400 })

  const result = verifySync({ secret: row.secret, token: String(code).trim(), strategy: 'totp', epochTolerance: 30 } as Parameters<typeof verifySync>[0])
  if (!result.valid) return NextResponse.json({ valid: false, error: 'Código incorrecto o caducado' }, { status: 400 })

  await svc.from('rrpp').update({ totp_activado: true }).eq('id', ctx.rrpp.id)
  return NextResponse.json({ valid: true })
}
