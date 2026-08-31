// Prueba del cableado resultados→puntos→ranking (31-08): un torneo JUGADO en
// Torneum (final cerrada por el TO en /gestionar) reparte puntos reales según
// puntos.ts y aparecen en /ranking (España y Mundial); el Circuito no suma
// torneos de comunidad y la fuente plataforma nunca los ve (regla de oro).
// Con los defaults de crear-torneo (smash · 8€ · 32 plazas · presencial ·
// comunidad) el tope es 100: campeón +100, subcampeón +70.
//   BASE_URL=http://localhost:3006 node _test_puntos.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-puntos'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const page = await ctx.newPage()
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})

const saltarOnboarding = async () => {
  const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
  if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(600) }
}
async function loginBoton(nombre) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForTimeout(1800)
  await saltarOnboarding()
}
async function logout() {
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Cerrar sesión/i }).first().click()
  await page.waitForURL('**/login**', { timeout: 8000 })
}
async function inscribir(nombreCuenta, nombreTorneo) {
  await loginBoton(nombreCuenta)
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await saltarOnboarding()
  await page.getByText(nombreTorneo).first().click()
  await page.waitForURL('**/torneo/**', { timeout: 8000 }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, `${nombreCuenta} queda inscrito`)
  await logout()
}

// ── 1. David crea el torneo (defaults: smash · 8€ · 32 plazas · presencial)
console.log('— David crea «Liga de Puntos» y se juega hasta la final')
await loginBoton('David')
await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByPlaceholder(/Lima Smash Weekly/).fill('Liga de Puntos')
await page.getByRole('button', { name: /elegir sede/i }).first().click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await page.waitForTimeout(500)
await page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await page.waitForTimeout(1200)
await logout()

// ── 2. Javier y Lucía se inscriben (cuentas reales, mundo compartido)
await inscribir('Javier', 'Liga de Puntos')
await inscribir('Lucía', 'Liga de Puntos')

// ── 3. David: check-in → bracket → iniciar → reporta la final (gana Javier)
await loginBoton('David')
await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByText('Liga de Puntos').first().click()
await page.waitForURL('**/gestionar/**', { timeout: 8000 }); await page.waitForTimeout(1800)
await page.getByRole('button', { name: /Check-in masivo/i }).click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Generar bracket/ }).first().click(); await page.waitForTimeout(900)
await page.getByRole('button', { name: /Iniciar torneo/ }).first().click(); await page.waitForTimeout(900)
// La final es al mejor de 5 (desde=semis): 3 juegos para Javier
for (let i = 0; i < 3; i++) {
  await page.locator('button').filter({ hasText: 'Javier' }).last().click()
  await page.waitForTimeout(500)
}
ok(await page.getByText(/gana|Campeón/i).count() > 0, 'la final queda cerrada con campeón')
await page.screenshot({ path: `${OUT}/1-final-cerrada.png` })

// id del torneo desde el mundo común
const idLiga = await page.evaluate(() => {
  const w = JSON.parse(localStorage.getItem('todh-mundo'))
  return w?.state?.creados?.find(c => c.nombre === 'Liga de Puntos')?.id ?? null
})
ok(!!idLiga, `el torneo vive en el mundo común (${idLiga})`)

// ── 4. Resultados: standings reales con los puntos repartidos
await page.goto(`${BASE}/torneo/${idLiga}/resultados`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
ok(await page.getByText('Javier').count() > 0, 'resultados: Javier es el campeón')
// El tope depende del bote que ponga crear-torneo: se lee del chip del campeón
// (100% del tope) y el resto de puestos se deriva del reparto de puntos.ts.
const chip = await page.locator('text=/\\+\\d+ pts/').first().textContent().catch(() => null)
const tope = chip ? parseInt(chip.match(/\d+/)[0], 10) : 0
ok(tope > 0, `el campeón gana puntos reales (${chip ?? 'sin chip'})`)
const ptsSub = Math.round(tope * 0.7)
ok(await page.getByText(`+${ptsSub} pts`).count() > 0, `la subcampeona gana el 70% del tope (+${ptsSub} pts)`)
await page.screenshot({ path: `${OUT}/2-resultados-puntos.png` })

// ── 5. Ranking: los puntos reales aparecen en España y Mundial
console.log('— el ranking recoge los puntos reales')
await page.goto(`${BASE}/ranking`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
ok(await page.getByText('Javier').count() > 0, 'España·smash·presencial: Javier tiene fila (jugó un Torneum)')
ok(await page.getByText('Lucía').count() > 0, 'y Lucía también (subcampeona)')
ok(await page.getByText(String(tope)).count() > 0, `y la tabla enseña sus ${tope} puntos`)
await page.screenshot({ path: `${OUT}/3-ranking-espana.png` })
// Mundial: también aparecen
await page.getByRole('button', { name: /Mundial/i }).first().click(); await page.waitForTimeout(1500)
ok(await page.getByText('Javier').count() > 0, 'Mundial: Javier también aparece')
// Circuito: un torneo de comunidad NO suma
await page.getByRole('button', { name: /Circuito/i }).first().click(); await page.waitForTimeout(1500)
ok(await page.getByText('Javier').count() === 0, 'Circuito: un torneo de comunidad NO suma (solo oficiales)')
// Online: era presencial, no debe aparecer
await page.getByRole('button', { name: /Mi país|País|España/i }).first().click().catch(() => {})
await page.waitForTimeout(800)
const tabOnline = page.getByRole('button', { name: /^Online$/i })
if (await tabOnline.count() > 0) {
  await tabOnline.first().click(); await page.waitForTimeout(1200)
  ok(await page.getByText('Javier').count() === 0, 'Online: el torneo presencial no cuenta aquí')
  await page.getByRole('button', { name: /^Presencial$/i }).first().click(); await page.waitForTimeout(800)
}
// Regla de oro: la fuente plataforma ni lo huele
const tabPlataforma = page.getByRole('button', { name: /start\.gg|Capcom|RK9|FACEIT|VLR|OP\.GG|lolchess|Melee/i })
if (await tabPlataforma.count() > 0) {
  await tabPlataforma.first().click(); await page.waitForTimeout(1500)
  ok(await page.getByText('Javier').count() === 0, 'fuente plataforma: sin rastro de puntos Torneum (regla de oro)')
}
await page.screenshot({ path: `${OUT}/4-ranking-fuentes.png` })

// ── 6. Otra cuenta ve el MISMO ranking (los puntos son del mundo)
await logout()
await loginBoton('Marcos')
await page.goto(`${BASE}/ranking`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
ok(await page.getByText('Javier').count() > 0, 'Marcos ve los puntos de Javier en el ranking (mundo común)')

await ctx.close()
await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
