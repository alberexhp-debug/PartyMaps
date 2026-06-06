import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'
import { resetPasswordRrpp } from '@/lib/rrpp/crear'

/** POST /api/admin/rrpp/reset-password { rrpp_id } — nueva contraseña por defecto. */
export async function POST(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { rrpp_id } = await req.json().catch(() => ({})) as { rrpp_id?: string }
  if (!rrpp_id) return NextResponse.json({ error: 'Falta rrpp_id' }, { status: 400 })

  const res = await resetPasswordRrpp(createServiceRoleClient(), rrpp_id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ ok: true, credenciales: res.credenciales })
}
