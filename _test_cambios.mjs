// Prueba de la tanda de cambios del 27-08 (perfil, reglas, local/calendario,
// reparto 80/20, resultados manuales del TO, sección Live, ranking dual).
//   BASE_URL=http://localhost:3006 node _test_cambios.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-cambios'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina(movil = false) {
  const ctx = await browser.newContext({ viewport: movil ? { width: 390, height: 844 } : { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
  })
  return { ctx, page }
}

async function login(page, email) {
  // Cierra la sesión anterior (si la hay): /login rebota a quien ya está dentro
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 1. Perfil → Identidad sin la etiqueta «Juego»
{
  const { ctx, page } = await nuevaPagina()
  console.log('— perfil: identidad sin etiqueta «Juego»')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Identidad', { exact: true }).count() > 0, 'la tarjeta Identidad está')
  ok(await page.getByText('Juego', { exact: true }).count() === 0, 'la etiqueta «Juego» ya no aparece junto a los chips')
  await ctx.close()
}

// ── 2. Reglas del torneo: desplegable con el reglamento del TO
{
  const { ctx, page } = await nuevaPagina()
  console.log('— ficha: reglas desplegables del TO')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t6`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Reglas del torneo').count() > 0, 'el bloque de reglas existe')
  ok(await page.getByText('Del organizador').count() === 0, 'y viene CERRADO por defecto (menos recargado)')
  await page.getByRole('button', { name: /Reglas del torneo/ }).click(); await page.waitForTimeout(400)
  ok(await page.getByText('Del organizador').count() > 0, 'al desplegarlo salen las reglas del organizador')
  ok(await page.getByText(/DLC permitidos/).count() > 0, 'con el reglamento que fijó el TO (t6)')
  ok(await page.getByText('Estándar Torneum').count() > 0, 'y las estándar de Torneum debajo')
  await page.screenshot({ path: `${OUT}/2-reglas.png` })
  // El TO tiene el campo al crear torneo
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByPlaceholder(/3 stocks, 7 minutos/).count() > 0, 'crear-torneo tiene el campo de reglamento')
  await ctx.close()
}

// ── 3+4. Página del local con calendario; MiniLocal ancho y su «Pedir fecha»
{
  const { ctx, page } = await nuevaPagina()
  console.log('— TO: ficha → local → calendario de reservas (80/20)')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/torneo/t6`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /D[oó]nde/i }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Sede Fundadora').count() > 0, 'la ventana del local abre (MiniLocal)')
  await page.getByRole('link', { name: /calendario del local/i }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/local/gamba'), `«Pedir fecha» lleva a la página del local (${page.url()})`)
  ok(await page.getByText('Calendario · pide tu fecha').count() > 0, 'con su CALENDARIO de reservas (vista de TO)')
  // Pedir un día libre → formulario con reparto base 80/20
  await page.getByTitle(/toca para pedir fecha/i).first().click(); await page.waitForTimeout(500)
  ok(await page.getByText('Local 80% · TO 20%').count() > 0, 'el reparto parte de 80% local / 20% TO')
  await page.getByRole('button', { name: /Enviar petición a Gamba/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Solicitud pendiente/).count() > 0, 'la petición queda pendiente para la sede')
  await page.screenshot({ path: `${OUT}/4-calendario-local.png` })
  // La sede la recibe en su panel
  await page.evaluate(() => localStorage.removeItem('todh-sesion'))
  await login(page, 'local@torneum.com')
  await page.goto(`${BASE}/sede/solicitudes`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900)
  ok(await page.getByText('Lima Esports').count() > 0, 'la solicitud del calendario llega al panel de la sede')
  await ctx.close()
}

// ── 4b. Jugador SIN rol de TO: página pública del local, sin negocio
{
  const { ctx, page } = await nuevaPagina()
  console.log('— jugador sin TO: local solo público')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/local/gamba`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Gamba Esports').count() > 0, 've la página pública del local')
  ok(await page.getByText('Calendario · pide tu fecha').count() === 0, 'NO ve el calendario de reservas')
  ok(await page.getByText(/€\/noche/).count() === 0, 'NO ve la tarifa €/noche')
  ok(await page.getByText(/Activa tu perfil de TO/i).count() > 0, 've cómo conseguir el rol de TO')
  await ctx.close()
}

// ── 6. Modo directo: resultado manual al liberar mesa + sets editables
{
  const { ctx, page } = await nuevaPagina()
  console.log('— modo directo: marcador manual del TO')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/modo-directo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  ok(await page.getByText('Sets · al mejor de').count() > 0, 'los sets (Bo) se editan en vivo')
  await page.locator('button[aria-label="Vista lista"]').click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /^Liberar$/ }).first().click(); await page.waitForTimeout(500)
  ok(await page.getByText('Cancelar partida').count() > 0, 'liberar ofrece cancelar la partida (vuelve a la cola)')
  await page.getByRole('button', { name: /Establecer resultado/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText(/Resultado · Mesa/).count() > 0, 'o establecer resultado: abre el marcador manual')
  await page.getByRole('button', { name: /^3–1$/ }).click(); await page.waitForTimeout(300)
  const guardar = page.getByRole('button', { name: /Guardar: gana/ })
  ok(await guardar.count() > 0, 'el ganador sale del marcador (3–1)')
  await guardar.click(); await page.waitForTimeout(600)
  ok(await page.getByText(/Resultado · Mesa/).count() === 0, 'se guarda, se libera la mesa y se cierra la hoja')
  await page.screenshot({ path: `${OUT}/6-resultado-manual.png` })
  await ctx.close()
}

// ── 7. Live: lista de salas + sala con bracket, rivales y probabilidad
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Live: salas del jugador')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/live`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('TFT Iberian Cup — Clasificatorio').count() > 0, 'aparece el torneo inscrito (t4)')
  ok(await page.getByText('Sala abierta').count() > 0, 'y su sala está abierta (torneo en directo)')
  await page.goto(`${BASE}/live/t4`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Tu cuadro en vivo').count() > 0, 'la sala enseña tu cuadro en vivo')
  ok(await page.getByText('Marcadores en vivo').count() > 0, 'con los marcadores del torneo')
  ok(await page.getByText(/%$/).count() > 0 || await page.locator('text=/\\d+%/').count() > 0, 'y probabilidad de próximos rivales')
  // Rival → perfil con mains e historial
  await page.getByRole('button', { name: /Después te cruzas/i }).count() // noop safe
  await page.locator('text=/\\d+%/').first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Últimos torneos').count() > 0, 'el perfil del rival incluye su historial de torneos')
  await page.screenshot({ path: `${OUT}/7-live-sala.png` })
  // Sala de un torneo NO inscrito: invita a inscribirse
  await page.goto(`${BASE}/live/t3`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('La sala Live es para inscritos').count() > 0, 'sin inscripción, la sala pide inscribirse')
  // Inscribirse a t3 (no está en directo) → sala cerrada con detalles y reglas
  await page.goto(`${BASE}/torneo/t3`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  await page.goto(`${BASE}/live/t3`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText(/la sala se abre cuando el organizador/i).count() > 0, 'inscrito y sin abrir: detalles a la espera del TO')
  ok(await page.getByText('Reglas del torneo').count() > 0, 'con las reglas visibles antes de empezar')
  // Sala cerrada: detalles + reglas antes de empezar (t8 no está inscrito; usamos noti seed t4… t4 abierta).
  await ctx.close()
}

// ── 7b. Live en el menú (móvil y escritorio)
{
  const { ctx, page } = await nuevaPagina(true)
  console.log('— Live en la navegación móvil')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('a[href="/live"]').count() > 0, 'la pestaña Live está en la barra inferior')
  await ctx.close()
}

// ── 8. Ranking dual: Torneum ↔ plataforma del juego (pedido por Albert; se queda)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— ranking: fuente Torneum ↔ start.gg')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/ranking`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByRole('button', { name: /start\.gg/ }).count() > 0, 'el conmutador ofrece la plataforma del juego (start.gg para Smash)')
  await page.getByRole('button', { name: /start\.gg/ }).first().click(); await page.waitForTimeout(800)
  ok(await page.getByText(/Circuito global de start\.gg/).count() > 0, 'muestra la puntuación de la plataforma')
  ok(await page.getByText(/no afecta al ranking Torneum/).count() > 0, 'dejando claro que es solo consulta')
  ok(await page.getByText('Presencial').count() === 0, 'sin los ejes Torneum (modalidad/ámbito ocultos)')
  await page.getByRole('button', { name: /^Torneum$/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByText('Circuito').count() > 0, 'volver a Torneum recupera país/mundial/circuito')
  await page.screenshot({ path: `${OUT}/8-ranking-dual.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
