// Lee DOCBRAIN00.txt (única fuente de verdad), genera DOCBRAIN00.html bonito y lo renderiza a PDF.
// Uso: node scripts/docbrain-build.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const DIR = '/home/albert/Desktop/Rumbo'
const txt = readFileSync(`${DIR}/DOCBRAIN00.txt`, 'utf8').split('\n')

const C1 = {'1':'#7C5CFF','2':'#E94560','3':'#13a594','4':'#C8922E','5':'#4F8EF7','6':'#64748b','7':'#E8743B'}
const C2 = {'1':'#6a4dff','2':'#c83350','3':'#0e7e72','4':'#a8781f','5':'#2f6fd6','6':'#475569','7':'#cf5f2a'}

const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
const lead = s => { // s ya escapado: pon en negrita "Etiqueta:" si es corta
  const m = s.match(/^([^:]{2,46}):\s([\s\S]+)$/)
  if (m && !m[1].includes('. ')) return `<span class="ld">${m[1]}:</span> ${m[2]}`
  return s
}

// ── Parseo ──
const sections = []
let sec = null, item = null, bullet = null, sub = null, idea = false, dev = false, stopped = false
const indentOf = l => l.length - l.replace(/^ +/,'').length

for (const raw of txt) {
  if (stopped) break
  const t = raw.trim()
  if (/^=+$/.test(t) || /^-{3,}$/.test(t)) continue
  if (t === 'Y AHORA QUÉ') { stopped = true; break }

  const ind = indentOf(raw)
  const mSec = raw.match(/^(\d) · (.+)$/)
  const mItem = raw.match(/^(\d\.\d+[a-z]?) — (.+)$/)

  if (ind === 0 && mSec) {
    let title = mSec[2], subtitle = ''
    const ms = title.match(/^(.+?)\s{2,}\((.+)\)$/)
    if (ms) { title = ms[1]; subtitle = ms[2] }
    sec = { n: mSec[1], title, subtitle, note: [], items: [] }
    sections.push(sec); item = null; bullet = null; sub = null; idea = dev = false
    continue
  }
  if (ind === 0 && mItem) {
    item = { id: mItem[1], title: mItem[2], idea: '', dev: [] }
    sec.items.push(item); bullet = null; sub = null; idea = false; dev = false
    continue
  }
  if (!sec) continue
  if (!item) { if (t) sec.note.push(t); continue }   // nota de sección

  if (/^Tu idea:/.test(t)) { item.idea = t.replace(/^Tu idea:\s*/,''); idea = true; dev = false; continue }
  if (/^Desarrollo:/.test(t)) { idea = false; dev = true; continue }
  if (idea && t) { item.idea += ' ' + t; continue }
  if (!dev) continue

  if (ind === 4 && t.startsWith('- ')) { bullet = { text: t.slice(2), subs: [] }; item.dev.push(bullet); sub = null; continue }
  if (ind === 6 && t.startsWith('· ')) { sub = { text: t.slice(2) }; if (bullet) bullet.subs.push(sub); continue }
  if (ind === 6 && bullet) { bullet.text += ' ' + t; continue }
  if (ind >= 8 && sub) { sub.text += ' ' + t; continue }
  if (ind >= 6 && bullet) { bullet.text += ' ' + t; continue }
}

// ── HTML ──
const idx = sections.map(s =>
  `<tr class="grp" style="--gc:${C1[s.n]}"><td class="n">${s.n}</td><td class="tt" colspan="2">${esc(s.title)}</td></tr>` +
  s.items.map(it => `<tr><td class="sid">${it.id}</td><td class="stt" colspan="2">${esc(it.title)}</td></tr>`).join('')
).join('')

const body = sections.map(s => {
  const ac = C1[s.n]
  let html = `<div class="banner" style="--c1:${C1[s.n]};--c2:${C2[s.n]}"><div class="let">${s.n}</div><div><div class="tt">${esc(s.title)}</div>${s.subtitle?`<div class="ds">${esc(s.subtitle)}</div>`:''}</div></div>`
  if (s.note.length) html += `<div class="secnote">${s.note.map(esc).join(' ')}</div>`
  for (const it of s.items) {
    html += `<div class="item" style="--ac:${ac}">`
    html += `<div class="ititle"><span class="iid">${it.id}</span>${esc(it.title)}</div>`
    if (it.idea) html += `<div class="tu"><span class="tag">Tu idea</span>${esc(it.idea)}</div>`
    if (it.dev.length) {
      html += `<div class="dlabel">Desarrollo</div><ul class="dev">`
      for (const b of it.dev) {
        html += `<li>${lead(esc(b.text))}`
        if (b.subs.length) html += `<ul class="sub">${b.subs.map(x=>`<li>${lead(esc(x.text))}</li>`).join('')}</ul>`
        html += `</li>`
      }
      html += `</ul>`
    }
    html += `</div>`
  }
  return html
}).join('')

