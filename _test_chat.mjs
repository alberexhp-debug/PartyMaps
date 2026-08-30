// Prueba del paquete «Chat» (30-08): la pestaña Entradas del nav se sustituye
// por Chat → /amigos (con badge de solicitudes); /amigos titula Chat con 4
// pestañas (Amigos · Grupos · Crews · Difusión — canales de SOLO lectura de los
// TOs que sigues); el perfil gana la fila Entradas (fuera «Amigos y grupos»),
// Editar perfil (foto/banner/bio persistidos) y el tag de usuario #XABCD con
// copiar y búsqueda exacta nombre#tag; y administración de crews (creador y
// admins: editar, quitar miembros —nunca al creador— y conceder el rol).
//   BASE_URL=http://localhost:3006 node _test_chat.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-chat'
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

async function login(page, email = 'jugador@torneum.com') {
  await page.evaluate(() => localStorage.removeItem('todh-sesion')).catch(() => {})
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

// Mismo algoritmo determinista que tagUsuarioDe (src/lib/torneos/tags.ts):
// permite construir aquí la búsqueda exacta nombre#XABCD de un jugador del pool.
function tagUsuarioDe(nombre) {
  const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  let h = 2166136261
  for (const ch of nombre) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0 }
  const digito = 1 + (h % 9)
  let letras = ''
  let x = h
  for (let i = 0; i < 4; i++) { x = (Math.imul(x, 1103515245) + 12345) >>> 0; letras += LETRAS[x % LETRAS.length] }
  return `${digito}${letras}`
}

// ── 1. Nav: Chat (con badge de solicitudes) en vez de Entradas; la ruta /entradas sigue viva
{
  const { ctx, page } = await nuevaPagina()
  console.log('— nav: Chat sustituye a Entradas (escritorio y móvil)')
  await login(page)
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('aside a[href="/amigos"]').count() > 0, 'el rail de escritorio tiene el ítem Chat → /amigos')
  ok((await page.locator('aside a[href="/amigos"]').innerText()).includes('Chat'), 'con el texto «Chat»')
  ok((await page.locator('aside a[href="/amigos"]').innerText()).includes('1'), 'y el badge de solicitudes pendientes (Nyx sembrada)')
  ok(await page.locator('aside a[href="/entradas"]').count() === 0, 'Entradas ya no está en el rail')
  // La ruta /entradas SIGUE existiendo (solo sale del nav)
  await page.goto(`${BASE}/entradas`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(!page.url().includes('/explorar') && await page.getByText(/Application error/i).count() === 0, `/entradas sigue viva fuera del nav (${page.url()})`)
  await ctx.close()
}
{
  const { ctx, page } = await nuevaPagina(true)
  await login(page)
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('nav a[href="/amigos"]').count() > 0, 'la barra móvil también lleva Chat → /amigos')
  ok(await page.locator('nav a[href="/entradas"]').count() === 0, 'y tampoco tiene Entradas')
  await page.screenshot({ path: `${OUT}/1-nav-movil.png` })
  await ctx.close()
}

