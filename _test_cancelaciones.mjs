// Prueba de la Fase 7 (30-08): política de cancelaciones (ventana de 24 h) +
// cola de espera gestionada por el TO (fin de la promoción FIFO automática al
// cancelar un jugador; el TO mete al siguiente o elige a uno concreto).
//   BASE_URL=http://localhost:3006 node _test_cancelaciones.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-cancelaciones'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina(seedDemo = null) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  await page.addInitScript((seed) => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
    if (seed && !localStorage.getItem('todh-demo')) {
      localStorage.setItem('todh-demo', JSON.stringify({ state: seed, version: 0 }))
    }
  }, seedDemo)
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

// ── 1. Torneo FUTURO (t11, 15€): cancelar dentro de plazo → devolución 100%
{
  const { ctx, page } = await nuevaPagina()
  console.log('— jugador: cancelar un torneo futuro → devolución del 100%')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Cancela hasta 24 h antes y te devolvemos el 100%').count() > 0, 'la norma general (24 h) es visible junto al CTA')
  // Inscribirse (15€ + 10% = 16.5€)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, 'inscrito en t11 (torneo futuro)')
  // Abrir la hoja de cancelación: reglas claras ANTES de confirmar
  await page.getByRole('button', { name: /Cancelar inscripción/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Cancelar tu plaza').count() > 0, 'se abre la hoja de cancelación propia (sin window.confirm)')
  ok(await page.getByText('Si cancelas ahora se te devuelve el 100%').count() > 0, 'el caso aplicable: dentro de plazo → devolución')
  ok(await page.getByText('(15€)').count() > 0, 'con el importe de la inscripción (15€)')
  await page.screenshot({ path: `${OUT}/1-dialogo-devolucion.png` })
  ok(await page.getByRole('button', { name: /^Mantenerla$/ }).count() > 0, 'y la salida «Mantenerla»')
  await page.getByRole('button', { name: /^Cancelar mi plaza$/ }).click(); await page.waitForTimeout(900)
  ok(await page.getByText('Inscrito · ver en mi cartera').count() === 0, 'la plaza queda cancelada')
  // Notificaciones: reembolso correcto + alerta al TO
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Devolución emitida').count() > 0, 'noti «Devolución emitida»')
  ok(await page.getByText(/15€ de vuelta en tu método de pago/).count() > 0, 'con los 15€ de vuelta en el método de pago')
  ok(await page.getByText(/Plaza liberada en «Smash Arena Madrid — Major»/).count() > 0, 'y la ALERTA al TO: plaza liberada, decide quién entra')
  await page.screenshot({ path: `${OUT}/1-notis.png` })
  await ctx.close()
}

// ── 2. Torneo de HOY (t10, 3€, esHoy): cancelar fuera de plazo → sin devolución
{
  const { ctx, page } = await nuevaPagina({ inscritos: ['t4', 't10'] })
  console.log('— jugador: cancelar un torneo de hoy → pierde la inscripción')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t10`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Cancelar inscripción/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText(/Quedan menos de 24 h: si cancelas ahora pierdes la inscripción/).count() > 0, 'el diálogo avisa: <24 h → pierdes la inscripción')
  ok(await page.getByText('(3€)').count() > 0, 'con el importe que se pierde (3€)')
  await page.screenshot({ path: `${OUT}/2-dialogo-perdida.png` })
  await page.getByRole('button', { name: /^Cancelar mi plaza$/ }).click(); await page.waitForTimeout(900)
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Inscripción cancelada sin devolución').count() > 0, 'noti sin devolución (aviso con <24 h)')
  ok(await page.getByText(/no se reembolsa/).count() > 0, 'que deja claro que no hay reembolso')
  ok(await page.getByText(/Plaza liberada en «TFT Friday Showdown»/).count() > 0, 'alerta al TO de la plaza liberada')

  // El TO lo ve en gestionar: aviso con contador y las dos formas de resolver
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/gestionar/t10`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('1 plaza liberada por una cancelación').count() > 0, 'gestionar muestra el aviso destacado con contador')
  ok(await page.getByRole('button', { name: /Meter al siguiente/ }).count() > 0, 'con el botón «Meter al siguiente»')
  ok(await page.getByRole('button', { name: /^Meter a / }).count() >= 2, 'y «Meter» por fila de la cola (elegir a uno concreto)')
  ok(await page.getByText('Entró desde la lista de espera').count() === 0, 'nadie ha entrado aún: NO hubo promoción automática')
  await page.screenshot({ path: `${OUT}/2-gestionar-aviso.png` })
  await ctx.close()
}

// ── 3. El TO decide (t10 con 2 plazas pendientes): siguiente FIFO y uno concreto
{
  const { ctx, page } = await nuevaPagina({ plazasPendientes: { t10: 2 } })
  console.log('— TO: consola avisa y en gestionar mete al siguiente o a uno concreto')
  await login(page, 'to@torneum.com')
  // Aviso en la consola (bloque de avisos)
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('2 plazas liberadas por cancelaciones').count() > 0, 'la consola avisa de las plazas pendientes')
  ok(await page.getByText('Decide quién entra desde la lista de espera.').count() > 0, 'con la acción clara (decidir quién entra)')
  await page.screenshot({ path: `${OUT}/3-consola-aviso.png` })
  await page.getByText('2 plazas liberadas por cancelaciones').click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/gestionar/t10'), `el aviso lleva a gestionar el torneo (${page.url()})`)

  // Meter al siguiente (primero de la cola de t10: Blitz)
  await page.getByRole('button', { name: /Meter al siguiente/ }).click(); await page.waitForTimeout(900)
  ok(await page.getByText('Entró desde la lista de espera').count() === 1, '«Meter al siguiente» mete a UNA persona (el 1º de la cola)')
  ok(await page.getByText('Blitz').count() > 0, 'y es Blitz, el primero de la cola de t10')
  ok(await page.getByText('1 plaza liberada por una cancelación').count() > 0, 'queda 1 plaza pendiente (el contador baja)')

  // Meter a uno concreto (Yuki, 2º de la cola pendiente)
  await page.getByRole('button', { name: 'Meter a Yuki' }).click(); await page.waitForTimeout(900)
  ok(await page.getByText('Entró desde la lista de espera').count() === 2, 'elegir a uno concreto también lo inscribe')
  ok(await page.getByText(/plaza liberada por una cancelación|plazas liberadas por cancelaciones/).count() === 0, 'sin plazas pendientes, el aviso desaparece')
  ok(await page.getByRole('button', { name: /^Meter a / }).count() === 0, 'y los botones «Meter» por fila se retiran')
  await page.screenshot({ path: `${OUT}/3-gestionar-resuelto.png` })

  // Los elegidos reciben su notificación
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('¡Blitz está dentro!').count() > 0, 'noti al primero de la cola (Blitz)')
  ok(await page.getByText('¡Yuki está dentro!').count() > 0, 'y al elegido a dedo (Yuki)')
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
