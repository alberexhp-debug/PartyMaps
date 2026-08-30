// E2E del alta de RRPP contra Vercel: dueño crea un RRPP desde el panel local
// → RRPP entra (primer acceso: contraseña + TOTP real) → re-login con 2FA.
// Requiere migración 037 aplicada. Cada fase en try/catch; limpia al final.
import { chromium } from 'playwright'
import { generateSync } from 'otplib'
import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdirSync } from 'node:fs'

const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const BASE = process.env.BASE || 'https://torneum.vercel.app'
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
mkdirSync('e2e-shots', { recursive: true })
const ok = m => console.log('  ✅', m), bad = m => console.log('  ❌', m)
const shot = (p, n) => p.screenshot({ path: `e2e-shots/${n}.png`, fullPage: true }).catch(() => {})

const rnd = Date.now().toString().slice(-6)
const duenoEmail = `e2ervpd${rnd}@example.com`, duenoPass = `Dueno${rnd}!`
const username = `rrpp${rnd}`
let localId = null, rrppPass = null, nuevaPass = `Rrpp${rnd}!nueva`, totpSecret = null, altaStatus = null, altaBody = null

const browser = await chromium.launch({ headless: true })
function watch(page) {
  page.on('dialog', d => d.accept().catch(() => {}))
  page.on('response', async r => {
    const u = r.url()
    if (u.includes('/cuenta/totp/iniciar')) { try { const j = await r.json(); if (j?.secret) totpSecret = j.secret } catch {} }
    if (u.endsWith('/api/local-panel/rrpp') && r.request().method() === 'POST') { altaStatus = r.status(); try { altaBody = await r.json() } catch {} }
  })
}
async function dismiss(p) { for (const re of [/aceptar/i, /esenciales/i]) { try { await p.getByRole('button', { name: re }).first().click({ timeout: 1000 }); break } catch {} } }

