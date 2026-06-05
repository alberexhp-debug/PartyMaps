import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Resuelve al RRPP autenticado a partir de su sesión Supabase.
 * Devuelve la fila completa de `rrpp` + `usuario_id`, o null si:
 *   - no hay sesión
 *   - la sesión no tiene un perfil RRPP activado
 *   - el RRPP está marcado inactivo
 */
export async function getRRPPAutenticado(_req?: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const admin = await createAdminSupabaseClient()
  // usuario → rrpp por usuario_id (siguiendo el patrón del proyecto: auth_id en usuarios)
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, auth_id, nombre, telefono, foto_perfil_url')
    .eq('auth_id', user.id)
    .maybeSingle()
  if (!usuario) return null
  const { data: rrpp } = await admin
    .from('rrpp')
    .select('*')
    .eq('usuario_id', usuario.id)
    .eq('activo', true)
    .maybeSingle()
  if (!rrpp) return null
  return { rrpp, usuario, authUserId: user.id }
}

/**
 * Resuelve al trabajador del local autenticado (dueño/gestor/etc.) usando
 * el email del JWT igual que productos/route.ts.
 */
export async function getTrabajadorLocal(_req?: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const admin = await createAdminSupabaseClient()
  const { data } = await admin
    .from('usuario_local')
    .select('id, local_id, rol, activo, email')
    .ilike('email', user.email ?? '') // insensible a mayúsculas: el login usa ilike, aquí también
    .eq('activo', true)
    .maybeSingle()
  return data
}

/** Slug-ify nombre público: lower, sin acentos, sin espacios. */
export function slugify(s: string): string {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}
