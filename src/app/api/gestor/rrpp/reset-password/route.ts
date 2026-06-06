import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, gestorPoseeLocal } from '@/lib/gestor/auth'
import { resetPasswordRrpp, rrppVinculadoALocal } from '@/lib/rrpp/crear'

/** POST /api/gestor/rrpp/reset-password { local_id, rrpp_id } — nueva contraseña
 * de un RRPP vinculado a un local de la cartera del gestor. */
export async function POST(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { local_id, rrpp_id } = await req.json().catch(() => ({})) as { local_id?: string; rrpp_id?: string }
  if (!local_id || !rrpp_id) return NextResponse.json({ error: 'Falta local_id o rrpp_id' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, local_id))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }
  const svc = createServiceRoleClient()
  if (!(await rrppVinculadoALocal(svc, rrpp_id, local_id))) {
    return NextResponse.json({ error: 'Ese RRPP no trabaja con ese local' }, { status: 403 })
  }
  const res = await resetPasswordRrpp(svc, rrpp_id)
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
  return NextResponse.json({ ok: true, credenciales: res.credenciales })
}
