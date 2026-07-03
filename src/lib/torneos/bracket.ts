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
  let actual: { a: Jugador | null; b: Jugador | null }[] = []
  for (let i = 0; i < slots.length; i += 2) actual.push({ a: slots[i], b: slots[i + 1] })
  let ri = 0
  while (actual.length >= 1) {
    const matches: MatchB[] = actual.map((m, i) => {
      const id = `r${ri}m${i}`
      let g: 'a' | 'b' | null = winners[id] ?? null
      if (!g) { if (m.a && !m.b) g = 'a'; else if (!m.a && m.b) g = 'b' } // bye auto-avanza
      return { id, a: m.a, b: m.b, ganador: g }
    })
    rondas.push(matches)
    if (matches.length === 1) break
    const w = (mm: MatchB) => (mm.ganador ? (mm.ganador === 'a' ? mm.a : mm.b) : null)
    const next: { a: Jugador | null; b: Jugador | null }[] = []
    for (let i = 0; i < matches.length; i += 2) next.push({ a: w(matches[i]), b: w(matches[i + 1]) })
    actual = next
    ri++
  }
  return rondas
}

export function nombreRonda(nMatches: number): string {
  if (nMatches === 1) return 'Final'
  if (nMatches === 2) return 'Semifinales'
  if (nMatches === 4) return 'Cuartos'
  if (nMatches === 8) return 'Octavos'
  return `Ronda de ${nMatches * 2}`
}

// Sets por ronda: bo.base al principio del cuadro y bo.top desde la ronda elegida
// ('final' = solo la final, 'semis' = últimas 2 rondas, 'top8' = últimas 3).
export function boDeRonda(ri: number, totalRondas: number, bo: { base: number; top: number; desde: 'final' | 'semis' | 'top8' }): number {
  const topRondas = bo.desde === 'final' ? 1 : bo.desde === 'semis' ? 2 : 3
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
