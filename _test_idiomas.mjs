// Prueba de la Fase 9 (i18n a 3 idiomas): el selector del perfil cambia TODA la
// app keyificada entre ES / EN / 日本語; los nombres propios (nicks, títulos de
// torneos, tags de crew) no se traducen nunca; volver a ES restaura el texto.
//   BASE_URL=http://localhost:3006 node _test_idiomas.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-idiomas'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina() {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
  })
  return { ctx, page }
}

async function login(page, email) {
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// Cambia el idioma desde el selector del PERFIL (ES / EN / 日本語)
async function cambiarIdioma(page, etiqueta) {
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(800)
  await page.getByRole('button', { name: etiqueta, exact: true }).first().click()
  await page.waitForTimeout(600)
}

const { ctx, page } = await nuevaPagina()
await login(page, 'jugador@torneum.com')

// ── 1. Punto de partida: ES por defecto
{
  console.log('— ES por defecto')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('h1', { hasText: 'Explorar' }).count() > 0, 'Explorar arranca en español («Explorar»)')
  ok(await page.getByText('Lima Smash Weekly #42').count() > 0, 'el título «Lima Smash Weekly #42» está en la lista')
}

// ── 2. Cambiar a EN desde el perfil: la app keyificada pasa a inglés
{
  console.log('— Cambio a EN desde el perfil')
  await cambiarIdioma(page, 'en')
  ok(await page.locator('h1', { hasText: 'Profile' }).count() > 0, 'el perfil pasa a «Profile»')

  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/1-explorar-en.png`, fullPage: false })
  ok(await page.locator('h1', { hasText: 'Explore' }).count() > 0, 'Explorar pasa a «Explore»')
  ok(await page.locator('h1', { hasText: 'Explorar' }).count() === 0, 'sin el h1 español «Explorar»')
  ok(await page.getByText('Upcoming tournaments').count() > 0, 'el eyebrow es «Upcoming tournaments»')
  ok(await page.getByText('Próximos torneos', { exact: true }).count() === 0, 'sin «Próximos torneos» en español')
  ok(await page.getByText('Lima Smash Weekly #42').count() > 0, 'el título del torneo NO se traduce en EN')

  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  ok(await page.getByText('Achievements').count() > 0, 'el perfil enseña «Achievements»')
  ok(await page.getByText('Cerrar sesión').count() === 0, 'sin «Cerrar sesión» en español')
}

// ── 3. Cambiar a 日本語: textos japoneses; nombres propios intactos
{
  console.log('— Cambio a 日本語')
  await cambiarIdioma(page, '日本語')

  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/2-explorar-ja.png`, fullPage: false })
  ok(await page.locator('h1', { hasText: '探す' }).count() > 0, 'Explorar pasa a «探す»')
  ok(await page.getByText('今後の大会').count() > 0, 'el eyebrow lleva «大会» («今後の大会»)')
  ok(await page.getByText('Lima Smash Weekly #42').count() > 0, 'el título «Lima Smash Weekly #42» sigue intacto en japonés')

  // Ranking: japonés en el chrome, nicks y tag #NOCT sin traducir
  await page.goto(`${BASE}/ranking`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.screenshot({ path: `${OUT}/3-ranking-ja.png`, fullPage: false })
  ok(await page.locator('h1', { hasText: 'ランキング' }).count() > 0, 'el ranking se titula «ランキング»')
  const cuerpoRanking = await page.locator('body').innerText()
  ok(cuerpoRanking.includes('Kaze'), 'el nick «Kaze» sigue intacto')
  ok(cuerpoRanking.includes('#NOCT'), 'el tag de crew #NOCT no se traduce')

  // Ficha del torneo: título intacto y chrome japonés
  await page.goto(`${BASE}/torneo/t1`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('h1', { hasText: 'Lima Smash Weekly #42' }).count() > 0, 'la ficha mantiene el título original')
  ok(await page.getByText('エントリー').count() > 0, 'la ficha lleva «エントリー» (inscripción)')

  // El perfil, en japonés
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  ok(await page.locator('h1', { hasText: 'プロフィール' }).count() > 0, 'el perfil se titula «プロフィール»')
}

// ── 4. Volver a ES: todo restaurado
{
  console.log('— Vuelta a ES')
  await cambiarIdioma(page, 'es')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/4-explorar-es.png`, fullPage: false })
  ok(await page.locator('h1', { hasText: 'Explorar' }).count() > 0, 'vuelve «Explorar»')
  ok(await page.getByText('Próximos torneos').count() > 0, 'vuelve «Próximos torneos»')
  ok(await page.getByText('Lima Smash Weekly #42').count() > 0, 'y el título del torneo sigue ahí')
}

await ctx.close()
await browser.close()
console.log(fallos === 0 ? `\n✅ Idiomas: todo OK (capturas en ${OUT})` : `\n❌ ${fallos} fallos (capturas en ${OUT})`)
process.exit(fallos === 0 ? 0 : 1)
