import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import type { Gestor } from '@/types'

/**
 * Resuelve al TorneumGestor autenticado a partir de su sesión Supabase.
 * Sigue el patrón seguro del proyecto: email del JWT, sin JOIN a auth.users.
 * Devuelve la fila completa de `gestores` (solo si activo), o null.
 */
export async function getGestorAutenticado(_req?: NextRequest): Promise<{ gestor: Gestor; authUserId: string } | null> {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user?.email) return null

  const admin = createServiceRoleClient()
  const { data: gestor } = await admin
    .from('gestores')
    .select('*')
    .ilike('email', user.email) // insensible a mayúsculas (consistente con el login)
    .eq('activo', true)
    .maybeSingle()

  if (!gestor) return null
  return { gestor: gestor as Gestor, authUserId: user.id }
}

/**
 * Comprueba que un local pertenece a la cartera del gestor (gestor_id).
 * Devuelve true solo si el local existe y es suyo. Úsalo SIEMPRE antes de
 * operar sobre datos de un local desde el panel del gestor.
 */
export async function gestorPoseeLocal(gestorId: string, localId: string): Promise<boolean> {
  if (!localId) return false
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('locales')
    .select('id')
    .eq('id', localId)
    .eq('gestor_id', gestorId)
    .maybeSingle()
  return !!data
}

/** Contraseña temporal legible para entregar al dueño en el alta presencial. */
export function generarPasswordTemporal(): string {
  const adjetivos = ['Torneum', 'Noche', 'Fiesta', 'Madrid', 'Neon', 'Vibe']
  const a = adjetivos[Math.floor(Math.random() * adjetivos.length)]
  const n = Math.floor(1000 + Math.random() * 9000)
  return `${a}${n}!`
}
