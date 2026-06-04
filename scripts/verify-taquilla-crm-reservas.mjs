// Verifica las migraciones 032 (taquilla), 033 (clientes/CRM) y 034 (reservas VIP)
// contra la Supabase real. Ejecutar: node scripts/verify-taquilla-crm-reservas.mjs
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

// 032 — taquilla
const tq = await db.from('entradas').select('id, canal, metodo_pago, vendido_por, comprador_nombre').limit(1)
check('032 · columnas de taquilla en entradas', !tq.error, tq.error?.message)

// 033 — clientes
const cl = await db.from('cliente_local').select('id').limit(1)
check('033 · tabla cliente_local', !cl.error, cl.error?.message)
const { data: anyEnt } = await db.from('entradas').select('local_id').not('usuario_id', 'is', null).limit(1).maybeSingle()
if (anyEnt) {
  const rpc = await db.rpc('clientes_del_local', { p_local_id: anyEnt.local_id })
  check('033 · función clientes_del_local', !rpc.error, rpc.error?.message)
}

// 034 — reservas VIP
const rv = await db.from('reservas').select('id, minimo_consumo, deposito, deposito_pagado').limit(1)
check('034 · columnas VIP en reservas', !rv.error, rv.error?.message)

// E2E taquilla: vender 1 entrada anónima en puerta y limpiar
if (!tq.error && anyEnt) {
  const fila = {
    usuario_id: null, local_id: anyEnt.local_id, precio_local: 12, comision_plataforma: 0,
    precio_total: 12, qr_code: `PM2:verify-${Date.now()}`, estado: 'activa',
    canal: 'taquilla', metodo_pago: 'efectivo', comprador_nombre: 'Verify QA',
  }
  const ins = await db.from('entradas').insert(fila).select('id').single()
  check('032 · venta E2E en taquilla (insert anónimo)', !ins.error, ins.error?.message)
  if (ins.data) await db.from('entradas').delete().eq('id', ins.data.id)
}

console.log('\n' + (verde ? '✅ Todo verde: las 3 funciones están activas.' : '⚠️ Algo en rojo: aplica las migraciones 032/033/034 en el SQL editor de Supabase.'))
process.exit(verde ? 0 : 1)
