// ─────────────────────────────────────────────────────────────────────────────
// SISTEMA DE PUNTUACIÓN TORNEUM (decisión de producto, sesión 21-ago)
//
// Regla de oro: SOLO puntúan los torneos jugados en Torneum. start.gg (u otras
// plataformas) nunca es fuente de puntos — así no existe el desajuste de
// "torneos que allí no están publicados". Torneum es su propio circuito.
//
// Cada torneo reparte un TOPE de puntos (lo que gana el campeón) que depende de:
//   · Categoría: Comunidad (cualquier TO) · Oficial (sello Torneum) · Super Major
//     (2 al año, organizados por la app; mundiales — todo el mundo puede jugar).
//   · Inscripción: un torneo gratis no puede puntuar como uno de pago, ni uno
//     barato como uno caro.
//   · Bote y aforo: más en juego y más rivales → más puntos.
//   · Modalidad: online puntúa algo menos que presencial (menos control).
// El resto de puestos cobra un % del tope según su clasificación final.
//
// Ámbitos: al registrarte eliges TU PAÍS. Tus puntos van SIEMPRE al ranking de
// tu país (juegues donde juegues: un visitante extranjero puede jugar cualquier
// torneo sin romper nada) y al ranking mundial. Presencial y online son rankings
// separados. El Circuito (oficiales + Super Majors) tiene tabla propia.
// ─────────────────────────────────────────────────────────────────────────────

export type CategoriaTorneo = 'comunidad' | 'oficial' | 'supermajor'

export const CATEGORIAS: Record<CategoriaTorneo, { label: string; corto: string; color: string; base: number }> = {
  comunidad:  { label: 'Torneo de comunidad',   corto: 'Comunidad',   color: '#8B8BA8', base: 100 },
  oficial:    { label: 'Torneum Official',      corto: 'Oficial',     color: '#E0BE63', base: 400 },
  supermajor: { label: 'Torneum Super Major',   corto: 'Super Major', color: '#FF5C8A', base: 1000 },
}

type DatosTope = { precio: number; bote?: number; plazas: number; online?: boolean; categoria?: CategoriaTorneo }

// Tope de puntos del torneo (lo que recibe el campeón). Determinista y público:
// el TO y el jugador ven el mismo número antes de inscribirse.
export function topePuntos(t: DatosTope): number {
  const cat = CATEGORIAS[t.categoria ?? 'comunidad']
  // Inscripción: gratis puntúa la mitad; a partir de 15€ puntúa un 25% más.
  const porPrecio = t.precio === 0 ? 0.5 : t.precio < 6 ? 0.75 : t.precio < 15 ? 1 : 1.25
  // Bote en juego: señal de nivel del torneo.
  const bote = t.bote ?? 0
  const porBote = bote >= 1500 ? 1.5 : bote >= 500 ? 1.25 : bote >= 100 ? 1.1 : 1
  // Aforo: más bracket que superar, más vale cada ronda.
  const porAforo = t.plazas >= 128 ? 1.3 : t.plazas >= 64 ? 1.15 : t.plazas >= 32 ? 1 : 0.8
  // Online algo menos que presencial.
  const porModalidad = t.online ? 0.8 : 1
  return Math.round((cat.base * porPrecio * porBote * porAforo * porModalidad) / 5) * 5
}

// Reparto por puesto: % del tope según la clasificación final.
export const REPARTO_PUESTOS: { hasta: number; pct: number; label: string }[] = [
  { hasta: 1,  pct: 100, label: '1º' },
  { hasta: 2,  pct: 70,  label: '2º' },
  { hasta: 3,  pct: 55,  label: '3º' },
  { hasta: 4,  pct: 45,  label: '4º' },
  { hasta: 8,  pct: 30,  label: 'Top 8' },
  { hasta: 16, pct: 18,  label: 'Top 16' },
  { hasta: 32, pct: 10,  label: 'Top 32' },
  { hasta: 64, pct: 5,   label: 'Top 64' },
]

export function puntosPorPuesto(tope: number, puesto: number): number {
  const tramo = REPARTO_PUESTOS.find(r => puesto <= r.hasta)
  if (!tramo) return Math.max(1, Math.round(tope * 0.02)) // participar siempre suma algo
  return Math.round((tope * tramo.pct) / 100)
}

