import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { emailSinteticoDeUsuario, esUsernameValido, normalizarUsername, passwordPorDefecto } from '@/lib/equipo'
import type { RolLocal } from '@/types'

const GESTORES = ['dueno', 'gestor']
// Roles que un dueño/gestor puede crear desde el panel (no se crean dueños).
const ROLES_ALTA: RolLocal[] = ['gestor', 'barman', 'puerta']

/**
 * POST /api/local-panel/equipo — alta de un trabajador con cuenta REAL.
 * Crea la cuenta en Supabase Auth (email sintético) con una contraseña por
 * defecto y guarda su ficha. Devuelve las credenciales para entregárselas.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Solo el dueño o el encargado pueden dar de alta' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const nombre = String(body.nombre || '').trim()
  const username = normalizarUsername(String(body.username || ''))
  const rol = String(body.rol || '') as RolLocal
  if (!nombre) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  if (!esUsernameValido(username)) return NextResponse.json({ error: 'Usuario no válido: 3-30 caracteres, solo letras, números, punto, guion o guion bajo' }, { status: 400 })
  if (!ROLES_ALTA.includes(rol)) return NextResponse.json({ error: 'Rol no válido' }, { status: 400 })

  const svc = createServiceRoleClient()

  // ¿Usuario libre? (hay índice único global, pero comprobamos antes para un buen mensaje)
  const { data: existe } = await svc.from('usuario_local').select('id').eq('username', username).maybeSingle()
  if (existe) return NextResponse.json({ error: 'Ese nombre de usuario ya está cogido' }, { status: 409 })

  const email = emailSinteticoDeUsuario(username)
  const password = passwordPorDefecto()
  const { data: created, error: authErr } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (authErr || !created?.user) {
    return NextResponse.json({ error: 'Ese nombre de usuario ya está cogido' }, { status: 409 })
  }

  const { data: fila, error } = await svc.from('usuario_local').insert({
    usuario_id: null,
    local_id: t.local_id,
    rol,
    email,                                 // identidad de login (email sintético)
    nombre,
    username,
    email_contacto: limpiarTexto(body.email_contacto),
    telefono: limpiarTexto(body.telefono),
    dni: limpiarTexto(body.dni),
    fecha_nacimiento: limpiarFecha(body.fecha_nacimiento),
    fecha_alta: hoy(),
    auth_id: created.user.id,
    activo: true,
    totp_activado: false,
    debe_cambiar_password: true,
  }).select('*').single()

  if (error) {
    // Si la fila no entró, deshacemos la cuenta Auth para no dejar el usuario cogido.
    await svc.auth.admin.deleteUser(created.user.id).catch(() => {})
    if ((error as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'Ese nombre de usuario ya está cogido' }, { status: 409 })
    }
    return NextResponse.json({ error: '¿Está aplicada la migración 035? ' + error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, trabajador: fila, credenciales: { username, password } })
}

/**
 * PATCH /api/local-panel/equipo — editar datos/rol/estado de un trabajador.
 * Body: { id, nombre?, rol?, telefono?, email_contacto?, dni?, fecha_nacimiento?, activo? }
 */
export async function PATCH(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: target } = await svc.from('usuario_local').select('id, local_id, rol').eq('id', id).maybeSingle()
  if (!target || target.local_id !== t.local_id) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  if (target.rol === 'dueno') return NextResponse.json({ error: 'No se puede modificar al dueño' }, { status: 403 })

  const cambios: Record<string, unknown> = {}
  if (typeof body.nombre === 'string' && body.nombre.trim()) cambios.nombre = body.nombre.trim()
  if (typeof body.rol === 'string' && ROLES_ALTA.includes(body.rol as RolLocal)) cambios.rol = body.rol
  if ('telefono' in body) cambios.telefono = limpiarTexto(body.telefono)
  if ('email_contacto' in body) cambios.email_contacto = limpiarTexto(body.email_contacto)
  if ('dni' in body) cambios.dni = limpiarTexto(body.dni)
  if ('fecha_nacimiento' in body) cambios.fecha_nacimiento = limpiarFecha(body.fecha_nacimiento)
  if (typeof body.activo === 'boolean') cambios.activo = body.activo
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 })

  const { data, error } = await svc.from('usuario_local').update(cambios).eq('id', id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, trabajador: data })
}

/** DELETE /api/local-panel/equipo?id= — eliminar trabajador (y su cuenta Auth). */
export async function DELETE(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const id = new URL(req.url).searchParams.get('id') || ''
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: target } = await svc.from('usuario_local').select('id, local_id, rol, auth_id').eq('id', id).maybeSingle()
  if (!target || target.local_id !== t.local_id) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })
  if (target.rol === 'dueno') return NextResponse.json({ error: 'No se puede eliminar al dueño' }, { status: 403 })
  if (target.id === t.id) return NextResponse.json({ error: 'No puedes eliminarte a ti mismo' }, { status: 400 })

  await svc.from('usuario_local').delete().eq('id', id) // cascada borra totp + mensajes
  if (target.auth_id) await svc.auth.admin.deleteUser(target.auth_id).catch(() => {})
  return NextResponse.json({ ok: true })
}

function limpiarTexto(v: unknown): string | null { const s = String(v ?? '').trim(); return s || null }
function limpiarFecha(v: unknown): string | null { const s = String(v ?? '').trim(); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null }
function hoy(): string { return new Date().toISOString().slice(0, 10) }
