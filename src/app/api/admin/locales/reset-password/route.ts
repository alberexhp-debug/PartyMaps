import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'
import { passwordPorDefecto } from '@/lib/equipo'

/**
 * POST /api/admin/locales/reset-password { local_id }
 * Genera una contraseña TEMPORAL para la cuenta del dueño del local y le obliga a
 * cambiarla en el primer acceso (no se puede "ver" la actual: está hasheada, §5.1).
 * Devuelve las credenciales una vez para dárselas en mano.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { local_id } = await req.json().catch(() => ({})) as { local_id?: string }
  if (!local_id) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: dueno } = await svc.from('usuario_local')
    .select('id, auth_id, username, email').eq('local_id', local_id).eq('rol', 'dueno').limit(1).maybeSingle()
  if (!dueno) return NextResponse.json({ error: 'Este local no tiene cuenta de dueño' }, { status: 404 })
  if (!dueno.auth_id) return NextResponse.json({ error: 'La cuenta del dueño no es gestionable' }, { status: 400 })

  const password = passwordPorDefecto()
  const { error } = await svc.auth.admin.updateUserById(dueno.auth_id, { password })
  if (error) return NextResponse.json({ error: 'No se pudo resetear la contraseña' }, { status: 500 })
  await svc.from('usuario_local').update({ debe_cambiar_password: true }).eq('id', dueno.id)

  return NextResponse.json({ ok: true, credenciales: { username: dueno.username || dueno.email || '', password } })
}
