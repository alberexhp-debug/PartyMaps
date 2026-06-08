// Verifica la migración 047 (consumiciones DENTRO del QR de la entrada) contra la
// Supabase real, incluido el canje ATÓMICO y la auditoría. Ejecutar TRAS aplicar 047:
//   node scripts/verify-consumiciones.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = (b) => b ? '🟢' : '🔴'
let verde = true
const check = (label, b, extra = '') => { if (!b) verde = false; console.log(`${ok(b)} ${label}${extra ? ' — ' + extra : ''}`) }

// Esquema
const ent = await db.from('entradas').select('id, consumiciones_incluidas, consumiciones_canjeadas, consumiciones_descripcion').limit(1)
check('047 · columnas de consumiciones en entradas', !ent.error, ent.error?.message)
const evt = await db.from('eventos').select('id, consumiciones_incluidas, consumiciones_descripcion').limit(1)
check('047 · columnas de consumiciones en eventos', !evt.error, evt.error?.message)
const canjes = await db.from('consumicion_canjes').select('id').limit(1)
check('047 · tabla consumicion_canjes', !canjes.error, canjes.error?.message)

// E2E atómico: entrada con 2 consumiciones → canjear 2 ok, la 3ª falla, auditoría = 2.
const { data: anyEnt } = await db.from('entradas').select('local_id').limit(1).maybeSingle()
if (!ent.error && anyEnt) {
  const ins = await db.from('entradas').insert({
    usuario_id: null, local_id: anyEnt.local_id, precio_local: 0, comision_plataforma: 0,
    precio_total: 0, qr_code: `PM2:verify-consum-${Date.now()}`, estado: 'activa',
    canal: 'taquilla', metodo_pago: 'efectivo',
    consumiciones_incluidas: 2, consumiciones_canjeadas: 0, consumiciones_descripcion: 'QA: cubata o refresco',
  }).select('id').single()
  check('047 · crear entrada con 2 consumiciones', !ins.error, ins.error?.message)

  if (ins.data) {
    const id = ins.data.id
    const c1 = (await db.rpc('canjear_consumicion', { p_entrada_id: id, p_trabajador: null })).data?.[0]
    check('canje 1 ok (quedan 1)', c1?.ok === true && c1?.canjeadas === 1)
    const c2 = (await db.rpc('canjear_consumicion', { p_entrada_id: id, p_trabajador: null })).data?.[0]
    check('canje 2 ok (quedan 0)', c2?.ok === true && c2?.canjeadas === 2)
    const c3 = (await db.rpc('canjear_consumicion', { p_entrada_id: id, p_trabajador: null })).data?.[0]
    check('canje 3 RECHAZADO (agotadas)', c3?.ok === false && c3?.motivo === 'agotadas')

    const aud = await db.from('consumicion_canjes').select('id', { count: 'exact', head: true }).eq('entrada_id', id)
    check('auditoría: 2 canjes registrados', aud.count === 2, `count=${aud.count}`)

    // El CHECK de rango impide poner canjeadas > incluidas a mano.
    const viol = await db.from('entradas').update({ consumiciones_canjeadas: 5 }).eq('id', id).select('id')
    check('CHECK chk_consumiciones_rango bloquea canjeadas>incluidas', !!viol.error, viol.error ? '' : 'NO bloqueó')

    await db.from('consumicion_canjes').delete().eq('entrada_id', id)
    await db.from('entradas').delete().eq('id', id)
  }
}

console.log('\n' + (verde ? '✅ Consumiciones (047): esquema + canje atómico + auditoría OK.' : '⚠️ Algo en rojo: aplica la migración 047 en el SQL editor de Supabase.'))
process.exit(verde ? 0 : 1)
