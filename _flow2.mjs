import { chromium } from 'playwright'
import { mkdirSync } from 'fs'
const OUT = '/tmp/claude-1000/-home-albert-Desktop/59ea04f1-c730-44ac-b835-bc04c9ae6f5c/scratchpad/sedes'
mkdirSync(OUT, { recursive: true })
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1920, height: 950 } })
await page.addInitScript(() => { localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 })) })
const shot = n => page.screenshot({ path: `${OUT}/${n}.png` })

await page.goto('http://localhost:4567/sedes', { waitUntil: 'networkidle' })
await page.waitForTimeout(2500)
await shot('01_mapa_sedes')

// Filtro disponibles
await page.getByRole('button', { name: /Disponibles/ }).click()
await page.waitForTimeout(1200)
await shot('02_disponibles')

// Seleccionar Nexus (disponible) y pedir fecha
await page.locator('button[aria-label*="Nexus"]').first().evaluate(el => el.click())
await page.waitForTimeout(1200)
await shot('03_sheet_nexus')
await page.getByRole('button', { name: /pedir fecha/i }).click()
await page.waitForTimeout(400)
await shot('04_form_fecha')
await page.getByRole('button', { name: /enviar petición/i }).click()
await page.waitForTimeout(600)
await shot('05_enviada')

// También a Gamba (para verlo en el panel de la sede demo)
await page.getByRole('button', { name: /^Todas/ }).click()
await page.waitForTimeout(800)
await page.locator('button[aria-label*="Gamba"]').first().evaluate(el => el.click())
await page.waitForTimeout(800)
await page.getByRole('button', { name: /pedir fecha/i }).click()
await page.getByRole('button', { name: /enviar petición/i }).click()
await page.waitForTimeout(600)
await shot('06_solicitudes_lista')

// Panel de la sede: aceptar la petición
await page.goto('http://localhost:4567/sede', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot('07_sede_panel')
await page.getByRole('button', { name: /aceptar/i }).first().click()
await page.waitForTimeout(600)

// Notificaciones del TO: confirmación
await page.goto('http://localhost:4567/notificaciones', { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await shot('08_noti_confirmada')
await browser.close()
console.log('DONE')
