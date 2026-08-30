import type { Jugador } from '@/lib/torneos/sample'

// ── Motor de bracket de eliminación simple (demo, en cliente) ──
// Compartido por /gestionar/[id] (reportar resultados) y /modo-directo (cola real).

export type MatchB = { id: string; a: Jugador | null; b: Jugador | null; ganador: 'a' | 'b' | null }

function siguientePotencia2(n: number): number {
  let p = 1
  while (p < n) p *= 2
  return Math.max(2, p)
}

// Orden de siembra estándar (1 vs N, top seeds en lados opuestos).
function ordenSiembra(n: number): number[] {
  let pls = [1, 2]
  while (pls.length < n) {
    const suma = pls.length * 2 + 1
    const next: number[] = []
    for (const p of pls) { next.push(p); next.push(suma - p) }
    pls = next
  }
  return pls
}

export function construirRondas(seeds: Jugador[], winners: Record<string, 'a' | 'b'>): MatchB[][] {
  if (seeds.length < 2) return []
  const n = siguientePotencia2(seeds.length)
  const slots = ordenSiembra(n).map(s => seeds[s - 1] ?? null)
  const rondas: MatchB[][] = []
  // byeA/byeB = hueco DEFINITIVO (bye real: nunca llegará jugador). Distinto del
  // hueco PENDIENTE (el cruce que alimenta el slot aún no se ha jugado): ahí el
  // rival presente ESPERA, no avanza — fix QA 30-08: un resultado de cuartos ya
  // no propagaba al ganador hasta la final con las semis sin jugar.
  let actual: { a: Jugador | null; b: Jugador | null; byeA: boolean; byeB: boolean }[] = []
  for (let i = 0; i < slots.length; i += 2)
    actual.push({ a: slots[i], b: slots[i + 1], byeA: slots[i] === null, byeB: slots[i + 1] === null })
  let ri = 0
  while (actual.length >= 1) {
    const matches: MatchB[] = actual.map((m, i) => {
      const id = `r${ri}m${i}`
      let g: 'a' | 'b' | null = winners[id] ?? null
      if (!g) { if (m.a && !m.b && m.byeB) g = 'a'; else if (!m.a && m.b && m.byeA) g = 'b' } // solo el bye real auto-avanza
      return { id, a: m.a, b: m.b, ganador: g }
    })
    rondas.push(matches)
    if (matches.length === 1) break
    const w = (mm: MatchB) => (mm.ganador ? (mm.ganador === 'a' ? mm.a : mm.b) : null)
    // El slot siguiente solo es bye definitivo si su cruce de origen es un doble
    // bye (sin jugadores posibles): de ahí jamás saldrá nadie.
    const bye = (idx: number) => actual[idx].byeA && actual[idx].byeB
    const next: typeof actual = []
    for (let i = 0; i < matches.length; i += 2)
      next.push({ a: w(matches[i]), b: w(matches[i + 1]), byeA: bye(i), byeB: bye(i + 1) })
    actual = next
    ri++
  }
  return rondas
}

// `idioma` (i18n F9): por defecto 'es' — los datos y tests siguen en español;
// las vistas pasan el idioma activo para pintar la ronda traducida.
export function nombreRonda(nMatches: number, idioma: 'es' | 'en' | 'ja' = 'es'): string {
  if (nMatches === 1) return idioma === 'ja' ? '決勝' : 'Final'
  if (nMatches === 2) return idioma === 'en' ? 'Semifinals' : idioma === 'ja' ? '準決勝' : 'Semifinales'
  if (nMatches === 4) return idioma === 'en' ? 'Quarterfinals' : idioma === 'ja' ? '準々決勝' : 'Cuartos'
  if (nMatches === 8) return idioma === 'en' ? 'Round of 16' : idioma === 'ja' ? 'ベスト16' : 'Octavos'
  return idioma === 'en' ? `Round of ${nMatches * 2}` : idioma === 'ja' ? `ベスト${nMatches * 2}` : `Ronda de ${nMatches * 2}`
}

// Desde qué profundidad sube el Bo. 'final' es un valor legado (guardado en
// localStorage por versiones previas): se trata SIEMPRE como 'semis'.
export type BoDesde = 'final' | 'semis' | 'top8' | 'top16' | 'top32' | 'top64'

// Rondas contadas desde el final que juegan a bo.top (semis=2, top8=3, top16=4…).
// 'final' legado → como 'semis' (mapeo defensivo, sin migración formal).
const RONDAS_TOP: Record<BoDesde, number> = { final: 2, semis: 2, top8: 3, top16: 4, top32: 5, top64: 6 }

// Normaliza un 'desde' leído del store: 'final' (o cualquier valor desconocido)
// pasa a 'semis'.
export function normalizarDesde(d: string | undefined): Exclude<BoDesde, 'final'> {
  return d && d !== 'final' && d in RONDAS_TOP ? (d as Exclude<BoDesde, 'final'>) : 'semis'
}

// Opciones de 'desde' válidas para un cuadro de `tam` jugadores (seeds o plazas):
// siempre semis y top8; top16/32/64 solo si el cuadro llega a ese tamaño.
export function opcionesDesde(tam: number): Exclude<BoDesde, 'final'>[] {
  const out: Exclude<BoDesde, 'final'>[] = ['semis', 'top8']
  if (tam >= 16) out.push('top16')
  if (tam >= 32) out.push('top32')
  if (tam >= 64) out.push('top64')
  return out
}

// Etiqueta corta de la profundidad (igual en es/en: nombres propios del bracket).
export function etiquetaDesde(d: BoDesde): string {
  const n = normalizarDesde(d)
  return n === 'semis' ? 'semis' : `top ${n.slice(3)}`
}

// Sets por ronda: bo.base al principio del cuadro y bo.top desde la ronda elegida
// ('semis' = últimas 2 rondas, 'top8' = últimas 3, 'top16' = últimas 4…).
export function boDeRonda(ri: number, totalRondas: number, bo: { base: number; top: number; desde: BoDesde }): number {
  const topRondas = RONDAS_TOP[normalizarDesde(bo.desde)]
  return ri >= totalRondas - topRondas ? bo.top : bo.base
}

// Juegos necesarios para cerrar un set (Bo3 → 2, Bo5 → 3).
export const paraGanar = (bo: number) => Math.ceil(bo / 2)

// Clasificación final a partir del cuadro: campeón, subcampeón y después los
// eliminados de cada ronda (de la final hacia atrás). Solo tiene sentido
// cuando la final está jugada.
export function standingsDe(rondas: MatchB[][]): Jugador[] {
  const final = rondas[rondas.length - 1]?.[0]
  if (!final?.ganador) return []
  const w = (m: MatchB) => (m.ganador === 'a' ? m.a : m.b)
  const l = (m: MatchB) => (m.ganador === 'a' ? m.b : m.a)
  const out: Jugador[] = []
  const campeon = w(final)
  if (campeon) out.push(campeon)
  for (let ri = rondas.length - 1; ri >= 0; ri--) {
    for (const m of rondas[ri]) {
      const perdedor = m.ganador ? l(m) : null
      if (perdedor && !out.some(p => p.id === perdedor.id)) out.push(perdedor)
    }
  }
  return out
}
