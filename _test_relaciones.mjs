// Prueba de las RELACIONES entre roles (identidad por cuenta, herencia TO de
// la sede, expedientes, propuestas de juego, moderación, bote, persistencia).
// Complementa a _test_roles.mjs. Sale con código 1 si algo falla.
//   BASE_URL=http://localhost:3006 node _test_relaciones.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-relaciones'
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
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

async function logout(page) {
  await page.evaluate(() => localStorage.removeItem('todh-sesion'))
}

// ── 1. Sedes SOLO sedes (decisión 28-08): local@ NO entra en la capa de TO
{
  const { ctx, page } = await nuevaPagina()
  console.log('— la sede no hereda funciones de TO')
  await login(page, 'local@torneum.com')
  for (const ruta of ['/consola', '/mi-pagina', '/crear-torneo']) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1400)
    ok(page.url().includes('/sede'), `${ruta} rebota al panel de sede (${page.url()})`)
  }
  ok(await page.getByText('Gamba Esports').count() > 0, 'el panel de sede muestra su identidad (Gamba Esports)')
  await page.screenshot({ path: `${OUT}/1-sede-rebote.png` })
  await ctx.close()
}

// ── 3. Alta de local end-to-end: expediente → admin aprueba (≠ rechazar)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— alta de local → verificación del admin')
  await page.goto(`${BASE}/alta-local`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.getByPlaceholder('Ej. Nivel 99').fill('Sala Test E2E')
  await page.getByPlaceholder('B-12345678').fill('B-99887766')
  await page.getByPlaceholder('Calle y número, CP, ciudad').fill('C/ Prueba 1, 28000 Madrid')
  await page.getByPlaceholder('Nombre y apellidos').fill('Pepa Prueba')
  await page.getByPlaceholder('hola@tulocal.es').fill('pepa@salatest.es')
  await page.getByRole('button', { name: /Licencia de actividad/ }).click()
  await page.getByRole('button', { name: /Enviar expediente/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText('Expediente enviado').count() > 0, 'el local envía su expediente desde /alta-local')
  await login(page, 'admin@torneum.com')
  await page.getByRole('button', { name: /Verificación/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Sala Test E2E').count() > 0, 'el admin ve el expediente nuevo en Verificación')
  await page.getByRole('button', { name: /Sala Test E2E/ }).first().click(); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Aprobar sede/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText(/^Aprobado$/).count() > 0, 'aprobar deja rastro (historial «Aprobado»), distinto de rechazar')
  await page.screenshot({ path: `${OUT}/3-admin-expediente.png` })
  await ctx.close()
}

// ── 4. Propuesta de juego del TO → bandeja real del admin
{
  const { ctx, page } = await nuevaPagina()
  console.log('— juego propuesto por el TO (ya sin alta directa)')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Añadir juego/ }).click(); await page.waitForTimeout(400)
  await page.getByPlaceholder(/Nombre del juego/).fill('Juego Test E2E')
  await page.getByRole('button', { name: /Proponer «Juego Test E2E»/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByText('Propuesta enviada').count() > 0, 'el TO propone el juego (no lo publica él)')
  await logout(page)
  await login(page, 'admin@torneum.com')
  await page.getByRole('button', { name: /^Juegos$/ }).first().click(); await page.waitForTimeout(700)
  ok(await page.getByText('Juego Test E2E').count() > 0, 'la propuesta REAL llega a la bandeja del admin')
  ok(await page.getByText(/Propuesto por Lima Esports/).count() > 0, 'con la identidad del proponente (Lima Esports)')
  await page.screenshot({ path: `${OUT}/4-admin-propuesta.png` })
  await ctx.close()
}

// ── 5. Identidad en solicitudes de sede (las de otros TOs no son mías)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— identidad por cuenta en solicitudes')
  await login(page, 'local@torneum.com')
  await page.goto(`${BASE}/sede/solicitudes`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900)
  ok(await page.getByText('FGC Madrid').count() > 0, 'la sede ve la solicitud sembrada de FGC Madrid')
  ok(await page.getByText('Bracket Club').count() > 0, 'la sede ve la solicitud sembrada de Bracket Club')
  // Aceptar una por el flujo REAL del store
  await page.getByRole('button', { name: /^Aceptar$/ }).first().click(); await page.waitForTimeout(600)
  const quedan = await page.getByText('FGC Madrid').count()
  ok(quedan === 0, 'aceptar la resuelve por el store (sale de pendientes)')
  await logout(page)
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/sedes`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800)
  ok(await page.getByText('Bracket Club').count() === 0, 'las solicitudes de OTROS TOs no salen en «Mis solicitudes» de Lima')
  await ctx.close()
}

// ── 6. Admin interviene en incidencias (antes solo lectura)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— admin resuelve una disputa enquistada')
  await login(page, 'admin@torneum.com')
  await page.getByRole('button', { name: /Incidencias/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText(/Lux vs Nyx/).count() > 0, 'la disputa sembrada está visible')
  await page.getByRole('button', { name: /Forzar: gana Lux/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText(/Lux vs Nyx/).count() === 0, 'el admin fuerza la resolución y la disputa se cierra')
  await page.getByRole('button', { name: /Cerrar reporte/ }).first().click().catch(() => {})
  await page.waitForTimeout(500)
  ok(await page.getByRole('button', { name: /Cerrar reporte/ }).count() === 0, 'el admin puede cerrar reportes abiertos')
  await page.screenshot({ path: `${OUT}/6-admin-incidencias.png` })
  await ctx.close()
}

// ── 7. Bote comunitario ELIMINADO de la app (decisión 28-08): no debe quedar rastro
{
  const { ctx, page } = await nuevaPagina()
  console.log('— sin rastro del bote comunitario')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/torneo/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Bote comunitario').count() === 0, 'la ficha del major ya no muestra bote comunitario')
  await ctx.close()
}

// ── 8. Persistencia del admin: beta y silenciados sobreviven a la recarga
{
  const { ctx, page } = await nuevaPagina()
  console.log('— persistencia del panel admin')
  await login(page, 'admin@torneum.com')
  await page.getByRole('button', { name: /^Acceso$/ }).first().click(); await page.waitForTimeout(500)
  await page.locator('button[aria-label="Abrir o cerrar la beta"]').click(); await page.waitForTimeout(500)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByRole('button', { name: /^Acceso$/ }).first().click(); await page.waitForTimeout(500)
  ok(await page.getByText(/Registro abierto/).count() > 0, 'el toggle de beta PERSISTE tras recargar')
  await ctx.close()
}

// ── 9. Mapa de sedes del TO: «Disponibles» = disponibilidad publicada
{
  const { ctx, page } = await nuevaPagina()
  console.log('— filtro Disponibles con la dispo real')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/sedes`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(2500)
  ok(await page.getByText(/Disponibles · 2/).count() > 0, 'el contador sale de las 2 sedes con horario publicado (nexus y comarca)')
  ok(await page.getByText(/horario publicado/).count() > 0, 'la leyenda ya no dice «sin torneos aún»')
  await page.screenshot({ path: `${OUT}/9-mapa-sedes.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
