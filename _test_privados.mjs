// Torneos PRIVADOS por invitación + cupo de ESPECTADORES aparte (31-08):
// David crea un privado (4 plazas, 8 de espectador) → Javier lo ve con candado,
// no puede inscribirse pero SÍ verlo → David invita a Lucía (buscador de
// gestionar) → a Lucía le llega la invitación por el buzón y se inscribe →
// David CIERRA espectadores → Marcos ya no puede entrar a verlo.
//   BASE_URL=http://localhost:3006 node _test_privados.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-privados'
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
async function abrirAjustes(nombreTorneo) {
  await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByText(nombreTorneo).first().click()
  await page.waitForURL('**/gestionar/**', { timeout: 8000 }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Ajustes/ }).first().click(); await page.waitForTimeout(700)
}

// ── 1. David crea «Copa Privada»: 4 plazas, espectadores 8, PRIVADO
console.log('— David crea «Copa Privada» (privado, 4 plazas, 8 de espectador)')
await loginBoton('David')
await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
await page.getByPlaceholder(/Lima Smash Weekly/).fill('Copa Privada')
// Plazas de competidor: 32 → 4 (stepper 1º, pasos de 4)
for (let i = 0; i < 7; i++) { await page.getByRole('button', { name: '−' }).nth(0).click(); await page.waitForTimeout(80) }
// Plazas de espectador: 64 → 8 (stepper 3º, pasos de 8)
for (let i = 0; i < 7; i++) { await page.getByRole('button', { name: '−' }).nth(2).click(); await page.waitForTimeout(80) }
await page.getByRole('button', { name: /Torneo privado/ }).click(); await page.waitForTimeout(300)
ok(await page.getByRole('button', { name: /Torneo privado/ }).getAttribute('aria-pressed') === 'true', 'el toggle de privado queda activo')
await page.getByRole('button', { name: /elegir sede/i }).first().click(); await page.waitForTimeout(600)
await page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await page.waitForTimeout(500)
await page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await page.waitForTimeout(1200)
await logout()

// ── 2. Javier: lo VE con candado, no puede inscribirse, SÍ de espectador
console.log('— Javier: candado de inscripción, entrada de espectador sí')
await loginBoton('Javier')
await abrirFicha('Copa Privada')
ok(await page.getByText('Solo con invitación').count() > 0, '(5) la ficha luce el candado «Solo con invitación»')
ok(await page.getByText(/Torneo privado: solo con invitación/).count() > 0, '(5) el CTA de inscripción es el candado')
ok(await page.getByRole('button', { name: /Inscribirme/i }).count() === 0, '(5) sin botón Inscribirme para no invitados')
await page.getByRole('button', { name: /Solo quiero verlo/i }).click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: /· Ver el torneo|Conseguir entrada de espectador/ }).click(); await page.waitForTimeout(2600)
ok(await page.getByText(/Tu entrada de espectador|en tu cartera|cartera/i).count() > 0, '(4) Javier consigue entrada de ESPECTADOR (abierto al público)')
await page.screenshot({ path: `${OUT}/1-javier-candado.png` })
await logout()

// ── 3. David invita a Lucía desde gestionar (buscador de cuentas)
console.log('— David invita a Lucía')
await loginBoton('David')
await abrirAjustes('Copa Privada')
ok(await page.getByText('Invitaciones').count() > 0, '(5) el privado tiene sección de Invitaciones')
await page.getByPlaceholder(/alias#tag/).fill('Lucía'); await page.waitForTimeout(500)
await page.locator('button[aria-label="Invitar a Lucía"]').click(); await page.waitForTimeout(700)
ok(await page.getByText(/Invitado ✓/).count() > 0, '(5) Lucía queda invitada')
await logout()

// ── 4. Lucía: recibe la invitación en su buzón y SÍ puede inscribirse
console.log('— Lucía: invitación en el buzón + inscripción abierta')
await loginBoton('Lucía')
await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
ok(await page.getByText(/Invitación a «Copa Privada»/).count() > 0, '(5) la invitación llega a su buzón al entrar')
await abrirFicha('Copa Privada')
ok(await page.getByText(/Torneo privado: solo con invitación/).count() === 0, '(5) para la invitada NO hay candado')
ok(await page.getByRole('button', { name: /Inscribirme/i }).count() > 0, '(5) y el botón Inscribirme está disponible')
await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, '(5) Lucía queda inscrita al privado')
await logout()

// ── 5. David CIERRA espectadores
console.log('— David cierra espectadores')
await loginBoton('David')
await abrirAjustes('Copa Privada')
await page.getByRole('button', { name: /^Cerrar espectadores$/ }).click(); await page.waitForTimeout(700)
ok(await page.getByRole('button', { name: /^Abrir espectadores$/ }).count() > 0, '(4) el botón pasa a «Abrir espectadores» (cerrado)')
await logout()

// ── 6. Marcos: ni inscribirse (candado) ni verlo (cerrado)
console.log('— Marcos: espectadores cerrados')
await loginBoton('Marcos')
await abrirFicha('Copa Privada')
ok(await page.getByText(/Torneo privado: solo con invitación/).count() > 0, '(5) Marcos sigue con candado de inscripción')
ok(await page.getByText(/Espectadores cerrados por el organizador/).count() > 0, '(4) y la entrada de espectador está CERRADA por el TO')
ok(await page.getByRole('button', { name: /Solo quiero verlo/i }).count() === 0, '(4) sin botón de espectador')
await page.screenshot({ path: `${OUT}/2-marcos-cerrado.png` })

await ctx.close()
await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
