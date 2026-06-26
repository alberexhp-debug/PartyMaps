import webpush from 'web-push'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// Lazy init: el módulo se importa también en código de prerender donde las
// env vars pueden no estar disponibles. Solo configuramos en cada llamada real.
let configurado = false
function asegurarConfigurado() {
  if (configurado) return true
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:soporte@partymaps.com'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  configurado = true
  return true
}

export interface PushPayload {
  title: string
  body: string
  url?: string
}

export interface PushSubscriptionRow {
  id: string
  endpoint: string
  p256dh: string
  auth: string
}

// Envía un push a varias suscripciones. Devuelve estadísticas y limpia
// automáticamente las suscripciones que el push service rechaza como expiradas.
export async function enviarPush(
  suscripciones: PushSubscriptionRow[],
  payload: PushPayload,
): Promise<{ enviadas: number; falladas: number; eliminadas: number }> {
  if (!asegurarConfigurado() || suscripciones.length === 0) {
    return { enviadas: 0, falladas: 0, eliminadas: 0 }
  }

  const admin = await createAdminSupabaseClient()
  const body = JSON.stringify(payload)
  const endpointsAEliminar: string[] = []
  let enviadas = 0
  let falladas = 0

  await Promise.all(suscripciones.map(async sub => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        body,
      )
      enviadas += 1
    } catch (e) {
      const err = e as { statusCode?: number }
      // 404 / 410 → suscripción muerta: limpiarla
      if (err.statusCode === 404 || err.statusCode === 410) {
        endpointsAEliminar.push(sub.endpoint)
      } else {
        falladas += 1
      }
    }
  }))

  let eliminadas = 0
  if (endpointsAEliminar.length > 0) {
    const { count } = await admin
      .from('push_subscriptions')
      .delete({ count: 'exact' })
      .in('endpoint', endpointsAEliminar)
    eliminadas = count || 0
  }

  return { enviadas, falladas, eliminadas }
}

// Envía un push a TODAS las suscripciones de un usuario concreto (sus dispositivos).
export async function enviarPushAUsuario(usuarioId: string, payload: PushPayload) {
  if (!usuarioId) return { enviadas: 0, falladas: 0, eliminadas: 0 }
  const admin = await createAdminSupabaseClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('usuario_id', usuarioId)
  return enviarPush((subs ?? []) as PushSubscriptionRow[], payload)
}

// Envía un push a una lista concreta de usuarios (p. ej. los contactables de un segmento CRM).
export async function enviarPushAUsuarios(usuarioIds: string[], payload: PushPayload) {
  const ids = usuarioIds.filter(Boolean)
  if (ids.length === 0) return { enviadas: 0, falladas: 0, eliminadas: 0 }
  const admin = await createAdminSupabaseClient()
  const { data: subs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('usuario_id', ids)
  return enviarPush((subs ?? []) as PushSubscriptionRow[], payload)
}

// Envía un push a un RRPP (resuelve su usuario). No lanza: notificar nunca debe
// romper la acción que lo dispara.
export async function enviarPushARRPP(rrppId: string, payload: PushPayload) {
  try {
    const admin = await createAdminSupabaseClient()
    const { data: rrpp } = await admin.from('rrpp').select('usuario_id').eq('id', rrppId).maybeSingle()
    if (!rrpp?.usuario_id) return
    await enviarPushAUsuario(rrpp.usuario_id, payload)
  } catch (e) {
    if (process.env.NODE_ENV !== 'production') console.error('[push] enviarPushARRPP', e)
  }
}

// Helper que envía a todos los suscriptores de un local.
export async function enviarPushASuscriptoresDeLocal(
  localId: string,
  payload: PushPayload,
) {
  const admin = await createAdminSupabaseClient()
  // suscripciones (FCM) → usuarios suscritos al local con notificaciones activas
  const { data: subs } = await admin
    .from('suscripciones')
    .select('usuario_id')
    .eq('local_id', localId)
    .eq('silenciada', false)

  const usuarioIds = (subs ?? []).map(s => s.usuario_id)
  if (usuarioIds.length === 0) return { enviadas: 0, falladas: 0, eliminadas: 0 }

  const { data: pushSubs } = await admin
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .in('usuario_id', usuarioIds)

  return enviarPush((pushSubs ?? []) as PushSubscriptionRow[], payload)
}
