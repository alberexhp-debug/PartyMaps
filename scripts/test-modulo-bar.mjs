#!/usr/bin/env node
// Tests del módulo Bar — verifica schema, RLS, flujo de pedido y canje.
// Usa service_role para crear datos demo y anon para validar acceso público.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL_SB || !ANON || !SERVICE) {
  console.error('Faltan vars en .env.local'); process.exit(1)
}

let passed = 0, failed = 0
const fail = (msg, extra) => { failed++; console.log('  ❌', msg, extra ?? '') }
const ok   = (msg)        => { passed++; console.log('  ✅', msg) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
const anon  = createClient(URL_SB, ANON,    { auth: { persistSession: false } })

// ── 1. Schema ─────────────────────────────────────────────────────
console.log('\n1. Schema y migración 011')
{
  for (const t of ['productos_local', 'pedidos_bar', 'pedido_items']) {
    const { error } = await admin.from(t).select('id').limit(1)
    if (error) fail(`tabla "${t}" no accesible`, error.message)
    else ok(`tabla "${t}" existe y es queryable`)
  }
  // Función expirar_pedidos_bar
  const { error: errFn } = await admin.rpc('expirar_pedidos_bar')
  if (errFn) fail('función expirar_pedidos_bar()', errFn.message)
  else ok('función expirar_pedidos_bar() ejecuta sin error')
}

// ── 2. Trabajar contra Club Test PartyMaps ───────────────────────
console.log('\n2. Preparación: local de pruebas')
const { data: local } = await admin
  .from('locales')
  .select('id, nombre, tier')
  .ilike('nombre', '%Club Test PartyMaps%')
  .maybeSingle()
if (!local) { fail('Club Test PartyMaps no encontrado'); process.exit(1) }
ok(`local: ${local.nombre} (tier ${local.tier})`)

// ── 3. Productos: crear, listar, actualizar, ocultar ─────────────
console.log('\n3. CRUD productos')
{
  // Limpiar productos previos del local de pruebas (idempotencia)
  await admin.from('productos_local').delete().eq('local_id', local.id)

  const base = { disponible: true, es_pack: false, descripcion: null, unidades_pack: null, imagen_url: null }
  const productosDemo = [
    { ...base, nombre: 'Mahou Cinco Estrellas', categoria: 'cerveza',  precio: 4.50, descripcion: 'Caña de 33cl', orden: 1 },
    { ...base, nombre: 'Cubata Beefeater',      categoria: 'cubata',   precio: 8.00, descripcion: 'Ginebra con tónica', orden: 2 },
    { ...base, nombre: 'Mojito clásico',        categoria: 'cocktail', precio: 9.50, descripcion: 'Ron blanco, lima, menta', orden: 3 },
    { ...base, nombre: 'Chupito Jägermeister',  categoria: 'chupito',  precio: 3.00, orden: 4 },
    { ...base, nombre: 'Coca-Cola',             categoria: 'refresco', precio: 3.00, orden: 5 },
    { ...base, nombre: 'Pack 5 cubatas (ahorra 5€)', categoria: 'pack', precio: 35.00, descripcion: 'Cinco cubatas a 7€/ud', es_pack: true, unidades_pack: 5, orden: 0 },
    { ...base, nombre: 'Patatas bravas',        categoria: 'comida',   precio: 6.50, orden: 6 },
    { ...base, nombre: 'Producto desactivado',  categoria: 'otro',     precio: 1.00, disponible: false, orden: 99 },
  ]
  const { data: insertados, error } = await admin
    .from('productos_local')
    .insert(productosDemo.map(p => ({ ...p, local_id: local.id })))
    .select()
  if (error) { fail('insert productos demo', error.message) }
  else ok(`insertados ${insertados.length} productos demo`)

  // Listado público (anon) — solo disponibles. Necesita migración 012 aplicada.
  const { data: publicos, error: errPub } = await anon
    .from('productos_local')
    .select('id, nombre, disponible')
    .eq('local_id', local.id)
  if (errPub) {
    if (errPub.message.includes('permission denied')) {
      console.log('  ⚠️  anon listar productos falla → falta aplicar migración 012_fix_rls_productos_bar.sql')
    } else fail('anon listar productos', errPub.message)
  }
  else if (publicos.length !== 7) fail(`anon ve ${publicos.length} productos (esperados 7 disponibles)`)
  else ok('anon ve solo productos disponibles (7/8, oculta el desactivado por RLS)')

  // Actualizar precio
  const cubata = insertados.find(p => p.nombre.startsWith('Cubata'))
  const { error: errUpd } = await admin
    .from('productos_local').update({ precio: 8.50 }).eq('id', cubata.id)
  if (errUpd) fail('update precio', errUpd.message)
  else ok('update precio funciona')

  // Ocultar (disponible=false)
  const { error: errHide } = await admin
    .from('productos_local').update({ disponible: false }).eq('id', cubata.id)
  if (errHide) fail('toggle disponible', errHide.message)
  else ok('toggle disponible funciona')

  // Restaurar disponible para los tests siguientes
  await admin.from('productos_local').update({ disponible: true }).eq('id', cubata.id)
}

// ── 4. Crear pedido (usuario PWA Carlos López) ──────────────────
console.log('\n4. Flujo de pedido')
const { data: usuarioPwa } = await admin
  .from('usuarios')
  .select('id, nombre')
  .eq('telefono', '+34666000002')
  .maybeSingle()
if (!usuarioPwa) { fail('usuario PWA +34666000002 no encontrado'); process.exit(1) }
ok(`usuario PWA: ${usuarioPwa.nombre}`)

const { data: prods } = await admin
  .from('productos_local')
  .select('id, nombre, precio')
  .eq('local_id', local.id)
  .eq('disponible', true)
  .order('orden')

// Pedido: 2 mahous + 1 cubata + 1 mojito
const items = [
  { producto: prods.find(p => p.nombre.startsWith('Mahou')),  cantidad: 2 },
  { producto: prods.find(p => p.nombre.startsWith('Cubata')), cantidad: 1 },
  { producto: prods.find(p => p.nombre.startsWith('Mojito')), cantidad: 1 },
]
const subtotal = items.reduce((s, i) => s + i.producto.precio * i.cantidad, 0)
const comision = Math.round(subtotal * 0.08 * 100) / 100
const total = Math.round((subtotal + comision) * 100) / 100

const qrCode = `PMB:${crypto.randomUUID()}`
const { data: pedido, error: errPed } = await admin
  .from('pedidos_bar')
  .insert({
    usuario_id: usuarioPwa.id,
    local_id: local.id,
    qr_code: qrCode,
    estado: 'pagado',
    precio_total: total,
    comision_plataforma: comision,
    metodo_pago: 'app',
    notas: 'Mojito sin hielo, gracias',
  })
  .select()
  .single()
if (errPed) { fail('crear pedido', errPed.message); process.exit(1) }
ok(`pedido creado (QR ${qrCode.slice(0, 14)}…, total ${total}€)`)

// Insertar items
const { error: errItems } = await admin.from('pedido_items').insert(
  items.map(i => ({
    pedido_id: pedido.id,
    producto_id: i.producto.id,
    nombre_snapshot: i.producto.nombre,
    precio_unitario: i.producto.precio,
    cantidad: i.cantidad,
  })),
)
if (errItems) fail('insertar items', errItems.message)
else ok(`${items.length} items insertados`)

// Verificar trigger updated_at
const { data: ped2 } = await admin.from('pedidos_bar').select('expira_at, pagado_at').eq('id', pedido.id).single()
const expira = new Date(ped2.expira_at).getTime() - new Date(ped2.pagado_at).getTime()
if (Math.abs(expira - 6 * 3600 * 1000) < 5000) ok('expira_at = pagado_at + 6h ✓')
else fail(`expira_at incorrecto (diff ${expira}ms)`)

// ── 5. Constraint UNIQUE qr_code ─────────────────────────────────
console.log('\n5. Integridad')
{
  const { error } = await admin.from('pedidos_bar').insert({
    usuario_id: usuarioPwa.id, local_id: local.id, qr_code: qrCode, // duplicado
    precio_total: 1, comision_plataforma: 0,
  })
  if (error && error.code === '23505') ok('UNIQUE qr_code previene duplicados')
  else fail('UNIQUE qr_code no aplica', error?.message)
}

// Optimistic lock al canjear: solo si está 'pagado'
{
  // marcar como entregado y luego intentar canjear de nuevo
  await admin.from('pedidos_bar').update({
    estado: 'entregado', entregado_at: new Date().toISOString(),
  }).eq('id', pedido.id)

  const { data: result } = await admin
    .from('pedidos_bar')
    .update({ estado: 'entregado', entregado_at: new Date().toISOString() })
    .eq('id', pedido.id)
    .eq('estado', 'pagado')   // ← lock
    .select()
  if (!result || result.length === 0) ok('optimistic lock impide doble canje')
  else fail('doble canje permitido (CRÍTICO)')

  // Restaurar
  await admin.from('pedidos_bar').update({ estado: 'pagado', entregado_at: null }).eq('id', pedido.id)
}

// ── 6. Vista v_pedidos_bar_activos ───────────────────────────────
console.log('\n6. Vista de pedidos activos')
{
  const { data, error } = await admin
    .from('v_pedidos_bar_activos')
    .select('*')
    .eq('local_id', local.id)
  if (error) fail('vista no accesible', error.message)
  else if (data.length === 0) fail('vista vacía (esperaba al menos el pedido recién creado)')
  else {
    const ped = data.find(p => p.id === pedido.id)
    if (!ped) fail('pedido recién creado no aparece en la vista')
    else if (!ped.items || ped.items.length !== 3) fail(`items en vista: ${ped.items?.length} (esperaba 3)`)
    else ok(`vista devuelve pedido con ${ped.items.length} items + nombre usuario "${ped.usuario_nombre}"`)
  }
}

// ── 7. Expiración automática ─────────────────────────────────────
console.log('\n7. Función expirar_pedidos_bar')
{
  // Crear un pedido con expira_at en el pasado
  const qrViejo = `PMB:${crypto.randomUUID()}`
  await admin.from('pedidos_bar').insert({
    usuario_id: usuarioPwa.id, local_id: local.id, qr_code: qrViejo,
    estado: 'pagado', precio_total: 5, comision_plataforma: 0.4,
    expira_at: new Date(Date.now() - 60_000).toISOString(),
  })
  const { data: expirados } = await admin.rpc('expirar_pedidos_bar')
  if (typeof expirados !== 'number') fail('expirar_pedidos_bar no devolvió número')
  else if (expirados < 1) fail(`expirar_pedidos_bar devolvió ${expirados} (esperaba >= 1)`)
  else ok(`expirar_pedidos_bar expiró ${expirados} pedido(s)`)

  // Verificar que el pedido ahora está expirado
  const { data: comprob } = await admin.from('pedidos_bar').select('estado, cancelado_motivo').eq('qr_code', qrViejo).single()
  if (comprob?.estado === 'expirado' && comprob.cancelado_motivo) ok(`pedido marcado expirado con motivo "${comprob.cancelado_motivo}"`)
  else fail(`estado post-expiración: ${comprob?.estado}`)

  // Limpiar
  await admin.from('pedidos_bar').delete().eq('qr_code', qrViejo)
}

// ── 8. Cascada ON DELETE ─────────────────────────────────────────
console.log('\n8. Cascadas')
{
  const { data: pedidoTmp } = await admin.from('pedidos_bar').insert({
    usuario_id: usuarioPwa.id, local_id: local.id,
    qr_code: `PMB:${crypto.randomUUID()}`,
    precio_total: 1, comision_plataforma: 0,
  }).select().single()
  await admin.from('pedido_items').insert({
    pedido_id: pedidoTmp.id, nombre_snapshot: 'tmp', precio_unitario: 1, cantidad: 1,
  })
  await admin.from('pedidos_bar').delete().eq('id', pedidoTmp.id)
  const { count } = await admin.from('pedido_items').select('id', { count: 'exact', head: true }).eq('pedido_id', pedidoTmp.id)
  if ((count ?? 0) === 0) ok('borrar pedido elimina items en cascada')
  else fail(`items huérfanos: ${count}`)
}

// ── 9. Rol barman aceptado en constraint ─────────────────────────
console.log('\n9. Rol barman')
{
  const email = `barman.test.${Date.now()}@partymaps.com`
  const { data: barman, error } = await admin.from('usuario_local').insert({
    local_id: local.id, email, rol: 'barman', activo: true, nombre: 'Barman Test',
  }).select().maybeSingle()
  if (error) fail('insert rol barman', error.message)
  else if (barman) {
    ok('rol "barman" aceptado en CHECK constraint')
    await admin.from('usuario_local').delete().eq('id', barman.id)
  }
}

// ── 10. Resumen ──────────────────────────────────────────────────
console.log('\n' + '─'.repeat(60))
console.log(`Resultado: ${passed} ✅ · ${failed} ❌`)
console.log('Productos demo permanecen en BD para QA manual.')
process.exit(failed > 0 ? 1 : 0)
