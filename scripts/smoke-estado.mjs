// Smoke test del estado-apertura (PR-4/5/6) contra el Vercel desplegado:
// 1) /mapa carga sin errores de consola Mapbox (las expresiones GL son válidas en runtime).
// 2) /explorar renderiza, el chip "Abiertos ahora" filtra sin romper.
// 3) Una ficha de local renderiza (línea de estado / bloque horario no rompen).
import { chromium } from 'playwright'
const BASE = process.env.BASE || 'https://party-maps-hojy.vercel.app'
const ok = m => console.log('  ✅', m), bad = m => { console.log('  ❌', m); process.exitCode = 1 }

const browser = await chromium.launch()
const page = await browser.newPage()
const errores = []
page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
page.on('pageerror', e => errores.push('pageerror: ' + e.message))

try {
  // 1) MAPA
  console.log('1) /mapa — carga + errores de consola')
  await page.goto(`${BASE}/mapa`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(7000) // dar tiempo a Mapbox a montar capas y pintar el source
  const errMapbox = errores.filter(e => /mapbox|expression|layout|paint|circle-opacity|text-field|filter/i.test(e))
  errMapbox.length === 0 ? ok('mapa sin errores Mapbox/expresión') : bad('errores Mapbox:\n     ' + errMapbox.slice(0, 6).join('\n     '))
  const otros = errores.filter(e => !/mapbox|expression/i.test(e) && !/favicon|manifest|sw\.js|service worker|preload|Download the React/i.test(e))
  otros.length === 0 ? ok('mapa sin otros errores de página') : console.log('  ⚠️ otros errores (no bloqueantes):\n     ' + otros.slice(0, 4).join('\n     '))

  // 2) EXPLORAR
  console.log('\n2) /explorar — render + toggle "Abiertos ahora"')
  errores.length = 0
  await page.goto(`${BASE}/explorar`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(3500)
  const chip = page.getByRole('button', { name: /Abiertos ahora/i })
  ;(await chip.count()) > 0 ? ok('chip "Abiertos ahora" presente') : bad('falta el chip "Abiertos ahora"')
  // ¿hay tarjetas? (puede haber 0 si no hay locales activos)
  const nCards = await page.locator('a[href^="/local/"]').count()
  console.log(`     tarjetas de local: ${nCards}`)
  await chip.first().click()
  await page.waitForTimeout(1500)
  const errExplorar = errores.filter(e => !/favicon|manifest|sw\.js|preload|Download the React|Failed to load resource/i.test(e))
  errExplorar.length === 0 ? ok('toggle aplicado sin errores') : bad('errores al filtrar:\n     ' + errExplorar.slice(0, 4).join('\n     '))

  // 3) FICHA (navegando desde explorar; quitamos el filtro por si dejó 0 resultados)
  console.log('\n3) Ficha de local — render')
  await chip.first().click().catch(() => {}) // desactivar filtro
  await page.waitForTimeout(800)
  const primera = page.locator('a[href^="/local/"]').first()
  if (await primera.count() === 0) {
    console.log('  ⚠️ no hay locales activos para abrir una ficha (omito)')
  } else {
    errores.length = 0
    await primera.click()
    await page.waitForTimeout(3500)
    const h1 = await page.locator('h1').first().textContent().catch(() => null)
    h1 ? ok(`ficha renderiza (título: "${h1?.slice(0, 30)}")`) : bad('la ficha no renderizó h1')
    const errFicha = errores.filter(e => !/favicon|manifest|sw\.js|preload|Download the React|Failed to load resource/i.test(e))
    errFicha.length === 0 ? ok('ficha sin errores de página') : bad('errores en ficha:\n     ' + errFicha.slice(0, 4).join('\n     '))
  }
} catch (e) {
  bad('EXCEPCIÓN: ' + e.message)
} finally {
  await browser.close()
  console.log(process.exitCode ? '\n  ❌ smoke con fallos' : '\n  ✅ smoke OK')
}
