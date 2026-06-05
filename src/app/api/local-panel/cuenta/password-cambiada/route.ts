import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * POST /api/local-panel/cuenta/password-cambiada — baja el flag tras el cambio
 * de contraseña en el primer acceso. El cambio en sí lo hace el cliente con
 * supabase.auth.updateUser({ password }).
 */
export async function POST() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const svc = createServiceRoleClient()
  await svc.from('usuario_local').update({ debe_cambiar_password: false }).eq('id', t.id)
  return NextResponse.json({ ok: true })
}
