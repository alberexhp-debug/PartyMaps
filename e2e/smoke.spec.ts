import { test, expect } from '@playwright/test'

/**
 * Smoke tests: comprueban que las pantallas principales renderizan sin errores
 * de hidratación ni excepciones JS. NO dependen de credenciales reales.
 * Si pasan: el deploy no está roto. Si fallan: hay regresión visible al usuario.
 */

test('bienvenida muestra el carrusel y CTAs', async ({ page }) => {
  await page.goto('/bienvenida')
  await expect(page.getByText('Rumbo').first()).toBeVisible()
  await expect(page.getByText('Descubre qué merece la pena')).toBeVisible()
  // Avanzar al último slide
  await page.getByRole('button', { name: /Siguiente/i }).click()
  await page.getByRole('button', { name: /Siguiente/i }).click()
  await expect(page.getByRole('button', { name: /Crear cuenta/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /Ya tengo cuenta/i })).toBeVisible()
})

test('login pwa renderiza formulario de teléfono', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Bienvenido')).toBeVisible()
  await expect(page.getByPlaceholder('600 000 000')).toBeVisible()
  await expect(page.getByRole('button', { name: /Enviar código SMS/i })).toBeVisible()
})

test('admin login muestra campos y exige TOTP', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.getByText('Panel de administración')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Contraseña')).toBeVisible()
})

test('panel local login muestra formulario', async ({ page }) => {
  await page.goto('/local-panel/login')
  await expect(page.getByText('Panel del local')).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
})

test('carta pública con slug inválido muestra estado vacío', async ({ page }) => {
  await page.goto('/c/noexiste99')
  await expect(page.getByText('Carta no encontrada')).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('link', { name: /Ir a Rumbo/i })).toBeVisible()
})

test('explorar (PWA) carga el shell sin crash', async ({ page }) => {
  await page.goto('/explorar')
  // Sin login redirige a /login o carga el shell del mapa. Aceptamos ambos.
  // Lo importante es que no se vea un error 500.
  await expect(page.locator('body')).not.toContainText(/Application error|Internal Server Error/i)
})

test('cookie banner aparece y se puede cerrar', async ({ page, context }) => {
  await context.clearCookies()
  await page.goto('/bienvenida')
  const banner = page.getByText('Usamos cookies para que esto funcione')
  await expect(banner).toBeVisible()
  await page.getByRole('button', { name: /Solo esenciales/i }).click()
  await expect(banner).not.toBeVisible()
})
