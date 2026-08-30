// Prueba de la tanda social/live del 27-08: mesas en grande + emisión incrustada
// en la sala Live, resultados enriquecidos desde el historial, pestaña Perfil
// con foto y apartado Amigos con grupos de chat persistentes.
//   BASE_URL=http://localhost:3006 node _test_social.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-social'
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
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// ── 1. Sala Live: mesas en grande + orden clara + emisión incrustada al fondo
{
  const { ctx, page } = await nuevaPagina()
  console.log('— sala Live: mesas en grande y emisión incrustada')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/live/t4`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Última mesa jugada').count() > 0, 'la última mesa jugada aparece en grande')
  ok(await page.getByText('Siguiente mesa').count() > 0, 'y la siguiente mesa también')
  ok(await page.getByText('¡Ve ya a tu mesa!').count() > 0, 'con la orden clara: torneo en directo → VE YA')
  ok(await page.getByText('Ver mi mesa en el plano').count() > 0, 'y el acceso directo al plano')
  ok(await page.getByText('Emisión en directo').count() === 0, 'el BOTÓN de emisión ya no existe')
  ok(await page.getByText('Emisión del torneo').count() > 0, 'la emisión va incrustada debajo del todo')
  ok(await page.getByText(/no ha conectado la señal/).count() > 0, 'con hueco claro si el TO aún no conectó (t4 sin URL)')
  await page.screenshot({ path: `${OUT}/1-live-mesas.png`, fullPage: true })
  await ctx.close()
}

// ── 2. Historial del jugador → resultados con detalles y VOD
{
  const { ctx, page } = await nuevaPagina()
  console.log('— historial → resultados enriquecidos')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/live/t4`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.locator('text=/\\d+%/').first().click(); await page.waitForTimeout(600)
  ok(await page.getByText('Últimos torneos').count() > 0, 'el perfil del rival lista sus torneos')
  await page.getByRole('link', { name: /TFT Iberian Cup/ }).first().click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/resultados'), `el torneo del historial abre sus RESULTADOS (${page.url()})`)
  ok(await page.getByText(/Campeón/i).count() > 0, 'con los ganadores del torneo')
  ok(await page.getByText('Formato', { exact: true }).count() > 0, 'y los detalles del torneo (juego/fecha/sede/formato)')
  // VOD: t1 tiene la emisión guardada
  await page.goto(`${BASE}/torneo/t1/resultados`, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(1800)
  ok(await page.getByText('Así se vivió').count() > 0, 'los resultados enseñan la emisión que hubo (VOD)')
  ok(await page.locator('iframe').count() > 0, 'con el reproductor incrustado')
  await page.screenshot({ path: `${OUT}/2-resultados-vod.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Pestaña Perfil con tu foto (abajo, en móvil)
{
  const { ctx, page } = await nuevaPagina(true)
  console.log('— pestaña Perfil con foto en la barra inferior')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  const perfilTab = page.locator('nav a[href="/perfil"]')
  ok(await perfilTab.count() > 0, 'la pestaña Perfil está en la barra')
  const texto = await perfilTab.first().innerText()
  ok(texto.includes('Á'), `lleva tu foto/inicial (Á de Álex) en vez de icono (${JSON.stringify(texto)})`)
  await ctx.close()
}

// ── 4. Amigos: agregar, aceptar, y grupos de chat persistentes
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Amigos y grupos de chat')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(page.url().includes('/amigos'), `la página Amigos abre en la demo (antes expulsaba a /login) (${page.url()})`)
  ok(await page.getByText('Kaze').count() > 0, 'con tus amigos sembrados')
  // Aceptar la solicitud de Nyx
  await page.locator('button[aria-label="Aceptar a Nyx"]').click(); await page.waitForTimeout(600)
  ok(await page.getByText(/\(6\)/).count() > 0, 'aceptar la solicitud de Nyx te deja 6 amigos')
  // Agregar por buscador
  await page.getByPlaceholder(/Busca por alias/).fill('Rei'); await page.waitForTimeout(400)
  await page.getByRole('button', { name: /Agregar/ }).first().click(); await page.waitForTimeout(600)
  ok(await page.getByText(/\(7\)/).count() > 0, 'agregar a Rei desde el buscador funciona')
  // Grupos: abrir chat, escribir y comprobar persistencia
  await page.getByRole('button', { name: /^Grupos$/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Club Gamba').count() > 0, 'los grupos sembrados están')
  await page.getByText('Club Gamba').first().click(); await page.waitForTimeout(600)
  await page.getByPlaceholder('Escribe al grupo…').fill('Nos vemos en el Weekly 🎮')
  await page.keyboard.press('Enter'); await page.waitForTimeout(500)
  ok(await page.getByText('Nos vemos en el Weekly 🎮').count() > 0, 'el mensaje sale en el chat del grupo')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /^Grupos$/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Nos vemos en el Weekly 🎮').count() > 0, 'y PERSISTE tras recargar (preview del grupo)')
  // Crear un grupo nuevo
  await page.getByRole('button', { name: /Crear un grupo de chat/ }).click(); await page.waitForTimeout(500)
  await page.getByPlaceholder(/Nombre del grupo/).fill('Test Squad')
  await page.getByRole('button', { name: /^Kaze$/ }).click().catch(() => page.getByText('Kaze').last().click())
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /Crear grupo/ }).last().click(); await page.waitForTimeout(700)
  ok(await page.getByText('Test Squad').count() > 0, 'crear un grupo nuevo con un amigo funciona')
  await page.screenshot({ path: `${OUT}/4-amigos-grupos.png`, fullPage: true })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
