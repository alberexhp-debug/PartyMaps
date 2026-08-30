// Verifica el login del panel de local contra el deploy REAL (navegador → Vercel → Supabase).
import { chromium } from 'playwright'

const BASE = process.argv[2] || 'https://torneum.vercel.app'
const EMAIL = process.argv[3] || 'dueno@testlocal.com'
const PASS = process.argv[4] || 'PM_Dueno2025!'

const browser = await chromium.launch()
const page = await browser.newPage()
const errores = []
const fallos = []
page.on('console', m => { if (m.type() === 'error') errores.push(m.text()) })
page.on('response', r => { if (r.status() >= 400) fallos.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 160)}`) })

await page.goto(`${BASE}/local-panel/login`, { waitUntil: 'networkidle' })
await page.fill('input[autocomplete="username"]', EMAIL)
await page.fill('input[autocomplete="current-password"]', PASS)
// Enter en el campo de contraseña (evita overlays que tapan el botón).
await page.press('input[autocomplete="current-password"]', 'Enter')

// Espera a navegar fuera de /login O a que aparezca un toast de error.
let resultado = 'desconocido'
try {
  await page.waitForFunction(
    () => !location.pathname.endsWith('/login') || !!document.body.innerText.match(/No tienes acceso|incorrect|Demasiados/i),
    { timeout: 15000 },
  )
} catch {}
await page.waitForTimeout(1500)

const url = page.url()
const texto = await page.evaluate(() => document.body.innerText)
const toastErr = (texto.match(/No tienes acceso a ningún local|Usuario o contraseña incorrectos|Demasiados intentos/i) || [])[0]

if (/\/local-panel\/(dashboard|scanner|pedidos-bar|puesta-a-punto)/.test(url)) resultado = '✅ LOGIN OK → ' + url
else if (toastErr) resultado = '❌ Sigue fallando: "' + toastErr + '" (url: ' + url + ')'
else resultado = '⚠️ Estado incierto. url=' + url

console.log(resultado)
if (fallos.length) console.log('Requests ≥400:\n  ' + fallos.slice(0, 10).join('\n  '))
if (errores.length) console.log('Console errors:', errores.slice(0, 5))
await browser.close()
process.exitCode = resultado.startsWith('✅') ? 0 : 1
