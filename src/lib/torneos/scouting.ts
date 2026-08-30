// ─────────────────────────────────────────────────────────────────────────────
// SCOUTING v1 (30-08): estudiar a un rival con datos MEDIBLES de Torneum.
// Regla de oro del spec: solo stats que salen de datos que existen (sets por
// consenso, ranking, historial, personajes declarados) — nada inventado que
// parezca telemetría del juego. Para los jugadores del pool de muestra, los
// números se DERIVAN deterministas del nombre+juego (hash FNV-1a + LCG, el
// mismo patrón que tagUsuarioDe en tags.ts): misma persona → mismos datos,
// estables entre renders, sesiones y SSR. Nada de Math.random sin semilla.
// El tamaño de muestra (nSets) viaja SIEMPRE con el dato («basado en 14 sets»)
// y por debajo de UMBRAL_MUESTRA la vista degrada a solo rango + torneos.
// ─────────────────────────────────────────────────────────────────────────────
import { rankingPorJuego, TORNEOS_SAMPLE, usuarioStatDe, type Jugador } from './sample'
import { PERSONAJES } from './personajes'
import { CREW_USUARIO, ratingEnJuego, type Crew } from './crews'

// Umbral de muestra (spec: ~5 sets): por debajo, «aún poca muestra».
export const UMBRAL_MUESTRA = 5

