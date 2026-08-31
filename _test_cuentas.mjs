// Prueba de las CUENTAS DEMO (30-08): el login enseña los 11 accesos nuevos
// (6 jugadores + David TO + 3 sedes + admin) sin los 4 botones viejos; las
// cuentas legacy siguen entrando tecleando; lo PERSONAL de cada cuenta nueva
// arranca vacío y persiste en su namespace, y desde v2 TODAS comparten MUNDO
// ('todh-mundo'): torneos, inscripciones cruzadas y amistades entre cuentas
// (sección 7).
//   BASE_URL=http://localhost:3006 node _test_cuentas.mjs
import { chromium } from 'playwright'
import { mkdirSync } from 'fs'

const OUT = process.env.OUT_DIR || '/tmp/test-cuentas'
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

async function loginTeclado(page, email) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', email)
  await page.fill('input[type="password"]', 'torneum')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForTimeout(1800)
}

async function loginBoton(page, nombre) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
  await page.getByRole('button', { name: new RegExp(nombre) }).first().click()
  await page.waitForTimeout(1800)
}

async function logout(page) {
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  await page.getByRole('button', { name: /Cerrar sesión/i }).first().click()
  await page.waitForURL('**/login**', { timeout: 8000 })
}

// ── 1. El login enseña los 11 accesos (6+1+3+1) y NO los botones viejos
{
  const { ctx, page } = await nuevaPagina()
  console.log('— login: 11 accesos nuevos, sin botones legacy')
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' }); await page.waitForTimeout(800)
  for (const nombre of ['Javier', 'Lucía', 'Marcos', 'Carmen', 'Álvaro', 'Paula', 'David', 'Gamba Esports', 'La Tienda del Dragón', 'Arcade Planet', 'Equipo Torneum']) {
    ok(await page.getByRole('button', { name: new RegExp(nombre) }).count() > 0, `acceso «${nombre}» visible`)
  }
  for (const grupo of ['Jugadores', 'Organizador', 'Sedes', 'Admin']) {
    ok(await page.getByText(grupo, { exact: true }).count() > 0, `grupo «${grupo}» visible`)
  }
  // Los botones viejos enseñaban el email completo: ya no hay ninguno
  for (const email of ['jugador@torneum.com', 'to@torneum.com', 'local@torneum.com']) {
    ok(await page.getByText(email).count() === 0, `sin botón del legacy ${email}`)
  }
  await page.screenshot({ path: `${OUT}/1-login-accesos.png`, fullPage: true })
  await ctx.close()
}

// ── 2. jugador@ (legacy, sin botón) sigue entrando TECLEANDO y con su mundo rico
{
  const { ctx, page } = await nuevaPagina()
  console.log('— jugador@ teclea y conserva su mundo')
  await loginTeclado(page, 'jugador@torneum.com')
  ok(page.url().includes('/explorar'), `jugador@ entra tecleando (${page.url()})`)
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Lima Smash Weekly #41').count() > 0, 'su historial rico sigue ahí (mundo todh-demo intacto)')
  ok(await page.getByText(/Nocturna/).count() > 0, 'sus crews propias siguen (Nocturna)')
  await ctx.close()
}

