// ─────────────────────────────────────────────────────────────────────────────
// PERSONAJES EN EL BRACKET (01-09-2026)
//
// En la casilla de cada combate, junto al nombre de cada jugador, va el
// personaje que jugó ESE set: el jugador avanza de ronda con el icono del
// personaje que usó en cada una, y puede cambiarlo de un set a otro (lo normal
// en lucha: counterpicks entre rondas).
//
// Fuente de verdad: los reportes reales del doble reporte
// (`personajesPorMatch[torneoId][matchId]` del store, F5). Cuando un combate no
// tiene reporte —los brackets de MUESTRA ya jugados, que son casi todo lo que
// se enseña en la demo— se derivan aquí de forma DETERMINISTA (mismo hash que
// el resto de la demo: nada de Math.random, SSR estable) a partir de jugador +
// juego + id del combate. Así:
//   · el mismo jugador NO lleva siempre el mismo personaje (varía por set),
//   · pero un combate concreto siempre enseña lo mismo en todos los sitios
//     (bracket público, gestión del TO y modo directo coinciden).
// ─────────────────────────────────────────────────────────────────────────────
import { PERSONAJES } from '@/lib/torneos/personajes'
import { plantillaDe } from '@/lib/torneos/sample'

export type ParPersonajes = { A?: string[]; B?: string[] }

function hash(s: string): number {
  let x = 0
  for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0
  return x
}

// Personajes de UN jugador en UN combate: casi siempre uno; a veces dos (se
// cambia de personaje dentro del set, como en un counterpick tras perder juego).
function personajesDe(juego: string, jugador: string, matchId: string): string[] | undefined {
  const lista = PERSONAJES[juego]
  if (!lista?.length || !jugador || jugador === '—') return undefined
  const x = hash(`${juego}:${jugador}:${matchId}`)
  const primero = lista[x % lista.length].nombre
  // OJO: `>>` es con SIGNO y el hash usa los 32 bits — con hashes por encima de
  // 2^31 daba índices negativos → lista[neg] undefined y la página entera caía.
  // Con `>>>` (sin signo) el índice siempre es válido.
  // ~1 de cada 4 sets el jugador saca un segundo personaje
  if ((x >>> 5) % 4 !== 0) return [primero]
  const segundo = lista[(x >>> 3) % lista.length].nombre
  return segundo === primero ? [primero] : [primero, segundo]
}

// Par de personajes de un combate ya jugado. `reales` (doble reporte) MANDA
// siempre; solo se rellena el lado que no tenga reporte.
export function personajesDelSet(
  juego: string | undefined,
  matchId: string,
  nombreA: string,
  nombreB: string,
  reales?: ParPersonajes,
): ParPersonajes | undefined {
  if (!juego || !plantillaDe(juego).personajes) return undefined
  const A = reales?.A?.length ? reales.A : personajesDe(juego, nombreA, matchId)
  const B = reales?.B?.length ? reales.B : personajesDe(juego, nombreB, matchId)
  return A || B ? { A, B } : undefined
}
