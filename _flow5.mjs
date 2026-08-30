import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const b = await chromium.launch();
const p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
p.on('dialog', d => d.accept());
await p.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, ts: 1 }));
  if (!localStorage.getItem('todh-demo')) localStorage.setItem('todh-demo', JSON.stringify({ state: { perfilTO: 'aprobado', onboardingVisto: true }, version: 0 }));
});
const go = (r) => p.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 });

// 1) Crear un torneo → su ficha debe salir SIN participantes fantasma
await go('/crear-torneo'); await p.waitForTimeout(800);
await p.fill('input[placeholder*="Lima Smash"], input', 'Torneo Prueba Coherencia').catch(() => {});
await p.screenshot({ path: `${out}/00-crear.png` });
// publicar con lo que haya por defecto
await p.locator('button', { hasText: 'Publicar' }).last().click().catch(() => {});
await p.waitForTimeout(1200);
const url = p.url();
console.log('tras publicar:', url);
if (url.includes('/torneo/')) { await p.screenshot({ path: `${out}/01-ficha-vacia.png`, fullPage: true }); }
else { await go('/torneo/t7'); }

// 2) Ficha t7 (12/32): solo 6 avatares pero "+6 más" correcto → mira contadores
await go('/torneo/t7'); await p.waitForTimeout(800);
await p.screenshot({ path: `${out}/02-t7.png`, fullPage: true });

// 3) Usuario inscrito en t1 → aparece en la lista del TO
await go('/torneo/t1'); await p.waitForTimeout(700);
await p.locator('button', { hasText: 'Inscribirme' }).first().click(); await p.waitForTimeout(500);
await p.locator('button', { hasText: 'Pagar' }).last().click(); await p.waitForTimeout(2600);
await go('/gestionar/t1'); await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/03-gestionar-tu.png`, fullPage: true });

// 4) Sede: bloque de herencia TO
await go('/sede'); await p.waitForTimeout(900);
await p.screenshot({ path: `${out}/04-sede-hereda.png`, fullPage: true });
await b.close(); console.log('flow5 OK');
