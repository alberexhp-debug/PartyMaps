// Verifica la migración 049 ("Pedidos" con mesas) contra Supabase real, incluida la
// sesión de mesa y el índice único de "una sesión abierta por mesa". Correr tras aplicar 049:
//   node scripts/verify-pedidos-mesas.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = (b) => b ? '🟢' : '🔴'
let verde = true
const check = (l, b, x = '') => { if (!b) verde = false; console.log(`${ok(b)} ${l}${x ? ' — ' + x : ''}`) }

// Esquema
const m = await db.from('mesas').select('id, qr_token').limit(1)
check('049 · mesas.qr_token', !m.error, m.error?.message)
const ses = await db.from('mesa_sesiones').select('id').limit(1)
check('049 · tabla mesa_sesiones', !ses.error, ses.error?.message)
const pb = await db.from('pedidos_bar').select('id, origen, mesa_sesion_id, priorizado_at').limit(1)
check('049 · pedidos_bar.origen/mesa_sesion_id/priorizado', !pb.error, pb.error?.message)
const loc = await db.from('locales').select('id, prioridad_zonas').limit(1).maybeSingle()
check('049 · locales.prioridad_zonas', !loc.error && !!loc.data?.prioridad_zonas, loc.error?.message)

// E2E: una mesa real → abrir sesión, la 2ª falla (uq), cerrar y limpiar.
const { data: mesa } = await db.from('mesas').select('id, local_id').limit(1).maybeSingle()
if (mesa) {
  const s1 = await db.from('mesa_sesiones').insert({ local_id: mesa.local_id, mesa_id: mesa.id, personas: 2 }).select('id').single()
  check('049 · abrir sesión de mesa', !s1.error, s1.error?.message)
  if (s1.data) {
    const s2 = await db.from('mesa_sesiones').insert({ local_id: mesa.local_id, mesa_id: mesa.id, personas: 3 }).select('id')
    check('049 · 2ª sesión abierta RECHAZADA (uq_mesa_sesion_abierta)', !!s2.error, s2.error ? '' : 'NO bloqueó la doble sesión')
    await db.from('mesa_sesiones').delete().eq('id', s1.data.id)
  }
} else {
  console.log('⚪ (sin mesas para el E2E; crea una en «Sala & Mesas» y reejecuta)')
}

console.log('\n' + (verde ? '✅ Pedidos/mesas (049): esquema + sesión + unicidad OK.' : '⚠️ Algo en rojo: aplica la migración 049 en el SQL editor de Supabase.'))
process.exit(verde ? 0 : 1)
