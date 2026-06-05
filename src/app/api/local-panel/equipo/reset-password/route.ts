import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { passwordPorDefecto } from '@/lib/equipo'

const GESTORES = ['dueno', 'gestor']

/**
 * POST /api/local-panel/equipo/reset-password — el dueño/gestor genera una
 * nueva contraseña por defecto para un trabajador (p.ej. si la olvidó).
 * Body: { id }. Devuelve las nuevas credenciales.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: target } = await svc.from('usuario_local').select('id, local_id, auth_id, username').eq('id', id).maybeSingle()
  if (!target || target.local_id !== t.local_id) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  if (!target.auth_id) return NextResponse.json({ error: 'Este trabajador no tiene cuenta gestionable' }, { status: 400 })

  const password = passwordPorDefecto()
  const { error } = await svc.auth.admin.updateUserById(target.auth_id, { password })
  if (error) return NextResponse.json({ error: 'No se pudo resetear la contraseña' }, { status: 500 })
  await svc.from('usuario_local').update({ debe_cambiar_password: true }).eq('id', id)
  return NextResponse.json({ ok: true, credenciales: { username: target.username, password } })
}
