// Prueba de los capados y reclamos del 30-08 (decisiones Albert #2, #7 y #8):
//   · /rrpp, /local-panel y /gestor (paneles nocturnos legado) → /inicio
//   · /dev-emblemas (galería QA) → /perfil/logros
//   · La puerta de /consola (jugador sin rol TO) abre la SOLICITUD directamente
//     y muestra «Solicitud en revisión» si ya se envió
//   · Con el rol de TO no se pinta ningún reclamo «¿Organizas torneos?»
//   BASE_URL=http://localhost:3006 node _test_capados.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-capados'
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
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 1. Paneles nocturnos legado capados: el árbol entero redirige a /inicio
{
  const { ctx, page } = await nuevaPagina()
  console.log('— paneles legado capados (redirect a /inicio)')
  for (const ruta of ['/rrpp', '/local-panel', '/gestor', '/rrpp/listas', '/gestor/login', '/gestor/dashboard']) {
    await page.goto(`${BASE}${ruta}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(600)
    ok(new URL(page.url()).pathname === '/inicio', `${ruta} redirige a /inicio`)
  }
  await ctx.close()
}

// ── 2. /dev-emblemas (QA aprobado 30-08) redirige a /perfil/logros
{
  const { ctx, page } = await nuevaPagina()
  console.log('— /dev-emblemas capado (redirect a /perfil/logros)')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/dev-emblemas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(900)
  ok(new URL(page.url()).pathname === '/perfil/logros', '/dev-emblemas redirige a /perfil/logros')
  await ctx.close()
}

// ── 3. Puerta de /consola (jugador sin rol): el botón abre la SOLICITUD
// directamente (AltaTOSheet), sin pasar por el perfil; enviada, la puerta
// muestra «Solicitud en revisión».
{
  const { ctx, page } = await nuevaPagina()
  console.log('— puerta de /consola: solicitud directa y estado en revisión')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Esta zona es para organizadores').count() > 0, 'jugador sin rol ve la puerta de organizador')
  await page.getByRole('button', { name: /Solicitar perfil de organizador/ }).click(); await page.waitForTimeout(600)
  ok(new URL(page.url()).pathname === '/consola', 'el botón NO navega al perfil: sigue en /consola')
  ok(await page.getByText('Conviértete en organizador').count() > 0, 'y abre la hoja de solicitud DIRECTAMENTE')
  await page.screenshot({ path: `${OUT}/3-puerta-solicitud.png` })
  // Enviarla: elegir un juego y mandar → estado pendiente persistido
  await page.getByRole('button', { name: /Smash/ }).first().click(); await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Enviar solicitud/ }).click(); await page.waitForTimeout(800)
  ok(await page.getByText('Solicitud enviada').count() > 0, 'la solicitud se envía desde la propia puerta')
  await page.waitForTimeout(1600)
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Solicitud en revisión').count() > 0, 'la puerta muestra «Solicitud en revisión» tras enviarla')
  await ctx.close()
}

// ── 4. Reclamos «¿Organizas torneos?»: un jugador sin rol los ve (y llevan a
// /consola, que ES la puerta con la solicitud); un jugador+TO no ve ninguno.
{
  const { ctx, page } = await nuevaPagina()
  console.log('— reclamos de organizador: visibles sin rol, ninguno con rol TO')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('¿Organizas torneos?').count() >= 2, 'jugador sin rol: reclamo en sidebar Y banner de Explorar')
  const hrefs = await page.locator('a:has-text("¿Organizas torneos?")').evaluateAll(as => as.map(a => a.getAttribute('href')))
  ok(hrefs.length > 0 && hrefs.every(h => h === '/consola'), 'todos los reclamos llevan a /consola (la puerta con la solicitud)')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('¿Organizas torneos?').count() === 0, 'con rol de TO no se pinta NINGÚN reclamo (sidebar ni Explorar)')
  await page.screenshot({ path: `${OUT}/4-sin-reclamos-to.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
