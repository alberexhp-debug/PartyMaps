import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { verifySync } from 'otplib'

export async function POST(req: NextRequest) {
  const { totp, adminId } = await req.json()
  if (!totp || !adminId) return NextResponse.json({ valid: false }, { status: 400 })

  const supabase = await createAdminSupabaseClient()
  const { data: admin } = await supabase
    .from('administradores')
    .select('totp_secret, activo')
    .eq('id', adminId)
    .single()

  if (!admin?.activo) return NextResponse.json({ valid: false }, { status: 403 })

  // Use the secret from env if no per-admin secret
  const secret = admin.totp_secret || process.env.ADMIN_TOTP_SECRET!
  const result = verifySync({ secret, token: totp, strategy: 'totp' } as Parameters<typeof verifySync>[0])
  const valid = result.valid
  return NextResponse.json({ valid })
}