// ─────────────────────────────────────────────────────────────────────────────
// Países (al registrarte eliges dónde compites; se puede corregir en el perfil)
// ─────────────────────────────────────────────────────────────────────────────
export type Pais = { id: string; nombre: string; bandera: string }
export const PAISES: Pais[] = [
  { id: 'ES', nombre: 'España',         bandera: '🇪🇸' },
  { id: 'PT', nombre: 'Portugal',       bandera: '🇵🇹' },
  { id: 'FR', nombre: 'Francia',        bandera: '🇫🇷' },
  { id: 'IT', nombre: 'Italia',         bandera: '🇮🇹' },
  { id: 'DE', nombre: 'Alemania',       bandera: '🇩🇪' },
  { id: 'GB', nombre: 'Reino Unido',    bandera: '🇬🇧' },
  { id: 'NL', nombre: 'Países Bajos',   bandera: '🇳🇱' },
  { id: 'US', nombre: 'Estados Unidos', bandera: '🇺🇸' },
  { id: 'MX', nombre: 'México',         bandera: '🇲🇽' },
  { id: 'JP', nombre: 'Japón',          bandera: '🇯🇵' },
]
export const paisDe = (id: string): Pais => PAISES.find(p => p.id === id) ?? PAISES[0]

// ─────────────────────────────────────────────────────────────────────────────
// Ranking Torneum de MUESTRA (determinista, sin backend): por juego × modalidad
// (presencial/online) × ámbito (país/mundial). Cuando ruede el motor real, esto
// se sustituye por la agregación de resultados de torneos Torneum.
// ─────────────────────────────────────────────────────────────────────────────
export type FilaRankingTorneum = {
  id: string
  nombre: string
  pais: string
  bandera: string
  puntos: number
  torneos: number
  mejor: number      // mejor puesto del periodo
  rating: number     // escala de rangos (E → S) para el RangoChip
  tendencia: number  // +/- puestos vs. semana pasada
}

// OJO: filasDe recorre esta lista en pasos de 7 (`(seed + i*7) % NICKS.length`)
// y la longitud debe ser COPRIMA con 7 o la tabla repetiría pocos nicks. NO
// cambiar su tamaño: cambia la tabla entera y saca del top a los nicks que
// llevan tag de crew (Kaze/Sora/Volt son Nocturna y hay suites que lo miran).
const NICKS = [
  'Kaze', 'Sora', 'Volt', 'Zen', 'Drako', 'Lux', 'Vega', 'Kira', 'Riven', 'Nyx',
  'Rei', 'Mist', 'Aqua', 'Pyra', 'Onyx', 'Faze', 'Blitz', 'Nova', 'Echo', 'Yuki',
]

// Jugadoras de la escena (01-09): están también en NOMBRES_POOL de sample.ts,
// así que desde el ranking se abre su perfil con historial, récord y mains.
// Ocupan POSICIONES FIJAS de cada tabla (ver POS_JUGADORAS) en vez de ampliar
// NICKS: así el resto de la tabla queda exactamente como estaba.
const NICKS_JUGADORAS = ['Alba', 'Nerea', 'Vera', 'Iris', 'Noa', 'Marta', 'Sara', 'Luna', 'Aria']
// Elegidas para no pisar a los miembros de crew del top de Smash·ES (Kaze 5º,
// Sora 8º, Volt 11º) y repartirse por toda la tabla.
const POS_JUGADORAS = new Set([1, 3, 6, 9])

// Hash determinista pequeño (sin Math.random: SSR estable)
function h(s: string): number {
  let x = 0
  for (const c of s) x = (x * 31 + c.charCodeAt(0)) >>> 0
  return x
}

function filasDe(juego: string, modalidad: 'presencial' | 'online', pais: Pais, n: number): FilaRankingTorneum[] {
  const seed = h(`${juego}:${modalidad}:${pais.id}`)
  const filas: FilaRankingTorneum[] = []
  for (let i = 0; i < n; i++) {
    const nick = POS_JUGADORAS.has(i)
      ? NICKS_JUGADORAS[(seed + i * 5) % NICKS_JUGADORAS.length]
      : NICKS[(seed + i * 7) % NICKS.length]
    const puntos = Math.max(40, 1980 - i * 150 - ((seed >> (i % 5)) % 90))
    filas.push({
      id: `${juego}-${modalidad}-${pais.id}-${i}`,
      nombre: pais.id === 'ES' ? nick : `${nick}${['', 'x', 'V2', 'GG', 'Jr'][(seed + i) % 5]}`,
      pais: pais.id,
      bandera: pais.bandera,
      puntos,
      torneos: 3 + ((seed + i * 3) % 11),
      mejor: 1 + ((seed + i) % 2 === 0 ? Math.min(i, 4) : Math.min(i + 2, 9)),
      rating: 1500 + Math.min(940, Math.round(puntos * 0.42)),
      tendencia: ((seed + i * 3) % 5) - 2,
    })
  }
  return filas
}

