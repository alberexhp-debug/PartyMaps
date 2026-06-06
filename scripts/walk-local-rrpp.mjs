// Recorrido visual del panel LOCAL: alta de RRPP + reset, con capturas.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://party-maps-hojy.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })
const log = (...a) => console.log(...a)

const rnd = Date.now().toString().slice(-6)
const duenoEmail = `walkd${rnd}@example.com`, duenoPass = `Dueno${rnd}!`
const username = `walk${rnd}`
let localId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage()
page.on('dialog', d => d.accept().catch(() => {}))
const shot = n => page.screenshot({ path: `e2e-shots/${n}.png` }).catch(() => {})

try {
  // Dueño + local
  const reg = await fetch(`${BASE}/api/local-panel/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: duenoEmail, password: duenoPass, nombre_responsable: 'Dueño Demo', nombre_local: `Sala Demo ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 1', latitud: '40.4203', longitud: '-3.7058', aforo_maximo: '300' }) })
  localId = (await reg.json().catch(() => ({}))).local_id
  log('dueño+local:', reg.status)

  // Login
  await page.goto(`${BASE}/local-panel/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200)
  for (const re of [/aceptar/i, /esenciales/i]) { try { await page.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
  await page.locator('input[autocomplete="username"]').fill(duenoEmail)
  await page.locator('input[autocomplete="current-password"]').fill(duenoPass)
  await shot('LR-01-login')
  await page.getByRole('button', { name: 'Acceder al panel' }).click(); await page.waitForTimeout(3500)

  // Sección RRPP (vacía)
  await page.goto(`${BASE}/local-panel/rrpp`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2000)
  await shot('LR-02-rrpp-vacio'); log('RRPP section URL:', page.url())

  // Abrir alta → Crear nuevo
  await page.getByRole('button', { name: /Añadir RRPP/i }).click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Crear nuevo' }).click(); await page.waitForTimeout(400)
  await page.getByPlaceholder('Leo García').fill('Carla Promotora')
  await page.getByPlaceholder('leo.noches').fill(username)
  await page.getByPlaceholder('leo@example.com').fill('carla@example.com')
  await page.waitForTimeout(400); await shot('LR-03-form')

  // Crear → credenciales
  await page.getByRole('button', { name: /Dar de alta RRPP/i }).click(); await page.waitForTimeout(3000)
  await shot('LR-04-credenciales')
  const credText = (await page.locator('body').innerText()).split('\n').filter(l => /usuario|contrase|Acceso del RRPP|primer acceso/i.test(l)).slice(0, 6)
  log('Modal credenciales:', credText)

  // Cerrar (Hecho) → lista con el RRPP y sus botones de reset
  try { await page.getByRole('button', { name: 'Hecho' }).click() } catch {}
  await page.waitForTimeout(2500); await shot('LR-05-lista')
  const enLista = (await page.locator('body').innerText()).includes('Carla Promotora')
  log('RRPP en la lista:', enLista)
  const botones = await page.getByRole('button', { name: /Contraseña|Authenticator/ }).count()
  log('Botones de reset visibles:', botones)

  // Reset de contraseña → nuevas credenciales
  if (botones) {
    await page.getByRole('button', { name: /^Contraseña$/ }).first().click(); await page.waitForTimeout(2500)
    await shot('LR-06-reset-credenciales')
    const resetText = (await page.locator('body').innerText()).split('\n').filter(l => /Nueva contraseña|usuario|contrase/i.test(l)).slice(0, 5)
    log('Modal reset:', resetText)
  }
  log('OK recorrido')
} catch (e) { log('ERROR:', e.message); await shot('LR-error') }
finally {
  // Limpieza
  const { data: rr } = await svc.from('rrpp').select('id, usuario_id').eq('username', username).maybeSingle()
  if (rr) { await svc.from('rrpp').delete().eq('id', rr.id); if (rr.usuario_id) { const { data: u } = await svc.from('usuarios').select('auth_id').eq('id', rr.usuario_id).maybeSingle(); await svc.from('usuarios').delete().eq('id', rr.usuario_id); if (u?.auth_id) await svc.auth.admin.deleteUser(u.auth_id) } }
  if (localId) await svc.from('locales').delete().eq('id', localId)
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
  const du = list?.users?.find(x => x.email === duenoEmail); if (du) await svc.auth.admin.deleteUser(du.id)
  log('limpieza ok')
  await browser.close()
}