// Hash determinista (FNV-1a, como tags.ts) + generador LCG sembrado.
function hashDe(s: string): number {
  let h = 2166136261
  for (const ch of s) {
    h ^= ch.charCodeAt(0)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}
function lcg(seed: number): () => number {
  let x = seed || 1
  return () => {
    x = (Math.imul(x, 1103515245) + 12345) >>> 0
    return x / 4294967296
  }
}

export type MainScouting = { nombre: string; winrate: number; sets: number }

export type ScoutingJugador = {
  nombre: string
  juego: string
  rating: number
  tendencia: number        // ± puestos en 30 días (dato del ranking, ya público)
  nSets: number            // muestra total registrada
  muestraPequena: boolean  // nSets < UMBRAL_MUESTRA → la vista degrada
  mains: MainScouting[]    // 2-3 mains/decks/comps con winrate 45-70%
  clutchPct: number        // % ganado en sets ajustados (los que llegan al último game)
  nAjustados: number       // muestra del dato clutch
  torneosMes: number       // actividad
  presencialPct: number    // % de torneos presenciales (resto, online)
  torneosJugados: number
}

// Ficha de scouting de un jugador del pool. Determinista por nombre+juego.
// Los del FONDO del ranking (índice ≥ 14: recién llegados) tienen pocos sets
// registrados → así la degradación por muestra pequeña es demostrable.
export function scoutingDe(nombre: string, juego: string): ScoutingJugador {
  const pool = rankingPorJuego(juego)
  const idx = pool.findIndex(p => p.nombre.toLowerCase() === nombre.toLowerCase())
  const jugador: Jugador | undefined = idx >= 0 ? pool[idx] : undefined
  const h = hashDe(`${nombre}·${juego}·scout`)
  const r = lcg(h)

  const recienLlegado = idx >= 14
  const nSets = recienLlegado ? 2 + (h % 3) : 8 + (h % 33)

  // Mains con winrate: arranca del main que ya enseña el ranking (coherencia
  // con MiniPerfil) y añade 1-2 secundarios del catálogo del juego.
  const catalogo = (PERSONAJES[juego] ?? []).map(p => p.nombre)
  const nMains = 2 + (h % 2)
  const desde = jugador?.main ? Math.max(0, catalogo.indexOf(jugador.main)) : h % Math.max(1, catalogo.length)
  const nombres: string[] = []
  for (let i = 0; nombres.length < nMains && i < catalogo.length; i++) {
    const cand = catalogo[(desde + i * (1 + (h % 3))) % catalogo.length]
    if (!nombres.includes(cand)) nombres.push(cand)
  }
  if (jugador?.main && nombres.length && nombres[0] !== jugador.main && catalogo.includes(jugador.main)) nombres[0] = jugador.main
  const partes = [0.5, 0.3, 0.2]
  const mains: MainScouting[] = nombres.map((n, i) => ({
    nombre: n,
    winrate: 45 + Math.floor(r() * 26),                    // 45-70%
    sets: Math.max(1, Math.round(nSets * partes[i % 3])),
  }))

  const nAjustados = Math.max(1, Math.round(nSets * (0.22 + (h % 16) / 100)))
  return {
    nombre: jugador?.nombre ?? nombre,
    juego,
    rating: jugador?.rating ?? ratingEnJuego(nombre, juego),
    tendencia: jugador?.tendencia ?? ((h % 5) - 2),
    nSets,
    muestraPequena: nSets < UMBRAL_MUESTRA,
    mains,
    clutchPct: 40 + (h % 31),                              // 40-70%
    nAjustados,
    torneosMes: 1 + (h % 4),
    presencialPct: 40 + (h % 51),                          // 40-90%
    torneosJugados: jugador?.torneosJugados ?? Math.max(nSets, 3),
  }
}

// ── Head-to-head contra el usuario de la demo ────────────────────────────────
export type SetH2H = {
  torneo: string
  ronda: string
  marcador: string   // desde TU perspectiva: «2–1» = ganaste 2-1
  ganeYo: boolean
  diasHace: number
}

const RONDAS_H2H = ['Winners R2', 'Cuartos', 'Semis', 'Losers R1', 'Winners R1', 'Final']

// 3-6 sets contra ti, deterministas, con marcadores y quién ganó.
export function headToHead(nombre: string, juego: string): { sets: SetH2H[]; mias: number; suyas: number } {
  const h = hashDe(`${nombre}·${juego}·h2h`)
  const r = lcg(h)
  const torneos = TORNEOS_SAMPLE.filter(t => t.juego === juego)
  const n = 3 + (h % 4)
  const sets: SetH2H[] = []
  for (let i = 0; i < n; i++) {
    const ganeYo = r() > 0.45
    const cerrado = r() > 0.5
    const marcador = ganeYo ? (cerrado ? (r() > 0.5 ? '3–2' : '2–1') : '2–0') : (cerrado ? (r() > 0.5 ? '2–3' : '1–2') : '0–2')
    sets.push({
      torneo: torneos.length ? torneos[i % torneos.length].nombre : '—',
      ronda: RONDAS_H2H[(h + i) % RONDAS_H2H.length],
      marcador, ganeYo,
      diasHace: 5 + i * 9 + (h % 7),
    })
  }
  const mias = sets.filter(s => s.ganeYo).length
  return { sets, mias, suyas: n - mias }
}

// ── Historial de torneos del rival ───────────────────────────────────────────
// Mismos torneos y misma fórmula de puesto que el MiniPerfil (hash nombre+id):
// lo que ya es público en la app no puede contradecirse aquí.
export type EntradaHistorialRival = { torneoId: string; nombre: string; fechaLabel: string; puesto: string }

export function historialDe(nombre: string, juego: string): EntradaHistorialRival[] {
  return TORNEOS_SAMPLE.filter(t => t.juego === juego).map(t => {
    let h = 0
    for (const ch of nombre + t.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
    return { torneoId: t.id, nombre: t.nombre, fechaLabel: t.fechaLabel, puesto: ['🥇 1º', '🥈 2º', 'Top 4', 'Top 8', 'Top 16'][h % 5] }
  })
}

// ── VODs del rival ───────────────────────────────────────────────────────────
// Diseño defensivo como en VODs N1: solo hay vídeo si existe de verdad. Hoy
// solo se siembra UNO (Kaze en el Weekly #41: el MISMO set que el usuario
// tiene en su historial como derrota 2–3 en semis, visto del otro lado) para
// demostrar el módulo; el resto de rivales enseña «sin vídeos aún».
export type VodRival = { torneo: string; ronda: string; marcador: string; contraUsuario: boolean; url: string }

export function vodsDe(nombre: string, juego: string): VodRival[] {
  if (juego === 'smash' && nombre === 'Kaze') {
    return [{
      torneo: 'Lima Smash Weekly #41', ronda: 'Semis', marcador: '3–2', contraUsuario: true,
      url: 'https://www.youtube.com/watch?v=JzS96auqau0&t=3480s',
    }]
  }
  return []
}

// ── Scouting de CREW (juegos de equipo: valorant/lol/cs/cod) ─────────────────
export type MiembroScouting = {
  nombre: string
  esUsuario: boolean
  rating: number
  main?: string
  winrate: number
  nSets: number
}

export type ScoutingCrew = {
  media: number                 // media de rating del roster (la del emblema)
  miembros: MiembroScouting[]   // en orden del roster
  masFuerte: MiembroScouting
  masDebil: MiembroScouting
}

export function scoutingCrew(crew: Crew): ScoutingCrew {
  const miembros: MiembroScouting[] = crew.miembros.map(m => {
    if (m === CREW_USUARIO) {
      const st = usuarioStatDe(crew.juego)
      const total = st.v + st.d
      return {
        nombre: m, esUsuario: true, rating: st.rating, main: st.mains[0],
        winrate: total ? Math.round((st.v / total) * 100) : 0, nSets: total,
      }
    }
    const sc = scoutingDe(m, crew.juego)
    return { nombre: m, esUsuario: false, rating: sc.rating, main: sc.mains[0]?.nombre, winrate: sc.mains[0]?.winrate ?? 50, nSets: sc.nSets }
  })
  const orden = [...miembros].sort((a, b) => b.rating - a.rating)
  const media = miembros.length ? Math.round(miembros.reduce((acc, m) => acc + m.rating, 0) / miembros.length) : 0
  return { media, miembros, masFuerte: orden[0], masDebil: orden[orden.length - 1] }
}
