import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Resuelve al usuario B2C autenticado (fila de `usuarios`) a partir del JWT.
 * Patrón seguro del proyecto: email/auth_id del JWT, sin JOIN a auth.users.
 * Devuelve solo lo necesario para identificarlo, o null.
 */
export async function getUsuarioAutenticado(): Promise<{ id: string; nombre: string; foto_perfil_url: string | null } | null> {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const db = createServiceRoleClient()
  const { data } = await db.from('usuarios').select('id, nombre, foto_perfil_url').eq('auth_id', user.id).maybeSingle()
  return (data as { id: string; nombre: string; foto_perfil_url: string | null } | null) ?? null
}
