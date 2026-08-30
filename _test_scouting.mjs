// Prueba de SCOUTING v1 (30-08): estudiar a un rival con datos medibles.
// - Live t1: botón «Estudiar a {rival}» junto al próximo rival; sin tier abre
//   el TierSheet (acceso contextual = Platino) y activar Platino desde ahí
//   abre el sheet de scouting con mains+winrate+muestra y head-to-head.
// - /jugador/[nombre]: bloque Scouting; sin tier, teaser con candados; con
//   Oro se destapa lo básico pero el head-to-head sigue bloqueado (Platino).
// - VODs del rival: Kaze (sembrado) tiene «Ver set»; el resto «sin vídeos aún».
// - Crew AJENA de juego de equipo (Skuadra, valorant) ofrece «Estudiar equipo»
//   (Platino) con roster; las tuyas y las de juego individual, no.
// - Muestra pequeña: Riven (fondo del ranking) degrada a «aún poca muestra».
//   BASE_URL=http://localhost:3006 node _test_scouting.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-scouting'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

const visible = async (loc, ms = 25000) => {
  try { await loc.first().waitFor({ state: 'visible', timeout: ms }); return true } catch { return false }
}

// `seed` se mezcla con los defaults del store (zustand persist, version 2).
async function nuevaPagina(seed) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript((s) => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
    if (s && !localStorage.getItem('todh-demo')) {
      localStorage.setItem('todh-demo', JSON.stringify({ state: s, version: 2 }))
    }
  }, seed ?? null)
  return { ctx, page }
}

async function login(page, email = 'jugador@torneum.com') {
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 1. Live t1: puerta contextual (Platino) → TierSheet → activar → scouting
{
  const { ctx, page } = await nuevaPagina({ inscritos: ['t1'] })
  console.log('— live/t1: «Estudiar a {rival}» → TierSheet → Platino → scouting')
  await login(page)
  await page.goto(`${BASE}/live/t1`, { waitUntil: 'networkidle' })
  const btn = page.getByRole('button', { name: /Estudiar a Sora/ })
  ok(await visible(btn), 'el botón «Estudiar a Sora» está junto al próximo rival')
  await btn.click(); await page.waitForTimeout(500)
  ok(await visible(page.getByText('Tiers Torneum')), 'sin tier, el botón abre el TierSheet (acceso contextual = Platino)')
  ok(await page.getByText(/tier Platino/).count() > 0, 'y el sheet destaca que pide Platino')
  await page.screenshot({ path: `${OUT}/1a-tiersheet.png` })
  await page.getByRole('button', { name: /^Activar Platino$/ }).click()
  await page.waitForTimeout(2400)   // confirmación (1600ms) + apertura del scouting pendiente
  ok(await visible(page.getByText('Winrate por Main')), 'activar Platino desde ahí abre el scouting: módulo de mains')
  ok(await page.getByText(/basado en \d+ sets/).count() > 0, 'con la muestra visible («basado en N sets»)')
  ok(await page.locator('div.card-premium:has-text("Winrate por Main")').getByText(/%/).count() >= 2, 'y 2-3 mains con su winrate en %')
  ok(await visible(page.getByText('Head-to-head contra ti')), 'el head-to-head contra ti está')
  ok(await page.getByText(/^[0-3]–[0-3]$/).count() >= 3, 'con marcadores de los sets contra ti')
  ok(await page.getByText(/a tu favor|en tu contra|empatados/).count() > 0, 'y el balance a favor/en contra')
  ok(await page.getByText('Sets ajustados').count() > 0, 'módulo de sets ajustados (clutch) presente')
  ok(await page.getByText('Desbloquea con').count() === 0, 'con Platino no queda ningún candado')
  await page.screenshot({ path: `${OUT}/1b-scouting-live.png` })
  // El MiniPerfil del rival lleva el enlace discreto «Estudiar a fondo»
  await page.keyboard.press('Escape'); await page.locator('.fixed button[aria-label="Cerrar"]').first().click().catch(() => {})
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Ahora: tú vs Sora/ }).click().catch(() => {})
  await page.waitForTimeout(600)
  ok(await page.getByText('Estudiar a fondo').count() > 0, 'el MiniPerfil del rival lleva «Estudiar a fondo ›»')
  await ctx.close()
}

