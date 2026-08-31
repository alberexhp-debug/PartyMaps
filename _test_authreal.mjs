// Cuentas REALES (fase A backend, 31-08): registro/login contra Supabase Auth,
// alta automática en usuarios (trigger + tag #XABCD), arranque VACÍO (fresca)
// y perfil sincronizado (push con debounce + pull al entrar).
// Necesita ~/.config/torneum/supabase.env (solo local); sin él, se salta.
//   BASE_URL=http://localhost:3006 node _test_authreal.mjs
import { chromium } from 'playwright'
import { readFileSync, existsSync } from 'fs'
import os from 'os'

const CFG = os.homedir() + '/.config/torneum/supabase.env'
if (!existsSync(CFG)) { console.log('SKIP: sin credenciales locales de Supabase'); process.exit(0) }
const env = Object.fromEntries(readFileSync(CFG, 'utf8').split('\n')
  .filter(l => l.includes('=') && !l.startsWith('#'))
  .map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).replace(/^'|'$/g, '')] }))
const SB = env.SUPABASE_URL
const SK = env.SUPABASE_SECRET_KEY
const admin = (ruta, init = {}) => fetch(`${SB}${ruta}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) } })

const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()
let fallos = 0
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { fallos++; console.log(`  ✗ FALLO: ${m}`) } }

// ── Usuario real confirmado, creado por la vía admin
const TS = Date.now().toString(36)
const EMAIL = `e2e-real-${TS}@torneum.test`
const PASS = 'PruebaReal123!'
const alta = await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true, user_metadata: { nombre: 'Real E2E' } }) })
const usuario = await alta.json()
ok(!!usuario.id, `alta admin del usuario de prueba (${EMAIL})`)
const fila = await (await admin(`/rest/v1/usuarios?auth_id=eq.${usuario.id}&select=nombre,tag`)).json()
ok(fila[0]?.nombre === 'Real E2E', 'el trigger crea su fila en usuarios con su nombre')
ok(/^[1-9][A-Z]{4}$/.test(fila[0]?.tag ?? ''), `y un tag válido (#${fila[0]?.tag})`)

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})

// ── Login REAL por la UI (mismo formulario que la demo)
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[type="email"]', EMAIL)
await page.fill('input[type="password"]', PASS)
await page.getByRole('button', { name: /^Entrar$/ }).click()
await page.waitForURL('**/explorar**', { timeout: 15000 }).catch(() => {})
ok(page.url().includes('/explorar'), `entra con la cuenta real (${page.url()})`)
const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(600) }

// ── Arranque VACÍO + tag del servidor en el perfil
await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2500)
ok(await page.getByText('Real E2E').count() > 0, 'el perfil enseña su nombre real')
ok(await page.getByText(`#${fila[0].tag}`).count() > 0, 'y el TAG generado por el servidor (pull)')

// ── Push: editar la bio → debounce → la fila de usuarios se actualiza
await page.getByRole('button', { name: /Editar perfil/i }).first().click(); await page.waitForTimeout(800)
await page.locator('textarea').fill('Sincronizado desde el e2e')
await page.getByRole('button', { name: /^Guardar$/ }).click(); await page.waitForTimeout(3500)
const tras = await (await admin(`/rest/v1/usuarios?auth_id=eq.${usuario.id}&select=bio`)).json()
ok(tras[0]?.bio === 'Sincronizado desde el e2e', `la bio editada llega a la base («${tras[0]?.bio}»)`)

// ── Pull en un dispositivo nuevo: contexto limpio, mismo login → misma bio
await ctx.close()
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const p2 = await ctx2.newPage()
await p2.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})
await p2.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await p2.fill('input[type="email"]', EMAIL)
await p2.fill('input[type="password"]', PASS)
await p2.getByRole('button', { name: /^Entrar$/ }).click()
await p2.waitForURL('**/explorar**', { timeout: 15000 }).catch(() => {})
const saltar2 = p2.getByRole('button', { name: /Saltar por ahora/ })
if (await saltar2.count() > 0) { await saltar2.first().click(); await p2.waitForTimeout(600) }
await p2.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await p2.waitForTimeout(2500)
ok(await p2.getByText('Sincronizado desde el e2e').count() > 0, 'OTRO dispositivo recupera el perfil (pull)')

// ── Registro por la UI («Crear cuenta»): dentro directo o aviso de correo
const EMAIL2 = `e2e-alta-${TS}@torneum.test`
await p2.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await p2.waitForTimeout(600)
await p2.getByRole('button', { name: /Cerrar sesión/i }).first().click().catch(() => {})
await p2.waitForURL('**/login**', { timeout: 8000 }).catch(() => p2.goto(`${BASE}/login`))
await p2.getByRole('button', { name: /Crea tu cuenta/i }).click(); await p2.waitForTimeout(400)
await p2.getByPlaceholder(/conocerán en los torneos/i).fill('Alta E2E')
await p2.fill('input[type="email"]', EMAIL2)
await p2.fill('input[type="password"]', PASS)
await p2.getByRole('button', { name: /^Crear cuenta$/ }).click(); await p2.waitForTimeout(4000)
// El registro por UI depende del servicio de CORREO de Supabase (confirmación
// activada + límite de envío del plan): se acepta cualquier RESPUESTA visible
// — dentro, aviso de correo, o el error traducido (correo inválido/límite).
const dentro = p2.url().includes('/explorar') || p2.url().includes('/bienvenida')
const avisoCorreo = await p2.getByText(/revisa tu correo/i).count() > 0
const errorVisible = await p2.getByText(/no parece válido|Demasiados intentos|ya tiene cuenta/i).count() > 0
ok(dentro || avisoCorreo || errorVisible, `crear cuenta responde (${dentro ? 'dentro' : avisoCorreo ? 'confirmación por correo' : 'error legible del servidor'})`)

// ── Limpieza: fuera los usuarios de prueba (la fila de usuarios cae en cascada)
for (const em of [EMAIL, EMAIL2]) {
  const lista = await (await admin(`/auth/v1/admin/users?page=1&per_page=100`)).json()
  const u = (lista.users ?? []).find(x => x.email === em)
  if (u) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
}
const quedan = await (await admin(`/rest/v1/usuarios?email=like.e2e-*&select=id`)).json()
ok(Array.isArray(quedan) && quedan.length === 0, 'limpieza: sin usuarios de prueba en la base')

await ctx2.close()
await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
