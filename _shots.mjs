// Screenshot batch: node shots.mjs <out-dir> <width> <height> <ruta1> <ruta2> ...
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const [outDir, w, h, ...routes] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: +w, height: +h } });
await page.addInitScript(() => {
  localStorage.setItem('pm_cookie_consent_v1', JSON.stringify({ esenciales: true, analiticas: true, marketing: true, ts: 1 }));
});
for (const r of routes) {
  const name = (r === '/' ? 'home' : r.replace(/^\//, '').replace(/\//g, '_'));
  try {
    await page.goto(`http://localhost:4567${r}`, { waitUntil: 'networkidle', timeout: 45000 });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${outDir}/${name}.png` });
    console.log('OK', r);
  } catch (e) {
    try { await page.screenshot({ path: `${outDir}/${name}.png` }); console.log('PARTIAL', r); }
    catch { console.log('FAIL', r, e.message.split('\n')[0]); }
  }
}
await browser.close();
