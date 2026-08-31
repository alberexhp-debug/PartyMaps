// Mundo compartido, ronda 2 (backlog 31-08): (B) buzón cruzado — las notis
// llegan a la CUENTA correcta al entrar (amistad, mensaje, torneo en directo,
// plaza liberada al TO, promoción de espera); (C) la cola de espera de otras
// cuentas la ve y la promociona el TO desde /gestionar (con reconciliación de
// la cartera del promovido); (E) chat directo entre cuentas amigas en el mundo.
//   BASE_URL=http://localhost:3006 node _test_mundo2.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-mundo2'
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
// El confirm() de «Iniciar torneo» (y las bajas del TO) se aceptan siempre
page.on('dialog', d => d.accept())
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
  localStorage.setItem('todh-demo-onboarding', '1')
})

const saltarOnboarding = async () => {
  const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
  if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(600) }
}
async function loginBoton(nombre) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForTimeout(1800)
  await saltarOnboarding()
}
async function logout() {
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Cerrar sesión/i }).first().click()
  await page.waitForURL('**/login**', { timeout: 8000 })
}
async function abrirFicha(nombreTorneo) {
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await saltarOnboarding()
  await page.getByText(nombreTorneo).first().click()
  await page.waitForURL('**/torneo/**', { timeout: 8000 }); await page.waitForTimeout(1500)
}
async function inscribirse(nombreTorneo) {
  await abrirFicha(nombreTorneo)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
}

// ── A. David crea «Copa Buzón» con solo 4 plazas
console.log('— David crea «Copa Buzón» (4 plazas)')
await loginBoton('David')
await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByPlaceholder(/Lima Smash Weekly/).fill('Copa Buzón')
for (let i = 0; i < 7; i++) { await page.getByRole('button', { name: '−' }).first().click(); await page.waitForTimeout(120) }
await page.getByRole('button', { name: /elegir sede/i }).first().click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await page.waitForTimeout(500)
await page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await page.waitForTimeout(1200)
await logout()

// ── B. Javier se inscribe y pide amistad a Lucía
console.log('— Javier: se inscribe y agrega a Lucía')
await loginBoton('Javier')
await inscribirse('Copa Buzón')
await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
await page.getByPlaceholder(/Busca por alias/).fill('Lucía'); await page.waitForTimeout(500)
await page.getByRole('button', { name: /Agregar/ }).first().click(); await page.waitForTimeout(700)
await logout()

// ── C. Lucía: la solicitud le llega por el BUZÓN, acepta, chatea y se inscribe
console.log('— Lucía: buzón de amistad, chat y su inscripción')
await loginBoton('Lucía')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
ok(await page.getByText('Nueva solicitud de amistad').count() > 0, '(B) la solicitud de Javier llega al buzón de Lucía')
await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
await page.locator('button[aria-label="Aceptar a Javier"]').click(); await page.waitForTimeout(700)
await page.locator('button[aria-label="Chatear con Javier"]').click(); await page.waitForTimeout(700)
ok(await page.getByText('Aún no hay mensajes').count() > 0, '(E) el chat con Javier abre vacío')
await page.getByPlaceholder(/Escríbele a Javier/).fill('¡Nos vemos en la Copa Buzón!')
await page.getByRole('button', { name: 'Enviar' }).click(); await page.waitForTimeout(700)
ok(await page.getByText('¡Nos vemos en la Copa Buzón!').count() > 0, '(E) su mensaje queda en el hilo')
await page.keyboard.press('Escape'); await page.locator('button[aria-label="Cerrar"]').first().click().catch(() => {})
await inscribirse('Copa Buzón')
await logout()

// ── D. Carmen y Álvaro llenan el torneo (4/4)
for (const nombre of ['Carmen', 'Álvaro']) {
  console.log(`— ${nombre} se inscribe`)
  await loginBoton(nombre)
  await inscribirse('Copa Buzón')
  await logout()
}

// ── E. Marcos: lleno → lista de espera (cola del mundo)
console.log('— Marcos entra en lista de espera')
await loginBoton('Marcos')
await abrirFicha('Copa Buzón')
ok(await page.getByText(/4 ?\/ ?4/).count() > 0, 'el torneo está lleno (4/4)')
await page.getByRole('button', { name: /lista de espera/i }).first().click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: /Apuntarme a la lista de espera/i }).last().click(); await page.waitForTimeout(1200)
ok(await page.getByText(/En lista de espera/i).count() > 0, '(C) Marcos queda en la cola')
await logout()

