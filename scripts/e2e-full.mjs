// E2E completo contra Vercel: dueño fresco → alta → primer acceso (TOTP real)
// → chat trabajador → re-login con 2FA → ficha del dueño (chat, editar, resets).
// Cada fase en try/catch (un fallo no aborta el resto). Limpia al final.
import { chromium } from 'playwright'
import { generateSync } from 'otplib'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://party-maps-hojy.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })

const rnd = Date.now().toString().slice(-6)
const duenoEmail = `e2edueno${rnd}@example.com`, duenoPass = `Dueno${rnd}!`
const workerUser = `wkr${rnd}`
let localId = null, workerAuthId = null, workerPass = null, nuevaPass = `Wkr${rnd}!nueva`, totpSecret = null

const apiLog = [], errs = []
const ok = m => console.log('  ✅', m), bad = m => console.log('  ❌', m)
function watch(page, tag) {
  page.on('dialog', d => d.accept().catch(() => {}))
  page.on('response', async r => {
    const u = r.url(), s = r.status()
    if (u.includes('/cuenta/totp/iniciar')) { try { const j = await r.json(); if (j?.secret) totpSecret = j.secret } catch {} }
    if (u.includes('/api/local-panel/')) { let b = null; try { b = await r.json() } catch {}; apiLog.push({ tag, m: r.request().method(), path: u.replace(BASE, ''), s, b }) }
    if ((u.includes('/api/local-panel/') || u.includes('/rest/v1/')) && s >= 400) { let t = ''; try { t = (await r.text()).slice(0, 120) } catch {}; errs.push(`[${tag}] ${s} ${r.request().method()} ${u.replace(BASE, '').replace(env.NEXT_PUBLIC_SUPABASE_URL, '')} ${t}`) }
  })
}
const shot = (p, n) => p.screenshot({ path: `e2e-shots/${n}.png`, fullPage: true }).catch(() => {})
const last = (path, m) => [...apiLog].reverse().find(x => x.path.includes(path) && (!m || x.m === m))
async function dismissCookies(p) { for (const re of [/aceptar/i, /esenciales/i]) { try { await p.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} } }
async function loginPanel(p, user, pass) {
  await p.goto(`${BASE}/local-panel/login`, { waitUntil: 'domcontentloaded' }); await p.waitForTimeout(1200); await dismissCookies(p)
  await p.locator('input[autocomplete="username"]').fill(user)
  await p.locator('input[autocomplete="current-password"]').fill(pass)
  await p.getByRole('button', { name: 'Acceder al panel' }).click(); await p.waitForTimeout(3500)
}