// ── 3. Javier: cuenta VACÍA de verdad; su inscripción PERSISTE tras logout+login
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Javier: perfil vacío + persistencia de su namespace')
  await loginBoton(page, 'Javier')
  ok(page.url().includes('/explorar'), `un toque en Javier entra (${page.url()})`)
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Javier').count() > 0, 'el perfil lleva su nombre')
  ok(await page.getByText(/sin valoraciones aún/).count() > 0, 'estrellas «— · sin valoraciones aún»')
  ok(await page.getByText('Aún no has jugado ningún torneo').count() > 0, 'historial vacío con su CTA')
  ok(await page.getByText(/Nocturna|Vandalia/).count() === 0, 'sin crews propias de Álex')
  ok(await page.getByText(/Fundador #12/).count() === 0, 'sin la insignia Fundador del escaparate')
  await page.screenshot({ path: `${OUT}/3-javier-perfil.png`, fullPage: true })
  await page.goto(`${BASE}/perfil/logros`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText(/0 de 11/).count() > 0, 'logros 0 de 11 (todos bloqueados)')
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Bienvenido a Torneum').count() > 0, 'la noti de bienvenida está')
  ok(await page.getByText('Te toca · Mesa 3').count() === 0, 'sin las notis del mundo de Álex')
  await page.goto(`${BASE}/live`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText(/Aún no estás inscrito/).count() > 0, '/live sin salas (no está inscrito en nada)')
  // Se inscribe a un torneo (t11, 15€)
  await page.goto(`${BASE}/torneo/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  // Logout + login de Javier → la inscripción PERSISTE en su namespace
  await logout(page)
  await loginTeclado(page, 'javier@torneum.com')
  await page.goto(`${BASE}/live`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText(/Smash Arena Madrid/).count() > 0, 'tras logout+login su inscripción sigue (persistencia por cuenta)')
  await page.screenshot({ path: `${OUT}/3-javier-live-persistente.png` })
  await ctx.close()
}

// ── 4. Lucía NO ve la inscripción de Javier (aislamiento entre namespaces)
{
  const { ctx, page } = await nuevaPagina()
  console.log('— Lucía: aislamiento')
  // Mismo contexto de navegador nuevo: primero Javier deja su huella…
  await loginBoton(page, 'Javier')
  await page.goto(`${BASE}/torneo/t11`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  await logout(page)
  // …y Lucía entra en el MISMO navegador: no debe ver nada de Javier
  await loginBoton(page, 'Lucía')
  await page.goto(`${BASE}/live`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText(/Aún no estás inscrito/).count() > 0, 'Lucía no ve la inscripción de Javier')
  await page.goto(`${BASE}/notificaciones`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Inscripción confirmada').count() === 0, 'ni su notificación de inscripción')
  await page.screenshot({ path: `${OUT}/4-lucia-aislada.png` })
  await ctx.close()
}

// ── 5. David: consola de TO vacía a su nombre; puede publicar su primer torneo
{
  const { ctx, page } = await nuevaPagina()
  console.log('— David: TO fresco con consola vacía que publica')
  await loginBoton(page, 'David')
  await page.goto(`${BASE}/consola`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1800)
  ok(page.url().includes('/consola'), `David abre la consola (${page.url()})`)
  ok(await page.getByText('Aún no tienes torneos').count() > 0, 'consola vacía: CTA de crear el primero')
  ok(await page.getByText(/disputa por resolver/).count() === 0, 'sin la disputa seed del mundo de Lima')
  ok(await page.getByText('Sin avisos pendientes').count() > 0, '«Sin avisos» en la columna de avisos')
  await page.screenshot({ path: `${OUT}/5-david-consola-vacia.png`, fullPage: true })
  // Su página pública de organizador lleva SU nombre (fallback «Organizador nuevo»)
  await page.goto(`${BASE}/mi-pagina`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('David').count() > 0, '/mi-pagina lleva su nombre')
  ok(await page.getByText(/Organizador nuevo/).count() > 0, 'con el perfil «Organizador nuevo»')
  // /gestionar vacío y /crear-torneo publica
  await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Aún no tienes torneos').count() > 0, '/gestionar vacío')
  await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByPlaceholder(/Lima Smash Weekly/).fill('Open de David #1')
  // Sin local vinculado: David elige sede antes de publicar
  await page.getByRole('button', { name: /elegir sede/i }).first().click(); await page.waitForTimeout(600)
  await page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await page.waitForTimeout(1200)
  await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Open de David #1').count() > 0, 'su torneo publicado aparece en /gestionar')
  await page.screenshot({ path: `${OUT}/5-david-gestionar.png` })
  await ctx.close()
}

// ── 6. Sedes: cada cuenta abre el panel de SU local
{
  const { ctx, page } = await nuevaPagina()
  console.log('— sedes: gamba@ y dragon@')
  await loginBoton(page, 'Gamba Esports')
  ok(page.url().includes('/sede'), `gamba@ entra a /sede (${page.url()})`)
  await page.waitForTimeout(1000)
  ok(await page.getByText('Gamba Esports').count() > 0, 'el panel es el de Gamba Esports')
  // El panel de sede tiene su propio botón de salir
  await page.locator('button[aria-label="Cerrar sesión"]').first().click(); await page.waitForTimeout(1200)
  await loginBoton(page, 'La Tienda del Dragón')
  ok(page.url().includes('/sede'), `dragon@ entra a /sede (${page.url()})`)
  await page.waitForTimeout(1000)
  ok(await page.getByText('La Tienda del Dragón').count() > 0, 'el panel es el de La Tienda del Dragón')
  await page.screenshot({ path: `${OUT}/6-dragon-sede.png`, fullPage: true })
  await ctx.close()
}

// ── 7. MUNDO COMPARTIDO (v2): las cuentas comparten mundo — torneos,
// inscripciones cruzadas, amistades entre cuentas y torneo iniciado en vivo.
// Mismo contexto de navegador todo el rato, cambiando de cuenta por logout/login.
{
  const { ctx, page } = await nuevaPagina()
  page.on('dialog', d => d.accept())
  console.log('— mundo compartido: David publica, Javier/Lucía lo ven y se inscriben')
  // Una cuenta fresca estrena el onboarding real en /explorar: se salta aquí
  // para que no tape los clicks del flujo (el onboarding ya tiene su prueba).
  const saltarOnboarding = async () => {
    const saltar = page.getByRole('button', { name: /Saltar por ahora/ })
    if (await saltar.count() > 0) { await saltar.first().click(); await page.waitForTimeout(600) }
  }

  // (a) David crea su torneo
  await loginBoton(page, 'David')
  await saltarOnboarding()
  await page.goto(`${BASE}/crear-torneo`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await page.getByPlaceholder(/Lima Smash Weekly/).fill('Copa Mundo Compartido')
  await page.getByRole('button', { name: /elegir sede/i }).first().click(); await page.waitForTimeout(600)
  await page.getByRole('button', { name: /Arcade Planet/ }).last().click(); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Publicar torneo/ }).first().click(); await page.waitForTimeout(1200)
  await logout(page)

  // Javier LO VE en /explorar y se inscribe
  await loginBoton(page, 'Javier')
  await saltarOnboarding()
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await saltarOnboarding()
  ok(await page.getByText('Copa Mundo Compartido').count() > 0, 'Javier VE el torneo de David en /explorar (mundo compartido)')
  await page.getByText('Copa Mundo Compartido').first().click()
  await page.waitForURL('**/torneo/**', { timeout: 8000 }); await page.waitForTimeout(1500)
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  ok(await page.getByText('Inscrito · ver en mi cartera').count() > 0, 'Javier queda inscrito al torneo de David')
  ok(await page.getByText(/1 ?\/ ?32/).count() > 0, 'el contador de la ficha marca 1/32')

  // (b) Javier busca a Lucía en /amigos y la agrega
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByPlaceholder(/Busca por alias/).fill('Lucía'); await page.waitForTimeout(500)
  ok(await page.getByText('Cuenta Torneum').count() > 0, 'Lucía sale en el buscador marcada como «Cuenta Torneum»')
  await page.getByRole('button', { name: /Agregar/ }).first().click(); await page.waitForTimeout(700)
  await page.getByPlaceholder(/Busca por alias/).fill('Lucía'); await page.waitForTimeout(500)
  ok(await page.getByText('Pendiente').count() > 0, 'tras agregar, la solicitud queda Pendiente')
  await logout(page)

  // Lucía: la solicitud de Javier le aparece → Aceptar; y también se inscribe
  await loginBoton(page, 'Lucía')
  await saltarOnboarding()
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('button[aria-label="Aceptar a Javier"]').count() > 0, 'a Lucía le aparece la solicitud de Javier')
  await page.locator('button[aria-label="Aceptar a Javier"]').click(); await page.waitForTimeout(700)
  ok(await page.getByText('Javier').count() > 0, 'aceptar → Javier en la lista de amigos de Lucía')
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await saltarOnboarding()
  await page.getByText('Copa Mundo Compartido').first().click()
  await page.waitForURL('**/torneo/**', { timeout: 8000 }); await page.waitForTimeout(1500)
  ok(await page.getByText(/1 ?\/ ?32/).count() > 0, 'Lucía ve la inscripción de Javier en el contador (1/32)')
  await page.getByRole('button', { name: /Inscribirme/i }).first().click(); await page.waitForTimeout(700)
  await page.getByRole('button', { name: /^Pagar .*€$|^Confirmar inscripción$/ }).click(); await page.waitForTimeout(2600)
  await logout(page)

  // (c) Marcos agrega a Carmen → Carmen RECHAZA
  await loginBoton(page, 'Marcos')
  await saltarOnboarding()
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  await page.getByPlaceholder(/Busca por alias/).fill('Carmen'); await page.waitForTimeout(500)
  await page.getByRole('button', { name: /Agregar/ }).first().click(); await page.waitForTimeout(700)
  await logout(page)
  await loginBoton(page, 'Carmen')
  await saltarOnboarding()
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.locator('button[aria-label="Rechazar a Marcos"]').count() > 0, 'a Carmen le aparece la solicitud de Marcos')
  await page.locator('button[aria-label="Rechazar a Marcos"]').click(); await page.waitForTimeout(700)
  ok(await page.locator('button[aria-label="Rechazar a Marcos"]').count() === 0, 'rechazar → la solicitud desaparece')
  ok(await page.getByText('Marcos').count() === 0, 'y Marcos NO queda como amigo de Carmen')
  await logout(page)

  // Verificación en la otra dirección: Javier ve a Lucía como amiga
  await loginBoton(page, 'Javier')
  await saltarOnboarding()
  await page.goto(`${BASE}/amigos`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1200)
  ok(await page.getByText('Lucía').count() > 0, 'Javier ve a Lucía en SU lista de amigos (las dos direcciones)')
  await logout(page)

  // (a2) David ve el contador subido y los nombres; hace check-in, genera el
  // bracket y ARRANCA el torneo sin estar lleno → EN DIRECTO para todos
  await loginBoton(page, 'David')
  await saltarOnboarding()
  await page.goto(`${BASE}/gestionar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('2/32').count() > 0, 'David ve el contador con las 2 inscripciones de cuenta (2/32)')
  await page.getByText('Copa Mundo Compartido').first().click()
  await page.waitForURL('**/gestionar/**', { timeout: 8000 }); await page.waitForTimeout(1800)
  ok(await page.getByText('Javier').count() > 0, 'David ve a «Javier» POR SU NOMBRE en la lista de inscritos')
  ok(await page.getByText('Lucía').count() > 0, 'y a «Lucía» también')
  await page.getByRole('button', { name: /Check-in masivo/i }).click(); await page.waitForTimeout(600)
  await page.getByRole('button', { name: /Generar bracket/ }).first().click(); await page.waitForTimeout(900)
  ok(await page.getByRole('button', { name: /Iniciar torneo/ }).count() > 0, 'con bracket generado aparece «Iniciar torneo»')
  await page.getByRole('button', { name: /Iniciar torneo/ }).first().click(); await page.waitForTimeout(900)
  ok(await page.getByText('El torneo está EN DIRECTO').count() > 0, 'David inicia el torneo sin llenarlo → EN DIRECTO')
  await logout(page)

  // Marcos (no inscrito) lo ve EN DIRECTO y ya NO puede inscribirse. La ficha
  // se abre por id leído del MUNDO compartido (verifica de paso 'todh-mundo').
  await loginBoton(page, 'Marcos')
  await saltarOnboarding()
  await page.goto(`${BASE}/explorar`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  await saltarOnboarding()
  ok(await page.getByText('Copa Mundo Compartido').count() > 0, 'Marcos también ve el torneo (ya en directo) en /explorar')
  const idCopa = await page.evaluate(() => {
    const w = JSON.parse(localStorage.getItem('todh-mundo'))
    return w?.state?.creados?.find(c => c.nombre === 'Copa Mundo Compartido')?.id ?? null
  })
  ok(!!idCopa, `el torneo vive en el MUNDO común 'todh-mundo' (${idCopa})`)
  await page.goto(`${BASE}/torneo/${idCopa}`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText(/inscripciones cerradas/i).count() > 0, 'la ficha avisa: torneo en directo — inscripciones cerradas')
  ok(await page.getByRole('button', { name: /Inscribirme/i }).count() === 0, 'y el botón Inscribirme ya no existe')
  await page.screenshot({ path: `${OUT}/7-live-cerrado.png` })
  await logout(page)

  // (d) el mundo rico legacy sigue: jugador@ tecleando ve su mundo de siempre
  await loginTeclado(page, 'jugador@torneum.com')
  await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' }); await page.waitForTimeout(1500)
  ok(await page.getByText('Lima Smash Weekly #41').count() > 0, 'jugador@ conserva su historial rico tras todo el cruce')
  ok(await page.getByText(/Nocturna/).count() > 0, 'y sus crews propias (Nocturna) siguen siendo suyas')
  await ctx.close()
}

await browser.close()
console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`)
process.exit(fallos === 0 ? 0 : 1)
