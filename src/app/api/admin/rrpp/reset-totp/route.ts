import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado, adminPuedeAccionSensible } from '@/lib/admin/auth'
import { resetTotpRrpp } from '@/lib/rrpp/crear'

/** POST /api/admin/rrpp/reset-totp { rrpp_id } — reinicia el authenticator. */
export async function POST(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  if (!adminPuedeAccionSensible(admin)) return NextResponse.json({ error: 'Solo un admin o super_admin puede reiniciar el 2FA' }, { status: 403 })
  const { rrpp_id } = await req.json().catch(() => ({})) as { rrpp_id?: string }
  if (!rrpp_id) return NextResponse.json({ error: 'Falta rrpp_id' }, { status: 400 })

  const res = await resetTotpRrpp(createServiceRoleClient(), rrpp_id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ ok: true })
}
