import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Consentimiento de marketing POR LOCAL (RGPD). Histórico append-only: cada
 * cambio es una fila nueva; el VIGENTE es la última por fecha para
 * (identidad, local). Identidad = usuario_id o contacto_id. Migración 038.
 * Usar SIEMPRE con un cliente service_role (la identidad se verifica aparte).
 */

export const ORIGENES_CONSENTIMIENTO = [
  'checkout_entrada', 'checkout_bar', 'checkout_reserva', 'taquilla',
  'lista_rrpp', 'perfil_usuario', 'importado_declarado', 'baja_email',
] as const
export type OrigenConsentimiento = typeof ORIGENES_CONSENTIMIENTO[number]
export type EstadoConsentimiento = 'acepta' | 'retira'

type Identidad = { usuario_id?: string | null; contacto_id?: string | null }

/** Registra una fila de consentimiento (append-only). No bloquea: traza el error. */
export async function registrarConsentimiento(
  svc: SupabaseClient,
  p: Identidad & { local_id: string; estado: EstadoConsentimiento; origen: OrigenConsentimiento },
): Promise<void> {
  if (!p.usuario_id && !p.contacto_id) return
  const { error } = await svc.from('consentimientos_marketing').insert({
    usuario_id: p.usuario_id ?? null,
    contacto_id: p.contacto_id ?? null,
    local_id: p.local_id,
    estado: p.estado,
    origen: p.origen,
  })
  if (error && process.env.NODE_ENV !== 'production') console.error('[consentimiento] no se pudo registrar:', error.message)
}

/** ¿El usuario YA respondió (sí o no) sobre este local? Para no repetir en barra. */
export async function tieneRespuestaConsentimiento(
  svc: SupabaseClient, usuario_id: string, local_id: string,
): Promise<boolean> {
  const { data } = await svc.from('consentimientos_marketing')
    .select('id').eq('usuario_id', usuario_id).eq('local_id', local_id).limit(1)
  return !!(data && data.length)
}

/** Resuelve a quién atribuir un consentimiento de taquilla (cliente sin sesión):
 * usuario por teléfono, contacto existente, o crea un contacto. null si no hay
 * teléfono o no se pudo. Usar con service_role. */
export async function resolverIdentidadPorTelefono(
  svc: SupabaseClient, telefono: string | null | undefined, localId: string, nombre?: string | null,
): Promise<Identidad | null> {
  const tel = (telefono || '').trim()
  if (!tel) return null
  const { data: u } = await svc.from('usuarios').select('id').eq('telefono', tel).maybeSingle()
  if (u) return { usuario_id: u.id as string }
  const { data: c } = await svc.from('contactos').select('id, user_id').eq('telefono', tel).maybeSingle()
  if (c) return c.user_id ? { usuario_id: c.user_id as string } : { contacto_id: c.id as string }
  const ahora = new Date().toISOString()
  const { data: nuevo, error } = await svc.from('contactos').insert({
    telefono: tel, nombre: nombre || null, primer_local_id: localId,
    fuente_origen: 'desconocido', primer_contacto_en: ahora, ultimo_contacto_en: ahora,
  }).select('id').single()
  if (error || !nuevo) return null
  return { contacto_id: nuevo.id as string }
}

/** Consentimiento vigente (última fila) de un usuario para un local. */
export async function consentimientoVigente(
  svc: SupabaseClient, usuario_id: string, local_id: string,
): Promise<boolean> {
  const { data } = await svc.from('consentimientos_marketing')
    .select('estado').eq('usuario_id', usuario_id).eq('local_id', local_id)
    .order('created_at', { ascending: false }).limit(1).maybeSingle()
  return data?.estado === 'acepta'
}