const HTML = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Rumbo · DOCBRAIN00</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap');
:root{--ink:#1d1d29;--ink2:#3a3a4c;--muted:#73738a;--line:#e7e7ef;--soft:#f7f7fb;}
*{box-sizing:border-box;}
@page{size:A4;margin:14mm 0 16mm;} @page :first{margin:0;}
html,body{margin:0;padding:0;background:#fff;}
body{font-family:'Inter',system-ui,Arial,sans-serif;color:var(--ink);font-size:10.3pt;line-height:1.5;-webkit-font-smoothing:antialiased;}
.pad{padding:0 16mm;} strong,b{color:#101018;font-weight:700;} em{color:var(--ink2);font-style:normal;font-weight:600;}
.cover{height:297mm;margin:0;color:#fff;position:relative;overflow:hidden;display:flex;flex-direction:column;justify-content:center;padding:0 24mm;
 background:radial-gradient(1100px 520px at 80% -8%,rgba(124,92,255,.42),transparent 60%),radial-gradient(900px 480px at 6% 110%,rgba(233,69,96,.40),transparent 60%),linear-gradient(155deg,#0b0b14,#15131f 48%,#0d0c16);}
.cover .logo{width:60px;height:60px;border-radius:18px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#E0455E,#7C5CFF);font-weight:900;font-size:30px;margin-bottom:28px;box-shadow:0 18px 44px -10px rgba(124,92,255,.7);}
.cover .kicker{font-size:10.5pt;letter-spacing:.34em;text-transform:uppercase;color:#C9C2FF;font-weight:700;}
.cover h1{font-size:60px;font-weight:900;letter-spacing:-.02em;line-height:1.02;margin:14px 0 4px;}
.cover .rule{width:64px;height:5px;border-radius:99px;background:linear-gradient(90deg,#E0455E,#7C5CFF);margin:22px 0;}
.cover .sub{font-size:18px;font-weight:600;color:#E7E4FF;max-width:600px;line-height:1.4;}
.cover .tag{font-size:13px;color:#9b9bb5;margin-top:20px;max-width:560px;line-height:1.55;}
.cover .meta{position:absolute;left:24mm;bottom:22mm;font-size:12px;color:#8a8aa6;} .cover .meta b{color:#EDEBFF;}
.h-sec{font-size:11px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:#6a4dff;margin:0 0 10px;}
.howbox{background:linear-gradient(135deg,#f4f1ff,#fdf2f5);border:1px solid #e7e0ff;border-radius:16px;padding:18px 22px;}
.howbox p{margin:0 0 8px;color:var(--ink2);} .howbox p:last-child{margin:0;}
.idx{width:100%;border-collapse:collapse;font-size:9.5pt;} .idx td{padding:4px 6px;vertical-align:baseline;}
.idx .grp td{padding-top:12px;border-bottom:2px solid var(--ink);} .idx .grp .n{font-family:'JetBrains Mono',monospace;font-weight:700;color:var(--gc);}
.idx .grp .tt{font-weight:800;text-transform:uppercase;letter-spacing:.04em;font-size:9.3pt;color:var(--ink);}
.idx .sid{font-family:'JetBrains Mono',monospace;color:var(--muted);width:42px;} .idx .stt{color:var(--ink2);}
.banner{break-inside:avoid;break-after:avoid;color:#fff;border-radius:16px;padding:17px 22px;margin:9mm 0 5mm;display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,var(--c1),var(--c2));}
.banner:first-child{margin-top:0;} .banner .let{font-family:'JetBrains Mono',monospace;font-size:30px;font-weight:700;opacity:.9;min-width:26px;}
.banner .tt{font-size:21px;font-weight:800;letter-spacing:-.01em;} .banner .ds{font-size:11.5px;opacity:.88;font-weight:500;margin-top:1px;}
.secnote{color:var(--ink2);font-size:9.7pt;background:var(--soft);border:1px solid var(--line);border-radius:10px;padding:10px 14px;margin-bottom:5mm;}
.item{border:1px solid var(--line);border-left:4px solid var(--ac);border-radius:12px;padding:13px 16px 14px;margin:0 0 9px;break-inside:avoid;background:#fff;}
.ititle{font-weight:800;font-size:13.5px;color:var(--ink);letter-spacing:-.01em;margin-bottom:8px;}
.ititle .iid{font-family:'JetBrains Mono',monospace;color:var(--ac);margin-right:8px;font-size:12.5px;}
.tu{background:var(--soft);border-radius:9px;padding:8px 12px;color:var(--ink2);font-size:9.8pt;margin-bottom:10px;}
.tu .tag{display:inline-block;font-size:8.2px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--ac);margin-right:8px;vertical-align:1px;}
.dlabel{font-size:8.6px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ac);margin-bottom:5px;}
.dev{list-style:none;margin:0;padding:0;} .dev>li{position:relative;padding:3.5px 0 3.5px 18px;color:var(--ink2);font-size:9.8pt;}
.dev>li::before{content:'+';position:absolute;left:2px;top:3px;font-weight:800;color:var(--ac);font-family:'JetBrains Mono',monospace;}
.dev .ld{font-weight:700;color:#101018;}
ul.sub{list-style:none;margin:5px 0 2px;padding:0;} ul.sub li{position:relative;padding:2.5px 0 2.5px 16px;color:var(--ink2);font-size:9.6pt;}
ul.sub li::before{content:'·';position:absolute;left:4px;top:1px;font-weight:800;color:var(--ac);}
.closing{background:linear-gradient(135deg,#eef7ff,#f4f1ff);border:1px solid #dfe9ff;border-radius:16px;padding:18px 22px;color:var(--ink2);}
.closing .h-sec{color:#2f6fd6;} .foot{text-align:center;color:#b6b6c6;font-size:8.5pt;margin-top:14px;}
</style></head><body>
<section class="cover">
 <div class="logo">R</div>
 <div class="kicker">Rumbo · Documento interno</div>
 <h1>DOCBRAIN00</h1>
 <div class="rule"></div>
 <div class="sub">Tus ideas del brainstorming, ordenadas y definidas a fondo</div>
 <div class="tag">He repasado cada punto preguntándome «¿está todo definido?». Donde la cosa era profunda, la he definido —flujos, estados, configuración, permisos, qué guardamos, casos límite y cómo conecta con el resto— hasta que la respuesta era sí.</div>
 <div class="meta">08/06/2026 · Fuente: <b>BRAINSTORMING_070626.txt</b></div>
</section>
<section class="pad" style="padding-top:12mm">
 <div class="h-sec">Cómo está montado esto</div>
 <div class="howbox">
  <p>He cogido tu volcado, lo he <strong>ordenado por áreas</strong> y, para cada idea, me he preguntado «¿está todo?». Donde podía ir más hondo, lo he <strong>definido</strong> —cómo funciona paso a paso, estados, qué configura el dueño, quién lo ve, qué guardamos, casos límite y cómo conecta con el resto— y me lo he vuelto a preguntar hasta que la respuesta era sí.</p>
  <p>Cada idea trae <strong>«Tu idea»</strong> (lo que escribiste, limpio) y <strong>«Desarrollo»</strong> (la definición completa). Sigue siendo para pensar juntos: lee, tacha, marca y añade encima de cada punto.</p>
 </div>
 <div class="h-sec" style="margin-top:9mm">Índice</div>
 <table class="idx">${idx}</table>
</section>
<div class="pad">${body}</div>
<section class="pad" style="padding-top:6mm">
 <div class="closing">
  <div class="h-sec">Y ahora qué</div>
  <p style="margin:0">Esto es tu brainstorming ordenado y definido a fondo: cada punto repasado preguntándome «¿está todo?» hasta que la respuesta era sí. Léelo con calma, tacha lo que no, marca lo que más te gusta y escribe encima de cada punto. Cuando lo tengas como quieres, de aquí sale el plan para la sesión de código — y cualquier bloque (chat, pedidos, admin, CRM…) lo puedo llevar a un documento propio todavía más detallado, pantalla por pantalla.</p>
 </div>
 <div class="foot">Rumbo · documento interno · DOCBRAIN00 · 08/06/2026</div>
</section>
</body></html>`

writeFileSync(`${DIR}/DOCBRAIN00.html`, HTML)

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('file://' + `${DIR}/DOCBRAIN00.html`, { waitUntil: 'networkidle' })
try { await page.evaluate(() => document.fonts.ready) } catch {}
await page.waitForTimeout(1000)
await page.pdf({
  path: `${DIR}/DOCBRAIN00.pdf`, format: 'A4', printBackground: true, preferCSSPageSize: true,
  displayHeaderFooter: true, headerTemplate: '<div></div>',
  footerTemplate: `<div style="width:100%;font-size:7.5px;color:#a6a6b8;font-family:Inter,Arial,sans-serif;text-align:center;padding:0 15mm;">Rumbo · DOCBRAIN00 · 08/06/2026 · <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
})
await browser.close()
console.log(`OK · ${sections.length} secciones · ${sections.reduce((a,s)=>a+s.items.length,0)} ítems → DOCBRAIN00.html + .pdf`)
