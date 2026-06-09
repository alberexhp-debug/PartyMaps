#!/usr/bin/env node
// Verifica la migración 053 (tanda de lanzamiento) contra Supabase real.
// Comprueba el schema nuevo: §1 mensajes_gestor, §2 usuario_local.permisos_override,
// §4 amistades / grupos_amigos / grupo_amigos_miembros. Solo lee schema (no escribe).
// Uso: node scripts/verify-053-tanda.mjs   (tras aplicar 053_tanda_lanzamiento.sql)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]
  })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !SERVICE) { console.error('Faltan vars en .env.local'); process.exit(1) }
const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })

let passed = 0, failed = 0
const ok = (m) => { passed++; console.log('  ✅', m) }
const fail = (m, e) => { failed++; console.log('  ❌', m, e ?? '') }

async function comprobar(tabla, columnas) {
  // OJO: NO usar { head: true } — enmascara los errores de tabla inexistente
  // (devuelve error vacío). Un select normal con limit 1 sí los surge.
  const { error } = await admin.from(tabla).select(columnas).limit(1)
  if (error) {
    if (error.code === 'PGRST205' || error.code === '42P01') return fail(`Falta la tabla ${tabla} (¿aplicaste la 053?)`, error.message)
    if (error.code === '42703') return fail(`Falta una columna en ${tabla} (${columnas})`, error.message)
    return fail(`Error consultando ${tabla}`, `${error.code} ${error.message}`)
  }
  ok(`${tabla} (${columnas})`)
}

console.log('\n› §1 · Chat local ↔ RumboGestor')
await comprobar('mensajes_gestor', 'id, local_id, gestor_id, emisor, mensaje, leido, created_at')
console.log('\n› §2 · Permisos por módulos del equipo')
await comprobar('usuario_local', 'permisos_override')
console.log('\n› §4 · Amigos y grupos del usuario')
await comprobar('amistades', 'id, solicitante_id, receptor_id, estado, created_at')
await comprobar('grupos_amigos', 'id, nombre, emoji, creador_id, created_at')
await comprobar('grupo_amigos_miembros', 'grupo_id, usuario_id, created_at')

console.log(`\n${failed === 0 ? '✅ Todo correcto' : '❌ Revisar'} — ${passed} OK, ${failed} fallos`)
console.log('ℹ️  El realtime (§1 mensajes_gestor, §3 ticket_mensajes) se ve en Supabase → Database → Replication.')
process.exit(failed === 0 ? 0 : 1)
