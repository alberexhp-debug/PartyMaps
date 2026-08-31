// Prueba de la Fase 6 (spec §7): CREWS. Crear una crew desde Amigos (nombre +
// tag autovalidado + miembros), límite de 2 por juego, vista de crew con
// emblema/puntuación media/logros, tag #TAG junto al nick SOLO en ranking
// Torneum y brackets (no en Amigos), bloque de crews en el perfil y flujo de
// inscripción por equipos: abrir cupo → convocatoria en el grupo de chat →
// enlace → sheet «en nombre de» → el cupo avanza (miembros seed + tú).
//   BASE_URL=http://localhost:3006 node _test_crews.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-crews'
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

async function login(page, email = 'jugador@torneum.com') {
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 1. Crear una crew desde Amigos + límite de 2 por juego
{
  const { ctx, page } = await nuevaPagina()
  console.log('— crear crew desde Amigos y límite 2 por juego')
  await login(page)
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('#NOCT').count() === 0, 'la pestaña Amigos NO enseña tags de crew (spec: solo torneo y ranking)')
  await page.getByRole('button', { name: /^Grupos y crews$/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Nocturna').count() > 0, 'las crews sembradas del usuario están (Nocturna)')
  ok(await page.getByText('#VNDL').count() > 0, 'y Vandalia #VNDL (juego de equipos)')

  // Crear una segunda crew de Smash (permitido: límite es 2)
  await page.getByRole('button', { name: /Crear una crew/ }).click(); await page.waitForTimeout(500)
  const sheet = page.locator('div.fixed.inset-0').last()
  await page.getByPlaceholder(/Nombre de la crew/).fill('Trueno Krew')
  await page.getByPlaceholder('NOCT', { exact: true }).fill('TKRW')
  await sheet.getByRole('button', { name: 'Smash', exact: true }).click()
  await sheet.getByText('Kaze', { exact: true }).click()
  await sheet.getByText('Volt', { exact: true }).click()
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Crear crew/ }).click(); await page.waitForTimeout(800)
  ok(await page.getByText('Trueno Krew').count() > 0, 'la crew nueva aparece en la lista de crews')
  ok(await page.getByText('#TKRW').count() > 0, 'con su tag #TKRW')

  // La 3ª de Smash se rechaza con mensaje claro
  await page.getByRole('button', { name: /Crear una crew/ }).click(); await page.waitForTimeout(500)
  const sheet2 = page.locator('div.fixed.inset-0').last()
  await page.getByPlaceholder(/Nombre de la crew/).fill('Tercera')
  await page.getByPlaceholder('NOCT', { exact: true }).fill('TERC')
  await sheet2.getByRole('button', { name: 'Smash', exact: true }).click()
  await sheet2.getByText('Sora', { exact: true }).click()
  await page.waitForTimeout(300)
  ok(await page.getByText(/Ya estás en 2 crews de este juego/).count() > 0, 'la 3ª crew de Smash enseña el motivo del rechazo')
  ok(await page.getByRole('button', { name: /Crear crew/ }).isDisabled(), 'y el botón de crear queda deshabilitado')
  // El tag repetido también se valida
  await sheet2.getByRole('button', { name: 'Valorant', exact: true }).click()
  await page.getByPlaceholder('NOCT', { exact: true }).fill('NOCT')
  await page.waitForTimeout(300)
  ok(await page.getByText('Ese tag ya lo usa otra crew.').count() > 0, 'un tag ocupado (#NOCT) se rechaza con mensaje claro')
  await page.screenshot({ path: `${OUT}/1-crear-crew.png`, fullPage: true })
  await ctx.close()
}

