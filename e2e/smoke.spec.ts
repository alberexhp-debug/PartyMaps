import { test, expect, type Page } from '@playwright/test'

/**
 * Smoke tests de TORNEUM: comprueban que las pantallas principales renderizan
 * sin errores y que las piezas clave de producto están en su sitio (sistema de
 * puntos propio, sin start.gg, sidebar unificada, catálogo de juegos del admin).
 * Si pasan: el deploy no está roto. Si fallan: hay regresión visible.
 */

// Siembra sesión demo + estado (onboarding visto) antes de cargar la app.
const sesion = (page: Page, cuenta: 'jugador' | 'to' | 'admin') =>
  page.addInitScript((c) => {
    const cuentas = {
      jugador: { email: 'jugador@torneum.com', nombre: 'Álex', rol: 'jugador' },
      to: { email: 'to@torneum.com', nombre: 'Lima', rol: 'jugador', to: true, orgId: 'lima' },
      admin: { email: 'admin@torneum.com', nombre: 'Equipo Torneum', rol: 'admin' },
    } as const
    localStorage.setItem('todh-sesion', JSON.stringify({ state: { sesion: cuentas[c] }, version: 0 }))
    localStorage.setItem('todh-demo', JSON.stringify({ state: { onboardingVisto: true, juegosFavoritos: ['smash'], paisJugador: 'ES' }, version: 0 }))
  }, cuenta)

test('login muestra la marca y el acceso demo', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByText('Torneum').first()).toBeVisible()
  await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible()
})

test('explorar carga torneos (start.gg permitido solo como descubrimiento)', async ({ page }) => {
  await sesion(page, 'jugador')
  await page.goto('/explorar')
  await expect(page.getByRole('heading', { name: 'Explorar' })).toBeVisible()
  await expect(page.getByText('Lima Smash Weekly #42').first()).toBeVisible()
  // Desde el 29-08 start.gg vuelve SOLO en descubrimiento («También en España»);
  // lo que sigue prohibido es que puntúe: el explicador del ranking es propio.
  await expect(page.locator('body')).not.toContainText(/Application error|Internal Server Error/i)
})

test('ranking propio: ámbitos España/Mundial/Circuito y modalidad', async ({ page }) => {
  await sesion(page, 'jugador')
  await page.goto('/ranking')
  await expect(page.getByRole('heading', { name: /Ranking/ }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'España', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mundial' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Circuito' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Online', exact: true })).toBeVisible()
  // Explicador del sistema de puntos
  await page.getByRole('button', { name: /Cómo puntúa/i }).click()
  await expect(page.getByText('¿Cómo puntúa un torneo?')).toBeVisible()
  await expect(page.getByText(/Solo puntúan los torneos jugados en Torneum/).first()).toBeVisible()
})

test('ficha de torneo Oficial enseña su tope de puntos', async ({ page }) => {
  await sesion(page, 'jugador')
  await page.goto('/torneo/t11')
  await expect(page.getByText('Smash Arena Madrid — Major').first()).toBeVisible()
  await expect(page.getByText(/Puntos para el ranking/i)).toBeVisible()
  await expect(page.getByText(/Reparte hasta/)).toBeVisible()
  await expect(page.locator('body')).not.toContainText(/start\.gg/i)
})

test('cuenta jugador NO entra en la consola del TO (gate)', async ({ page }) => {
  await sesion(page, 'jugador')
  await page.goto('/consola')
  await expect(page.getByText(/Esta zona es para organizadores/i)).toBeVisible()
})

test('cuenta TO entra en la consola', async ({ page }) => {
  await sesion(page, 'to')
  await page.goto('/consola')
  // La identidad ya no encabeza la consola (vive en /consola/perfil): se
  // comprueban el título, el menú interno y los KPIs.
  await expect(page.getByRole('heading', { name: 'Consola TO' })).toBeVisible()
  await expect(page.getByRole('link', { name: /Facturación|Billing/ })).toBeVisible()
  await expect(page.getByText(/Torneos activos/i)).toBeVisible()
})

test('perfil del TO vive en la consola (identidad fuera del resumen)', async ({ page }) => {
  await sesion(page, 'to')
  await page.goto('/consola/perfil')
  await expect(page.getByText('Lima Esports').first()).toBeVisible()
  await expect(page.getByText(/Ver mi página pública/i)).toBeVisible()
})

test('crear torneo obedece la plantilla del juego', async ({ page }) => {
  await sesion(page, 'to')
  await page.goto('/crear-torneo')
  // Smash (lucha): doble eliminación por defecto
  await expect(page.getByText(/Bo3 · Bo5 en top 8/).first()).toBeVisible()
  // Magic (TCG): al elegirlo cambian formato y sets
  // dispatchEvent: en móvil el chip queda bajo la cabecera sticky y el click
  // normal aterriza en ella; el evento directo llega al botón igualmente.
  await page.getByRole('button', { name: 'Magic', exact: true }).dispatchEvent('click')
  await expect(page.getByText(/Suizo/).first()).toBeVisible()
  // Y el torneo enseña cuántos puntos repartirá
  await expect(page.getByText(/Repartirá hasta/)).toBeVisible()
})

test('admin gestiona el catálogo de juegos con plantillas', async ({ page }) => {
  await sesion(page, 'admin')
  await page.goto('/admin-demo')
  await page.getByRole('button', { name: 'Juegos' }).click()
  await expect(page.getByText('Catálogo de juegos')).toBeVisible()
  await expect(page.getByText('Super Smash Bros. Ultimate')).toBeVisible()
  // Asistente de alta con arquetipos
  await page.getByRole('button', { name: /Añadir juego/ }).click()
  await expect(page.getByText('¿Cómo se compite?')).toBeVisible()
  await expect(page.getByText(/Deportes \/ simulación/)).toBeVisible()
})

test('mapa carga sin errores', async ({ page }) => {
  await sesion(page, 'jugador')
  await page.goto('/mapa')
  await expect(page.getByText(/Mapa de torneos/i)).toBeVisible({ timeout: 15_000 })
  await expect(page.locator('body')).not.toContainText(/Application error|Internal Server Error/i)
})
