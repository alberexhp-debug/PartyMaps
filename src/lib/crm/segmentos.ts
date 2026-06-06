// Motor de segmentos del CRM (doc 02 §6, doc 04 §2.3). PURO: evalúa una lista de
// condiciones en AND sobre los clientes ya cargados (segmentos "vivos", se recalculan al
// abrirlos). Los pre-creados viven aquí (no se siembran por local).
import type { ClienteCRM } from './clientes'

export type OpFiltro = '>=' | '<=' | '=' | 'hace_mas_de_dias' | 'hace_menos_de_dias' | 'contiene' | 'entre' | 'top_pct'
export interface FiltroSegmento { campo: string; op: OpFiltro; valor: unknown }
export interface SegmentoDef { id: string; nombre: string; emoji: string; descripcion: string; filtros: FiltroSegmento[]; pre_creado?: boolean }

const dias = (s: string | null) => (s ? Math.floor((Date.now() - new Date(s).getTime()) / 86400000) : Infinity)
const bool = (v: unknown) => v === true || v === 'true'

function cmp(a: number, op: OpFiltro, b: number): boolean {
  if (op === '>=') return a >= b
  if (op === '<=') return a <= b
  if (op === '=') return a === b
  return true
}

// Filtro simple (los relativos al conjunto, como top_pct, se resuelven en aplicarSegmento).
function cumpleFiltro(c: ClienteCRM, f: FiltroSegmento): boolean {
  const n = Number(f.valor) || 0
  switch (f.campo) {
    case 'visitas': return cmp(c.visitas, f.op, n)
    case 'gasto_total': return cmp(c.gasto, f.op, n)
    case 'ticket_medio': return cmp(c.visitas ? c.gasto / c.visitas : 0, f.op, n)
    case 'gasto_bar_pct': return cmp(c.gasto ? (c.gasto_bar / c.gasto) * 100 : 0, f.op, n)
    case 'edad':
      if (f.op === 'entre' && Array.isArray(f.valor)) { const [a, b] = f.valor as number[]; return c.edad != null && c.edad >= a && c.edad <= b }
      return c.edad != null && cmp(c.edad, f.op, n)
    case 'ultima_visita':
      if (f.op === 'hace_mas_de_dias') return dias(c.ultima) > n
      if (f.op === 'hace_menos_de_dias') return dias(c.ultima) < n
      return true
    case 'primera_visita':
      if (f.op === 'hace_menos_de_dias') return dias(c.primera) < n
      if (f.op === 'hace_mas_de_dias') return dias(c.primera) > n
      return true
    case 'vip': return c.vip === bool(f.valor)
    case 'consentimiento': return c.contactable === bool(f.valor)
    case 'cumple_mes': return c.cumple_mes === bool(f.valor)
    case 'etiqueta': return c.etiquetas.some(e => e.toLowerCase().includes(String(f.valor).toLowerCase()))
    default: return true // campos no soportados en esta fase no excluyen (origen/evento llegan después)
  }
}

export function aplicarSegmento(clientes: ClienteCRM[], filtros: FiltroSegmento[]): ClienteCRM[] {
  const simples = filtros.filter(f => f.op !== 'top_pct')
  const topPct = filtros.find(f => f.op === 'top_pct')
  let r = clientes.filter(c => simples.every(f => cumpleFiltro(c, f)))
  if (topPct) {
    const valor = (c: ClienteCRM) => (topPct.campo === 'ticket_medio' ? (c.visitas ? c.gasto / c.visitas : 0) : c.gasto)
    const pct = Number(topPct.valor) || 10
    const orden = [...r].sort((a, b) => valor(b) - valor(a))
    const corte = Math.max(1, Math.ceil(orden.length * (pct / 100)))
    const top = new Set(orden.slice(0, corte).map(c => c.usuario_id))
    r = r.filter(c => top.has(c.usuario_id))
  }
  return r
}

/** Total y contactables de un segmento (los dos números que siempre se muestran, doc 02 §6.2). */
export function contarSegmento(clientes: ClienteCRM[], filtros: FiltroSegmento[]): { total: number; contactables: number } {
  const r = aplicarSegmento(clientes, filtros)
  return { total: r.length, contactables: r.filter(c => c.contactable).length }
}

export const SEGMENTOS_PRECREADOS: SegmentoDef[] = [
  { id: 'recuperar', emoji: '🔁', nombre: 'Recuperar', descripcion: '3+ visitas y 30+ días sin venir', pre_creado: true,
    filtros: [{ campo: 'visitas', op: '>=', valor: 3 }, { campo: 'ultima_visita', op: 'hace_mas_de_dias', valor: 30 }] },
  { id: 'top_gasto', emoji: '💎', nombre: 'Top gasto', descripcion: 'El 10% que más gasta', pre_creado: true,
    filtros: [{ campo: 'gasto_total', op: 'top_pct', valor: 10 }] },
  { id: 'nuevos_mes', emoji: '🆕', nombre: 'Nuevos del mes', descripcion: 'Primera visita en los últimos 30 días', pre_creado: true,
    filtros: [{ campo: 'primera_visita', op: 'hace_menos_de_dias', valor: 30 }] },
  { id: 'cumplen_mes', emoji: '🎂', nombre: 'Cumplen este mes', descripcion: 'Cumpleaños en el mes en curso', pre_creado: true,
    filtros: [{ campo: 'cumple_mes', op: '=', valor: true }] },
  { id: 'gente_copas', emoji: '🥃', nombre: 'Gente de copas', descripcion: '60%+ de su gasto es de barra', pre_creado: true,
    filtros: [{ campo: 'gasto_bar_pct', op: '>=', valor: 60 }] },
  { id: 'sin_marketing', emoji: '📵', nombre: 'Sin marketing', descripcion: 'Sin consentimiento (solo para verlos)', pre_creado: true,
    filtros: [{ campo: 'consentimiento', op: '=', valor: false }] },
]

// Campos ofrecidos por el constructor (los que tienen dato fiable en esta fase).
export const CAMPOS_FILTRO: { campo: string; label: string; ops: OpFiltro[]; tipo: 'num' | 'bool' | 'texto' }[] = [
  { campo: 'visitas', label: 'Visitas', ops: ['>=', '<=', '='], tipo: 'num' },
  { campo: 'gasto_total', label: 'Gasto total (€)', ops: ['>=', '<='], tipo: 'num' },
  { campo: 'ticket_medio', label: 'Ticket medio (€)', ops: ['>=', '<='], tipo: 'num' },
  { campo: 'gasto_bar_pct', label: '% gasto en barra', ops: ['>=', '<='], tipo: 'num' },
  { campo: 'ultima_visita', label: 'Días sin venir', ops: ['hace_mas_de_dias', 'hace_menos_de_dias'], tipo: 'num' },
  { campo: 'edad', label: 'Edad', ops: ['>=', '<='], tipo: 'num' },
  { campo: 'vip', label: 'VIP', ops: ['='], tipo: 'bool' },
  { campo: 'consentimiento', label: 'Acepta marketing', ops: ['='], tipo: 'bool' },
  { campo: 'cumple_mes', label: 'Cumple este mes', ops: ['='], tipo: 'bool' },
  { campo: 'etiqueta', label: 'Etiqueta', ops: ['contiene'], tipo: 'texto' },
]

export const LABEL_OP: Record<OpFiltro, string> = {
  '>=': 'mínimo', '<=': 'máximo', '=': 'es', 'hace_mas_de_dias': 'más de (días)',
  'hace_menos_de_dias': 'menos de (días)', 'contiene': 'contiene', 'entre': 'entre', 'top_pct': 'top %',
}
