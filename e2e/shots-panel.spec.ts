import { test } from '@playwright/test'

// Verifica el logo arreglado en bienvenida (sin banner de cookies tapando).
test('bienvenida limpia', async ({ page }) => {
  await page.goto('/bienvenida', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Solo esenciales/i }).click().catch(() => {})
  await page.waitForTimeout(900)
  await page.screenshot({ path: 'e2e-shots/visual/bienvenida-2.png', fullPage: true })
})

// Capturas del panel local autenticado (cuenta demo). Solo navega y captura.
test('capturas panel local', async ({ page }) => {
  await page.goto('/local-panel/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Solo esenciales/i }).click().catch(() => {})
  await page.getByPlaceholder('tu_usuario').fill('dueno@testlocal.com')
  await page.getByPlaceholder('••••••••').fill('PM_Dueno2025!')
  await page.getByRole('button', { name: /Acceder al panel/i }).click()
  await page.waitForURL(/\/local-panel\/(dashboard|puesta-a-punto|scanner)/, { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(3000)
  const zonas = ['dashboard', 'taquilla', 'pedidos-bar', 'sala', 'equipo', 'mensajes', 'configuracion', 'eventos', 'crm', 'analytics']
  for (const z of zonas) {
    await page.goto(`/local-panel/${z}`, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2200)
    await page.screenshot({ path: `e2e-shots/visual/panel-${z}.png`, fullPage: true })
  }
})
