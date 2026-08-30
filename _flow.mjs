// Flujo interactivo: sets Bo3/Bo5 hasta campeón, crear-torneo completo, editor de mesas.
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.argv[2] || '/tmp/flow'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }));
});
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` })
const BASE = 'http://localhost:4567'

// ── 1. Gestionar: check-in masivo → generar bracket → reportar sets hasta campeón
await page.goto(`${BASE}/gestionar/t1`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /check-in masivo/i }).click()
await page.waitForTimeout(300)
await page.locator('button:has-text("con check-in")').click({ force: true })
await page.waitForTimeout(800)
await shot('01_bracket_generado')

// Reportar: tocar el primer jugador con "+1 juego" repetidamente
for (let i = 0; i < 200; i++) {
  const btn = page.locator('button:has-text("+1 juego")').first()
  if (!(await btn.count())) break
  await btn.evaluate(el => el.click())
  await page.waitForTimeout(60)
}
await page.waitForTimeout(500)
await shot('02_campeon_podio')
console.log('campeon:', await page.locator('text=Campeón').count())

// Publicar resultados
const pub = page.getByRole('button', { name: /publicar resultados/i })
if (await pub.count()) { await pub.click(); await page.waitForTimeout(400) }
await shot('03_publicado')

// ── 2. Crear torneo: juego custom + sede + comentarios + premios
await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' })
await page.getByPlaceholder(/Lima Smash Weekly/).fill('Guilty Gear Strive Open #1')
await page.getByRole('button', { name: /añadir juego/i }).click()
await page.getByPlaceholder(/Nombre del juego/).fill('Guilty Gear Strive')
await page.getByRole('button', { name: /Añadir «/i }).click()
await page.waitForTimeout(400)
await shot('04_juego_custom')

// Formato libre
await page.getByPlaceholder(/Suizo 6 rondas/).first().fill('Doble eliminación · Bo3, Bo5 en top 8')

// Sede
await page.getByRole('button', { name: /elegir sede/i }).click()
await page.waitForTimeout(400)
await shot('05_picker_sede')
await page.getByRole('button', { name: /Arcade Planet/ }).last().click()
await page.waitForTimeout(300)

// Comentarios + premios
await page.getByPlaceholder(/cajas de sobres/).fill('Top 4 se lleva merch oficial y 2 cajas de sobres. Trae tu mando.')
const imgs = page.locator('button.relative.aspect-square')
await imgs.nth(0).click()
await imgs.nth(1).click()
await shot('06_form_completo')

await page.getByRole('button', { name: /Publicar torneo/ }).click()
await page.waitForTimeout(600)
await shot('07_publicado_modal')
await page.getByRole('link', { name: /ver la ficha/i }).click()
await page.waitForLoadState('networkidle')
await page.waitForTimeout(600)
await shot('08_ficha_nueva')
// Scroll para ver comentarios/premios/sede
await page.mouse.wheel(0, 1200)
await page.waitForTimeout(400)
await shot('09_ficha_scroll')

// MiniLocal desde la ficha
const sedeBtn = page.locator('button:has-text("Arcade Planet")').last()
if (await sedeBtn.count()) { await sedeBtn.click(); await page.waitForTimeout(500); await shot('10_minilocal') }

// ── 3. Sede: añadir mesa en celda vacía y editarla
await page.goto(`${BASE}/sede`, { waitUntil: 'networkidle' })
await page.mouse.wheel(0, 1400)
await page.waitForTimeout(400)
const celda = page.locator('button[aria-label^="Añadir mesa"]').first()
await celda.click()
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Redonda' }).click()
await page.getByRole('button', { name: 'Stream' }).click()
await shot('11_sede_editor')

// ── 4. Modo directo debe reflejar la mesa nueva (9)
await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot('12_modo_directo_mesa_nueva')
console.log('mesa9:', await page.locator('text=/^9$/').count())

// ── 5. Vista jugador: confirmar llegada
await page.goto(`${BASE}/torneo/t1/mesa?n=3&vs=Cuartos%20vs%20Sora`, { waitUntil: 'networkidle' })
await page.getByRole('button', { name: /voy de camino/i }).click()
await page.waitForTimeout(400)
await shot('13_mesa_confirmada')

// ── 6. Notificaciones (te toca + resultados + torneo publicado)
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
await shot('14_notificaciones')

await browser.close()
console.log('DONE')
