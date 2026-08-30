// Verificación ronda 2: efectivos (editados/cancelados) en todas las vistas,
// ticket cancelado, t4 sembrado coherente y CTA de MiniLocal por rol.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const out = process.argv[2] || '_shots-flow4';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();

const nueva = async (aprobado) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  page.on('dialog', d => d.accept());
  await page.addInitScript((apr) => {
    localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }));
    // Sembrar SOLO la primera vez: si no, cada navegación borra el estado acumulado
    if (!localStorage.getItem('todh-demo')) {
      localStorage.setItem('todh-demo', JSON.stringify({ state: { perfilTO: apr ? 'aprobado' : 'no', onboardingVisto: true }, version: 0 }));
    }
  }, aprobado);
  return page;
};
const go = (p, r) => p.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 });
const shot = (p, n, full = false) => p.screenshot({ path: `${out}/${n}.png`, fullPage: full });

// ── Contexto JUGADOR ──
const A = await nueva(false);
await go(A, '/torneo/t4'); await A.waitForTimeout(900); await shot(A, '01-t4-inscrito-seed');
await A.locator('button', { hasText: 'Gamba' }).first().click().catch(() => {});
await A.waitForTimeout(800); await shot(A, '02-minilocal-jugador');

// ── Contexto TO APROBADO ──
const B = await nueva(true);
// Inscribirse en t2 (de pago) para luego ver el ticket cancelado
await go(B, '/torneo/t2'); await B.waitForTimeout(800);
await B.locator('button', { hasText: 'Inscribirme' }).first().click(); await B.waitForTimeout(600);
await B.locator('button', { hasText: 'Pagar' }).last().click(); await B.waitForTimeout(2600);
// El TO cancela t2 desde gestión
await go(B, '/gestionar/t2'); await B.waitForTimeout(700);
await B.locator('button', { hasText: 'Ajustes' }).click(); await B.waitForTimeout(400);
await B.locator('button', { hasText: 'Cancelar torneo' }).click(); await B.waitForTimeout(900);
await shot(B, '03-gestionar-cancelado');
// Cartera: ticket marcado cancelado (t2) + t4 normal
await go(B, '/entradas'); await B.waitForTimeout(900); await shot(B, '04-ticket-cancelado', true);
// Explorar y consola reflejan la cancelación
await go(B, '/explorar'); await B.waitForTimeout(1100); await shot(B, '05-explorar-sin-t2', true);
await go(B, '/consola'); await B.waitForTimeout(900); await shot(B, '06-consola-cancelado', true);
// MiniLocal como TO: CTA de pedir fecha real
await go(B, '/torneo/t1'); await B.waitForTimeout(800);
await B.locator('button', { hasText: 'Gamba Esports' }).first().click(); await B.waitForTimeout(800);
await shot(B, '07-minilocal-to');

await browser.close();
console.log('flow4 OK →', out);
