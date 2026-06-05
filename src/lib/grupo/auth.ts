import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Grupo, GrupoMiembro } from '@/types'

export type ContextoGrupo = {
  miembro: GrupoMiembro
  grupo: Grupo
  /** IDs de los locales que este miembro puede ver (ya resueltos). */
  localesIds: string[]
  esPropietario: boolean
}

/**
 * Resuelve al miembro de grupo autenticado a partir de su sesión Supabase.
 * Patrón seguro del proyecto: email del JWT, sin JOIN a auth.users.
 * Resuelve también el alcance de locales:
 *   - propietario → todos los locales del grupo
 *   - manager con locales_asignados → ese subconjunto (intersecado con el grupo)
 *   - manager sin asignación → todos los del grupo
 */
export async function getMiembroGrupoAutenticado(_req?: NextRequest): Promise<ContextoGrupo | null> {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user?.email) return null

  const svc = createServiceRoleClient()
  const { data: miembro } = await svc
    .from('grupo_miembros')
    .select('*')
    .ilike('email', user.email) // insensible a mayúsculas (consistente con el login)
    .eq('activo', true)
    .maybeSingle()
  if (!miembro) return null

  const { data: grupo } = await svc
    .from('grupos').select('*').eq('id', miembro.grupo_id).eq('activo', true).maybeSingle()
  if (!grupo) return null

  // Locales del grupo (no eliminados).
  const { data: locales } = await svc
    .from('locales').select('id').eq('grupo_id', grupo.id).neq('estado', 'eliminado')
  const idsGrupo = (locales ?? []).map(l => l.id as string)

  const esPropietario = miembro.rol === 'propietario'
  const asignados = (miembro.locales_asignados ?? []) as string[]
  const localesIds = esPropietario || asignados.length === 0
    ? idsGrupo
    : idsGrupo.filter(id => asignados.includes(id))

  return { miembro: miembro as GrupoMiembro, grupo: grupo as Grupo, localesIds, esPropietario }
}
