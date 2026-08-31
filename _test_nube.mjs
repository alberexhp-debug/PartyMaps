// FASE A.5 (31-08): «lo que hago me sigue» — con cuenta REAL, el estado de la
// demo (personal + mundo) se sincroniza con Supabase. Reproduce la queja de
// Albert: entrar desde un navegador VIRGEN (incógnito) debe recuperar tus
// torneos y chats. OJO: sobreescribe estado_mundo de la nube (fase puente);
// limpia al terminar. Necesita ~/.config/torneum/supabase.env (si no, SKIP).
//   BASE_URL=http://localhost:3006 node _test_nube.mjs
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
const admin = (ruta, init = {}) => fetch(`${SB}${ruta}`, { ...init, headers: { apikey: SK, Authorization: `Bearer ${SK}`, 'Content-Type': 'application/json', Prefer: 'return=representation', ...(init.headers ?? {}) } })

const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()
let fallos = 0
const ok = (c, m) => { if (c) console.log(`  ✓ ${m}`); else { fallos++; console.log(`  ✗ FALLO: ${m}`) } }

const TS = Date.now().toString(36)
const EMAIL = `e2e-nube-${TS}@torneum.test`
const PASS = 'PruebaNube123!'
const alta = await (await admin('/auth/v1/admin/users', { method: 'POST', body: JSON.stringify({ email: EMAIL, password: PASS, email_confirm: true, user_metadata: { nombre: 'Nube E2E' } }) })).json()
ok(!!alta.id, `alta admin (${EMAIL})`)

async function loginReal(page) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', EMAIL)
  await page.fill('input[type="password"]', PASS)
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForURL('**/explorar**', { timeout: 15000 }).catch(() => {})
  const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
  if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(600) }
}
const init = (page) => page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})

// ── Navegador 1: la cuenta real se inscribe a t1 y escribe en el chat de sala
console.log('— navegador 1: inscripción + chat')
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await init(page)
await loginReal(page)
// t11: torneo FUTURO abierto (t1 está en directo; t6 pide tier Platino)
await page.goto(`${BASE}/torneo/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
const nombreT = (await page.locator('h1').first().textContent())?.trim() ?? ''
await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, `inscrito a «${nombreT}» con la cuenta real`)
await page.goto(`${BASE}/live/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByRole('button', { name: /Chat de la sala|^Chat$/ }).first().click(); await page.waitForTimeout(700)
await page.getByPlaceholder(/Escribe al torneo/i).fill('Mensaje desde la nube ☁️')
await page.keyboard.press('Enter'); await page.waitForTimeout(600)
ok(await page.getByText('Mensaje desde la nube ☁️').count() > 0, 'mensaje enviado al chat del torneo')
await page.waitForTimeout(5000)   // debounce del push (2 s) + escritura
await ctx.close()

// ── La nube tiene ambos blobs (los de ESTE usuario; puede haber residuos)
const filaU = await (await admin(`/rest/v1/usuarios?auth_id=eq.${alta.id}&select=id`)).json()
const ec = await (await admin(`/rest/v1/estado_cuenta?usuario_id=eq.${filaU[0]?.id}&select=usuario_id`)).json()
const em = await (await admin('/rest/v1/estado_mundo?select=id')).json()
ok(ec.length === 1, 'estado_cuenta guardado en la nube')
ok(em.length === 1, 'estado_mundo guardado en la nube')

// ── Navegador 2 (INCÓGNITO): todo vuelve
console.log('— navegador 2 (virgen): lo tuyo te sigue')
const ctx2 = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const p2 = await ctx2.newPage()
await init(p2)
await loginReal(p2)
await p2.waitForTimeout(2500)   // pull + rehydrate
await p2.goto(`${BASE}/entradas`, { waitUntil: 'networkidle' }); await p2.waitForTimeout(2000)
ok(nombreT.length > 3 && await p2.getByText(nombreT).count() > 0, `la INSCRIPCIÓN a «${nombreT}» aparece en el navegador virgen`)
await p2.goto(`${BASE}/live/t11`, { waitUntil: 'networkidle' }); await p2.waitForTimeout(1500)
await p2.getByRole('button', { name: /Chat de la sala|^Chat$/ }).first().click(); await p2.waitForTimeout(700)
ok(await p2.getByText('Mensaje desde la nube ☁️').count() > 0, 'y el CHAT también (mundo sincronizado)')
await ctx2.close()

// ── Limpieza: TODOS los usuarios e2e/dbg (residuos de runs anteriores incl.)
const lista = await (await admin('/auth/v1/admin/users?per_page=100')).json()
for (const u of (lista.users ?? [])) {
  if (/^(e2e-|dbg)/.test(u.email ?? '')) await admin(`/auth/v1/admin/users/${u.id}`, { method: 'DELETE' })
}
await admin(`/rest/v1/estado_mundo?id=eq.mundo`, { method: 'DELETE' })
const quedan = await (await admin('/rest/v1/estado_cuenta?select=usuario_id')).json()
ok(quedan.length === 0 && (await (await admin('/rest/v1/estado_mundo?select=id')).json()).length === 0, 'limpieza de la nube completa')

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
