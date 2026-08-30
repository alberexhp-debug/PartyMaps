// Flujo de verificación: lista de espera, puerta TO + admin, plano en MiniLocal.
// node _flow3.mjs <out-dir>
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = process.argv[2] || '_shots-flow3';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('dialog', d => d.accept());
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }));
});
const go = (r) => page.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 });
const shot = (n, full = false) => page.screenshot({ path: `${out}/${n}.png`, fullPage: full });
const pause = (ms) => page.waitForTimeout(ms);

// 1) Torneo lleno → lista de espera
await go('/torneo/t10'); await pause(1000); await shot('01-torneo-lleno');
await page.getByText('Apuntarme a la lista de espera').first().click(); await pause(700);
await shot('02-sheet-espera');
await page.locator('button', { hasText: 'Apuntarme a la lista de espera' }).last().click(); await pause(900);
await shot('03-en-espera');

// 2) Cartera con cola
await go('/entradas'); await pause(900); await shot('04-entradas-espera', true);

// 3) Puerta del panel TO
await go('/consola'); await pause(800); await shot('05-gate-to');
await page.getByText('Solicitar perfil de organizador').click(); await pause(600);
await page.locator('button', { hasText: 'Smash' }).first().click();
await page.getByText('Enviar solicitud').click(); await pause(2200);
await shot('06-gate-pendiente');

// 4) Admin aprueba (control de accesos)
await go('/admin-demo'); await pause(800); await shot('07-admin');
await page.locator('button', { hasText: 'Revisar' }).first().click(); await pause(500);
await shot('08-admin-cola');
await page.locator('button[aria-label="Aprobar"]').first().click(); await pause(700);
await go('/consola'); await pause(900); await shot('09-consola-aprobado');

// 5) Gestionar t8: cola visible, baja → promoción, ampliar → entra el usuario
await go('/gestionar/t10'); await pause(900); await shot('10-gestionar-espera', true);
await page.locator('button[aria-label^="Dar de baja"]').first().click(); await pause(900);
await shot('11-baja-promocion', true);
await page.locator('button', { hasText: 'Ampliar 16 plazas' }).click(); await pause(900);
await shot('12-ampliado', true);
await go('/entradas'); await pause(900); await shot('13-entradas-promovido', true);
await go('/notificaciones'); await pause(800); await shot('14-notis', true);

// 6) Plano de mesas en la ficha del local (desde la ficha del torneo)
await go('/torneo/t1'); await pause(1000);
await page.locator('button', { hasText: 'Gamba Esports' }).first().click(); await pause(900);
await shot('15-minilocal-plano');

await browser.close();
console.log('flow OK →', out);
