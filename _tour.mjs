import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const out = process.argv[2]; mkdirSync(out, { recursive: true });
const b = await chromium.launch();

const seed = () => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, ts: 1 }));
  if (!localStorage.getItem('todh-demo')) localStorage.setItem('todh-demo', JSON.stringify({ state: { perfilTO: 'aprobado', onboardingVisto: true, juegosFavoritos: ['smash', 'tft'] }, version: 0 }));
};

// Móvil: el recorrido del jugador
const m = await (await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await m.addInitScript(seed);
for (const r of ['/inicio', '/explorar', '/torneo/t1', '/torneo/t1/bracket', '/torneo/t1/directo', '/ranking', '/entradas', '/perfil', '/notificaciones', '/buscar', '/planes', '/circuito', '/amigos']) {
  await m.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await m.waitForTimeout(900);
  await m.screenshot({ path: `${out}/m${r.replace(/\//g, '_')}.png`, fullPage: true });
}
// Escritorio: paneles
const d = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
await d.addInitScript(seed);
for (const r of ['/sedes', '/planes', '/mi-pagina', '/modo-directo']) {
  await d.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(() => {});
  await d.waitForTimeout(1000);
  await d.screenshot({ path: `${out}/d${r.replace(/\//g, '_')}.png`, fullPage: true });
}
await b.close(); console.log('tour OK');
