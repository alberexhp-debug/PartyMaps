// Datos de muestra para el MVP visual de TODH mientras no existe la tabla real de
// torneos. Cuando se construya el modelo (juegos, torneos, inscripciones) esto se
// sustituye por la query a Supabase. NO usar en producción con datos reales.

export type Juego = { id: string; nombre: string; corto: string; color: string; emoji: string }

export const JUEGOS: Record<string, Juego> = {
  smash:   { id: 'smash',   nombre: 'Super Smash Bros. Ultimate', corto: 'Smash',   color: '#E63E54', emoji: '⚔️' },
  magic:   { id: 'magic',   nombre: 'Magic: The Gathering',       corto: 'Magic',   color: '#F4912B', emoji: '🃏' },
  pokemon: { id: 'pokemon', nombre: 'Pokémon TCG',                corto: 'Pokémon', color: '#FFC83D', emoji: '⚡' },
  tft:     { id: 'tft',     nombre: 'Teamfight Tactics',          corto: 'TFT',     color: '#4F8EF7', emoji: '♟️' },
  tekken:  { id: 'tekken',  nombre: 'Tekken 8',                   corto: 'Tekken',  color: '#9B5DE5', emoji: '👊' },
  sf6:     { id: 'sf6',     nombre: 'Street Fighter 6',           corto: 'SF6',     color: '#2EC4B6', emoji: '🥊' },
}

export const JUEGOS_LIST = Object.values(JUEGOS)

export type FormatoTorneo =
  | 'Doble eliminación' | 'Eliminación simple' | 'Suizo' | 'Pools → Top cut' | 'Round robin'

export type Tier = 'Platino' | 'Diamante' | 'Oro'

export type TorneoSample = {
  id: string
  nombre: string
  juego: string            // clave de JUEGOS
  formato: FormatoTorneo
  fechaLabel: string       // 'Hoy 18:00', 'Sáb 28 jun · 17:00'…
  esHoy?: boolean
  online?: boolean         // torneo online (sin sala física)
  local: string
  localId?: string
  ciudad: string
  distanciaKm: number
  inscritos: number
  plazas: number
  precio: number           // 0 = gratis
  bote?: number            // € en juego (opcional)
  enDirecto?: boolean
  viendo?: number          // espectadores si enDirecto
  vip?: Tier | null
  organizadorId?: string
  popularidad: number      // para ordenar
  bestOf?: string          // 'Bo3 → Bo5 en top 8'
  checkInAbierto?: boolean
  descripcion?: string
}