// ── 2. Vista de crew: emblema real, puntuación media, miembros y logros
{
  const { ctx, page } = await nuevaPagina()
  console.log('— vista de crew (emblema + media + logros)')
  await login(page)
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  await page.getByRole('button', { name: /^Grupos y crews$/ }).click(); await page.waitForTimeout(400)
  await page.getByText('Nocturna').first().click(); await page.waitForTimeout(800)
  // Vista unificada (31-08): la fila abre el CHAT con detalles al lado; la
  // página completa de la crew se abre desde «Ver crew» del panel de detalles.
  await page.getByRole('link', { name: /Ver crew/ }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/crew/crew-nox'), `la crew abre su vista (${page.url()})`)
  ok(await page.getByText('#NOCT').count() > 0, 'con el #TAG en la cabecera')
  ok(await page.getByText('Puntuación de la crew').count() > 0, 'el bloque de puntuación está')
  ok(await page.getByText('2290').count() > 0, 'la media REAL de sus miembros (2290 = media de Tú/Kaze/Sora/Volt en Smash)')
  ok(await page.locator('span[title="Diamante"]').count() > 0, 'el emblema es el del nivel real (Diamante, medallion con title)')
  ok(await page.getByText(/a \d+ pts de Élite/).count() > 0, 'y dice a cuánto está del siguiente nivel (Élite)')
  ok(await page.getByText('Tú', { exact: true }).count() > 0, 'los miembros te incluyen a ti')
  ok(await page.getByText('Kaze').count() > 0, 'y a los del pool (Kaze)')
  // Logros de la crew: desbloqueados por nivel + los de nivel superior en gris
  ok(await page.getByText('Primer torneo como crew').count() > 0, 'logro sembrado «Primer torneo como crew»')
  ok(await page.getByText('Top 4 en un Weekly').count() > 0, 'y «Top 4 en un Weekly»')
  ok(await page.getByText('Crew de Élite').count() > 0, 'el logro de Élite existe…')
  ok(await page.getByText('3/4').count() > 0, '…pero está bloqueado: contador 3/4 (nivel Diamante desbloquea 3)')
  await page.screenshot({ path: `${OUT}/2-vista-crew.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Tag junto al nick SOLO en ranking Torneum y brackets
{
  const { ctx, page } = await nuevaPagina()
  console.log('— tags en ranking Torneum y bracket (y solo ahí)')
  await login(page)
  await page.goto(`${BASE}/ranking`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('#NOCT').count() > 0, 'el ranking Torneum de Smash luce tags de serie (#NOCT)')
  // El conmutador a la plataforma externa (start.gg) NO lleva tags
  await page.getByRole('button', { name: 'start.gg' }).click(); await page.waitForTimeout(800)
  ok(await page.getByText('#NOCT').count() === 0, 'la vista start.gg NO enseña tags (los tags son de Torneum)')
  await page.screenshot({ path: `${OUT}/3a-ranking-tags.png`, fullPage: true })
  // Bracket público de t1 (Smash, doble eliminación)
  await page.goto(`${BASE}/torneo/t1/bracket`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('#NOCT').count() >= 1, 'el bracket de t1 enseña #NOCT junto al nick (Kaze/Sora/Volt)')
  ok(await page.getByText('#DOJO').count() >= 1, 'y #DOJO (Zen), repartidos entre el pool')
  await page.screenshot({ path: `${OUT}/3b-bracket-tags.png`, fullPage: true })
  await ctx.close()
}

// ── 4. Bloque de crews en el perfil
{
  const { ctx, page } = await nuevaPagina()
  console.log('— crews en el perfil')
  await login(page)
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Tus crews').count() > 0, 'el perfil tiene el bloque «Tus crews»')
  ok(await page.getByText('#NOCT').count() > 0, 'con Nocturna #NOCT')
  ok(await page.getByText('#VNDL').count() > 0, 'y Vandalia #VNDL')
  await page.getByRole('link', { name: /Nocturna/ }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/crew/crew-nox'), `clic en la crew → su vista (${page.url()})`)
  await page.screenshot({ path: `${OUT}/4-perfil-crews.png`, fullPage: true })
  await ctx.close()
}

// ── 5. Inscripción por equipos desde la crew (t13, VALORANT 5v5)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— inscripción por equipos: cupo → convocatoria → enlace → pago individual')
  await login(page)
  await page.goto(`${BASE}/torneo/t13`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Inscribir a tu crew').count() > 0, 't13 (juego de equipos + crew tuya) ofrece «Inscribir a tu crew»')
  await page.getByRole('button', { name: /Inscribir a tu crew/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Inscripción por equipos').count() > 0, 'se abre el selector de crew')
  ok(await page.getByText('Vandalia').count() > 0, 'con tu crew de VALORANT (Vandalia)')
  await page.getByRole('button', { name: /Vandalia/ }).first().click(); await page.waitForTimeout(800)
  ok(await page.getByText(/0\/5 plazas confirmadas/).count() > 0, 'el cupo se abre en la ficha: 0/5 plazas')
  // El primer miembro seed paga su plaza solo a los ~2,6 s (patrón F5)
  await page.waitForTimeout(3200)
  ok(await page.getByText(/1\/5 plazas confirmadas/).count() > 0, 'un miembro seed paga su plaza solo: el cupo avanza a 1/5')
  await page.screenshot({ path: `${OUT}/5a-cupo-abierto.png`, fullPage: true })

  // La convocatoria cayó en el grupo de chat de la crew, con estado y enlace
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Grupos y crews$/ }).click(); await page.waitForTimeout(500)
  await page.getByText('Vandalia').first().click(); await page.waitForTimeout(600)
  ok(await page.getByText(/He abierto la inscripción de Vandalia #VNDL/).count() > 0, 'el grupo de la crew recibió el MENSAJE AUTOMÁTICO de la convocatoria')
  ok(await page.getByText(/5 plazas\. Entra y paga tu plaza/).count() > 0, 'con el cupo de plazas y la orden clara')
  ok(await page.getByText(/plazas confirmadas/).count() > 0, 'la tarjeta del chat enseña el estado del cupo')
  ok(await page.getByText(/Plaza pagada ✅/).count() > 0, 'y el miembro seed avisó en el chat al pagar la suya')
  await page.screenshot({ path: `${OUT}/5b-chat-convocatoria.png`, fullPage: true })
  await page.getByRole('link', { name: /plazas confirmadas/ }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/torneo/t13') && page.url().includes('crew=crew-vnd'), `la tarjeta lleva a la ficha con ?crew= (${page.url()})`)

  // Pagar MI plaza: sheet «en nombre de» + pago individual de siempre
  await page.getByRole('button', { name: /Pagar mi plaza/ }).first().click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Vas en nombre de Vandalia/).count() > 0, 'la hoja dice «Vas en nombre de Vandalia #VNDL»')
  ok(await page.getByText('El pago es individual: inscribirte confirma que acudes.').count() > 0, 'y que inscribirte = confirmas que acudes')
  await page.getByRole('button', { name: /^Pagar \d+\.\d{2}€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, 'el pago individual te deja inscrito como siempre')
  ok(await page.getByText('Tu plaza está confirmada').count() > 0, 'la ficha marca tu plaza dentro del cupo')
  ok(await page.getByText(/[2-5]\/5 plazas confirmadas/).count() > 0, 'y el cupo cuenta tu plaza junto a los seeds (≥2/5)')
  const cupo = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.crewTorneo?.t13)
  ok(cupo?.crewId === 'crew-vnd' && cupo?.inscritos?.includes('@usuario'), `quedas VINCULADO a la crew en el store (${JSON.stringify(cupo)})`)
  await page.screenshot({ path: `${OUT}/5c-inscrito-en-nombre.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
