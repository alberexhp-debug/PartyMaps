'use client'
import { useEffect, useRef } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore, claveDemo } from '@/lib/stores/useSesionStore'
import { supabaseTorneum } from '@/lib/supabase/torneum'

// ─────────────────────────────────────────────────────────────────────────────
// FASE A.5 (31-08): TODO tu estado te sigue. Con cuenta REAL, el blob personal
// de la demo y el MUNDO común se sincronizan con Supabase (estado_cuenta /
// estado_mundo): entrar desde incógnito u otro dispositivo recupera tus
// torneos, chats, inscripciones y el mundo tal cual estaban.
//
// REGLA ANTI-PISOTÓN (la primera versión perdía datos): cada navegador guarda
// la REVISIÓN de nube que ya vio (updated_at). El pull solo aplica la nube si
// su revisión es DISTINTA de la marcada — es decir, si la escribió OTRO
// navegador. Si la nube está igual o por detrás (p. ej. un push abortado por
// una navegación), lo local manda y se re-empuja. Un navegador virgen no tiene
// marca → siempre adopta la nube. Limitación asumida del puente: el mundo es
// último-en-escribir-gana entre dispositivos.
// ─────────────────────────────────────────────────────────────────────────────

const CLAVE_MUNDO = 'todh-mundo'
const marcaCuenta = (email: string) => `todh-nube-rev@${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
const MARCA_MUNDO = 'todh-nube-rev-mundo'

function leerBlob(clave: string): unknown | null {
  try { const raw = window.localStorage.getItem(clave); return raw ? JSON.parse(raw) : null } catch { return null }
}
function escribirBlob(clave: string, valor: unknown) {
  try { window.localStorage.setItem(clave, JSON.stringify(valor)) } catch { /* cuota llena */ }
}
const leerMarca = (k: string) => { try { return window.localStorage.getItem(k) } catch { return null } }
const ponerMarca = (k: string, v: string) => { try { window.localStorage.setItem(k, v) } catch { /* sin sitio */ } }

export function NubeDemoSync() {
  const sesion = useSesionStore(s => s.sesion)
  const listo = useRef<string | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // PULL al entrar con cuenta real: solo aplica revisiones que no hayamos visto
  useEffect(() => {
    const email = sesion?.real ? sesion.email : null
    if (!email || listo.current === email) return
    const sb = supabaseTorneum()
    if (!sb) return
    let cancelado = false
    ;(async () => {
      const [cuenta, mundo] = await Promise.all([
        sb.from('estado_cuenta').select('estado,updated_at').limit(1).maybeSingle(),
        sb.from('estado_mundo').select('estado,updated_at').eq('id', 'mundo').maybeSingle(),
      ])
      if (cancelado) return
      let aplicado = false
      if (cuenta.data?.estado && cuenta.data.updated_at !== leerMarca(marcaCuenta(email))) {
        escribirBlob(claveDemo(email), cuenta.data.estado)
        ponerMarca(marcaCuenta(email), cuenta.data.updated_at)
        aplicado = true
      }
      if (mundo.data?.estado && mundo.data.updated_at !== leerMarca(MARCA_MUNDO)) {
        escribirBlob(CLAVE_MUNDO, mundo.data.estado)
        ponerMarca(MARCA_MUNDO, mundo.data.updated_at)
        aplicado = true
      }
      listo.current = email
      if (aplicado) useDemoStore.persist.rehydrate()
      else empujar(email)   // la nube está igual o por detrás: converge con lo local
    })()
    return () => { cancelado = true }
  }, [sesion])

  // PUSH: cambios del store con sesión real → nube (debounce corto)
  useEffect(() => {
    const unsub = useDemoStore.subscribe(() => {
      const ses = useSesionStore.getState().sesion
      if (!ses?.real || listo.current !== ses.email) return
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(() => empujar(ses.email), 800)
    })
    return () => { unsub(); if (timer.current) clearTimeout(timer.current) }
  }, [])

  return null
}

async function empujar(email: string) {
  const sb = supabaseTorneum()
  if (!sb) return
  const uid = (await sb.auth.getUser()).data.user?.id
  if (!uid) return
  const { data: fila } = await sb.from('usuarios').select('id').eq('auth_id', uid).maybeSingle()
  if (!fila?.id) return
  const ahora = new Date().toISOString()
  const personal = leerBlob(claveDemo(email))
  const mundo = leerBlob(CLAVE_MUNDO)
  // Mejor esfuerzo: si una navegación aborta la subida, la marca no avanza y
  // el próximo pull NO aplicará la nube vieja (lo local nunca se pierde).
  // La marca se guarda con el updated_at TAL COMO LO DEVUELVE la base (el
  // formato de PostgREST difiere del ISO enviado y la comparación es textual).
  if (personal) {
    const { data, error } = await sb.from('estado_cuenta')
      .upsert({ usuario_id: fila.id, estado: personal, updated_at: ahora })
      .select('updated_at').single()
    if (!error && data?.updated_at) ponerMarca(marcaCuenta(email), data.updated_at)
  }
  if (mundo) {
    const { data, error } = await sb.from('estado_mundo')
      .upsert({ id: 'mundo', estado: mundo, updated_at: ahora })
      .select('updated_at').single()
    if (!error && data?.updated_at) ponerMarca(MARCA_MUNDO, data.updated_at)
  }
}
