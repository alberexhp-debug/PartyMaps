// Prueba de la Fase 5 (30-08): doble reporte real de resultados + personajes.
// Consenso feliz (marcador+personaje → rival demo → verificado → bracket),
// camino de disputa (toggle demo → el TO la ve en modo directo) y flag por
// juego (Magic no ofrece selector de personajes).
//   BASE_URL=http://localhost:3006 node _test_reporte.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-reporte'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina(extraInit) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
  })
  if (extraInit) await page.addInitScript(extraInit)
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

// Bracket real sembrado: 8 seeds de Smash en t1 y 8 de Magic en t2 (t2 = juego
// SIN personajes según su plantilla). r0m0 = seed1 vs seed8 = Kaze vs Aqua.
const seedGestion = () => {
  // Solo en la PRIMERA carga del contexto: las navegaciones posteriores deben
  // conservar lo que el flujo escribió (reportes, disputas, personajes…).
  if (localStorage.getItem('todh-demo')) return
  const g = (juego) => ({
    checkin: [], cerrado: true, generado: true,
    seeds: [0, 1, 2, 3, 4, 5, 6, 7].map(i => `${juego}-p${i}`),
    winners: {}, puntos: {}, bo: { base: 3, top: 5, desde: 'semis' }, bajas: [],
  })
  localStorage.setItem('todh-demo', JSON.stringify({
    state: { gestion: { t1: g('smash'), t2: g('magic') } },
    version: 0,
  }))
}

// Flujo de mesa hasta la hoja de reporte: Voy → todo listo (rival demo) → GG
async function hastaHoja(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /Confirmo, voy de camino/ }).first().click()
  await page.waitForTimeout(600)
  ok(await page.getByText('Esperando a tu rival…').count() > 0, 'tras el «Voy», se espera la confirmación del rival')
  await page.waitForTimeout(1800)
  ok(await page.getByText('Todo listo · combate en marcha').count() > 0, 'el rival demo confirma → «Todo listo»')
  ok(await page.getByText(/^\d{2}:\d{2}$/).count() > 0, 'el cronómetro corre en mm:ss')
  await page.getByRole('button', { name: /GG · Reportar resultado/ }).click()
  await page.waitForTimeout(500)
  ok(await page.getByText('Tu reporte', { exact: true }).count() > 0, 'GG abre la hoja de reporte')
}

// ── 1. Consenso feliz: marcador + personaje → rival demo → verificado → bracket
{
  const { ctx, page } = await nuevaPagina(seedGestion)
  console.log('— consenso feliz (Smash, con personajes)')
  await login(page, 'jugador@torneum.com')
  await hastaHoja(page, `${BASE}/torneo/t1/mesa?n=2&vs=${encodeURIComponent('Kaze vs Aqua')}&mid=r0m0`)

  ok(await page.getByText('¿Con qué has jugado?').count() > 0, 'Smash SÍ ofrece el selector de personajes')
  await page.getByRole('button', { name: 'Kaze', exact: true }).click()
  await page.getByRole('button', { name: /^2–0$/ }).click()
  // Roster grande de Smash: buscador + toque en el personaje
  await page.fill('input[placeholder="Buscar personaje…"]', 'Joker')
  await page.locator('button[title="Joker"]').click()
  await page.screenshot({ path: `${OUT}/1-hoja-reporte.png` })
  await page.getByRole('button', { name: /Enviar mi reporte/ }).click()
  await page.waitForTimeout(600)
  ok(await page.getByText(/Reporte enviado\. Esperando el de tu rival/).count() > 0, 'tu reporte queda esperando al del rival')
  await page.waitForTimeout(3000)
  ok(await page.getByText('Resultado verificado').count() > 0, 'ambos reportes coinciden → resultado verificado')
  ok(await page.locator('img[alt="Joker"]').count() > 0, 'tu personaje (Joker) aparece en la tarjeta verificada')
  ok(await page.locator('img[alt="Sonic"]').count() > 0, 'el personaje de seed del rival (Sonic) también')
  await page.screenshot({ path: `${OUT}/1-verificado.png` })

  // Bracket público oficial: el resultado avanzó y luce los personajes
  await page.goto(`${BASE}/torneo/t1/bracket`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText(/Bracket oficial del organizador/).count() > 0, 'el bracket público es el oficial (generado)')
  ok(await page.getByText('Kaze').count() >= 2, 'el ganador (Kaze) avanza a la siguiente ronda')
  ok(await page.locator('img[alt="Joker"]').count() > 0, 'el bracket pinta el personaje del ganador (Joker)')
  ok(await page.locator('img[alt="Sonic"]').count() > 0, 'y el del rival (Sonic), junto al resultado jugado')
  await page.screenshot({ path: `${OUT}/1-bracket-personajes.png`, fullPage: true })

  // Perfil: el contador real se fusiona con los mains elegidos
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('×3').count() > 0, 'el main Pikachu enseña sus partidas verificadas (×3 de seed)')
  ok(await page.locator('img[alt="Joker"]').count() > 0, 'Joker (jugado de verdad, no main) aparece en la tarjeta')
  await page.screenshot({ path: `${OUT}/1-perfil-mains.png` })
  await ctx.close()
}

// ── 2. Camino de disputa: el toggle demo hace que el rival reporte distinto
{
  const { ctx, page } = await nuevaPagina(seedGestion)
  console.log('— disputa (reportes que no coinciden)')
  await login(page, 'jugador@torneum.com')
  await hastaHoja(page, `${BASE}/torneo/t1/mesa?n=2&vs=${encodeURIComponent('Kaze vs Aqua')}&mid=r0m0`)
  await page.getByRole('button', { name: 'Kaze', exact: true }).click()
  await page.getByText('(demo) el rival reportará distinto').click()
  await page.getByRole('button', { name: /Enviar mi reporte/ }).click()
  await page.waitForTimeout(3600)
  ok(await page.getByText('Disputa abierta').count() > 0, 'reportes distintos → disputa abierta para el jugador')
  await page.screenshot({ path: `${OUT}/2-disputa-jugador.png` })

  // El TO la ve en el modo directo (mismo storage, cuenta de TO) y la resuelve
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  ok(await page.getByText(/Kaze y Aqua reclaman la victoria/).count() > 0, 'el TO ve la disputa nueva en modo directo')
  ok(await page.getByRole('button', { name: /Poner el resultado/ }).count() >= 2, 'con el CTA de siempre («Poner el resultado»)')
  await page.screenshot({ path: `${OUT}/2-disputa-to.png` })
  await ctx.close()
}

// ── 3. Flag por juego: Magic (plantilla sin personajes) no ofrece selector
{
  const { ctx, page } = await nuevaPagina(seedGestion)
  console.log('— flag por juego (Magic, sin personajes)')
  await login(page, 'jugador@torneum.com')
  await hastaHoja(page, `${BASE}/torneo/t2/mesa?n=1&vs=${encodeURIComponent('Kaze vs Aqua')}&mid=r0m0`)
  ok(await page.getByText('¿Con qué has jugado?').count() === 0, 'Magic NO ofrece selector de personajes')
  await page.getByRole('button', { name: 'Kaze', exact: true }).click()
  await page.getByRole('button', { name: /Enviar mi reporte/ }).click()
  await page.waitForTimeout(3600)
  ok(await page.getByText('Resultado verificado').count() > 0, 'el consenso funciona igual sin personajes')
  ok(await page.locator('img[alt="Joker"]').count() === 0, 'y no se cuela ningún personaje')
  await page.screenshot({ path: `${OUT}/3-magic-sin-personajes.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
