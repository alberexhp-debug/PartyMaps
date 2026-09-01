// Prueba de las SALAS multi-dispositivo (01-09): dos contextos de navegador
// AISLADOS (localStorage separado, como dos dispositivos o incógnito) con el
// mismo código comparten MUNDO vía estado_mundo ('sala:{codigo}', anon);
// un tercero sin sala no ve nada. Requiere el dev server con las variables
// NEXT_PUBLIC_TORNEUM_SUPABASE_* (.env.local) y red hacia Supabase.
//   BASE_URL=http://localhost:3006 node _test_salas.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-salas'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const CODIGO = `qa-${Date.now().toString(36)}`
const NOMBRE_TORNEO = `Copa Salas ${CODIGO}`
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function dispositivo(conSala) {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const page = await ctx.newPage()
  page.on('dialog', d => d.accept())
  await page.addInitScript(() => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }))
    localStorage.setItem('todh-demo-onboarding', '1')
  })
  await page.goto(`${BASE}/login${conSala ? `?sala=${CODIGO}` : ''}`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)
  return { ctx, page }
}

async function loginBoton(page, nombre) {
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForTimeout(1800)
  const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
  if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(500) }
}

// Espera activa: reintenta la condición hasta `ms` (el poll de la sala es de 5 s)
async function esperar(fn, ms = 16000, paso = 2000) {
  const tope = Date.now() + ms
  while (Date.now() < tope) {
    if (await fn()) return true
    await new Promise(r => setTimeout(r, paso))
  }
  return fn()
}

// ── A («PC», David): conecta la sala por URL, publica un torneo
console.log(`— sala «${CODIGO}»: David funda el mundo compartido`)
const A = await dispositivo(true)
ok(await A.page.getByText(/Sala conectada/i).count() > 0, '?sala= en la URL deja la sala conectada (bloque del login)')
await loginBoton(A.page, 'David')
await A.page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await A.page.waitForTimeout(1200)
await A.page.getByPlaceholder(/Lima Smash Weekly/).fill(NOMBRE_TORNEO)
await A.page.getByRole('button', { name: /elegir sede/i }).first().click(); await A.page.waitForTimeout(600)
await A.page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await A.page.waitForTimeout(500)
await A.page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await A.page.waitForTimeout(1200)
await A.page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await A.page.waitForTimeout(2500) // debounce 800ms + red
ok(await A.page.getByText(NOMBRE_TORNEO).count() > 0, 'David ve su torneo en /gestionar')

// ── B («incógnito/otro dispositivo», Javier): mismo código → ve el torneo
console.log('— B (contexto aislado con la misma sala): recibe el mundo')
const B = await dispositivo(true)
await loginBoton(B.page, 'Javier')
const veTorneoB = await esperar(async () => {
  await B.page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' })
  await B.page.waitForTimeout(1200)
  return (await B.page.getByText(NOMBRE_TORNEO).count()) > 0
})
ok(veTorneoB, `Javier VE «${NOMBRE_TORNEO}» desde otro navegador (mundo por sala)`)
await B.page.screenshot({ path: `${OUT}/b-explorar.png`, fullPage: true })

// ── Vuelta B→A: Javier agrega a David; a David le llega en su navegador
console.log('— B→A: la amistad viaja de vuelta')
await B.page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await B.page.waitForTimeout(1000)
await B.page.getByPlaceholder(/Busca por alias/).fill('David'); await B.page.waitForTimeout(500)
await B.page.getByRole('button', { name: /Agregar/ }).first().click(); await B.page.waitForTimeout(2500)
const veSolicitudA = await esperar(async () => {
  await A.page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' })
  await A.page.waitForTimeout(1200)
  return (await A.page.locator('button[aria-label="Aceptar a Javier"]').count()) > 0
})
ok(veSolicitudA, 'a David le aparece la solicitud de Javier (sala en las dos direcciones)')
await A.page.screenshot({ path: `${OUT}/a-solicitud.png` })

// ── C (sin sala): mundo local de siempre, sin el torneo de la sala
console.log('— C (sin sala): aislado como hasta ahora')
const C = await dispositivo(false)
await loginBoton(C.page, 'Marcos')
await C.page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await C.page.waitForTimeout(1500)
ok(await C.page.getByText(NOMBRE_TORNEO).count() === 0, 'Marcos SIN sala no ve el torneo de la sala')
ok(await C.page.getByText('Lima Smash Weekly #42').count() > 0, 'y su mundo de muestra está intacto')

await A.ctx.close(); await B.ctx.close(); await C.ctx.close()
await browser.close()

// Limpieza: borra las filas de sala de QA (esta corrida y residuos) vía pg —
// no hay policy de DELETE anónimo a propósito. Solo si hay credenciales
// locales (~/.config/torneum/supabase.env); si no, las filas qa-* quedan y no
// molestan (las suites de nube consultan solo la fila global).
try {
  const { readFileSync, existsSync } = await import('fs')
  const envPath = process.env.HOME + '/.config/torneum/supabase.env'
  if (existsSync(envPath)) {
    const { createRequire } = await import('module')
    const { Client } = createRequire(import.meta.url)('pg')
    const env = Object.fromEntries(readFileSync(envPath, 'utf8').split('\n')
      .filter(l => l.includes('=') && !l.startsWith('#'))
      .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, '')]))
    const c = new Client({ host: env.SUPABASE_POOLER_HOST, port: 5432, user: env.SUPABASE_POOLER_USER, password: env.SUPABASE_DB_PASSWORD, database: 'postgres', ssl: { rejectUnauthorized: false } })
    await c.connect()
    const { rowCount } = await c.query(`DELETE FROM estado_mundo WHERE id LIKE 'sala:qa-%'`)
    await c.end()
    console.log(`  (limpieza: ${rowCount} filas sala:qa-* borradas de la nube)`)
  }
} catch (e) { console.log('  (limpieza de salas omitida:', String(e).split('\n')[0], ')') }
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
