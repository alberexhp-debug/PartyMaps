// Prueba de VODs N1 (30-08): sets del usuario dentro de la emisión.
// - Historial: chip «▶ n sets en vídeo» SOLO en la entrada con VOD (Weekly #41,
//   no #40 aunque compartan torneoId t1), acordeón con ronda/rival/marcador,
//   enlace externo a YouTube con t= correcto y sets sin cámara «sin emisión».
// - Resultados t1: «Tus sets en esta emisión» y re-montaje del embed con start=.
// - Torneo sin VOD: no enseña nada.
// - TO: input «URL del VOD» en ajustes; vodUrlFinal manda sobre videoUrl y
//   activa el chip «Con VOD» en la ficha.
//   BASE_URL=http://localhost:3006 node _test_vods.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-vods'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

// Espera a que un locator sea visible (el dev server recompila en caliente y la
// hidratación puede tardar): true/false en vez de reventar la suite.
const visible = async (loc, ms = 25000) => {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); return true } catch { return false }
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

// ── 1. Historial: chip solo en Weekly #41, acordeón con los sets, enlace con t=
{
  const { ctx, page } = await nuevaPagina()
  console.log('— historial: chip «sets en vídeo» y acordeón')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil/historial`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('sets en vídeo')), 'el chip «sets en vídeo» aparece en el historial')
  ok(await page.getByText('sets en vídeo').count() === 1, 'y UNA sola vez en todo el historial')
  ok(await page.locator('a:has-text("Lima Smash Weekly #41") + div button:has-text("sets en vídeo")').count() === 1, 'y está bajo la fila del Weekly #41')
  ok(await page.locator('a:has-text("Lima Smash Weekly #40") + div').count() === 0, 'el Weekly #40 (mismo torneoId t1) NO lleva chip')
  ok(await page.getByText('3 sets en vídeo').count() === 1, 'cuenta 3 sets (solo los que tienen cámara, no los 4 jugados)')
  await page.getByRole('button', { name: /sets en vídeo/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText(/Cuartos · vs Sora/).count() > 0, 'el acordeón lista ronda y rival (Cuartos · vs Sora)')
  ok(await page.getByText(/Semis · vs Kaze/).count() > 0, 'y las semis contra Kaze')
  ok(await page.getByText('2–1 ✓').count() > 0, 'y el marcador con victoria (2–1 ✓)')
  ok(await page.getByText('2–3 ✗').count() > 0, 'y la derrota de semis (2–3 ✗) — la fila vive sin el vídeo')
  ok(await page.locator('a[href="https://www.youtube.com/watch?v=JzS96auqau0&t=1240s"]').count() === 1, 'el enlace de Cuartos abre YouTube con t=1240s')
  ok(await page.locator('a[href="https://www.youtube.com/watch?v=JzS96auqau0&t=5350s"]').count() === 1, 'y el de Losers Semis con t=5350s')
  ok((await Promise.all((await page.locator('a[href*="youtube.com/watch"][href*="t="]').all()).map(a => a.getAttribute('target')))).every(t => t === '_blank'), 'los enlaces abren en pestaña nueva (target _blank)')
  ok(await page.getByText('Sin emisión').count() === 1, 'el set sin cámara (Mesa 5 vs Mist) se lista en gris «sin emisión»')
  ok(await page.getByText('Ver mi set').count() === 3, 'y sin botón: solo 3 «Ver mi set» para 4 sets')
  await page.screenshot({ path: `${OUT}/1-historial-acordeon.png` })
  await ctx.close()
}

// ── 2. Resultados t1: «Tus sets en esta emisión» + embed que salta al minuto
{
  const { ctx, page } = await nuevaPagina()
  console.log('— resultados t1: tus sets y salto del embed')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t1/resultados`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Así se vivió')), 'el bloque del VOD «Así se vivió» está')
  ok(await visible(page.getByText('Tus sets en esta emisión')), 'con «Tus sets en esta emisión» debajo')
  const iframe = page.locator('iframe[src*="youtube-nocookie"]')
  ok(await iframe.count() === 1, 'el embed de YouTube está montado')
  ok(!(await iframe.getAttribute('src')).includes('start='), 'y arranca desde el principio (sin start=)')
  await page.getByRole('button', { name: /Ver mi set/ }).first().click(); await page.waitForTimeout(700)
  ok((await page.locator('iframe[src*="youtube-nocookie"]').getAttribute('src')).includes('start=1240'), 'pulsar «Ver mi set» (Cuartos) re-monta el embed con start=1240')
  await page.getByRole('button', { name: /Ver mi set/ }).nth(1).click(); await page.waitForTimeout(700)
  ok((await page.locator('iframe[src*="youtube-nocookie"]').getAttribute('src')).includes('start=3480'), 'y el segundo (Semis) cambia a start=3480 sin navegar')
  ok(page.url().includes('/torneo/t1/resultados'), 'seguimos en la página de resultados')
  await page.screenshot({ path: `${OUT}/2-resultados-salto.png` })
  await ctx.close()
}

// ── 3. Torneo sin VOD: nada de sets ni emisión
{
  const { ctx, page } = await nuevaPagina()
  console.log('— torneo sin VOD (t12): no enseña nada')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t12/resultados`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Clasificación completa')), 'la página de resultados de t12 carga')
  ok(await page.getByText('Tus sets en esta emisión').count() === 0, 'sin VOD no hay «Tus sets en esta emisión»')
  ok(await page.getByText('Así se vivió').count() === 0, 'ni bloque de emisión')
  ok(await page.locator('iframe').count() === 0, 'ni iframe alguno')
  await ctx.close()
}

// ── 4. TO: input del VOD final en ajustes; manda sobre videoUrl + chip «Con VOD»
{
  const { ctx, page } = await nuevaPagina()
  console.log('— TO: URL del VOD al cerrar el directo')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/gestionar/t1`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByRole('button', { name: /^Ajustes$/ })), 'el panel de gestión de t1 carga')
  await page.getByRole('button', { name: /^Ajustes$/ }).click(); await page.waitForTimeout(600)
  ok(await visible(page.getByText('URL del VOD (cuando acabe el directo)')), 'ajustes tiene el campo del VOD definitivo')
  ok(await page.getByText(/Los VOD de Twitch caducan/).count() > 0, 'con el aviso «Twitch caduca; súbelo a YouTube»')
  await page.getByPlaceholder('https://www.youtube.com/watch?v=…').fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  await page.getByRole('button', { name: /Guardar cambios/ }).click(); await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/4-gestionar-vod.png` })
  // La ficha estrena el chip «Con VOD» (solo existe con vodUrlFinal)
  await page.goto(`${BASE}/torneo/t1`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Con VOD')), 'la ficha del torneo luce el chip «🎬 Con VOD»')
  // Y resultados prefiere el VOD definitivo sobre el vídeo del directo
  await page.goto(`${BASE}/torneo/t1/resultados`, { waitUntil: 'networkidle' })
  await visible(page.locator('iframe[src*="youtube-nocookie"]'))
  const src = await page.locator('iframe[src*="youtube-nocookie"]').getAttribute('src')
  ok(src.includes('dQw4w9WgXcQ'), 'resultados incrusta el vodUrlFinal…')
  ok(!src.includes('JzS96auqau0'), '…y ya no el videoUrl del directo')
  // La ficha de un torneo SIN vodUrlFinal no lleva chip
  await page.goto(`${BASE}/torneo/t6`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('SF6 Invitational — Platino')), 'la ficha de t6 carga')
  ok(await page.getByText('Con VOD').count() === 0, 'un torneo sin VOD final no lleva el chip')
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
