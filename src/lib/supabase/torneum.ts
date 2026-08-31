import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// ─────────────────────────────────────────────────────────────────────────────
// Cliente del Supabase NUEVO de Torneum (fase A del backend real, 31-08-2026).
// Esquema: src/lib/supabase/schema_torneum.sql (26 tablas, RLS completo).
//
// Singleton perezoso: si faltan las variables de entorno (p. ej. un clon de la
// demo sin backend), devuelve null y la app sigue funcionando 100% en modo
// demo — todo el código que lo use debe tolerar el null.
// No confundir con client.ts/server.ts: esos son del proyecto MUERTO de Rumbo
// y solo los referencian las zonas legacy capadas.
// ─────────────────────────────────────────────────────────────────────────────

let cliente: SupabaseClient | null | undefined

export function supabaseTorneum(): SupabaseClient | null {
  if (cliente !== undefined) return cliente
  const url = process.env.NEXT_PUBLIC_TORNEUM_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_TORNEUM_SUPABASE_KEY
  cliente = url && key ? createClient(url, key) : null
  return cliente
}