// ── 2. /jugador/[nombre] sin tier: el bloque aparece como teaser con candados
{
  const { ctx, page } = await nuevaPagina()
  console.log('— /jugador/Kaze sin tier: bloque Scouting con muros')
  await login(page)
  await page.goto(`${BASE}/jugador/Kaze?juego=smash`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Scouting')), 'el bloque «Scouting» aparece en el perfil público')
  ok(await page.getByText(/basado en \d+ sets/).count() > 0, 'la muestra es visible incluso sin tier (dato gratis)')
  ok(await page.getByRole('button', { name: 'Desbloquea con Oro' }).count() > 0, 'los módulos básicos piden Oro (candado + CTA)')
  ok(await page.getByRole('button', { name: 'Desbloquea con Platino' }).count() > 0, 'y los avanzados piden Platino')
  await page.getByRole('button', { name: 'Desbloquea con Oro' }).first().click(); await page.waitForTimeout(500)
  ok(await visible(page.getByText('Tiers Torneum')), 'el CTA del candado abre el TierSheet')
  await page.screenshot({ path: `${OUT}/2-jugador-sin-tier.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Con Oro (no Platino): lo básico destapado, head-to-head con candado
{
  const { ctx, page } = await nuevaPagina({ tierUsuario: 'Oro' })
  console.log('— /jugador/Kaze con Oro: mains+VODs sí, head-to-head no')
  await login(page)
  await page.goto(`${BASE}/jugador/Kaze?juego=smash`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Winrate por Main')), 'con Oro, el módulo de mains se destapa')
  ok(await page.getByRole('button', { name: 'Desbloquea con Oro' }).count() === 0, 'sin candados de Oro restantes')
  ok(await page.getByRole('button', { name: 'Desbloquea con Platino' }).count() > 0, 'el head-to-head (y clutch/tendencia) sigue con candado Platino')
  ok(await page.getByText('Sus VODs').count() > 0, 'el módulo de VODs del rival está (Oro)')
  ok(await page.getByText('Ver set').count() > 0, 'Kaze (sembrado) tiene un set en vídeo — «Ver set»')
  ok(await page.locator('a[href*="youtube.com/watch"][href*="t=3480s"]').count() === 1, 'que enlaza al minuto del VOD del Weekly #41 (t=3480s)')
  await page.screenshot({ path: `${OUT}/3-jugador-oro.png`, fullPage: true })
  // Un rival sin VOD sembrado enseña el módulo honesto: «sin vídeos aún»
  await page.goto(`${BASE}/jugador/Sora?juego=smash`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Sin vídeos aún')), 'un rival sin VODs enseña «Sin vídeos aún» (nada inventado)')
  await ctx.close()
}

// ── 4. Crew AJENA de juego de equipo: «Estudiar equipo» (Platino) con roster
{
  const { ctx, page } = await nuevaPagina({ tierUsuario: 'Platino' })
  console.log('— crew Skuadra (ajena, valorant): estudiar equipo')
  await login(page)
  await page.goto(`${BASE}/crew/crew-sqd`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Skuadra')), 'la crew ajena Skuadra (valorant) existe')
  const btn = page.getByRole('button', { name: /Estudiar equipo/ })
  ok(await visible(btn), 'y ofrece «Estudiar equipo»')
  await btn.click(); await page.waitForTimeout(600)
  ok(await visible(page.getByText('Scouting de equipo')), 'se abre el scouting de equipo')
  ok(await page.getByText('Media del equipo').count() > 0, 'con la media del equipo…')
  ok(await page.getByText('Más fuerte').count() > 0 && (await page.getByText('Más débil').count()) > 0, '…y el más fuerte / más débil')
  for (const m of ['Nyx', 'Volt', 'Zen', 'Aqua', 'Pyra']) ok(await page.getByText(m).count() > 0, `el roster lista a ${m}`)
  ok(await page.getByText(/\d+ sets/).count() >= 5, 'cada miembro enseña su muestra (N sets)')
  await page.screenshot({ path: `${OUT}/4-crew-scouting.png` })
  // Una crew TUYA de juego de equipo no se «estudia» (Vandalia)
  await page.goto(`${BASE}/crew/crew-vnd`, { waitUntil: 'networkidle' })
  await visible(page.getByText('Vandalia'))
  ok(await page.getByRole('button', { name: /Estudiar equipo/ }).count() === 0, 'tu propia crew (Vandalia) no lleva el botón')
  // Ni una ajena de juego INDIVIDUAL (Dojo Zen, smash)
  await page.goto(`${BASE}/crew/crew-dojo`, { waitUntil: 'networkidle' })
  await visible(page.getByText('Dojo Zen'))
  ok(await page.getByRole('button', { name: /Estudiar equipo/ }).count() === 0, 'ni una ajena de juego individual (Dojo Zen)')
  await ctx.close()
}

// ── 4b. La misma puerta sin tier: «Estudiar equipo» abre el TierSheet
{
  const { ctx, page } = await nuevaPagina()
  console.log('— crew Skuadra sin tier: puerta Platino')
  await login(page)
  await page.goto(`${BASE}/crew/crew-sqd`, { waitUntil: 'networkidle' })
  await visible(page.getByRole('button', { name: /Estudiar equipo/ }))
  await page.getByRole('button', { name: /Estudiar equipo/ }).click(); await page.waitForTimeout(500)
  ok(await visible(page.getByText('Tiers Torneum')), 'sin tier, «Estudiar equipo» abre el TierSheet')
  ok(await page.getByText('Scouting de equipo').count() === 0, 'y el roster NO se enseña')
  await ctx.close()
}

// ── 5. Muestra pequeña: degradación con gracia (Riven, fondo del ranking)
{
  const { ctx, page } = await nuevaPagina({ tierUsuario: 'Platino' })
  console.log('— /jugador/Riven: aún poca muestra')
  await login(page)
  await page.goto(`${BASE}/jugador/Riven?juego=smash`, { waitUntil: 'networkidle' })
  ok(await visible(page.getByText('Aún poca muestra')), 'un jugador con <5 sets enseña «Aún poca muestra»')
  ok(await page.getByText(/Solo \d+ sets registrados/).count() > 0, 'con el detalle de cuántos sets hay')
  ok(await page.getByText('Winrate por Main').count() === 0, 'y sin módulos a medias (ni mains…)')
  ok(await page.getByText('Head-to-head contra ti').count() === 0, '…ni head-to-head, aunque tengas Platino')
  await page.screenshot({ path: `${OUT}/5-poca-muestra.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