// ── 2. /amigos titula Chat con 4 pestañas; Difusión = solo lectura atada a seguidos
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Chat: 4 pestañas y canales de Difusión')
  await login(page)
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.locator('h1', { hasText: 'Chat' }).count() > 0, 'la página se titula «Chat»')
  for (const t of ['Amigos', 'Grupos', 'Crews', 'Difusión']) {
    ok(await page.getByRole('button', { name: new RegExp(`^${t}`) }).count() > 0, `pestaña «${t}» presente`)
  }
  await page.getByRole('button', { name: /^Difusión$/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Lima Esports').count() > 0, 'el canal de Lima Esports está')
  ok(await page.getByText('Dragón Events').count() > 0, 'y el de Dragón Events (segundo TO)')
  // Sin seguir al TO, el canal está cerrado con CTA de seguir
  ok(await page.getByText('Lima Smash Weekly #43').count() === 0, 'sin seguir al TO no se ven sus anuncios')
  await page.getByRole('button', { name: /Seguir para ver sus anuncios/ }).first().click(); await page.waitForTimeout(700)
  ok(await page.getByText('Lima Smash Weekly #43').count() > 0, 'al seguir a Lima aparecen sus anuncios (fechas de torneos)')
  ok(await page.getByText(/El Weekly de la semana que viene se adelanta/).count() > 0, 'incluidos los avisos')
  ok(await page.locator('input[placeholder*="Escribe"], textarea').count() === 0, 'SIN campo de escribir: los canales son de solo lectura')
  // Persistencia vía seguidos del store
  const seguidos = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.seguidos)
  ok(Array.isArray(seguidos) && seguidos.includes('lima'), `seguir desde el canal escribe en seguidos del store (${JSON.stringify(seguidos)})`)
  await page.screenshot({ path: `${OUT}/2-difusion.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Perfil: fila Entradas (no «Amigos y grupos»), tag #XABCD + copiar, Editar perfil con bio persistente
{
  const { ctx, page } = await nuevaPagina()
  console.log('— perfil: fila Entradas, tag de usuario y Editar perfil')
  await login(page)
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Amigos y grupos').count() === 0, 'la fila «Amigos y grupos» ya no existe (redundante con el nav)')
  ok(await page.getByRole('button', { name: /Entradas/ }).count() > 0, 'en su lugar hay una fila Entradas')
  ok((await page.getByRole('button', { name: /Entradas/ }).first().innerText()).includes('1'), 'con el contador de inscripciones activas (t4 de serie)')
  await page.getByRole('button', { name: /Entradas/ }).first().click(); await page.waitForTimeout(1200)
  ok(page.url().includes('/entradas'), `la fila lleva a /entradas (${page.url()})`)

  // Tag #XABCD junto al nombre + copiar con feedback
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.locator('h2', { hasText: /#[1-9][A-Z]{4}/ }).count() > 0, 'el tag #XABCD (dígito + 4 letras) va junto al nombre')
  await page.getByLabel('Copiar tag').click(); await page.waitForTimeout(300)
  ok(await page.getByText('Copiado').count() > 0, 'copiar el tag da feedback ✓')

  // Editar perfil: bio ≤160 que persiste tras recargar + regenerar tag (1 vez)
  await page.getByRole('button', { name: /Editar perfil/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByText('Foto de perfil').count() > 0, 'la hoja Editar perfil tiene foto propia (subida)')
  ok(await page.getByText('Banner', { exact: true }).count() > 0, 'banner (presets/subida)')
  ok(await page.getByRole('button', { name: /Regenerar \(1 vez\)/ }).count() > 0, 'y «Regenerar (1 vez)» del tag')
  const tagAntes = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.userTag)
  await page.getByRole('button', { name: /Regenerar \(1 vez\)/ }).click(); await page.waitForTimeout(400)
  const tagDespues = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.userTag)
  ok(tagAntes !== tagDespues && /^[1-9][A-Z]{4}$/.test(tagDespues), `regenerar cambia el tag (${tagAntes} → ${tagDespues})`)
  ok(await page.getByRole('button', { name: /Ya regenerado/ }).isDisabled(), 'y solo se puede UNA vez (botón agotado)')
  await page.getByPlaceholder(/160 caracteres/).fill('Main Pikachu. Labs los martes con Nocturna.')
  await page.getByRole('button', { name: /^Guardar$/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText('Main Pikachu. Labs los martes con Nocturna.').count() > 0, 'la bio guardada se pinta bajo el nombre')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Main Pikachu. Labs los martes con Nocturna.').count() > 0, 'y PERSISTE tras recargar')
  await page.screenshot({ path: `${OUT}/3-perfil-tag-bio.png`, fullPage: true })
  await ctx.close()
}

// ── 4. Buscador de Chat: parcial por nombre (con tag en resultados) y EXACTO nombre#tag
{
  const { ctx, page } = await nuevaPagina()
  console.log('— buscador: resultados con tag y búsqueda exacta nombre#XABCD')
  await login(page)
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const tagRei = tagUsuarioDe('Rei')
  await page.getByPlaceholder(/Busca por alias/).fill('Rei'); await page.waitForTimeout(400)
  ok(await page.getByText(`#${tagRei}`).count() > 0, `la búsqueda parcial enseña el tag del resultado (Rei #${tagRei})`)
  // Exacta con # (case-insensitive); un tag equivocado no encuentra a nadie
  await page.getByPlaceholder(/Busca por alias/).fill(`rei#${tagRei.toLowerCase()}`); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Agregar/ }).count() === 1, 'la búsqueda exacta rei#tag (minúsculas) encuentra SOLO a Rei')
  await page.getByPlaceholder(/Busca por alias/).fill('Rei#9ZZZZ'); await page.waitForTimeout(400)
  ok(await page.getByRole('button', { name: /Agregar/ }).count() === 0, 'con un tag equivocado no hay resultados (exacta de verdad)')
  await page.screenshot({ path: `${OUT}/4-buscador-tag.png` })
  await ctx.close()
}

