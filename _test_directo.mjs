// Prueba del modo directo del TO (tanda 27-08 tarde-2): disputas resueltas con
// MARCADOR manual (no «gana X»), y bracket EN DIRECTO que marca qué se juega en
// qué mesa y avanza con reportes/liberaciones.
//   BASE_URL=http://localhost:3006 node _test_directo.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-directo'
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

// Bracket real sembrado (8 seeds de Smash en t1), compartido por los bloques 2b y 3.
const seedGestion = () => {
  const seeds = ['smash-p0', 'smash-p1', 'smash-p2', 'smash-p3', 'smash-p4', 'smash-p5', 'smash-p6', 'smash-p7']
  localStorage.setItem('todh-demo', JSON.stringify({
    state: { gestion: { t1: { checkin: seeds, cerrado: true, generado: true, seeds, winners: {}, puntos: {}, bo: { base: 3, top: 5, desde: 'semis' }, bajas: [] } } },
    version: 0,
  }))
}

// Liberar la mesa `n` desde la vista lista (dos selectores, como el flujo real).
async function liberarMesa(page, mesaN) {
  await page.locator(`div.card-premium:has(> div span:text-is("Mesa ${mesaN}"))`).getByRole('button', { name: /^Liberar$/ }).click()
    .catch(async () => {
      const cards = page.locator('div.card-premium', { hasText: `Mesa ${mesaN}` })
      await cards.filter({ has: page.getByRole('button', { name: /^Liberar$/ }) }).first().getByRole('button', { name: /^Liberar$/ }).click()
    })
}

// ── 1. Disputa: el TO determina el MARCADOR, no «gana x o y»
{
  const { ctx, page } = await nuevaPagina()
  console.log('— disputa resuelta con marcador manual')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  ok(await page.getByRole('button', { name: /Gana Lux|Gana Nyx/ }).count() === 0, 'los botones «gana X / gana Y» ya no existen')
  ok(await page.getByRole('button', { name: /Poner el resultado/ }).count() > 0, 'la disputa ofrece «Poner el resultado»')
  await page.getByRole('button', { name: /Poner el resultado/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Disputa · Mesa 5').count() > 0, 'se abre la hoja de marcador de la disputa')
  ok(await page.getByText('Liberar sin resultado').count() === 0, 'sin salida «sin resultado»: la disputa exige marcador')
  await page.getByRole('button', { name: /^3–1$/ }).click(); await page.waitForTimeout(300)
  const resolver = page.getByRole('button', { name: /Resolver: gana Lux 3–1/ })
  ok(await resolver.count() > 0, 'el CTA refleja el marcador exacto (Lux 3–1)')
  await resolver.click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Poner el resultado/).count() === 0, 'la disputa queda resuelta y desaparece')
  await page.screenshot({ path: `${OUT}/1-disputa-marcador.png` })
  await ctx.close()
}