const browser = await chromium.launch({ headless: true })
const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } })
const pD = await ctxD.newPage(); watch(pD, 'dueño')
try {
  console.log('\n0) Crear dueño fresco vía API')
  const reg = await fetch(`${BASE}/api/local-panel/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: duenoEmail, password: duenoPass, nombre_responsable: 'Dueño E2E', nombre_local: `Local E2E ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 1', latitud: '40.4203', longitud: '-3.7058', aforo_maximo: '200' }) })
  const rb = await reg.json().catch(() => ({})); localId = rb.local_id
  reg.ok ? ok(`dueño ${duenoEmail}`) : bad(`registro ${reg.status} ${JSON.stringify(rb)}`)

  try {
    console.log('\n1) Login dueño + dar de alta')
    await loginPanel(pD, duenoEmail, duenoPass); console.log('   URL:', pD.url())
    await pD.goto(`${BASE}/local-panel/equipo`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(2000)
    await pD.getByRole('button', { name: 'Dar de alta' }).first().click(); await pD.waitForTimeout(600)
    await pD.getByPlaceholder('Nombre completo').fill('Trabajador E2E')
    await pD.getByPlaceholder('p.ej. juan.barra').fill(workerUser)
    await pD.getByRole('button', { name: 'Dar de alta' }).nth(1).click(); await pD.waitForTimeout(3500); await shot(pD, 'D-alta')
    const a = last('/api/local-panel/equipo', 'POST')
    if (a?.s === 200 && a.b?.credenciales) { workerPass = a.b.credenciales.password; workerAuthId = a.b.trabajador?.auth_id; ok(`alta OK → ${a.b.credenciales.username} / ${workerPass}`) }
    else bad(`alta status ${a?.s}: ${JSON.stringify(a?.b)}`)
  } catch (e) { bad('fase 1: ' + e.message) }

  if (workerPass) {
    try {
      console.log('\n2) Primer acceso del trabajador (password + TOTP)')
      const ctxW = await browser.newContext({ viewport: { width: 420, height: 880 } })
      const pW = await ctxW.newPage(); watch(pW, 'worker')
      await loginPanel(pW, workerUser, workerPass); console.log('   URL:', pW.url())
      pW.url().includes('primer-acceso') ? ok('redirige a primer-acceso') : bad('no fue a primer-acceso')
      await pW.getByPlaceholder('Mínimo 8 caracteres').fill(nuevaPass)
      await pW.getByPlaceholder('••••••••').fill(nuevaPass)
      await pW.getByRole('button', { name: 'Continuar' }).click(); await pW.waitForTimeout(2500)
      for (let i = 0; i < 20 && !totpSecret; i++) await pW.waitForTimeout(400)
      if (!totpSecret) { bad('sin secreto TOTP'); await shot(pW, 'W-nosecret') }
      else {
        ok('secreto TOTP recibido'); await shot(pW, 'W-qr')
        await pW.getByPlaceholder('000000').fill(generateSync({ secret: totpSecret }))
        await pW.getByRole('button', { name: /Activar y entrar/i }).click(); await pW.waitForTimeout(3500)
        console.log('   URL:', pW.url());
        /\/local-panel\/(scanner|dashboard|pedidos-bar|taquilla|cortesias)/.test(pW.url()) ? ok('trabajador entró al panel') : bad('no entró tras TOTP')
        await shot(pW, 'W-panel')
        try {
          console.log('\n3) Chat lado trabajador')
          await pW.goto(`${BASE}/local-panel/mensajes`, { waitUntil: 'domcontentloaded' }); await pW.waitForTimeout(2500)
          const inp = pW.getByPlaceholder('Escribe un mensaje…')
          if (await inp.count()) {
            await inp.fill('Hola jefe, soy el trabajador')
            const sb = pW.getByRole('button', { name: 'Enviar' })
            if (await sb.count()) await sb.click(); else await pW.locator('input[placeholder="Escribe un mensaje…"] + button').click()
            await pW.waitForTimeout(1800); ok('worker envió mensaje'); await shot(pW, 'W-chat')
          } else bad('no apareció el chat del trabajador')
        } catch (e) { bad('fase 3: ' + e.message) }
      }
      await ctxW.close()
    } catch (e) { bad('fase 2: ' + e.message) }

    try {
      console.log('\n3b) Re-login del trabajador con 2FA')
      const ctxW2 = await browser.newContext({ viewport: { width: 420, height: 880 } })
      const pW2 = await ctxW2.newPage(); watch(pW2, 'worker2')
      await loginPanel(pW2, workerUser, nuevaPass); await pW2.waitForTimeout(1500)
      const codeInp = pW2.getByPlaceholder('000000')
      if (await codeInp.count()) {
        ok('pide código 2FA')
        await codeInp.fill(generateSync({ secret: totpSecret }))
        await pW2.getByRole('button', { name: /Verificar y entrar/i }).click(); await pW2.waitForTimeout(3500);
        (/\/local-panel\/(scanner|dashboard|pedidos-bar|taquilla|cortesias)/.test(pW2.url())) ? ok('2FA OK, entró') : bad('2FA no entró: ' + pW2.url())
      } else bad('no pidió código 2FA en el re-login (URL ' + pW2.url() + ')')
      await shot(pW2, 'W2-2fa'); await ctxW2.close()
    } catch (e) { bad('fase 3b: ' + e.message) }
  }

  try {
    console.log('\n4) Dueño: ficha del trabajador (chat, editar, resets)')
    await pD.goto(`${BASE}/local-panel/equipo`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(2000)
    const fila = pD.getByText('Trabajador E2E').first()
    if (!await fila.count()) { bad('no encontró la fila'); } else {
      await fila.click(); await pD.waitForTimeout(2000); ok('abrió la ficha'); await shot(pD, 'D-ficha')
      // chat
      const bc = pD.getByRole('button', { name: /Abrir chat/i })
      if (await bc.count()) {
        await bc.click(); await pD.waitForTimeout(2000)
        const body = await pD.locator('body').innerText()
        ok(body.includes('Hola jefe') ? 'el dueño ve el mensaje del trabajador' : 'chat abierto (sin msg)')
        const ci = pD.getByPlaceholder('Escribe un mensaje…')
        if (await ci.count()) { await ci.fill('Recibido, bienvenido'); const sb = pD.getByRole('button', { name: 'Enviar' }); if (await sb.count()) await sb.click(); await pD.waitForTimeout(1200) }
        await shot(pD, 'D-chat'); await pD.keyboard.press('Escape').catch(() => {}); await pD.waitForTimeout(500)
      } else bad('sin botón de chat')
      // editar
      const tel = pD.getByPlaceholder('600 000 000')
      if (await tel.count()) { await tel.fill('611223344'); await pD.getByRole('button', { name: /Guardar cambios/i }).click(); await pD.waitForTimeout(2000); const g = last('/api/local-panel/equipo', 'PATCH'); g?.s === 200 ? ok('editar datos OK') : bad('editar PATCH ' + g?.s) }
      // reset password
      const rp = pD.getByRole('button', { name: /Resetear contraseña/i })
      if (await rp.count()) { await rp.click(); await pD.waitForTimeout(2000); const r = last('/reset-password', 'POST'); r?.s === 200 ? ok('reset contraseña OK') : bad('reset-password ' + r?.s); await pD.keyboard.press('Escape').catch(() => {}); await pD.waitForTimeout(500) }
      // reset totp
      const rt = pD.getByRole('button', { name: /Reiniciar authenticator/i })
      if (await rt.count()) { await rt.click(); await pD.waitForTimeout(2000); const r = last('/reset-totp', 'POST'); r?.s === 200 ? ok('reset authenticator OK') : bad('reset-totp ' + r?.s) }
    }
  } catch (e) { bad('fase 4: ' + e.message) }

  console.log('\n=== ERRORES 4xx ===')
  const uniq = [...new Set(errs)]
  uniq.length ? uniq.forEach(e => console.log('  ', e)) : console.log('  (ninguno)')
} catch (e) { console.log('ERROR e2e:', e.message) }
finally {
  console.log('\n5) Limpieza')
  try {
    if (workerAuthId) await svc.auth.admin.deleteUser(workerAuthId).catch(() => {})
    if (localId) await svc.from('locales').delete().eq('id', localId)
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
    for (const e of [duenoEmail]) { const u = list?.users?.find(x => x.email === e); if (u) await svc.auth.admin.deleteUser(u.id).catch(() => {}) }
    // por si el reset cambió el auth del worker y quedó huérfano: bórralo por email sintético
    const wu = list?.users?.find(x => x.email === `${workerUser}@trabajadores.rumbomap.com`); if (wu) await svc.auth.admin.deleteUser(wu.id).catch(() => {})
    console.log('  ok')
  } catch (e) { console.log('  parcial:', e.message) }
  await browser.close()
}
