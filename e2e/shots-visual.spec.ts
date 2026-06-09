import { test } from '@playwright/test'

// Capturas para el trabajo de pulido visual. Solo pantallas públicas (sin
// credenciales). Corre: npx playwright test e2e/shots-visual.spec.ts
const PAGINAS: [string, string][] = [
  ['bienvenida', '/bienvenida'],
  ['user-login', '/login'],
  ['user-registro', '/registro'],
  ['local-login', '/local-panel/login'],
  ['local-registro', '/local-panel/registro'],
  ['para-locales', '/para-locales'],
  ['admin-login', '/admin/login'],
  ['gestor-login', '/gestor/login'],
]

for (const [nombre, ruta] of PAGINAS) {
  test(`shot ${nombre}`, async ({ page }) => {
    await page.goto(ruta, { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(1200)
    await page.screenshot({ path: `e2e-shots/visual/${nombre}.png`, fullPage: true })
  })
}