// ─────────────────────────────────────────────────────────────────────────────
// PUNTUACIONES POR PLATAFORMA (consulta): además del ranking Torneum, cada
// juego enseña la clasificación de su plataforma competitiva de referencia
// (start.gg para Smash, RK9 para Pokémon…). SOLO LECTURA: estas puntuaciones
// nunca alimentan el ranking Torneum (regla de oro de puntos.ts).
// ─────────────────────────────────────────────────────────────────────────────
export type PlataformaJuego = { nombre: string; etiqueta: string; color: string }
export const PLATAFORMAS: Record<string, PlataformaJuego> = {
  smash:   { nombre: 'start.gg',    etiqueta: 'Circuito global de start.gg', color: '#CB333B' },
  tekken:  { nombre: 'start.gg',    etiqueta: 'Tekken World Tour · start.gg', color: '#CB333B' },
  sf6:     { nombre: 'Capcom Pro Tour', etiqueta: 'CPT · vía start.gg', color: '#F4C542' },
  magic:   { nombre: 'Melee.gg',    etiqueta: 'Circuito competitivo de Melee.gg', color: '#F4912B' },
  pokemon: { nombre: 'RK9 Labs',    etiqueta: 'Championship Points · RK9', color: '#FFC83D' },
  tft:     { nombre: 'lolchess.gg', etiqueta: 'Ladder competitiva de lolchess', color: '#4F8EF7' },
  valorant:{ nombre: 'VLR.gg',      etiqueta: 'Circuito Challengers · VLR', color: '#FF4655' },
  lol:     { nombre: 'OP.GG',       etiqueta: 'Ladder competitiva de OP.GG', color: '#0AC8B9' },
  // GameBattles cerró el 15-01-2024; la escena competitiva de CoD vive en FACEIT
  cod:     { nombre: 'FACEIT', etiqueta: 'Escalera competitiva de FACEIT', color: '#FF5500' },
}
export const PLATAFORMA_GENERICA: PlataformaJuego = { nombre: 'start.gg', etiqueta: 'Circuito global de start.gg', color: '#CB333B' }
export function plataformaDe(juegoId: string): PlataformaJuego {
  return PLATAFORMAS[juegoId] ?? PLATAFORMA_GENERICA
}

// Clasificación de la plataforma externa (muestra determinista, orden y puntos
// DISTINTOS del ranking Torneum para que se vea que son dos sistemas).
export function rankingPlataforma(juego: string): FilaRankingTorneum[] {
  const base = PAISES.flatMap(p => filasDe(juego, 'presencial', p, 3))
  const sello = juego.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return base
    .map((f, i) => {
      let h = 0
      for (const ch of f.nombre + juego + 'plataforma') h = (h * 33 + ch.charCodeAt(0)) >>> 0
      return {
        ...f,
        puntos: 4200 - ((h % 17) * 190) - i * 45 - (sello % 60),
        torneos: 6 + (h % 21),
        mejor: 1 + (h % 8),
        tendencia: ((h >> 3) % 5) - 2,
      }
    })
    .sort((a, b) => b.puntos - a.puntos)
    .slice(0, 12)
}

export function rankingTorneum(juego: string, modalidad: 'presencial' | 'online', ambito: 'pais' | 'mundial' | 'circuito', paisId: string): FilaRankingTorneum[] {
  if (ambito === 'pais') return filasDe(juego, modalidad, paisDe(paisId), 12)
  // Mundial/Circuito: los mejores de cada país en la misma tabla. Dos países
  // pueden generar el mismo alias (QA L6: NovaV2 duplicado): nos quedamos con
  // la primera aparición de cada nombre.
  const todos = PAISES.flatMap(p => filasDe(juego, modalidad, p, 4))
  const vistos = new Set<string>()
  const unicos = todos.filter(f => (vistos.has(f.nombre) ? false : (vistos.add(f.nombre), true)))
  if (ambito === 'circuito') {
    // Tabla PROPIA (QA L6: era un clon del mundial): solo cuentan oficiales y
    // Super Majors, así que hay menos torneos y otro reparto de puntos.
    return unicos
      .map(f => {
        let x = 0
        for (const ch of f.nombre + juego + 'circuito') x = (x * 33 + ch.charCodeAt(0)) >>> 0
        return { ...f, puntos: 3600 - (x % 13) * 210, torneos: 1 + (x % 4), mejor: 1 + (x % 6), tendencia: ((x >> 2) % 5) - 2 }
      })
      .sort((a, b) => b.puntos - a.puntos)
      .slice(0, 12)
  }
  return unicos.sort((a, b) => b.puntos - a.puntos).slice(0, 12)
}
