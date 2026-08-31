// Prueba de la Fase 4 del rediseño (sección 6 + R1): perfil del jugador.
// Inactividad real en vez de «rango activo», historial por juego con Ver todos,
// valoraciones clicables (recibidas + rellenar pendientes), logros con
// bloqueados, Atrás en el TierSheet, push movido a /notificaciones y
// notificaciones descartables (X en PC, swipe en móvil, quitar todas).
//   BASE_URL=http://localhost:3006 node _test_perfil.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-perfil'
mkdirSync(OUT, { recursive: true })
const BASE = process.env.BASE_URL || 'http://localhost:3006'
const browser = await chromium.launch()

let fallos = 0
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`)
  else { fallos++; console.log(`  ✗ FALLO: ${msg}`) }
}

async function nuevaPagina(movil = false) {
  const ctx = await browser.newContext({
    viewport: movil ? { width: 390, height: 844 } : { width: 1280, height: 900 },
    hasTouch: movil,
  })
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

// ── 1. Identidad: fuera «rango activo», aviso real de inactividad (>45 días)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Identidad: inactividad real en vez de «rango activo»')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText(/Rango activo/i).count() === 0, 'el texto «Rango activo» ya no existe')
  ok(await page.getByText(/sin competir en/).count() === 0, 'con Smash (jugado hace 1 sem) el hueco no muestra nada')
  await page.getByRole('button', { name: 'Tekken', exact: true }).click(); await page.waitForTimeout(600)
  ok(await page.getByText(/68 días sin competir en Tekken/).count() > 0, 'con Tekken (68 días) aparece el aviso de inactividad')
  ok(await page.getByText(/perdiendo puntos de rango/).count() > 0, 'y avisa de que está perdiendo puntos')
  // Paquete Chat: la fila «Amigos y grupos» se fue (redundante con el nav Chat)
  // y en su lugar está la fila Entradas (la pestaña Entradas salió del nav).
  ok(await page.getByText('Amigos y grupos').count() === 0, 'la fila «Amigos y grupos» ya no está (redundante con el nav Chat)')
  ok(await page.getByRole('button', { name: /Entradas/ }).count() > 0, 'y en su lugar hay una fila Entradas con contador')
  await page.screenshot({ path: `${OUT}/1-identidad-inactividad.png`, fullPage: true })
  // El aviso también cae en el buzón como notificación
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Estás perdiendo puntos').count() > 0, 'el buzón tiene la notificación de pérdida de puntos')
  ok(await page.getByText(/sin torneos de.*Tekken/).count() > 0, 'con los juegos inactivos en el cuerpo')
  await ctx.close()
}

// ── 2. Historial reciente separado por juego + Ver todos
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Historial por juego y «Ver todos»')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Lima Smash Weekly #41').count() > 0, 'el perfil enseña los 4 últimos torneos')
  ok(await page.getByText('CoD Custom Night — Kill Race').count() === 0, 'los antiguos no salen en el perfil')
  await page.getByRole('link', { name: /Ver todos \(\d+\)/ }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/perfil/historial'), `«Ver todos» abre el historial completo (${page.url()})`)
  ok(await page.getByText('Historial de torneos').count() > 0, 'con su cabecera')
  ok(await page.getByText('Super Smash Bros. Ultimate').count() > 0, 'agrupado por juego (Smash)')
  ok(await page.getByText('CoD Custom Night — Kill Race').count() > 0, 'y con torneos más allá de los 4 últimos')
  ok(await page.getByText(/68 días|68 days/).count() > 0, 'el grupo de Tekken marca sus días de inactividad')
  await page.screenshot({ path: `${OUT}/2-historial.png`, fullPage: true })
  await ctx.close()
}

// ── 3. Valoraciones: estrellas clicables → recibidas; enviadas con pendientes
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Valoraciones recibidas + rellenar pendientes')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('link', { name: 'Valoraciones', exact: true }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/perfil/valoraciones'), `las estrellas del perfil llevan a la página de valoraciones (${page.url()})`)
  ok(await page.getByText('Kaze').count() > 0, 'con las valoraciones recibidas (Kaze)')
  ok(await page.getByText(/Me prestó fundas/).count() > 0, 'todas, también las antiguas (Pyra, hace 2 meses)')
  // Enviadas: pendiente rellenable + la ya enviada de serie
  await page.getByRole('button', { name: /Enviadas/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByText('Pendientes de valorar').count() > 0, 'la pestaña Enviadas enseña las pendientes')
  ok(await page.getByText('TFT Friday Showdown').count() > 0, 'y la valoración ya enviada de serie (TFT Friday Showdown)')
  const pendientesAntes = await page.getByLabel('5 estrellas').count()
  await page.getByLabel('5 estrellas').first().click(); await page.waitForTimeout(800)
  ok(await page.getByLabel('5 estrellas').count() === pendientesAntes - 1, 'rellenar una pendiente la saca de la lista')
  const guardada = await page.evaluate(() => JSON.parse(localStorage.getItem('todh-demo')).state.valoracionesTO['t1'])
  ok(guardada === 5, `la valoración queda persistida en el store (t1 → ${guardada}★)`)
  await page.screenshot({ path: `${OUT}/3-valoraciones.png`, fullPage: true })
  await ctx.close()
}

// ── 4. Logros clicables → página con desbloqueados y bloqueados
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Logros con bloqueados y su condición')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('link', { name: /Campeón regional/ }).click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/perfil/logros'), `los logros del perfil abren su página (${page.url()})`)
  ok(await page.getByText('Desbloqueados').count() > 0, 'con la sección de desbloqueados')
  ok(await page.getByText('Por desbloquear').count() > 0, 'y la de bloqueados')
  ok(await page.getByText('Gana un Major o Super Major').count() > 0, 'cada bloqueado enseña su condición')
  ok(await page.getByText(/5 de 11/).count() > 0, 'con el contador 5 de 11')
  await page.screenshot({ path: `${OUT}/4-logros.png`, fullPage: true })
  await ctx.close()
}

// ── 5. TierSheet con botón Atrás que devuelve al perfil
{
  const { ctx, page } = await nuevaPagina()
  console.log('— TierSheet: botón Atrás')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Tiers Torneum/ }).click(); await page.waitForTimeout(600)
  ok(await page.getByText(/el mérito y el bolsillo/).count() > 0, 'el TierSheet abre')
  ok(await page.getByLabel('Atrás').count() > 0, 'y ahora tiene botón Atrás')
  await page.getByLabel('Atrás').click(); await page.waitForTimeout(600)
  ok(await page.getByText(/el mérito y el bolsillo/).count() === 0, 'Atrás cierra el sheet…')
  ok(page.url().includes('/perfil'), `…y te deja en el perfil (${page.url()})`)
  await ctx.close()
}

// ── 6. Push fuera del perfil y dentro de /notificaciones
{
  const { ctx, page } = await nuevaPagina()
  console.log('— «Activar notificaciones push» vive en /notificaciones')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Notificaciones push').count() === 0, 'el perfil ya no tiene el bloque de push')
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Notificaciones push').count() > 0, 'el apartado de notificaciones sí lo tiene')
  await ctx.close()
}

// ── 7. R1 en PC: X al pasar el ratón + Quitar todas (persisten)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— R1 PC: descartar con X y quitar todas')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const antes = await page.locator('[data-noti]').count()
  ok(antes >= 5, `hay notificaciones sembradas (${antes})`)
  await page.locator('[data-noti]').first().hover(); await page.waitForTimeout(300)
  await page.getByLabel('Descartar notificación').first().click(); await page.waitForTimeout(800)
  ok(await page.locator('[data-noti]').count() === antes - 1, 'la X quita la notificación')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.locator('[data-noti]').count() === antes - 1, 'y el descarte PERSISTE tras recargar')
  await page.getByRole('button', { name: /Quitar todas/ }).click(); await page.waitForTimeout(800)
  ok(await page.getByText('Sin notificaciones').count() > 0, '«Quitar todas» vacía el buzón')
  await page.reload({ waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Sin notificaciones').count() > 0, 'también persistente')
  await page.screenshot({ path: `${OUT}/7-notis-vacias.png`, fullPage: true })
  await ctx.close()
}

// ── 8. R1 en móvil: swipe lateral descarta
{
  const { ctx, page } = await nuevaPagina(true)
  console.log('— R1 móvil: swipe para descartar')
  await login(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  const antes = await page.locator('[data-noti]').count()
  await page.evaluate(async () => {
    const el = document.querySelector('[data-noti]')
    const toque = (x) => new Touch({ identifier: 1, target: el, clientX: x, clientY: 300 })
    const fire = (tipo, x, fin = false) => el.dispatchEvent(new TouchEvent(tipo, {
      bubbles: true, cancelable: true,
      touches: fin ? [] : [toque(x)], targetTouches: fin ? [] : [toque(x)], changedTouches: [toque(x)],
    }))
    fire('touchstart', 220)
    for (const x of [200, 160, 110, 60]) { fire('touchmove', x); await new Promise(r => setTimeout(r, 50)) }
    fire('touchend', 60, true)
  })
  await page.waitForTimeout(900)
  ok(await page.locator('[data-noti]').count() === antes - 1, `el swipe descarta la notificación (${antes} → ${antes - 1})`)
  await ctx.close()
}

// ── 8. Perfil de organizador EDITABLE desde Perfil (decisión Albert 30-08):
// fila en /perfil solo para TOs → editor /perfil/organizador → lo editado se ve
// en /mi-pagina, /consola/perfil y desde OTRAS cuentas (clave de mundo).
{
  const { ctx, page } = await nuevaPagina(true)
  console.log('— Perfil de organizador editable (David, jugador+TO)')
  await login(page, 'david@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Perfil de organizador').count() > 0, 'el perfil de David tiene la fila «Perfil de organizador»')
  await page.getByText('Perfil de organizador').first().click(); await page.waitForTimeout(1500)
  ok(page.url().includes('/perfil/organizador'), 'la fila lleva al editor')
  const nombreInput = page.locator('input').first()
  ok((await nombreInput.inputValue()) === 'David', 'el formulario arranca con su nombre efectivo')
  await nombreInput.fill('Dojo David')
  await page.locator('textarea').fill('Semanales de Smash en Madrid, todos los jueves.')
  await page.getByRole('button', { name: 'Guardar cambios' }).click(); await page.waitForTimeout(800)
  ok(await page.getByText('Perfil guardado').count() > 0, 'guardar confirma con toast')
  await page.goto(`${BASE}/mi-pagina`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Dojo David').count() > 0, '/mi-pagina pinta el nombre editado')
  ok(await page.getByText('Semanales de Smash').count() > 0, 'y la bio editada')
  await page.goto(`${BASE}/consola/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Dojo David').count() > 0, '/consola/perfil refleja el nombre editado')
  ok(await page.getByLabel('Editar perfil de organizador').count() > 0, 'y tiene el lápiz hacia el editor')
  // Mundo compartido: otra cuenta ve el perfil editado; y sin rol no hay editor
  await login(page, 'javier@torneum.com')
  await page.goto(`${BASE}/organizador/david-to`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Dojo David').count() > 0, 'Javier ve el perfil de organizador editado (mundo común)')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1000)
  ok(await page.getByText('Perfil de organizador').count() === 0, 'Javier no ve la fila (no es TO)')
  await page.goto(`${BASE}/perfil/organizador`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(!page.url().includes('/perfil/organizador'), 'el editor rebota a /perfil para no-TOs')
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
