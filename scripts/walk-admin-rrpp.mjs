// Recorrido visual del panel ADMIN: login 2FA → alta de RRPP → lista con
// botones de reset → reset de contraseña. Con capturas. Limpia al final.
import { chromium } from 'playwright'
import { generateSync } from 'otplib'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://torneum.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })
const log = (...a) => console.log(...a)

const ADMIN_EMAIL = 'superadmin@partymaps.com', ADMIN_PASS = 'PM_SuperAdmin2025!'
const rnd = Date.now().toString().slice(-6)
const nombre = `AdminWalk ${rnd}`, username = `admw${rnd}`

const browser = await chromium.launch({ headless: true })
const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 })).newPage()
page.on('dialog', d => d.accept().catch(() => {}))
const shot = n => page.screenshot({ path: `e2e-shots/${n}.png` }).catch(() => {})

try {
  // Login admin (2 pasos)
  await page.goto(`${BASE}/admin/login`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1200)
  for (const re of [/aceptar/i, /esenciales/i]) { try { await page.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
  await page.locator('input[type="email"]').fill(ADMIN_EMAIL)
  await page.locator('input[type="password"]').fill(ADMIN_PASS)
  await page.getByRole('button', { name: 'Continuar' }).click(); await page.waitForTimeout(2500)
  const code = generateSync({ secret: env.ADMIN_TOTP_SECRET })
  await page.getByPlaceholder('000000').fill(code)
  await page.getByRole('button', { name: /Verificar y entrar/i }).click(); await page.waitForTimeout(3500)
  log('URL tras login:', page.url())

  // Sección RRPP
  await page.goto(`${BASE}/admin/rrpp`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500)
  await shot('AD-01-lista-inicial')

  // Alta de RRPP (free agent)
  await page.getByRole('button', { name: /^Dar de alta$/ }).click(); await page.waitForTimeout(600)
  await page.getByPlaceholder('Leo García').fill(nombre)
  await page.getByPlaceholder('leo.noches').fill(username)
  await page.getByPlaceholder('leo@example.com').fill('admwalk@example.com')
  await page.waitForTimeout(300); await shot('AD-02-form')
  await page.getByRole('button', { name: /Dar de alta RRPP/i }).click(); await page.waitForTimeout(3000)
  await shot('AD-03-credenciales')
  log('credenciales:', (await page.locator('body').innerText()).split('\n').filter(l => /Acceso del RRPP|usuario|contrase/i.test(l)).slice(0, 4))
  try { await page.getByRole('button', { name: 'Hecho' }).click() } catch {}
  await page.waitForTimeout(2000)

  // Buscar el RRPP creado → ver botones de reset
  await page.getByPlaceholder('Buscar por slug, nombre o Instagram').fill(nombre)
  await page.waitForTimeout(2000); await shot('AD-04-lista')
  const botones = await page.getByTitle('Resetear contraseña').count()
  log('botones reset visibles:', botones)

  // Reset de contraseña
  if (botones) {
    await page.getByTitle('Resetear contraseña').first().click(); await page.waitForTimeout(2500)
    await shot('AD-05-reset')
    log('reset modal:', (await page.locator('body').innerText()).split('\n').filter(l => /Nueva contraseña|usuario|contrase/i.test(l)).slice(0, 4))
  }
  log('OK admin')
} catch (e) { log('ERROR:', e.message); await shot('AD-error') }
finally {
  const { data: rr } = await svc.from('rrpp').select('id, usuario_id').eq('username', username).maybeSingle()
  if (rr) { await svc.from('rrpp').delete().eq('id', rr.id); if (rr.usuario_id) { const { data: u } = await svc.from('usuarios').select('auth_id').eq('id', rr.usuario_id).maybeSingle(); await svc.from('usuarios').delete().eq('id', rr.usuario_id); if (u?.auth_id) await svc.auth.admin.deleteUser(u.auth_id) } }
  log('limpieza ok')
  await browser.close()
}
