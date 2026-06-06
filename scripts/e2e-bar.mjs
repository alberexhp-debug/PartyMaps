// E2E del módulo Bar contra Vercel: usuario logueado crea un pedido de barra
// (el bug "No se pudo crear el pedido") y lo visualiza (QR). Usa fetch en el
// contexto de la página (sesión real por cookies). Crea y limpia un usuario.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://party-maps-hojy.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = m => console.log('  ✅', m), bad = m => console.log('  ❌', m)
const ts = Date.now().toString()
const email = `baruser${ts}@example.com`, pass = 'BarUser1234!'
let authId = null, usuarioId = null, pedidoId = null

const browser = await chromium.launch({ headless: true })
try {
  // 1. Usuario de prueba (auth + usuarios activa)
  const { data: created, error: e1 } = await svc.auth.admin.createUser({ email, password: pass, email_confirm: true })
  if (e1) { bad('createUser ' + e1.message); throw new Error('createUser') }
  authId = created.user.id
  const { data: usuario, error: e2 } = await svc.from('usuarios').insert({
    auth_id: authId, nombre: 'Bar Tester', fecha_nacimiento: '1995-05-05', telefono: '+34699' + ts.slice(-6), estado_cuenta: 'activa',
  }).select('id').single()
  if (e2) { bad('insert usuarios: ' + e2.message); throw new Error('usuarios') }
  usuarioId = usuario.id; ok('usuario de prueba creado')

  // 2. Local Club Test + producto disponible
  const { data: local } = await svc.from('locales').select('id, nombre').ilike('nombre', '%Club Test%').maybeSingle()
  const { data: prod } = await svc.from('productos_local').select('id, nombre, precio').eq('local_id', local.id).eq('disponible', true).limit(1).maybeSingle()
  if (!local || !prod) { bad('falta local/producto'); throw new Error('datos') }
  ok(`local "${local.nombre}", producto "${prod.nombre}" (${prod.precio}€)`)

  // 3. Login por correo
  const ctx = await browser.newContext({ viewport: { width: 420, height: 880 } })
  const page = await ctx.newPage()
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1500)
  for (const re of [/aceptar/i, /esenciales/i]) { try { await page.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
  await page.locator('input[autocomplete="email"]').fill(email)
  await page.locator('input[autocomplete="current-password"]').fill(pass)
  await page.getByRole('button', { name: 'Entrar' }).click()
  await page.waitForTimeout(4000)
  console.log('   URL tras login:', page.url())

  // 4. Crear pedido (lo que daba "No se pudo crear el pedido")
  const createRes = await page.evaluate(async ({ localId, prodId }) => {
    const r = await fetch('/api/pedidos-bar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ local_id: localId, items: [{ producto_id: prodId, cantidad: 2 }] }) })
    return { status: r.status, body: await r.json().catch(() => null) }
  }, { localId: local.id, prodId: prod.id })
  if (createRes.status === 200 && createRes.body?.pedido?.id) {
    pedidoId = createRes.body.pedido.id
    ok(`POST /api/pedidos-bar → 200, QR ${createRes.body.pedido.qr_code}`)
  } else {
    bad(`POST /api/pedidos-bar → ${createRes.status}: ${JSON.stringify(createRes.body)}`)
  }

  // 5. Ver el pedido (página del QR usa este endpoint)
  if (pedidoId) {
    const dispRes = await page.evaluate(async (pid) => {
      const r = await fetch('/api/pedidos-bar/' + pid)
      return { status: r.status, body: await r.json().catch(() => null) }
    }, pedidoId)
    const p = dispRes.body?.pedido
    if (dispRes.status === 200 && p?.qr_code?.startsWith('PMB:') && (p.pedido_items?.length === 1)) {
      ok(`GET /api/pedidos-bar/[id] → 200, estado=${p.estado}, items=${p.pedido_items.length}, total=${p.precio_total}€`)
    } else {
      bad(`GET /api/pedidos-bar/[id] → ${dispRes.status}: ${JSON.stringify(dispRes.body)}`)
    }
  }
  await ctx.close()
} catch (e) { console.log('ERROR e2e:', e.message) }
finally {
  if (pedidoId) await svc.from('pedidos_bar').delete().eq('id', pedidoId).then(() => {}, () => {})
  if (usuarioId) await svc.from('usuarios').delete().eq('id', usuarioId).then(() => {}, () => {})
  if (authId) await svc.auth.admin.deleteUser(authId).catch(() => {})
  console.log('  limpieza ok')
  await browser.close()
}