export const TORNEOS_SAMPLE: TorneoSample[] = [
  {
    id: 't1', nombre: 'Lima Smash Weekly #42', juego: 'smash', formato: 'Doble eliminación',
    fechaLabel: 'Hoy · 18:00', esHoy: true, local: 'Gamba Esports', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 58, plazas: 64, precio: 8, bote: 320, enDirecto: true, viendo: 137,
    vip: null, organizadorId: 'lima', popularidad: 98, bestOf: 'Bo3 · Bo5 en top 8', checkInAbierto: true,
    descripcion: 'El semanal de Smash más veterano de Madrid. Bracket de doble eliminación, premios al top 3 y ambientazo asegurado.',
  },
  {
    id: 't2', nombre: 'Liga Magic Standard — Jornada 5', juego: 'magic', formato: 'Suizo',
    fechaLabel: 'Hoy · 19:30', esHoy: true, local: 'La Tienda del Dragón', localId: 'dragon', ciudad: 'Madrid',
    distanciaKm: 2.6, inscritos: 24, plazas: 32, precio: 12, bote: 0, enDirecto: true, viendo: 64,
    vip: null, organizadorId: 'dragon-to', popularidad: 86, bestOf: 'Bo3', checkInAbierto: true,
    descripcion: 'Quinta jornada de la liga Standard. 6 rondas de suizo + top 8. Puntúa para el ranking de temporada.',
  },
  {
    id: 't3', nombre: 'Pokémon TCG City League', juego: 'pokemon', formato: 'Suizo',
    fechaLabel: 'Mañana · 11:00', local: 'Card Kingdom', localId: 'cardkingdom', ciudad: 'Madrid',
    distanciaKm: 3.1, inscritos: 41, plazas: 48, precio: 10, bote: 0, enDirecto: false,
    vip: null, organizadorId: 'ck-to', popularidad: 81, bestOf: 'Bo3',
    descripcion: 'City League oficial. Reparte puntos de campeonato. Decklist obligatoria al registrarse.',
  },
  {
    id: 't4', nombre: 'TFT Iberian Cup — Clasificatorio', juego: 'tft', formato: 'Pools → Top cut',
    fechaLabel: 'Sáb 28 jun · 17:00', local: 'Online + Gamba', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 96, plazas: 128, precio: 5, bote: 500, enDirecto: true, viendo: 212,
    vip: null, organizadorId: 'lima', popularidad: 90, bestOf: 'Lobbies de 8',
    descripcion: 'Clasificatorio para la Iberian Cup. 16 pools, top 32 a la final presencial en Gamba.',
  },
  {
    id: 't5', nombre: 'Tekken 8 Arena Night', juego: 'tekken', formato: 'Doble eliminación',
    fechaLabel: 'Vie 27 jun · 20:00', local: 'Arcade Planet', localId: 'arcade', ciudad: 'Madrid',
    distanciaKm: 4.8, inscritos: 31, plazas: 32, precio: 6, bote: 180, enDirecto: false,
    vip: null, organizadorId: 'arcade-to', popularidad: 74, bestOf: 'Bo3 · Bo5 en finales',
    descripcion: 'Noche de Tekken en Arcade Planet. Setups en mando y arcade stick disponibles.',
  },
  {
    id: 't6', nombre: 'SF6 Invitational — Platino', juego: 'sf6', formato: 'Doble eliminación',
    fechaLabel: 'Dom 29 jun · 16:00', local: 'Gamba Esports', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 14, plazas: 16, precio: 0, bote: 1000, enDirecto: false,
    vip: 'Platino', organizadorId: 'lima', popularidad: 95, bestOf: 'Bo5',
    descripcion: 'Invitational exclusivo para jugadores Platino. Los 16 mejores de la región por un bote de 1.000€.',
  },
  {
    id: 't7', nombre: 'Smash Singles — Casual Bracket', juego: 'smash', formato: 'Eliminación simple',
    fechaLabel: 'Mañana · 18:30', local: 'Respawn Bar', localId: 'respawn', ciudad: 'Madrid',
    distanciaKm: 5.4, inscritos: 12, plazas: 32, precio: 0, bote: 0, enDirecto: false,
    vip: null, organizadorId: 'respawn-to', popularidad: 62, bestOf: 'Bo3',
    descripcion: 'Bracket casual y abierto, ideal para empezar a competir. Sin presión, mucho aprendizaje.',
  },
  {
    id: 't8', nombre: 'Magic Commander League', juego: 'magic', formato: 'Round robin',
    fechaLabel: 'Mié 25 jun · 18:00', local: 'La Tienda del Dragón', localId: 'dragon', ciudad: 'Madrid',
    distanciaKm: 2.6, inscritos: 16, plazas: 16, precio: 7, bote: 0, enDirecto: false,
    vip: 'Oro', organizadorId: 'dragon-to', popularidad: 70, bestOf: 'Partidas de 4',
    descripcion: 'Liga Commander en formato round robin. Mesas de 4, ambiente relajado y premios en producto.',
  },
  {
    id: 't9', nombre: 'Pokémon Junior Cup', juego: 'pokemon', formato: 'Suizo',
    fechaLabel: 'Sáb 28 jun · 10:00', local: 'Card Kingdom', localId: 'cardkingdom', ciudad: 'Madrid',
    distanciaKm: 3.1, inscritos: 28, plazas: 64, precio: 5, bote: 0, enDirecto: false,
    vip: null, organizadorId: 'ck-to', popularidad: 66, bestOf: 'Bo1',
    descripcion: 'Copa para jugadores junior (menos de 15 años). Acompañantes bienvenidos.',
  },
  {
    id: 't10', nombre: 'TFT Friday Showdown', juego: 'tft', formato: 'Pools → Top cut',
    fechaLabel: 'Hoy · 21:00', esHoy: true, online: true, local: 'Online', ciudad: 'Online',
    distanciaKm: 0, inscritos: 64, plazas: 64, precio: 3, bote: 150, enDirecto: false,
    vip: null, organizadorId: 'lima', popularidad: 79, bestOf: 'Lobbies de 8',
    descripcion: 'Showdown online de los viernes. Código de sala por el chat del combate.',
  },
  {
    id: 't11', nombre: 'Smash Arena Madrid — Major', juego: 'smash', formato: 'Pools → Top cut',
    fechaLabel: 'Sáb 5 jul · 10:00', local: 'Gamba Esports', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 176, plazas: 256, precio: 15, bote: 2500, enDirecto: false,
    vip: null, organizadorId: 'lima', popularidad: 99, bestOf: 'Bo3 · Bo5 en top 8',
    descripcion: 'El major del verano. 256 plazas, pools por la mañana y top 24 retransmitido por la tarde.',
  },
  {
    id: 't12', nombre: 'SF6 Newcomers Night', juego: 'sf6', formato: 'Doble eliminación',
    fechaLabel: 'Jue 26 jun · 19:00', local: 'Respawn Bar', localId: 'respawn', ciudad: 'Madrid',
    distanciaKm: 5.4, inscritos: 19, plazas: 24, precio: 4, bote: 0, enDirecto: false,
    vip: null, organizadorId: 'respawn-to', popularidad: 58, bestOf: 'Bo3',
    descripcion: 'Pensado para quien empieza en SF6. Coaching entre rondas y mucho buen rollo.',
  },
]

