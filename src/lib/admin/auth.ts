import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Resuelve al admin autenticado a partir del email del JWT.
 * Sigue el patrón establecido por /api/admin/auditoria — admins
 * viven en `administradores`, vinculados por email.
 */
export async function getAdminAutenticado(_req?: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user?.email) return null
  const svc = await createAdminSupabaseClient()
  const { data } = await svc
    .from('administradores')
    .select('id, email, nombre, rol, activo')
    .ilike('email', user.email) // insensible a mayúsculas (consistente con el login)
    .eq('activo', true)
    .maybeSingle()
  return data
}
