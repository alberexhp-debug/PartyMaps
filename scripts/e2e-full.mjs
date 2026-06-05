// E2E completo contra Vercel: crea un dueño fresco (API), prueba dar de alta,
// recorre el primer acceso del trabajador (con TOTP real), chat y resets.
// Captura todos los 4xx. Limpia al final.
import { chromium } from 'playwright'
import { generateSync } from 'otplib'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://party-maps-hojy.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })

const rnd = Date.now().toString().slice(-6)
const duenoEmail = `e2edueno${rnd}@example.com`
const duenoPass = `Dueno${rnd}!`
let localId = null, workerAuthId = null, workerUser = null, workerPass = null, totpSecret = null, altaStatus = null, altaBody = null

const errs = []
function watch(page, tag) {
  page.on('response', async r => {
    const u = r.url(); const s = r.status()
    if ((u.includes('/api/local-panel/') || u.includes('/rest/v1/')) && s >= 400) {
      let b = ''; try { b = (await r.text()).slice(0, 160) } catch {}
      errs.push(`[${tag}] ${s} ${r.request().method()} ${u.replace(BASE, '').replace(env.NEXT_PUBLIC_SUPABASE_URL, '')}  ${b}`)
    }
    if (u.endsWith('/api/local-panel/equipo') && r.request().method() === 'POST') { altaStatus = s; try { altaBody = await r.json() } catch {} }
    if (u.includes('/cuenta/totp/iniciar')) { try { totpSecret = (await r.json()).secret } catch {} }
  })
}
const shot = (p, n) => p.screenshot({ path: `e2e-shots/${n}.png`, fullPage: true }).catch(() => {})
const ok = (m) => console.log('  ✅', m), bad = (m) => console.log('  ❌', m)

