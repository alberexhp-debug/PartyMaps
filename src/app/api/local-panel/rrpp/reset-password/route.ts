import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { resetPasswordRrpp, rrppVinculadoALocal } from '@/lib/rrpp/crear'

const GESTORES = ['dueno', 'gestor']

/** POST /api/local-panel/rrpp/reset-password { rrpp_id } — nueva contraseña de
 * un RRPP vinculado a este local. */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Solo dueño/encargado' }, { status: 403 })
  const { rrpp_id } = await req.json().catch(() => ({})) as { rrpp_id?: string }
  if (!rrpp_id) return NextResponse.json({ error: 'Falta rrpp_id' }, { status: 400 })

  const svc = createServiceRoleClient()
  if (!(await rrppVinculadoALocal(svc, rrpp_id, t.local_id))) {
    return NextResponse.json({ error: 'Ese RRPP no trabaja con tu local' }, { status: 403 })
  }
  const res = await resetPasswordRrpp(svc, rrpp_id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ ok: true, credenciales: res.credenciales })
}
