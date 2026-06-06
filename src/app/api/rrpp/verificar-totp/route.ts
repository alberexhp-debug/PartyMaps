import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { verifySync } from 'otplib'

/**
 * POST /api/rrpp/verificar-totp — segundo factor del login del RRPP.
 * Se llama DESPUÉS de signInWithPassword (la sesión ya identifica al RRPP).
 * Body: { code }. Devuelve { valid }.
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ valid: false, error: 'No autorizado' }, { status: 401 })
  const { code } = await req.json().catch(() => ({})) as { code?: string }
  if (!code) return NextResponse.json({ valid: false }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: row } = await svc.from('rrpp_totp').select('secret').eq('rrpp_id', ctx.rrpp.id).maybeSingle()
  if (!row?.secret) return NextResponse.json({ valid: false }, { status: 400 })

  const result = verifySync({ secret: row.secret, token: String(code).trim(), strategy: 'totp', epochTolerance: 30 } as Parameters<typeof verifySync>[0])
  return NextResponse.json({ valid: result.valid })
}
