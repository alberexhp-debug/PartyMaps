import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getMiembroGrupoAutenticado } from '@/lib/grupo/auth'

/** Contraseña temporal legible para entregar al manager. */
function passwordTemporal(): string {
  const palabras = ['Rumbo', 'Grupo', 'Noche', 'Madrid', 'Vibe', 'Neon']
  const p = palabras[Math.floor(Math.random() * palabras.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${p}${n}!`
}

/** GET /api/grupo/equipo — managers del grupo + locales (para asignar). Solo propietario. */
export async function GET(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ctx.esPropietario) return NextResponse.json({ error: 'Solo el propietario gestiona el equipo' }, { status: 403 })

  const svc = createServiceRoleClient()
  const { data: miembros } = await svc
    .from('grupo_miembros')
    .select('id, email, nombre, rol, locales_asignados, activo, created_at')
    .eq('grupo_id', ctx.grupo.id)
    .order('rol', { ascending: true })
  const { data: locales } = await svc
    .from('locales').select('id, nombre').eq('grupo_id', ctx.grupo.id).neq('estado', 'eliminado').order('nombre')

  return NextResponse.json({ miembros: miembros ?? [], locales: locales ?? [] })
}

/** POST /api/grupo/equipo — alta de un manager. Crea cuenta si el email no existe. */
export async function POST(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ctx.esPropietario) return NextResponse.json({ error: 'Solo el propietario gestiona el equipo' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const email = String(body.email || '').trim().toLowerCase()
  const nombre = String(body.nombre || '').trim() || null
  const asignados: string[] = Array.isArray(body.locales_asignados) ? body.locales_asignados : []
  if (!email || !email.includes('@')) return NextResponse.json({ error: 'Email inválido' }, { status: 400 })

  const svc = createServiceRoleClient()

  // Asegura una cuenta de acceso. Si el email ya existe, usará su contraseña.
  let credenciales: { email: string; password: string } | null = null
  const password = passwordTemporal()
  const { data: created, error: authErr } = await svc.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (!authErr && created?.user) credenciales = { email, password }

  const { error } = await svc.from('grupo_miembros').upsert({
    grupo_id: ctx.grupo.id,
    email, nombre, rol: 'manager',
    locales_asignados: asignados.length ? asignados : null,
    activo: true,
  }, { onConflict: 'grupo_id,email' })

  if (error) return NextResponse.json({ error: 'No se pudo dar de alta. ¿Está aplicada la migración 029?' }, { status: 500 })
  return NextResponse.json({ ok: true, credenciales })
}

/** PATCH /api/grupo/equipo — activar/pausar o reasignar locales de un manager. */
export async function PATCH(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ctx.esPropietario) return NextResponse.json({ error: 'Solo el propietario gestiona el equipo' }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const cambios: Record<string, unknown> = {}
  if (typeof body.activo === 'boolean') cambios.activo = body.activo
  if (Array.isArray(body.locales_asignados)) cambios.locales_asignados = body.locales_asignados.length ? body.locales_asignados : null
  if (Object.keys(cambios).length === 0) return NextResponse.json({ error: 'Nada que cambiar' }, { status: 400 })

  const svc = createServiceRoleClient()
  // No permitimos tocar al propietario por seguridad.
  const { error } = await svc.from('grupo_miembros')
    .update(cambios).eq('id', id).eq('grupo_id', ctx.grupo.id).eq('rol', 'manager')
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}

/** DELETE /api/grupo/equipo?id= — quitar un manager del grupo. */
export async function DELETE(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ctx.esPropietario) return NextResponse.json({ error: 'Solo el propietario gestiona el equipo' }, { status: 403 })

  const id = new URL(req.url).searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const svc = createServiceRoleClient()
  const { error } = await svc.from('grupo_miembros')
    .delete().eq('id', id).eq('grupo_id', ctx.grupo.id).eq('rol', 'manager')
  if (error) return NextResponse.json({ error: 'No se pudo quitar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
