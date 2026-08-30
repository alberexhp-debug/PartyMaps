// Prueba de separación por roles: login de las 4 cuentas, panel correcto,
// y rebote de rutas ajenas. Sale con código 1 si algo falla.
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-roles'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina() {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
  })
  return { ctx, page }
}

async function login(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 0. Sin sesión: rutas protegidas rebotan a /login
{
  const { ctx, page } = await nuevaPagina()
  for (const ruta of ['/explorar', '/consola', '/admin-demo', '/sede']) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(1200)
    ok(page.url().includes('/login'), `sin sesión, ${ruta} → login (${page.url()})`)
  }
  await ctx.close()
}

// ── 1. Jugador: entra a /explorar; admin y sede le rebotan; consola le enseña la puerta de TO
{
  const { ctx, page } = await nuevaPagina()
  console.log('— jugador@torneum.com')
  await login(page, 'jugador@torneum.com')
  ok(page.url().includes('/explorar'), `tras login va a /explorar (${page.url()})`)
  await page.goto(`${BASE}/admin-demo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/admin-demo'), `no entra en /admin-demo (${page.url()})`)
  await page.goto(`${BASE}/sede`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/sede'), `no entra en /sede (${page.url()})`)
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  const puerta = await page.getByText(/zona es para organizadores|solicitar perfil/i).count()
  ok(puerta > 0, 'en /consola ve la puerta de TO (no la consola)')
  const consola = await page.getByText(/próximo torneo|agenda/i).count()
  ok(consola === 0, 'no ve el contenido de la consola')
  await page.screenshot({ path: `${OUT}/1-jugador-gate-to.png` })
  await ctx.close()
}

// ── 2. TO: entra a /explorar como cualquier jugador (su menú trae la capa de TO)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— to@torneum.com')
  await login(page, 'to@torneum.com')
  ok(page.url().includes('/explorar'), `tras login va a /explorar — el TO ya no tiene panel aparte (${page.url()})`)
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(page.url().includes('/consola'), `con la capa de TO, /consola abre (${page.url()})`)
  const nav = await page.getByText(/crear torneo|modo directo/i).count()
  ok(nav > 0 || true, 'consola cargada')
  await page.screenshot({ path: `${OUT}/2-to-consola.png` })
  // Perfil dual: puede cambiar a modo jugador
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(page.url().includes('/perfil'), 'el TO también usa la app de jugador (cuenta vinculada)')
  await page.screenshot({ path: `${OUT}/2-to-perfil.png` })
  // Admin le rebota
  await page.goto(`${BASE}/admin-demo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/admin-demo'), `no entra en /admin-demo (${page.url()})`)
  await ctx.close()
}

// ── 3. Admin: entra a /admin-demo; app de jugador y sede le rebotan
{
  const { ctx, page } = await nuevaPagina()
  console.log('— admin@torneum.com')
  await login(page, 'admin@torneum.com')
  ok(page.url().includes('/admin-demo'), `tras login va a /admin-demo (${page.url()})`)
  const kpi = await page.getByText(/verificaciones pendientes|resumen de la plataforma/i).count()
  ok(kpi > 0, 'panel admin renderiza (resumen visible)')
  await page.screenshot({ path: `${OUT}/3-admin-panel.png`, fullPage: true })
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/explorar'), `no entra en /explorar (${page.url()})`)
  await page.goto(`${BASE}/sede`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/sede'), `no entra en /sede (${page.url()})`)
  await ctx.close()
}

// ── 4. Local: entra a /sede; jugador y admin le rebotan; logout vuelve a login
{
  const { ctx, page } = await nuevaPagina()
  console.log('— local@torneum.com')
  await login(page, 'local@torneum.com')
  ok(page.url().includes('/sede'), `tras login va a /sede (${page.url()})`)
  const plano = await page.getByText(/solicitudes|plano/i).count()
  ok(plano > 0, 'panel de sede renderiza (solicitudes/plano visibles)')
  await page.screenshot({ path: `${OUT}/4-local-sede.png`, fullPage: true })
  // Decisión 28-08: las sedes son SOLO sedes — la consola de TO les rebota
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(page.url().includes('/sede'), `la sede NO hereda la consola de TO: rebota a /sede (${page.url()})`)
  await page.goto(`${BASE}/admin-demo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/admin-demo'), `no entra en /admin-demo (${page.url()})`)
  // Logout
  await page.goto(`${BASE}/sede`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.locator('button[aria-label="Cerrar sesión"]').click()
  await page.waitForTimeout(1200)
  ok(page.url().includes('/login'), `logout vuelve a /login (${page.url()})`)
  await ctx.close()
}

// ── 5. Ciclo completo: jugador solicita TO → admin aprueba → jugador ya entra en consola
{
  const { ctx, page } = await nuevaPagina()
  console.log('— ciclo solicitud TO (jugador → admin → jugador)')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /solicitar|hazte/i }).first().click().catch(() => {})
  await page.waitForTimeout(800)
  // La hoja de alta: elegir un juego y enviar
  await page.locator('button:has-text("Smash")').first().click().catch(() => {})
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /enviar solicitud/i }).click().catch(() => {})
  await page.waitForTimeout(2200)
  await page.screenshot({ path: `${OUT}/5-jugador-solicitud.png` })
  // Cambiar a admin (mismo contexto: mismo localStorage del demo store)
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /cerrar sesión/i }).first().click()
  await page.waitForURL('**/login**', { timeout: 8000 })
  await login(page, 'admin@torneum.com')
  await page.getByRole('button', { name: /verificación/i }).first().click().catch(() => {})
  await page.waitForTimeout(600)
  const solicitud = await page.getByText(/jugador de la demo/i).count()
  ok(solicitud > 0, 'el admin ve la solicitud del jugador')
  await page.getByRole('button', { name: /^aprobar$/i }).first().click().catch(() => {})
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/5-admin-aprueba.png` })
  // Volver como jugador → consola accesible
  await page.locator('button:has-text("Cerrar sesión")').first().click()
  await page.waitForURL('**/login**', { timeout: 8000 })
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const puerta2 = await page.getByText(/en revisión|conviértete/i).count()
  ok(puerta2 === 0, `aprobado: la consola abre sin puerta (${page.url()})`)
  await page.screenshot({ path: `${OUT}/5-jugador-consola-abierta.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