try {
  // 0. Dueño + local (vía API)
  const reg = await fetch(`${BASE}/api/local-panel/registro`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: duenoEmail, password: duenoPass, nombre_responsable: 'Dueño E2E', nombre_local: `Local RRPP ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 1', latitud: '40.4203', longitud: '-3.7058', aforo_maximo: '200' }) })
  const rb = await reg.json().catch(() => ({})); localId = rb.local_id
  reg.ok ? ok('dueño + local creados') : bad(`registro ${reg.status} ${JSON.stringify(rb)}`)

  // 1. Login dueño → panel RRPP → alta directa
  console.log('\n1) Dueño crea un RRPP desde el panel local')
  const ctxD = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  const pD = await ctxD.newPage(); watch(pD)
  await pD.goto(`${BASE}/local-panel/login`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(1200); await dismiss(pD)
  await pD.locator('input[autocomplete="username"]').fill(duenoEmail)
  await pD.locator('input[autocomplete="current-password"]').fill(duenoPass)
  await pD.getByRole('button', { name: 'Acceder al panel' }).click(); await pD.waitForTimeout(3500)
  await pD.goto(`${BASE}/local-panel/rrpp`, { waitUntil: 'domcontentloaded' }); await pD.waitForTimeout(2000)
  await pD.getByRole('button', { name: /Añadir RRPP/i }).click(); await pD.waitForTimeout(500)
  await pD.getByRole('button', { name: 'Crear nuevo' }).click(); await pD.waitForTimeout(400)
  await pD.getByPlaceholder('Leo García').fill('RRPP E2E')
  await pD.getByPlaceholder('leo.noches').fill(username)
  await pD.getByRole('button', { name: /Dar de alta RRPP/i }).click(); await pD.waitForTimeout(3500); await shot(pD, 'R-alta')
  console.log('   POST alta →', altaStatus)
  if (altaStatus === 200 && altaBody?.credenciales) { rrppPass = altaBody.credenciales.password; ok(`alta OK → ${altaBody.credenciales.username} / ${rrppPass}`) }
  else bad(`alta NO ok (${altaStatus}): ${JSON.stringify(altaBody)}`)
  await ctxD.close()

  // 2. RRPP: primer acceso (contraseña + TOTP real)
  if (rrppPass) {
    console.log('\n2) Primer acceso del RRPP')
    const ctxR = await browser.newContext({ viewport: { width: 420, height: 880 } })
    const pR = await ctxR.newPage(); watch(pR)
    await pR.goto(`${BASE}/rrpp/login`, { waitUntil: 'domcontentloaded' }); await pR.waitForTimeout(1200); await dismiss(pR)
    await pR.locator('input[autocomplete="username"]').fill(username)
    await pR.locator('input[autocomplete="current-password"]').fill(rrppPass)
    await pR.getByRole('button', { name: 'Entrar' }).click(); await pR.waitForTimeout(3500)
    console.log('   URL:', pR.url())
    pR.url().includes('primer-acceso') ? ok('redirige a primer-acceso') : bad('no fue a primer-acceso')
    await pR.getByPlaceholder('Mínimo 8 caracteres').fill(nuevaPass)
    await pR.getByPlaceholder('••••••••').fill(nuevaPass)
    await pR.getByRole('button', { name: 'Continuar' }).click(); await pR.waitForTimeout(2500)
    for (let i = 0; i < 20 && !totpSecret; i++) await pR.waitForTimeout(400)
    if (!totpSecret) { bad('sin secreto TOTP'); await shot(pR, 'R-nosecret') }
    else {
      ok('secreto TOTP recibido'); await shot(pR, 'R-qr')
      await pR.getByPlaceholder('000000').fill(generateSync({ secret: totpSecret }))
      await pR.getByRole('button', { name: /Activar y entrar/i }).click(); await pR.waitForTimeout(3500)
      console.log('   URL:', pR.url())
      ;(/\/rrpp(\?|$|\/)/.test(pR.url()) && !pR.url().includes('primer-acceso') && !pR.url().includes('login')) ? ok('RRPP entró al panel') : bad('no entró tras TOTP: ' + pR.url())
      await shot(pR, 'R-panel')
    }
    await ctxR.close()

    // 3. Re-login con 2FA
    console.log('\n3) Re-login del RRPP con 2FA')
    const ctxR2 = await browser.newContext({ viewport: { width: 420, height: 880 } })
    const pR2 = await ctxR2.newPage(); watch(pR2)
    await pR2.goto(`${BASE}/rrpp/login`, { waitUntil: 'domcontentloaded' }); await pR2.waitForTimeout(1000); await dismiss(pR2)
    await pR2.locator('input[autocomplete="username"]').fill(username)
    await pR2.locator('input[autocomplete="current-password"]').fill(nuevaPass)
    await pR2.getByRole('button', { name: 'Entrar' }).click(); await pR2.waitForTimeout(2000)
    const codeInp = pR2.getByPlaceholder('000000')
    if (await codeInp.count()) {
      ok('pide código 2FA')
      await codeInp.fill(generateSync({ secret: totpSecret }))
      await pR2.getByRole('button', { name: /Verificar y entrar/i }).click(); await pR2.waitForTimeout(3000)
      ;(/\/rrpp(\?|$|\/)/.test(pR2.url()) && !pR2.url().includes('login')) ? ok('2FA OK, entró') : bad('2FA no entró: ' + pR2.url())
    } else bad('no pidió código 2FA (URL ' + pR2.url() + ')')
    await ctxR2.close()
  }
} catch (e) { console.log('ERROR e2e:', e.message) }
finally {
  console.log('\n4) Limpieza')
  try {
    const { data: rr } = await svc.from('rrpp').select('id, usuario_id').eq('username', username).maybeSingle()
    if (rr) {
      await svc.from('rrpp').delete().eq('id', rr.id)
      if (rr.usuario_id) {
        const { data: u } = await svc.from('usuarios').select('auth_id').eq('id', rr.usuario_id).maybeSingle()
        await svc.from('usuarios').delete().eq('id', rr.usuario_id)
        if (u?.auth_id) await svc.auth.admin.deleteUser(u.auth_id)
      }
    }
    if (localId) await svc.from('locales').delete().eq('id', localId)
    const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
    const du = list?.users?.find(x => x.email === duenoEmail); if (du) await svc.auth.admin.deleteUser(du.id)
    console.log('  ok')
  } catch (e) { console.log('  parcial:', e.message) }
  await browser.close()
}
