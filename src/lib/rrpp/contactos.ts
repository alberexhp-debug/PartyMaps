import { createAdminSupabaseClient } from '@/lib/supabase/server'
import type { Contacto, FuenteContacto } from '@/types'

export interface ResolveInput {
  email?: string | null
  telefono?: string | null
  nombre?: string | null
  user_id?: string | null
  primer_rrpp_id?: string | null
  primer_local_id?: string | null
  fuente_origen?: FuenteContacto
}

/**
 * Encuentra o crea un contacto. Reglas:
 *   - Si tiene `user_id`, prioridad absoluta: si existe contacto con ese
 *     user_id, lo devolvemos.
 *   - Si no, busca por email (case-insensitive) o por teléfono.
 *   - Si no encuentra, lo crea.
 *   - Si encuentra pero el contacto existente está vacío en algún campo
 *     que ahora sí tenemos, lo enriquece.
 * Siempre toca `ultimo_contacto_en`.
 *
 * Nota: esto corre con service_role. Es transaccional a nivel de fila.
 * Conflictos concurrentes están protegidos por los índices únicos
 * `uq_contactos_email` y `uq_contactos_telefono`.
 */
export async function resolverContacto(input: ResolveInput): Promise<Contacto> {
  const admin = await createAdminSupabaseClient()
  const email = input.email?.trim().toLowerCase() || null
  const telefono = input.telefono?.trim() || null

  if (!email && !telefono && !input.user_id) {
    throw new Error('resolverContacto: email, teléfono o user_id obligatorio')
  }

  // 1) Buscar por user_id
  if (input.user_id) {
    const { data } = await admin
      .from('contactos').select('*')
      .eq('user_id', input.user_id).maybeSingle()
    if (data) return enriquecerYTouch(data, input)
  }
  // 2) Buscar por email
  if (email) {
    const { data } = await admin
      .from('contactos').select('*')
      .ilike('email', email).maybeSingle()
    if (data) return enriquecerYTouch(data, input)
  }
  // 3) Buscar por teléfono
  if (telefono) {
    const { data } = await admin
      .from('contactos').select('*')
      .eq('telefono', telefono).maybeSingle()
    if (data) return enriquecerYTouch(data, input)
  }

  // 4) Crear nuevo
  const { data: nuevo, error } = await admin
    .from('contactos')
    .insert({
      email, telefono,
      nombre: input.nombre || null,
      user_id: input.user_id || null,
      primer_rrpp_id: input.primer_rrpp_id || null,
      primer_local_id: input.primer_local_id || null,
      fuente_origen: input.fuente_origen || 'desconocido',
    })
    .select().single()
  if (error) throw error
  return nuevo as Contacto
}

async function enriquecerYTouch(existente: Contacto, input: ResolveInput): Promise<Contacto> {
  const admin = await createAdminSupabaseClient()
  const patch: Partial<Contacto> = { ultimo_contacto_en: new Date().toISOString() }
  if (!existente.email && input.email) patch.email = input.email.toLowerCase()
  if (!existente.telefono && input.telefono) patch.telefono = input.telefono
  if (!existente.nombre && input.nombre) patch.nombre = input.nombre
  if (!existente.user_id && input.user_id) patch.user_id = input.user_id
  if (!existente.primer_rrpp_id && input.primer_rrpp_id) patch.primer_rrpp_id = input.primer_rrpp_id
  if (!existente.primer_local_id && input.primer_local_id) patch.primer_local_id = input.primer_local_id
  const { data, error } = await admin
    .from('contactos').update(patch).eq('id', existente.id).select().single()
  if (error) throw error
  return data as Contacto
}
