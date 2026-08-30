// Prueba de la tanda del 30-08 (jerarquía de la consola, comunidad real,
// bloque comunidad en el perfil TO e iconos de juego en gestionar).
//   BASE_URL=http://localhost:3006 node _test_consola.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-consola'
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

// Posición relativa en el DOM: ¿a va antes que b? (por texto contenido)
async function antesEnDom(page, textoA, textoB) {
  return page.evaluate(([ta, tb]) => {
    const hoja = (txt) => [...document.querySelectorAll('main *, body *')]
      .find(e => e.childElementCount === 0 && (e.textContent || '').includes(txt))
    const a = hoja(ta); const b = hoja(tb)
    if (!a || !b) return null
    return !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
  }, [textoA, textoB])
}

// ── 1. /consola: orden banner → acciones → menú, y avisos antes que KPIs
{
  const { ctx, page } = await nuevaPagina()
  console.log('— consola: jerarquía (banner → acciones → menú → avisos → resumen)')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)

  ok(await page.getByRole('heading', { name: 'Consola TO' }).count() > 0, 'el banner «Consola TO» está')
  ok(await page.getByRole('link', { name: /Crear torneo/ }).count() > 0, 'la acción «Crear torneo» está')
  ok(await page.locator('a[href="/consola/perfil"]').count() > 0, 'el menú interno tiene Perfil')
  ok(await page.locator('a[href="/consola/facturacion"]').count() > 0, 'el menú interno tiene Facturación')
  ok(await page.locator('a[href="/consola/comunidad"]').count() > 0, 'el menú interno tiene Comunidad')

  // Orden obligatorio del spec: banner → acciones → menú
  const orden = await page.evaluate(() => {
    const h1 = document.querySelector('h1')
    const accion = document.querySelector('a[href="/crear-torneo"]')
    const menu = document.querySelector('a[href="/consola/perfil"]')
    if (!h1 || !accion || !menu) return null
    const sigue = (a, b) => !!(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING)
    return sigue(h1, accion) && sigue(accion, menu)
  })
  ok(orden === true, 'orden en el DOM: banner → acciones → menú interno')

  // Lo urgente primero: el aviso accionable (disputa seed) antes que los KPIs
  ok(await page.getByText(/disputa por resolver/).count() > 0, 'el aviso de disputa (seed) es visible')
  const avisoAntes = await antesEnDom(page, 'por resolver', 'Torneos activos')
  ok(avisoAntes === true, 'el aviso accionable va ANTES que los KPIs en el DOM')

  // La agenda no duplica el próximo torneo (va destacado una sola vez)
  const nombreProximo = await page.locator('.ring-grad p.font-bold').first().textContent().catch(() => null)
  if (nombreProximo) {
    const veces = await page.getByText(nombreProximo.trim(), { exact: true }).count()
    ok(veces === 1, `el próximo torneo («${nombreProximo.trim()}») aparece UNA vez (destacado, sin duplicar en la lista)`)
  }
  await page.screenshot({ path: `${OUT}/1-consola.png`, fullPage: true })
  await ctx.close()
}

// ── 2. /consola/comunidad: grupos y amigos del store + Difundir real
{
  const { ctx, page } = await nuevaPagina()
  console.log('— comunidad: grupos reales, amigos y difusión')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/consola/comunidad`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)

  ok(await page.getByText('Club Gamba').count() > 0, 'el grupo «Club Gamba» sale del store')
  ok(await page.getByText('Liga Magic Madrid').count() > 0, 'y también el segundo grupo del store')
  ok(await page.getByText(/4 miembros/).count() > 0, 'con sus miembros reales (4 en Club Gamba)')
  ok(await page.getByText(/5 amigos/i).count() > 0, 'el bloque Amigos cuenta los 5 amigos del store')
  ok(await page.locator('a[href="/amigos"]').count() > 0, 'y enlaza a /amigos')

  // Difundir: botón real → copia el enlace y confirma
  const difundir = page.getByRole('button', { name: /Difundir/ }).first()
  ok(await difundir.count() > 0, 'Difundir es un BOTÓN (ya no un chip decorativo)')
  await difundir.click(); await page.waitForTimeout(400)
  ok(await page.getByText(/Copiado/).count() > 0, 'al pulsarlo muestra la confirmación «Copiado ✓»')
  await page.waitForTimeout(2300)
  ok(await page.getByText(/Copiado/).count() === 0, 'y la confirmación se apaga sola (~2 s)')

  // Escaparates + datos
  ok(await page.getByText('Página de eventos pública').count() > 0, 'la página pública queda etiquetada como página de eventos pública')
  ok(await page.locator('a[href="/mi-pagina"]').count() > 0, 'con su enlace a /mi-pagina')
  ok(await page.locator('a[href="/modo-directo"]').count() > 0, 'y el modo live sigue enlazado')
  ok(await page.getByText('Datos y estadísticas').count() > 0, 'bloque «Datos y estadísticas»')
  ok(await page.getByText(/342 valoraciones/).count() > 0, 'valoración media con nº de valoraciones (342)')
  ok(await page.getByText('Torneos organizados').count() > 0, 'torneos organizados')
  ok(await page.getByText('Inscritos totales').count() > 0, 'e inscritos totales')
  await page.screenshot({ path: `${OUT}/2-comunidad.png`, fullPage: true })
  await ctx.close()
}

// ── 3. /consola/perfil: bloque compacto Comunidad
{
  const { ctx, page } = await nuevaPagina()
  console.log('— perfil TO: resumen de comunidad')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/consola/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Comunidad', { exact: true }).count() > 0, 'el bloque «Comunidad» está')
  ok(await page.locator('a[href="/consola/comunidad"]').count() > 0, 'y enlaza a /consola/comunidad')
  ok(await page.getByText(/4\.820 seguidores|4820 seguidores/i).count() > 0, 'con los seguidores del organizador')
  await ctx.close()
}

// ── 4. /gestionar: icono de juego junto al nombre en cada torneo
{
  const { ctx, page } = await nuevaPagina()
  console.log('— gestionar: iconos de juego en la lista')
  await login(page, 'to@torneum.com')
  await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const filas = page.locator('a[href^="/gestionar/"]')
  const n = await filas.count()
  ok(n > 0, `hay torneos listados (${n})`)
  let conIcono = 0
  for (let i = 0; i < n; i++) {
    const fila = filas.nth(i)
    if (await fila.locator('svg, img[src*="/assets/games/"]').count() > 0) conIcono++
  }
  ok(conIcono === n, `todas las filas llevan icono de juego junto al nombre (${conIcono}/${n})`)
  await page.screenshot({ path: `${OUT}/4-gestionar.png` })
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
