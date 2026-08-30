// Recorrido visual del panel GESTOR: login → alta de RRPP (cuenta+credenciales)
// → lista con botones de reset → reset. Prepara gestor + local. Limpia al final.
import { chromium } from 'playwright'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://torneum.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })
const log = (...a) => console.log(...a)

const rnd = Date.now().toString().slice(-6)
const gestorEmail = `walkg${rnd}@example.com`, gestorPass = `Gestor${rnd}!`
const username = `gesw${rnd}`
let gestorAuthId = null, gestorId = null, localId = null

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage()
page.on('dialog', d => d.accept().catch(() => {}))
page.on('response', async r => {
  if (r.url().includes('/api/gestor/rrpp') && r.request().method() === 'GET') {
    let b = ''; try { b = (await r.text()).slice(0, 220) } catch {}
    console.log('GET /api/gestor/rrpp →', r.status(), b)
  }
  if (r.url().includes('/api/gestor/rrpp/reset-password')) {
    let b = ''; try { b = (await r.text()).slice(0, 220) } catch {}
    console.log('POST reset-password →', r.status(), b)
  }
})
const shot = n => page.screenshot({ path: `e2e-shots/${n}.png` }).catch(() => {})

try {
  // Setup: gestor + local en su cartera
  const { data: gAuth, error: eg } = await svc.auth.admin.createUser({ email: gestorEmail, password: gestorPass, email_confirm: true })
  if (eg) { log('createUser gestor', eg.message); throw new Error('setup') }
  gestorAuthId = gAuth.user.id
  const { data: g } = await svc.from('gestores').insert({ auth_id: gestorAuthId, email: gestorEmail, nombre: 'Gestor Demo', incentivo_pct: 0, activo: true }).select('id').single()
  gestorId = g.id
  const { data: loc, error: el } = await svc.from('locales').insert({
    nombre: `Cartera Demo ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 2',
    latitud: 40.4203, longitud: -3.7058, aforo_maximo: 250, musica: [], imagenes: [], modulos_activos: [],
    consumiciones_bienvenida: [], estado: 'pendiente_verificacion', tier: 'basico', radio_verificacion_metros: 150,
    horario: {}, num_suscriptores: 0, notificaciones_semana_count: 0, gestor_id: gestorId,
  }).select('id').single()
  if (el) { log('insert local', el.message); throw new Error('setup') }
  localId = loc.id
  log('setup ok: gestor + local')

  // Login gestor
  await page.goto(`${BASE}/gestor/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200)
  for (const re of [/aceptar/i, /esenciales/i]) { try { await page.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
  await page.locator('input[type="email"]').fill(gestorEmail)
  await page.locator('input[type="password"]').fill(gestorPass)
  await page.getByRole('button', { name: /Entrar|Acceder/i }).first().click(); await page.waitForTimeout(3500)
  log('URL tras login:', page.url())

  // Sección RRPP
  await page.goto(`${BASE}/gestor/rrpp`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500)
  await shot('GE-01-rrpp')

  // Alta
  await page.getByRole('button', { name: /Dar de alta un RRPP/i }).click(); await page.waitForTimeout(600)
  await page.getByPlaceholder('Nombre público').fill('Bruno Promotor')
  await page.getByPlaceholder('leo.noches').fill(username)
  await page.getByPlaceholder('rrpp@email.com').fill('bruno@example.com')
  await page.waitForTimeout(300); await shot('GE-02-form')
  await page.getByRole('button', { name: /Crear RRPP/i }).click(); await page.waitForTimeout(3000)
  await shot('GE-03-credenciales')
  log('credenciales:', (await page.locator('body').innerText()).split('\n').filter(l => /Entrega|contrase|Copiar acceso/i.test(l)).slice(0, 3))
  try { await page.getByRole('button', { name: 'Hecho' }).click() } catch {}
  await page.waitForTimeout(1500)
  await page.getByText('Bruno Promotor').first().waitFor({ timeout: 12000 }).catch(() => {})
  await page.waitForTimeout(800); await shot('GE-04-lista')
  const botones = await page.getByTitle('Resetear contraseña').count()
  log('botones reset visibles:', botones)

  // Reset de contraseña
  if (botones) {
    await page.getByTitle('Resetear contraseña').first().click(); await page.waitForTimeout(4500)
    await shot('GE-05-reset')
    log('reset modal:', (await page.locator('body').innerText()).split('\n').filter(l => /Nueva contraseña|usuario|contrase/i.test(l)).slice(0, 4))
  }
  log('OK gestor')
} catch (e) { log('ERROR:', e.message); await shot('GE-error') }
finally {
  const { data: rr } = await svc.from('rrpp').select('id, usuario_id').eq('username', username).maybeSingle()
  if (rr) { await svc.from('rrpp').delete().eq('id', rr.id); if (rr.usuario_id) { const { data: u } = await svc.from('usuarios').select('auth_id').eq('id', rr.usuario_id).maybeSingle(); await svc.from('usuarios').delete().eq('id', rr.usuario_id); if (u?.auth_id) await svc.auth.admin.deleteUser(u.auth_id) } }
  if (localId) await svc.from('locales').delete().eq('id', localId)
  if (gestorId) await svc.from('gestores').delete().eq('id', gestorId)
  if (gestorAuthId) await svc.auth.admin.deleteUser(gestorAuthId)
  log('limpieza ok')
  await browser.close()
}