// ── F. Javier: buzón (aceptación + mensaje), responde y cancela su plaza
console.log('— Javier: buzón, respuesta y cancelación')
await loginBoton('Javier')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
ok(await page.getByText('Lucía aceptó tu solicitud').count() > 0, '(B) la aceptación llega al buzón de Javier')
ok(await page.getByText('💬 Mensaje de Lucía').count() > 0, '(B) y el aviso del mensaje de chat')
await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
await page.locator('button[aria-label="Chatear con Lucía"]').click(); await page.waitForTimeout(700)
ok(await page.getByText('¡Nos vemos en la Copa Buzón!').count() > 0, '(E) Javier lee el mensaje de Lucía (mundo común)')
await page.getByPlaceholder(/Escríbele a Lucía/).fill('GG, allí estaré')
await page.getByRole('button', { name: 'Enviar' }).click(); await page.waitForTimeout(700)
await page.locator('button[aria-label="Cerrar"]').first().click(); await page.waitForTimeout(500)
await abrirFicha('Copa Buzón')
await page.getByRole('button', { name: /Cancelar inscripción/ }).first().click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /^Cancelar mi plaza$/ }).click(); await page.waitForTimeout(1000)
await logout()

// ── G. David: alerta de plaza liberada + mete a Marcos desde la cola
console.log('— David: alerta cruzada y promoción de Marcos')
await loginBoton('David')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
ok(await page.getByText(/Plaza liberada en «Copa Buzón»/).count() > 0, '(B) la alerta de plaza liberada llega al TO en SU cuenta')
await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByText('Copa Buzón').first().click()
await page.waitForURL('**/gestionar/**', { timeout: 8000 }); await page.waitForTimeout(1800)
ok(await page.getByText('Marcos').count() > 0, '(C) David VE a Marcos en la cola de espera')
await page.locator('button[aria-label="Meter a Marcos"]').click(); await page.waitForTimeout(900)
ok(await page.locator('button[aria-label="Meter a Marcos"]').count() === 0, '(C) Marcos sale de la cola al meterlo')
ok(await page.getByText('Marcos').first().isVisible().catch(() => false), 'y Marcos pasa a la lista del torneo')
await logout()

// ── H. Marcos: se entera al entrar y tiene su entrada (reconciliación)
console.log('— Marcos: buzón de promoción y entrada en cartera')
await loginBoton('Marcos')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
ok(await page.getByText(/¡Estás dentro! Plaza liberada/).count() > 0, '(B) el buzón le da la noticia a Marcos')
await page.goto(`${BASE}/entradas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
ok(await page.getByText('Copa Buzón').count() > 0, '(C) y su entrada de Copa Buzón está en la cartera')
await page.screenshot({ path: `${OUT}/1-marcos-entrada.png` })

// ── I. El TO inicia y a Marcos (inscrito) le llega el aviso al entrar
console.log('— iniciar torneo avisa a los inscritos de otras cuentas')
await logout()
await loginBoton('David')
await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByText('Copa Buzón').first().click()
await page.waitForURL('**/gestionar/**', { timeout: 8000 }); await page.waitForTimeout(1800)
await page.getByRole('button', { name: /Check-in masivo/i }).click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Generar bracket/ }).first().click(); await page.waitForTimeout(900)
await page.getByRole('button', { name: /Iniciar torneo/ }).first().click(); await page.waitForTimeout(900)
await logout()
await loginBoton('Marcos')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
ok(await page.getByText(/«Copa Buzón» ha empezado/).count() > 0, '(B) el «ha empezado» llega a Marcos al entrar')

// ── J. (A) La sala live es TU partida real en cada cuenta: rival del bracket,
// estado honesto y enlace a la mesa con el combate (mid) para el doble reporte.
console.log('— (A) sala live: la partida real de cada cuenta')
const idCopa = await page.evaluate(() => {
  const w = JSON.parse(localStorage.getItem('todh-mundo'))
  return w?.state?.creados?.find(c => c.nombre === 'Copa Buzón')?.id ?? null
})
await page.goto(`${BASE}/live/${idCopa}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
ok(await page.getByText('Aún sin sets jugados').count() > 0, '(A) Marcos aún no tiene sets (honesto, sin maqueta)')
ok(await page.getByText(/Ahora: tú vs Lucía/).count() > 0, '(A) su rival REAL del bracket es Lucía')
ok(await page.getByText('¡Ve ya a tu mesa!').count() > 0, '(A) el torneo está en directo: VE YA')
const hrefMesa = await page.locator('a[href*="/mesa?"]').first().getAttribute('href').catch(() => null)
ok(!!hrefMesa && hrefMesa.includes('mid='), `(A) «Ver mi mesa» lleva el combate real (${hrefMesa?.slice(-60)})`)
ok(await page.getByText('Carmen').count() > 0 && await page.getByText('Álvaro').count() > 0, '(A) el siguiente cruce enseña a Carmen y Álvaro')
await page.screenshot({ path: `${OUT}/2-live-marcos.png` })
// La otra punta del MISMO match: Lucía ve a Marcos como rival
await logout()
await loginBoton('Lucía')
await page.goto(`${BASE}/live/${idCopa}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
ok(await page.getByText(/Ahora: tú vs Marcos/).count() > 0, '(A) Lucía ve el mismo match desde su lado (vs Marcos)')

await ctx.close()
await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
