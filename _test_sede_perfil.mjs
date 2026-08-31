// Página pública editable de la SEDE (pedido Albert 31-08): banner, equipos
// con cantidad y ajuste de juegos desde /sede/pagina — y lo que ve un jugador
// en /local/[id]. (La subida real de imágenes no se prueba aquí: file input.)
//   BASE_URL=http://localhost:3006 node _test_sede_perfil.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-sede-perfil'
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
page.on('dialog', d => d.accept())
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})
const saltarOnboarding = async () => {
  const s = page.getByRole('button', { name: /Saltar por ahora/ })
  if (await s.count() > 0) { await s.first().click(); await page.waitForTimeout(600) }
}
async function loginBoton(nombre) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForTimeout(1800)
  await saltarOnboarding()
}
async function logout() {
  await page.evaluate(() => localStorage.removeItem('todh-sesion'))
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
}

// ── 1. Gamba personaliza su página desde /sede/pagina
console.log('— gamba@: personaliza banner, equipos y juegos')
await loginBoton('Gamba Esports')
await page.goto(`${BASE}/sede/pagina`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
ok(await page.getByText('Consolas y equipo').count() > 0, 'la sección «Tu página» abre con el bloque de equipos')

// Banner preset
await page.getByRole('button', { name: 'Violeta' }).click(); await page.waitForTimeout(600)
ok(await page.locator('[data-banner]').count() > 0, 'el preset de banner queda aplicado (vista previa)')

// PS5 ×3
for (let i = 0; i < 3; i++) { await page.locator('button[aria-label="Más PS5"]').click(); await page.waitForTimeout(250) }
ok(await page.getByText('PS5').count() > 0, 'el equipo PS5 está en el catálogo')

// Juegos: quitar el primer activo y añadir el primer inactivo
const chips = page.locator('button[aria-label^="Juego "]')
const nChips = await chips.count()
const estado = async (i) => ({
  nombre: (await chips.nth(i).getAttribute('aria-label')).replace('Juego ', ''),
  pressed: (await chips.nth(i).getAttribute('aria-pressed')) === 'true',
})
// Quitar: el primer chip activo
let quitado = null, anadido = null
for (let i = 0; i < nChips && !quitado; i++) {
  const c = await estado(i)
  if (c.pressed) { quitado = c.nombre; await chips.nth(i).click(); await page.waitForTimeout(400) }
}
// Añadir: un chip inactivo distinto del quitado; si todos estaban activos
// (gamba sugiere el catálogo entero), se quita y re-añade el último para
// probar el alta manual igualmente.
for (let i = 0; i < nChips && !anadido; i++) {
  const c = await estado(i)
  if (!c.pressed && c.nombre !== quitado) { anadido = c.nombre; await chips.nth(i).click(); await page.waitForTimeout(400) }
}
if (!anadido) {
  const c = await estado(nChips - 1)
  anadido = c.nombre
  await chips.nth(nChips - 1).click(); await page.waitForTimeout(400)  // quitar
  await chips.nth(nChips - 1).click(); await page.waitForTimeout(400)  // re-añadir (juegosExtra/quitados)
}
ok(!!quitado && !!anadido, `juegos ajustados: quitado «${quitado}», añadido «${anadido}»`)
await page.screenshot({ path: `${OUT}/1-editor-sede.png`, fullPage: true })
await logout()

// ── 2. Javier ve la página personalizada en /local/gamba
console.log('— Javier: /local/gamba refleja la personalización (mundo)')
await loginBoton('Javier')
await page.goto(`${BASE}/local/gamba`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
ok(await page.locator('[data-banner]').count() > 0, 'el hero lleva el banner personalizado')
ok(await page.getByText('PS5 ×3').count() > 0, 'el chip «PS5 ×3» se enseña con su cantidad')
const bloque = page.locator('[data-juegos-local]')
ok(await bloque.count() > 0, 'el bloque de juegos disponibles existe')
ok(await bloque.getByText(anadido, { exact: true }).count() > 0, `el juego añadido («${anadido}») aparece`)
ok(await bloque.getByText(quitado, { exact: true }).count() === 0, `el juego quitado («${quitado}») ya no aparece`)
await page.screenshot({ path: `${OUT}/2-local-publico.png`, fullPage: true })

await ctx.close()
await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