export function getTorneo(id: string): TorneoSample | undefined {
  return TORNEOS_SAMPLE.find(t => t.id === id)
}

// ─────────────────────────────────────────────────────────────────────────────
// Organizadores (TOs)
// ─────────────────────────────────────────────────────────────────────────────
export type Organizador = {
  id: string
  nombre: string
  handle: string
  bio: string
  color: string
  ciudad: string
  rating: number
  valoraciones: number
  torneosOrg: number
  seguidores: number
  verificado: boolean
  tier: Tier
  juegos: string[]
  insignias: string[]
}

export const ORGANIZADORES: Record<string, Organizador> = {
  lima: {
    id: 'lima', nombre: 'Lima Esports', handle: '@lima', color: '#E63E54', ciudad: 'Madrid',
    bio: 'Organizamos los mejores semanales y majors de Smash y FGC de Madrid desde 2019.',
    rating: 4.9, valoraciones: 342, torneosOrg: 128, seguidores: 4820, verificado: true,
    tier: 'Platino', juegos: ['smash', 'sf6', 'tekken', 'tft'],
    insignias: ['+100 torneos', 'Sin incidencias', 'Pago puntual', 'Major host'],
  },
  'dragon-to': {
    id: 'dragon-to', nombre: 'La Tienda del Dragón', handle: '@dragon', color: '#F4912B', ciudad: 'Madrid',
    bio: 'Liga semanal de Magic y eventos Commander. Tu tienda de cartas de confianza.',
    rating: 4.7, valoraciones: 156, torneosOrg: 74, seguidores: 1980, verificado: true,
    tier: 'Diamante', juegos: ['magic'],
    insignias: ['+50 torneos', 'Pago puntual'],
  },
  'ck-to': {
    id: 'ck-to', nombre: 'Card Kingdom TO', handle: '@cardkingdom', color: '#FFC83D', ciudad: 'Madrid',
    bio: 'City Leagues oficiales de Pokémon TCG y eventos para toda la familia.',
    rating: 4.8, valoraciones: 98, torneosOrg: 52, seguidores: 1340, verificado: true,
    tier: 'Diamante', juegos: ['pokemon'],
    insignias: ['+50 torneos', 'Oficial'],
  },
  'arcade-to': {
    id: 'arcade-to', nombre: 'Arcade Planet', handle: '@arcadeplanet', color: '#9B5DE5', ciudad: 'Madrid',
    bio: 'Noches de FGC en el salón recreativo más grande de la ciudad.',
    rating: 4.5, valoraciones: 61, torneosOrg: 38, seguidores: 890, verificado: false,
    tier: 'Oro', juegos: ['tekken', 'sf6'],
    insignias: ['+25 torneos'],
  },
  'respawn-to': {
    id: 'respawn-to', nombre: 'Respawn Bar', handle: '@respawn', color: '#2EC4B6', ciudad: 'Madrid',
    bio: 'Brackets casuales con birra fría. El sitio para empezar a competir.',
    rating: 4.6, valoraciones: 44, torneosOrg: 29, seguidores: 720, verificado: false,
    tier: 'Oro', juegos: ['smash', 'sf6'],
    insignias: ['Comunidad nueva'],
  },
}

export function getOrganizador(id: string): Organizador | undefined {
  return ORGANIZADORES[id]
}

// ─────────────────────────────────────────────────────────────────────────────
// Locales (sedes)
// ─────────────────────────────────────────────────────────────────────────────
export type Local = {
  id: string
  nombre: string
  ciudad: string
  zona: string
  setups: number
  tiposSetup: string[]
  rating: number
  valoraciones: number
  color: string
  lat: number
  lng: number
}