// ── 2. Bracket en directo: vacío sin generar; vivo con el cuadro real
{
  // 2a. Sin bracket generado: hueco con CTA a Gestión
  const { ctx, page } = await nuevaPagina()
  console.log('— bracket en directo')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  ok(await page.getByText('Bracket en directo').count() > 0, 'la sección Bracket en directo existe')
  ok(await page.getByText('Aún no hay bracket generado').count() > 0, 'sin cuadro: hueco claro con CTA')
  ok(await page.getByRole('link', { name: /Generar bracket/ }).count() > 0, 'que lleva a Gestión')
  await ctx.close()
}
{
  // 2b. Con bracket real sembrado (8 seeds de Smash en t1): asignar → jugándose → liberar con marcador → avanza
  const { ctx, page } = await nuevaPagina(seedGestion)
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  ok(await page.getByText('Bracket real').count() > 0, 'con cuadro generado, la cola marca «Bracket real»')
  ok(await page.getByText('Cuartos', { exact: true }).count() > 0, 'el bracket en directo pinta las rondas (Cuartos)')
  ok(await page.getByText('Esperando rival').count() > 0, 'las rondas futuras esperan rival')
  // Asignar el primer combate a una mesa → el bracket lo marca «Jugándose · Mesa N»
  await page.locator('button[aria-label="Vista lista"]').click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Asignar/ }).first().click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Jugándose · Mesa/).count() > 0, 'al asignar, el bracket marca el combate JUGÁNDOSE con su mesa')
  await page.screenshot({ path: `${OUT}/2-bracket-jugandose.png`, fullPage: true })
  // Liberar ESA mesa (no una de muestra): primero el diálogo de decisión y
  // después el marcador → el bracket avanza
  const badge = await page.locator('text=/Jugándose · Mesa \\d+/').first().innerText()
  const mesaN = badge.match(/mesa (\d+)/i)[1]
  await liberarMesa(page, mesaN)
  await page.waitForTimeout(500)
  ok(await page.getByText('¿Qué hacemos con la partida en curso?').count() > 0, 'liberar con partida activa abre el diálogo de decisión')
  await page.getByRole('button', { name: /Establecer resultado/ }).click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /^3–1$/ }).click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Guardar: gana/ }).click(); await page.waitForTimeout(900)
  ok(await page.getByText(/Jugándose · Mesa/).count() === 0, 'liberada la mesa, ya no hay combate jugándose')
  ok(await page.getByText('Jugado', { exact: true }).count() > 0, 'el combate figura JUGADO con su marcador')
  // El ganador (seed 1, Kaze) aparece dos veces: cuartos y su hueco de semis
  ok(await page.getByText('Kaze').count() >= 2, 'el ganador avanza a la siguiente ronda en vivo')
  await page.screenshot({ path: `${OUT}/2-bracket-avanza.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Fase 3: cancelar partida (vuelve a la cola) y quitar/añadir mesas del torneo
{
  const { ctx, page } = await nuevaPagina(seedGestion)
  console.log('— cancelar partida y mesas fuera/dentro del torneo')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(2000)
  await page.locator('button[aria-label="Vista lista"]').click(); await page.waitForTimeout(400)
  // Combates en cola = badges «Siguiente» + «Listo»
  const enCola = async () =>
    (await page.getByText('Siguiente', { exact: true }).count()) + (await page.getByText('Listo', { exact: true }).count())
  const antes = await enCola()
  await page.getByRole('button', { name: /Asignar/ }).first().click(); await page.waitForTimeout(700)
  ok(await enCola() === antes - 1, 'al asignar, el combate sale de la cola')
  const badge = await page.locator('text=/Jugándose · Mesa \\d+/').first().innerText()
  const mesaN = badge.match(/mesa (\d+)/i)[1]
  await liberarMesa(page, mesaN)
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Cancelar partida/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Jugándose · Mesa/).count() === 0, 'cancelar partida deja la mesa libre (sin combate jugándose)')
  ok(await enCola() === antes, 'el combate vuelve a la cola como pendiente, como si no se hubiera jugado')
  await page.screenshot({ path: `${OUT}/3-cancelar-partida.png`, fullPage: true })
  // Quitar una mesa del torneo → queda «fuera» y re-añadible; añadirla la recupera
  const addAntes = await page.getByRole('button', { name: /Añadir al torneo/ }).count()
  await page.locator('button[aria-label="Quitar del torneo"]').first().click(); await page.waitForTimeout(500)
  ok(await page.getByRole('button', { name: /Añadir al torneo/ }).count() === addAntes + 1, 'quitar del torneo deja la mesa fuera, con botón para re-añadirla')
  await page.getByRole('button', { name: /Añadir al torneo/ }).first().click(); await page.waitForTimeout(500)
  ok(await page.getByRole('button', { name: /Añadir al torneo/ }).count() === addAntes, 'añadir al torneo devuelve la mesa al plano del torneo (libre)')
  await page.screenshot({ path: `${OUT}/3-mesas-torneo.png`, fullPage: true })
  await ctx.close()
}

// ── 4. Preparación de sala ANTES del directo (decisión Albert 30-08, #3):
// con un torneo NO empezado el TO marca caídas y quita/añade mesas, y esa
// preparación PERSISTE (slice prepMesas del store) tras recargar. Asignar
// combates sigue exigiendo directo (la cola no existe antes).
{
  const { ctx, page } = await nuevaPagina()
  console.log('— preparación de sala antes del directo (persiste)')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  // t6 «SF6 Invitational — Platino» (lima, gamba) aún no está en directo
  await page.getByRole('button', { name: /SF6 Invitational/ }).click(); await page.waitForTimeout(900)
  ok(await page.getByText('Empieza').count() > 0, 'el torneo elegido está en modo preparación (no en directo)')
  await page.locator('button[aria-label="Vista lista"]').click(); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Asignar siguiente/ }).count() === 0, 'sin directo NO se asignan combates (la cola no existe aún)')
  // Marcar caída la primera mesa libre
  await page.locator('button[aria-label="Marcar caída"]').first().click(); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Reactivar/ }).count() === 1, 'marcar caída funciona ANTES del directo')
  // Quitar del torneo otra mesa (la caída es la primera; usamos la siguiente)
  const addAntes = await page.getByRole('button', { name: /Añadir al torneo/ }).count()
  await page.locator('button[aria-label="Quitar del torneo"]').nth(1).click(); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Añadir al torneo/ }).count() === addAntes + 1, 'quitar del torneo funciona ANTES del directo')
  // Recargar: la preparación sobrevive (se re-selecciona el torneo y sigue igual)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  await page.getByRole('button', { name: /SF6 Invitational/ }).click(); await page.waitForTimeout(900)
  await page.locator('button[aria-label="Vista lista"]').click(); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Reactivar/ }).count() === 1, 'la mesa caída SIGUE caída tras recargar')
  ok(await page.getByRole('button', { name: /Añadir al torneo/ }).count() === addAntes + 1, 'la mesa quitada sigue fuera tras recargar')
  await page.screenshot({ path: `${OUT}/4-prep-persiste.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
