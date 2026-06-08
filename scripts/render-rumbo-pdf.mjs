// Renderiza un HTML de Rumbo a PDF con Playwright/Chromium.
// Uso: node scripts/render-rumbo-pdf.mjs <input.html> <output.pdf> "<pie de página>"
import { chromium } from 'playwright'

const IN = process.argv[2] || '/home/albert/Desktop/Rumbo/Rumbo_Documento_Maestro_Unificado.html'
const OUT = process.argv[3] || '/home/albert/Desktop/Rumbo/Rumbo - Documento Maestro.pdf'
const LABEL = process.argv[4] || 'Rumbo · Documento Maestro'

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('file://' + IN, { waitUntil: 'networkidle' })
try { await page.evaluate(() => document.fonts.ready) } catch {}
await page.waitForTimeout(1200)
await page.pdf({
  path: OUT, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%; font-size:7.5px; color:#a6a6b8; font-family:Inter,Arial,sans-serif; text-align:center; padding:0 15mm;">${LABEL} · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
})
await browser.close()
console.log('PDF generado:', OUT)