const browser = await chromium.launch({ headless: true })
try {
  // 0) Crear dueño fresco vía API (como el formulario de registro) ----------
  console.log('\n0) Crear dueño fresco vía /api/local-panel/registro')
  const reg = await fetch(`${BASE}/api/local-panel/registro`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: duenoEmail, password: duenoPass, nombre_responsable: 'Dueño E2E', nombre_local: `Local E2E ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 1, Madrid', latitud: '40.4203', longitud: '-3.7058', aforo_maximo: '200' }),
  })
  const regBody = await reg.json().catch(() => ({}))
  if (!reg.ok) { bad(`registro falló: ${reg.status} ${JSON.stringify(regBody)}`); throw new Error('registro') }
  localId = regBody.local_id; ok(`dueño creado (${duenoEmail}), local ${localId}`)

  // 1) Login dueño fresco + dar de alta -------------------------------------
  console.log('\n1) Login dueño fresco → dar de alta')
  const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pD = await ctxD.newPage(); watch(pD, 'dueño')
  await pD.goto(`${BASE}/local-panel/login`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(1200)
  for (const re of [/aceptar/i, /esenciales/i]) { try { await pD.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
  await pD.locator('input[autocomplete="username"]').fill(duenoEmail)
  await pD.locator('input[autocomplete="current-password"]').fill(duenoPass)
  await pD.getByRole('button', { name: 'Acceder al panel' }).click()
  await pD.waitForTimeout(3500); console.log('   URL:', pD.url())
  if (!pD.url().includes('/local-panel/')) { bad('login dueño no entró al panel'); await shot(pD, 'D-login-fail') }
  await pD.goto(`${BASE}/local-panel/equipo`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(2000)
  await pD.getByRole('button', { name: 'Dar de alta' }).first().click(); await pD.waitForTimeout(600)
  workerUser = `wkr${rnd}`
  await pD.getByPlaceholder('Nombre completo').fill('Trabajador E2E')
  await pD.getByPlaceholder('p.ej. juan.barra').fill(workerUser)
  await pD.getByRole('button', { name: 'Dar de alta' }).nth(1).click()
  await pD.waitForTimeout(3500); await shot(pD, 'D-alta')
  console.log(`   POST alta → ${altaStatus}`)
  if (altaStatus === 200 && altaBody?.credenciales) { workerPass = altaBody.credenciales.password; ok(`alta OK, credenciales: ${altaBody.credenciales.username} / ${workerPass}`) }
  else { bad(`alta NO ok (status ${altaStatus}): ${JSON.stringify(altaBody)}`) }
  workerAuthId = altaBody?.trabajador?.auth_id || null

  // 2) Primer acceso del trabajador (password + TOTP real) ------------------
  if (workerPass) {
    console.log('\n2) Primer acceso del trabajador')
    const ctxW = await browser.newContext({ viewport: { width: 420, height: 880 } })
    const pW = await ctxW.newPage(); watch(pW, 'worker')
    await pW.goto(`${BASE}/local-panel/login`, { waitUntil: 'domcontentloaded' }); await pW.waitForTimeout(1000)
    for (const re of [/aceptar/i, /esenciales/i]) { try { await pW.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} }
    await pW.locator('input[autocomplete="username"]').fill(workerUser)
    await pW.locator('input[autocomplete="current-password"]').fill(workerPass)
    await pW.getByRole('button', { name: 'Acceder al panel' }).click()
    await pW.waitForTimeout(3500); console.log('   URL tras login worker:', pW.url())
    if (!pW.url().includes('primer-acceso')) bad('no redirigió a primer-acceso'); else ok('redirigió a primer-acceso')
    await shot(pW, 'W-primer-acceso')
    // Paso contraseña
    const nuevaPass = `Wkr${rnd}!nueva`
    await pW.getByPlaceholder('Mínimo 8 caracteres').fill(nuevaPass)
    await pW.getByPlaceholder('••••••••').fill(nuevaPass)
    await pW.getByRole('button', { name: 'Continuar' }).click()
    await pW.waitForTimeout(3000)
    // Esperar secreto TOTP
    for (let i = 0; i < 20 && !totpSecret; i++) await pW.waitForTimeout(400)
    if (!totpSecret) { bad('no llegó el secreto TOTP'); await shot(pW, 'W-totp-nosecret') }
    else {
      ok('QR/secreto TOTP recibido')
      await shot(pW, 'W-totp-qr')
      const code = generateSync({ secret: totpSecret })
      await pW.getByPlaceholder('000000').fill(code)
      await pW.getByRole('button', { name: /Activar y entrar/i }).click()
      await pW.waitForTimeout(3500); console.log('   URL tras activar:', pW.url())
      if (/\/local-panel\/(scanner|dashboard|pedidos-bar|taquilla|cortesias)/.test(pW.url())) ok('trabajador entró al panel')
      else bad('no entró al panel tras TOTP')
      await shot(pW, 'W-panel')

      // 3) Worker → Mensajes → enviar
      console.log('\n3) Chat lado trabajador')
      await pW.goto(`${BASE}/local-panel/mensajes`, { waitUntil: 'domcontentloaded' }); await pW.waitForTimeout(2000)
      const inp = pW.getByPlaceholder('Escribe un mensaje…')
      if (await inp.count()) { await inp.fill('Hola jefe, soy el trabajador'); await pW.getByRole('button').last().click(); await pW.waitForTimeout(1500); ok('worker envió mensaje') }
      else bad('no apareció el chat del trabajador')
      await shot(pW, 'W-chat')
    }
    await ctxW.close()
  }

  // 4) Dueño → ficha del trabajador → chat + edición ------------------------
  console.log('\n4) Dueño: ficha del trabajador')
  await pD.goto(`${BASE}/local-panel/equipo`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(2000)
  const fila = pD.getByText('Trabajador E2E').first()
  if (await fila.count()) { await fila.click(); await pD.waitForTimeout(2000); ok('abrió la ficha') } else bad('no encontró la fila del trabajador')
  await shot(pD, 'D-ficha')
  // Abrir chat y leer
  const btnChat = pD.getByRole('button', { name: /Abrir chat/i })
  if (await btnChat.count()) { await btnChat.click(); await pD.waitForTimeout(2000); const body = await pD.locator('body').innerText(); ok(body.includes('Hola jefe') ? 'el dueño ve el mensaje del trabajador' : 'chat abierto (sin mensaje aún)'); const ci = pD.getByPlaceholder('Escribe un mensaje…'); if (await ci.count()) { await ci.fill('Recibido, bienvenido'); await pD.getByRole('button').last().click(); await pD.waitForTimeout(1200) } await shot(pD, 'D-chat'); await pD.keyboard.press('Escape').catch(() => {}) }
  else bad('no apareció el botón de chat en la ficha')

  console.log('\n=== ERRORES 4xx capturados ===')
  if (!errs.length) console.log('  (ninguno)')
  for (const e of [...new Set(errs)]) console.log('  ', e)
} catch (e) {
  console.log('ERROR e2e:', e.message)
} finally {
  // Limpieza
  console.log('\n5) Limpieza')
  try {
    if (workerAuthId) await svc.auth.admin.deleteUser(workerAuthId)
    if (localId) await svc.from('locales').delete().eq('id', localId) // cascada usuario_local
    // borra cuenta auth del dueño (buscando por email)
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
    const du = list?.users?.find(u => u.email === duenoEmail)
    if (du) await svc.auth.admin.deleteUser(du.id)
    console.log('  limpieza hecha')
  } catch (e) { console.log('  limpieza parcial:', e.message) }
  await browser.close()
}
