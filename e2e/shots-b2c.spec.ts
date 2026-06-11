import { test } from '@playwright/test'

// Capturas B2C autenticado con la cuenta temporal viztest@rumbo.local.
test('capturas B2C', async ({ page }) => {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /Solo esenciales/i }).click().catch(() => {})
  await page.getByRole('button', { name: /^Correo$/ }).click().catch(() => {})
  await page.getByPlaceholder('tu@correo.com').fill('viztest@rumbo.local')
  await page.getByPlaceholder('Contraseña').fill('VizTest_2026!')
  await page.getByRole('button', { name: /^Entrar$/ }).click()
  await page.waitForURL(u => !u.pathname.includes('/login'), { timeout: 25000 }).catch(() => {})
  await page.waitForTimeout(3000)

  for (const [name, path] of [['perfil', '/perfil'], ['planes', '/planes'], ['amigos', '/amigos'], ['explorar', '/explorar'], ['mapa', '/mapa']] as [string, string][]) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2800)
    await page.screenshot({ path: `e2e-shots/visual/b2c-${name}.png`, fullPage: true })
  }

  // Ficha de local: abrir la primera tarjeta de Explorar.
  await page.goto('/explorar', { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2800)
  const card = page.locator('button').filter({ hasText: /€|ambiente|abierto|cerrado|Madrid/i }).first()
  await card.click({ timeout: 5000 }).catch(() => {})
  await page.waitForTimeout(1500)
  await page.screenshot({ path: 'e2e-shots/visual/b2c-ficha-local.png', fullPage: true })
})