// ── 5. Administración de crews: editar (descripción persiste), quitar miembros (nunca al creador), Hacer admin
{
  const { ctx, page } = await nuevaPagina()
  console.log('— crew Nocturna: Editar del creador, quitar miembro y Hacer admin')
  await login(page)
  await page.goto(`${BASE}/crew/crew-nox`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('#NOCT').count() > 0, 'Nocturna luce su tag reseteado #NOCT (4 letras)')
  ok(await page.getByRole('button', { name: /^Editar$/ }).count() > 0, 'el creador ve el botón Editar')
  await page.getByRole('button', { name: /^Editar$/ }).click(); await page.waitForTimeout(600)
  await page.getByPlaceholder(/Qué define a esta crew/).fill('Solo labs los martes; bracket serio los jueves.')
  await page.getByRole('button', { name: /^Guardar$/ }).click(); await page.waitForTimeout(700)
  ok(await page.getByText('Solo labs los martes; bracket serio los jueves.').count() > 0, 'la descripción editada se pinta en la crew')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Solo labs los martes; bracket serio los jueves.').count() > 0, 'y PERSISTE tras recargar')

  // Gestión de miembros dentro de Editar
  await page.getByRole('button', { name: /^Editar$/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByLabel('Quitar a Tú').count() === 0, 'el creador NO tiene botón de quitar (solo puede salirse él)')
  await page.getByLabel('Quitar a Sora').click(); await page.waitForTimeout(500)
  const miembros = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.crews.find(c => c.id === 'crew-nox').miembros)
  ok(!miembros.includes('Sora') && miembros.length === 3, `quitar a Sora funciona y libera su plaza (${JSON.stringify(miembros)})`)
  // Conceder el rol: chip Admin junto al miembro
  ok(await page.getByText('Admin', { exact: true }).count() === 0, 'antes de conceder no hay chips Admin en Nocturna')
  await page.getByLabel('Hacer admin: Kaze').click(); await page.waitForTimeout(500)
  ok(await page.getByText('Admin', { exact: true }).count() > 0, '«Hacer admin» sobre Kaze pone el chip Admin')
  ok(await page.getByLabel('Quitar admin: Kaze').count() > 0, 'y el creador puede revocarlo (Quitar admin)')
  await page.screenshot({ path: `${OUT}/5-crew-admin.png`, fullPage: true })
  await page.getByRole('button', { name: /^Guardar$/ }).click(); await page.waitForTimeout(500)
  ok(await page.getByText('Admin', { exact: true }).count() > 0, 'el chip Admin también se ve en la lista de miembros de la página')
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