export const LOCALES: Record<string, Local> = {
  gamba: { id: 'gamba', nombre: 'Gamba Esports', ciudad: 'Madrid', zona: 'Malasaña', setups: 24, tiposSetup: ['Consola', 'PC', 'Setup stream'], rating: 4.9, valoraciones: 210, color: '#E63E54', lat: 40.4262, lng: -3.7038 },
  dragon: { id: 'dragon', nombre: 'La Tienda del Dragón', ciudad: 'Madrid', zona: 'Chamberí', setups: 12, tiposSetup: ['Mesa'], rating: 4.7, valoraciones: 132, color: '#F4912B', lat: 40.4357, lng: -3.7045 },
  cardkingdom: { id: 'cardkingdom', nombre: 'Card Kingdom', ciudad: 'Madrid', zona: 'Salamanca', setups: 16, tiposSetup: ['Mesa'], rating: 4.8, valoraciones: 88, color: '#FFC83D', lat: 40.4280, lng: -3.6790 },
  arcade: { id: 'arcade', nombre: 'Arcade Planet', ciudad: 'Madrid', zona: 'Tetuán', setups: 20, tiposSetup: ['Arcade', 'Consola', 'Setup stream'], rating: 4.5, valoraciones: 70, color: '#9B5DE5', lat: 40.4610, lng: -3.6990 },
  respawn: { id: 'respawn', nombre: 'Respawn Bar', ciudad: 'Madrid', zona: 'Lavapiés', setups: 8, tiposSetup: ['Consola'], rating: 4.6, valoraciones: 51, color: '#2EC4B6', lat: 40.4090, lng: -3.7010 },
}

export function getLocal(id: string): Local | undefined {
  return LOCALES[id]
}

// ─────────────────────────────────────────────────────────────────────────────
// Jugadores (ranking + perfil competitivo)
// ─────────────────────────────────────────────────────────────────────────────
export type Jugador = {
  id: string
  nombre: string
  handle: string
  pais: string
  bandera: string
  juego: string
  rating: number
  tier: Tier
  victorias: number
  derrotas: number
  torneosJugados: number
  mejorPuesto: string
  main?: string
  tendencia: number   // +/- puestos
  online?: boolean
}

// Generador determinista de ranking por juego (sin Math.random para SSR estable)
const NOMBRES_POOL = [
  ['Kaze', 'ES', '🇪🇸'], ['Sora', 'ES', '🇪🇸'], ['Nyx', 'FR', '🇫🇷'], ['Volt', 'ES', '🇪🇸'],
  ['Rei', 'JP', '🇯🇵'], ['Mist', 'PT', '🇵🇹'], ['Zen', 'ES', '🇪🇸'], ['Aqua', 'IT', '🇮🇹'],
  ['Drako', 'ES', '🇪🇸'], ['Pyra', 'DE', '🇩🇪'], ['Lux', 'ES', '🇪🇸'], ['Onyx', 'GB', '🇬🇧'],
  ['Vega', 'ES', '🇪🇸'], ['Kira', 'ES', '🇪🇸'], ['Faze', 'NL', '🇳🇱'], ['Riven', 'ES', '🇪🇸'],
]
const MAINS: Record<string, string[]> = {
  smash: ['Joker', 'Steve', 'Fox', 'Pikachu', 'Cloud', 'Roy', 'Pyra/Mythra', 'Sonic'],
  sf6: ['Luke', 'Ken', 'JP', 'Cammy', 'Juri', 'Dee Jay', 'Guile'],
  tekken: ['Jin', 'Kazuya', 'King', 'Bryan', 'Nina', 'Dragunov'],
  tft: ['Hyper Roll', 'Fast 8', 'Reroll', 'Standard'],
  magic: ['Aggro', 'Control', 'Midrange', 'Combo'],
  pokemon: ['Charizard ex', 'Lugia', 'Lost Box', 'Gardevoir ex'],
}

