'use client'
import { useCallback, useEffect, useState } from 'react'

// Estado de las notificaciones push del usuario en este dispositivo.
//
// 'no-soportado': el navegador no admite Web Push (Safari < 16.4, navegadores antiguos)
// 'denegado':    el usuario rechazó el permiso en el navegador (hay que ir a settings)
// 'activado':    el usuario tiene una suscripción válida registrada
// 'desactivado': el navegador admite push pero no hay suscripción todavía
export type EstadoPush = 'no-soportado' | 'denegado' | 'activado' | 'desactivado'

// Base64url → Uint8Array sobre ArrayBuffer puro (requerido por pushManager.subscribe).
// TS 5.7 distingue Uint8Array<ArrayBufferLike> vs Uint8Array<ArrayBuffer>; el push manager
// exige el segundo.
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function usePushSubscription() {
  const [estado, setEstado] = useState<EstadoPush>('desactivado')
  const [trabajando, setTrabajando] = useState(false)
  const [endpoint, setEndpoint] = useState<string | null>(null)

  const refrescar = useCallback(async () => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setEstado('no-soportado')
      return
    }
    if (Notification.permission === 'denied') {
      setEstado('denegado')
      return
    }
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        setEstado('activado')
        setEndpoint(sub.endpoint)
      } else {
        setEstado(Notification.permission === 'granted' ? 'desactivado' : 'desactivado')
        setEndpoint(null)
      }
    } catch {
      setEstado('desactivado')
    }
  }, [])

  useEffect(() => { refrescar() }, [refrescar])

  const activar = useCallback(async () => {
    if (typeof window === 'undefined') return false
    setTrabajando(true)
    try {
      const permiso = await Notification.requestPermission()
      if (permiso !== 'granted') {
        setEstado(permiso === 'denied' ? 'denegado' : 'desactivado')
        return false
      }
      const reg = await navigator.serviceWorker.ready
      const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!pub) {
        console.error('Falta NEXT_PUBLIC_VAPID_PUBLIC_KEY')
        return false
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pub),
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription: sub.toJSON() }),
      })
      if (!res.ok) {
        await sub.unsubscribe().catch(() => {})
        return false
      }
      setEstado('activado')
      setEndpoint(sub.endpoint)
      return true
    } finally {
      setTrabajando(false)
    }
  }, [])

  const desactivar = useCallback(async () => {
    if (typeof window === 'undefined') return
    setTrabajando(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setEstado('desactivado')
      setEndpoint(null)
    } finally {
      setTrabajando(false)
    }
  }, [])

  return { estado, trabajando, endpoint, activar, desactivar, refrescar }
}
