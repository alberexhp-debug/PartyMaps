// Traducción de las etiquetas de fecha de muestra («Hoy · 18:00»,
// «Sáb 28 jun · 17:00»). Son cadenas sembradas en español (QA M4): en inglés y
// japonés se traducen aquí, sin tocar los datos. Cuando ruede el backend real
// las fechas serán Date y esto se sustituye por Intl.DateTimeFormat.
import type { Idioma } from '@/lib/i18n'

const DIAS_EN: Record<string, string> = { Lun: 'Mon', Mar: 'Tue', Mié: 'Wed', Jue: 'Thu', Vie: 'Fri', Sáb: 'Sat', Dom: 'Sun' }
const DIAS_JA: Record<string, string> = { Lun: '月', Mar: '火', Mié: '水', Jue: '木', Vie: '金', Sáb: '土', Dom: '日' }
const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MESES_EN: Record<string, string> = Object.fromEntries(MESES.map((m, i) => [m, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]]))
const MES_NUM: Record<string, number> = Object.fromEntries(MESES.map((m, i) => [m, i + 1]))

export function fechaLabelTr(label: string | undefined, idioma: Idioma): string {
  if (!label || idioma === 'es') return label ?? ''
  const [fecha, hora] = label.split(' · ')
  const conHora = (f: string) => (hora ? `${f} · ${hora}` : f)
  if (fecha === 'Hoy') return conHora(idioma === 'ja' ? '今日' : 'Today')
  if (fecha === 'Mañana') return conHora(idioma === 'ja' ? '明日' : 'Tomorrow')
  const m = fecha.match(/^(\p{L}+) (\d+) (\p{L}+)$/u)
  if (!m) return label
  const [, dia, num, mes] = m
  if (idioma === 'ja') {
    if (!MES_NUM[mes] || !DIAS_JA[dia]) return label
    return conHora(`${MES_NUM[mes]}月${num}日(${DIAS_JA[dia]})`)
  }
  if (!MESES_EN[mes] || !DIAS_EN[dia]) return label
  return conHora(`${DIAS_EN[dia]} ${MESES_EN[mes]} ${num}`)
}