export function rankingPorJuego(juegoId: string): Jugador[] {
  const mains = MAINS[juegoId] || []
  return NOMBRES_POOL.map((n, i) => {
    const rating = 2400 - i * 47 - (juegoId.charCodeAt(0) % 9) * 3
    const tier: Tier = i < 2 ? 'Platino' : i < 6 ? 'Diamante' : 'Oro'
    return {
      id: `${juegoId}-p${i}`,
      nombre: n[0], handle: `@${n[0].toLowerCase()}`, pais: n[1], bandera: n[2],
      juego: juegoId, rating, tier,
      victorias: 120 - i * 6 + (i % 3) * 4, derrotas: 18 + i * 3,
      torneosJugados: 40 - i,
      mejorPuesto: i === 0 ? '🥇 1º' : i === 1 ? '🥈 2º' : i < 4 ? 'Top 4' : 'Top 8',
      main: mains[i % (mains.length || 1)],
      tendencia: ((i * 7 + juegoId.length) % 5) - 2,
      online: i % 3 === 0,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// Bracket (generado a partir de un torneo)
// ─────────────────────────────────────────────────────────────────────────────
export type MatchSample = {
  id: string
  a: string
  b: string
  scoreA: number | null
  scoreB: number | null
  estado: 'pendiente' | 'en-juego' | 'jugado'
  ganador?: 'a' | 'b'
  setup?: string
}
export type RondaSample = { nombre: string; matches: MatchSample[] }

const BRACKET_NOMBRES = ['Kaze', 'Sora', 'Volt', 'Zen', 'Drako', 'Lux', 'Vega', 'Kira', 'Nyx', 'Rei', 'Mist', 'Faze', 'Riven', 'Aqua', 'Pyra', 'Onyx']

export function bracketDe(_torneoId: string): RondaSample[] {
  const N = BRACKET_NOMBRES
  return [
    {
      nombre: 'Cuartos',
      matches: [
        { id: 'q1', a: N[0], b: N[7], scoreA: 2, scoreB: 0, estado: 'jugado', ganador: 'a', setup: 'Setup 1' },
        { id: 'q2', a: N[3], b: N[4], scoreA: 1, scoreB: 2, estado: 'jugado', ganador: 'b', setup: 'Setup 2' },
        { id: 'q3', a: N[1], b: N[6], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Setup 3' },
        { id: 'q4', a: N[2], b: N[5], scoreA: 1, scoreB: 1, estado: 'en-juego', setup: 'Stream' },
      ],
    },
    {
      nombre: 'Semifinales',
      matches: [
        { id: 's1', a: N[0], b: N[4], scoreA: null, scoreB: null, estado: 'pendiente' },
        { id: 's2', a: N[1], b: '—', scoreA: null, scoreB: null, estado: 'pendiente' },
      ],
    },
    {
      nombre: 'Final',
      matches: [
        { id: 'f1', a: '—', b: '—', scoreA: null, scoreB: null, estado: 'pendiente' },
      ],
    },
  ]
}

// Bracket de doble eliminación (winners + losers + gran final)
export type BracketDoble = { winners: RondaSample[]; losers: RondaSample[]; granFinal: RondaSample }

export function bracketDobleDe(_torneoId: string): BracketDoble {
  const N = BRACKET_NOMBRES
  return {
    winners: [
      {
        nombre: 'WB Cuartos',
        matches: [
          { id: 'wq1', a: N[0], b: N[7], scoreA: 2, scoreB: 0, estado: 'jugado', ganador: 'a', setup: 'Setup 1' },
          { id: 'wq2', a: N[3], b: N[4], scoreA: 1, scoreB: 2, estado: 'jugado', ganador: 'b', setup: 'Setup 2' },
          { id: 'wq3', a: N[1], b: N[6], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Setup 3' },
          { id: 'wq4', a: N[2], b: N[5], scoreA: 1, scoreB: 1, estado: 'en-juego', setup: 'Stream' },
        ],
      },
      {
        nombre: 'WB Semis',
        matches: [
          { id: 'ws1', a: N[0], b: N[4], scoreA: null, scoreB: null, estado: 'pendiente' },
          { id: 'ws2', a: N[1], b: '—', scoreA: null, scoreB: null, estado: 'pendiente' },
        ],
      },
      {
        nombre: 'WB Final',
        matches: [{ id: 'wf1', a: '—', b: '—', scoreA: null, scoreB: null, estado: 'pendiente' }],
      },
    ],
    losers: [
      {
        nombre: 'LB Ronda 1',
        matches: [
          { id: 'lr1', a: N[7], b: N[3], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Setup 4' },
          { id: 'lr2', a: N[6], b: N[5], scoreA: null, scoreB: null, estado: 'pendiente' },
        ],
      },
      {
        nombre: 'LB Ronda 2',
        matches: [
          { id: 'lr3', a: N[7], b: '—', scoreA: null, scoreB: null, estado: 'pendiente' },
        ],
      },
      {
        nombre: 'LB Final',
        matches: [{ id: 'lf1', a: '—', b: '—', scoreA: null, scoreB: null, estado: 'pendiente' }],
      },
    ],
    granFinal: {
      nombre: 'Gran Final',
      matches: [{ id: 'gf1', a: '—', b: '—', scoreA: null, scoreB: null, estado: 'pendiente' }],
    },
  }
}

// Clasificación final de muestra
export const STANDINGS_SAMPLE = ['Kaze', 'Sora', 'Volt', 'Zen', 'Drako', 'Lux', 'Vega', 'Kira']
