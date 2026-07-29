// Datos de muestra para el MVP visual de Tourneum mientras no existe la tabla real de
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
  valorant:{ id: 'valorant',nombre: 'VALORANT',                   corto: 'Valorant',color: '#FF4655', emoji: '🎯' },
  lol:     { id: 'lol',     nombre: 'League of Legends',          corto: 'LoL',     color: '#0AC8B9', emoji: '🛡️' },
  cod:     { id: 'cod',     nombre: 'Call of Duty',               corto: 'CoD',     color: '#E8913A', emoji: '💥' },
}

export const JUEGOS_LIST = Object.values(JUEGOS)

// El formato es texto libre del TO (no se comparte entre juegos: Smash ≠ TFT ≠ Magic).
// Estos son solo atajos sugeridos en los formularios.
export type FormatoTorneo = string
export const FORMATOS_SUGERIDOS = ['Doble eliminación', 'Eliminación simple', 'Suizo', 'Pools → Top cut', 'Round robin']

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
  banner?: string          // URL del banner del torneo; si falta, se usa el keyart del juego
  comentarios?: string     // otros comentarios del TO (reglas extra, premios en producto…)
  premiosImgs?: string[]   // fotos de premios en producto
  videoUrl?: string            // vídeo o directo del torneo (YouTube/Twitch) que pega el TO
  coOrganizadores?: string[]   // colaboración entre TOs (reunión 5-jul)
  enEspera?: number            // personas en lista de espera (solo torneos llenos)
  startgg?: string             // slug del torneo en start.gg (espejo de datos en vivo)
}

export const TORNEOS_SAMPLE: TorneoSample[] = [
  {
    id: 't1', nombre: 'Lima Smash Weekly #42', juego: 'smash', formato: 'Doble eliminación',
    fechaLabel: 'Hoy · 18:00', esHoy: true, local: 'Gamba Esports', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 58, plazas: 64, precio: 8, bote: 320, enDirecto: true, viendo: 137,
    vip: null, organizadorId: 'lima', popularidad: 98, bestOf: 'Bo3 · Bo5 en top 8', checkInAbierto: true,
    descripcion: 'El semanal de Smash más veterano de Madrid. Bracket de doble eliminación, premios al top 3 y ambientazo asegurado.',
    banner: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80',
    videoUrl: 'https://www.youtube.com/watch?v=JzS96auqau0',
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
    banner: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
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
    distanciaKm: 2.6, inscritos: 16, plazas: 16, precio: 7, bote: 0, enDirecto: false, enEspera: 5,
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
    distanciaKm: 0, inscritos: 64, plazas: 64, precio: 3, bote: 150, enDirecto: false, enEspera: 7,
    vip: null, organizadorId: 'lima', popularidad: 79, bestOf: 'Lobbies de 8',
    descripcion: 'Showdown online de los viernes. Código de sala por el chat del combate.',
  },
  {
    id: 't11', nombre: 'Smash Arena Madrid — Major', juego: 'smash', formato: 'Pools → Top cut',
    fechaLabel: 'Sáb 5 jul · 10:00', local: 'Gamba Esports', localId: 'gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 176, plazas: 256, precio: 15, bote: 2500, enDirecto: false,
    vip: null, organizadorId: 'lima', popularidad: 99, bestOf: 'Bo3 · Bo5 en top 8',
    descripcion: 'El major del verano. 256 plazas, pools por la mañana y top 24 retransmitido por la tarde.',
    banner: 'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&q=80',
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

// Cola de la lista de espera (nombres deterministas, distintos de los inscritos).
// Orden FIFO: el primero de la lista es el primero en entrar si se libera plaza.
const ESPERA_POOL = ['Ghost', 'Nova', 'Blitz', 'Echo', 'Yuki', 'Prisma', 'Turbo', 'Salt', 'Wasp', 'Momo']
export function esperaDe(t: Pick<TorneoSample, 'juego' | 'enEspera'>): string[] {
  const n = Math.min(t.enEspera ?? 0, ESPERA_POOL.length)
  if (n <= 0) return []
  const off = t.juego.charCodeAt(0) % 3
  return Array.from({ length: n }, (_, i) => ESPERA_POOL[(i + off) % ESPERA_POOL.length])
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
  fundador?: boolean  // TO Fundador (programa de lanzamiento)
}

export const ORGANIZADORES: Record<string, Organizador> = {
  lima: {
    fundador: true,
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
// Mesa/estación física dentro del local. El LOCAL define su plano: dónde está cada
// mesa, su forma, cuánta gente cabe y si tiene equipo (consola/PC/stream) o es mesa
// de cartas. Posición en cuadrícula de 8×5 (x:0-7, y:0-4).
export type MesaForma = 'cuadrada' | 'redonda' | 'alargada'
export type MesaTipo = 'consola' | 'pc' | 'mesa' | 'arcade' | 'stream'
export type Mesa = {
  n: number
  x: number
  y: number
  forma: MesaForma
  plazas: number
  tipo: MesaTipo
}

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
  m2: number               // espacio del venue
  aforo: number
  precioNoche: number      // tarifa orientativa para TOs (€/noche)
  mesas: Mesa[]            // plano de mesas definido por el local
  fundador?: boolean  // Sede Fundadora (programa de lanzamiento)
}

const M = (n: number, x: number, y: number, forma: MesaForma, plazas: number, tipo: MesaTipo): Mesa =>
  ({ n, x, y, forma, plazas, tipo })

export const LOCALES: Record<string, Local> = {
  gamba: {
    fundador: true,
    id: 'gamba', nombre: 'Gamba Esports', ciudad: 'Madrid', zona: 'Malasaña', setups: 24, tiposSetup: ['Consola', 'PC', 'Setup stream'], rating: 4.9, valoraciones: 210, color: '#E63E54', lat: 40.4262, lng: -3.7038,
    m2: 340, aforo: 120, precioNoche: 60,
    // Las mesas 1-6 son los setups que ve el TO en modo directo.
    mesas: [
      M(1, 0, 0, 'cuadrada', 2, 'consola'), M(2, 2, 0, 'cuadrada', 2, 'consola'),
      M(3, 5, 0, 'alargada', 4, 'stream'), M(4, 0, 2, 'cuadrada', 2, 'consola'),
      M(5, 2, 2, 'cuadrada', 2, 'pc'), M(6, 4, 2, 'cuadrada', 2, 'pc'),
      M(7, 6, 2, 'redonda', 4, 'mesa'), M(8, 1, 4, 'alargada', 6, 'mesa'),
    ],
  },
  dragon: {
    id: 'dragon', nombre: 'La Tienda del Dragón', ciudad: 'Madrid', zona: 'Chamberí', setups: 12, tiposSetup: ['Mesa'], rating: 4.7, valoraciones: 132, color: '#F4912B', lat: 40.4357, lng: -3.7045,
    m2: 180, aforo: 60, precioNoche: 40,
    mesas: [
      M(1, 0, 0, 'alargada', 4, 'mesa'), M(2, 3, 0, 'alargada', 4, 'mesa'), M(3, 6, 0, 'cuadrada', 2, 'mesa'),
      M(4, 0, 2, 'alargada', 4, 'mesa'), M(5, 3, 2, 'alargada', 4, 'mesa'), M(6, 6, 2, 'cuadrada', 2, 'mesa'),
      M(7, 1, 4, 'redonda', 4, 'mesa'), M(8, 4, 4, 'redonda', 4, 'mesa'),
    ],
  },
  cardkingdom: {
    id: 'cardkingdom', nombre: 'Card Kingdom', ciudad: 'Madrid', zona: 'Salamanca', setups: 16, tiposSetup: ['Mesa'], rating: 4.8, valoraciones: 88, color: '#FFC83D', lat: 40.4280, lng: -3.6790,
    m2: 220, aforo: 80, precioNoche: 45,
    mesas: [
      M(1, 0, 0, 'alargada', 6, 'mesa'), M(2, 4, 0, 'alargada', 6, 'mesa'),
      M(3, 0, 2, 'alargada', 6, 'mesa'), M(4, 4, 2, 'alargada', 6, 'mesa'),
      M(5, 1, 4, 'redonda', 4, 'mesa'), M(6, 4, 4, 'redonda', 4, 'mesa'),
    ],
  },
  arcade: {
    id: 'arcade', nombre: 'Arcade Planet', ciudad: 'Madrid', zona: 'Tetuán', setups: 20, tiposSetup: ['Arcade', 'Consola', 'Setup stream'], rating: 4.5, valoraciones: 70, color: '#9B5DE5', lat: 40.4610, lng: -3.6990,
    m2: 420, aforo: 150, precioNoche: 80,
    mesas: [
      M(1, 0, 0, 'cuadrada', 2, 'arcade'), M(2, 1, 0, 'cuadrada', 2, 'arcade'), M(3, 2, 0, 'cuadrada', 2, 'arcade'), M(4, 3, 0, 'cuadrada', 2, 'arcade'),
      M(5, 5, 0, 'alargada', 4, 'stream'), M(6, 0, 2, 'cuadrada', 2, 'consola'), M(7, 2, 2, 'cuadrada', 2, 'consola'),
      M(8, 4, 2, 'cuadrada', 2, 'consola'), M(9, 6, 2, 'cuadrada', 2, 'consola'), M(10, 2, 4, 'alargada', 6, 'mesa'),
    ],
  },
  respawn: {
    id: 'respawn', nombre: 'Respawn Bar', ciudad: 'Madrid', zona: 'Lavapiés', setups: 8, tiposSetup: ['Consola'], rating: 4.6, valoraciones: 51, color: '#2EC4B6', lat: 40.4090, lng: -3.7010,
    m2: 150, aforo: 50, precioNoche: 35,
    mesas: [
      M(1, 0, 0, 'cuadrada', 2, 'consola'), M(2, 2, 0, 'cuadrada', 2, 'consola'), M(3, 4, 0, 'cuadrada', 2, 'consola'),
      M(4, 0, 2, 'cuadrada', 2, 'consola'), M(5, 2, 2, 'cuadrada', 2, 'consola'),
      M(6, 5, 3, 'redonda', 6, 'mesa'),
    ],
  },
  // ── Locales dados de alta SIN torneos publicados aún: solo los ven los TOs en
  // su mapa de sedes (el mapa del jugador únicamente enseña locales con torneos).
  meltdown: {
    id: 'meltdown', nombre: 'Meltdown Bar', ciudad: 'Madrid', zona: 'Chueca', setups: 10, tiposSetup: ['Consola', 'PC'], rating: 4.4, valoraciones: 23, color: '#FF7A5C', lat: 40.4230, lng: -3.6975,
    m2: 190, aforo: 70, precioNoche: 45,
    mesas: [
      M(1, 0, 0, 'cuadrada', 2, 'consola'), M(2, 2, 0, 'cuadrada', 2, 'consola'), M(3, 4, 0, 'cuadrada', 2, 'pc'),
      M(4, 6, 0, 'cuadrada', 2, 'pc'), M(5, 1, 2, 'alargada', 4, 'mesa'), M(6, 4, 3, 'redonda', 6, 'mesa'),
    ],
  },
  nexus: {
    id: 'nexus', nombre: 'Nexus Gaming Café', ciudad: 'Madrid', zona: 'Argüelles', setups: 14, tiposSetup: ['PC', 'Setup stream'], rating: 4.7, valoraciones: 12, color: '#5CC8FF', lat: 40.4302, lng: -3.7158,
    m2: 260, aforo: 90, precioNoche: 55,
    mesas: [
      M(1, 0, 0, 'cuadrada', 2, 'pc'), M(2, 1, 0, 'cuadrada', 2, 'pc'), M(3, 2, 0, 'cuadrada', 2, 'pc'), M(4, 3, 0, 'cuadrada', 2, 'pc'),
      M(5, 5, 0, 'alargada', 4, 'stream'), M(6, 0, 2, 'cuadrada', 2, 'pc'), M(7, 2, 2, 'cuadrada', 2, 'pc'), M(8, 4, 3, 'alargada', 6, 'mesa'),
    ],
  },
  comarca: {
    id: 'comarca', nombre: 'La Comarca Juegos', ciudad: 'Madrid', zona: 'Carabanchel', setups: 12, tiposSetup: ['Mesa'], rating: 4.8, valoraciones: 31, color: '#3FA65C', lat: 40.3902, lng: -3.7282,
    m2: 170, aforo: 60, precioNoche: 30,
    mesas: [
      M(1, 0, 0, 'alargada', 4, 'mesa'), M(2, 3, 0, 'alargada', 4, 'mesa'), M(3, 6, 0, 'cuadrada', 2, 'mesa'),
      M(4, 0, 2, 'alargada', 4, 'mesa'), M(5, 3, 2, 'alargada', 4, 'mesa'), M(6, 1, 4, 'redonda', 4, 'mesa'), M(7, 4, 4, 'redonda', 4, 'mesa'),
    ],
  },
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
  valorant: ['Jett', 'Reyna', 'Omen', 'Sage', 'Raze', 'Killjoy'],
  lol: ['Ahri', 'Yasuo', 'Lee Sin', 'Lux', 'Thresh', 'Jinx'],
  cod: ['Asalto', 'SMG', 'Francotirador', 'Escopeta', 'Apoyo'],
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
// Identidad competitiva del USUARIO de la demo (por juego). FUENTE ÚNICA: la
// leen el perfil (CompetitiveCard) y el ranking (fila «Tú»). El puesto NO se
// escribe a mano: se calcula contra rankingPorJuego para que nunca contradiga
// la tabla (antes el perfil decía #5·2210 y el ranking #9·2003 clonando a otro).
// ─────────────────────────────────────────────────────────────────────────────
export type StatUsuario = { rating: number; v: number; d: number; mejor: string; mains: string[]; racha: string[] }
export const USUARIO_STATS: Record<string, StatUsuario> = {
  smash:   { rating: 2210, v: 94,  d: 55, mejor: 'Top 4',  mains: ['Pikachu', 'Fox'], racha: ['V', 'V', 'D', 'V', 'V'] },
  magic:   { rating: 1980, v: 41,  d: 33, mejor: 'Top 8',  mains: ['Aggro'],          racha: ['D', 'V', 'V', 'D', 'V'] },
  pokemon: { rating: 2050, v: 58,  d: 30, mejor: 'Top 8',  mains: ['Charizard ex'],   racha: ['V', 'V', 'V', 'D', 'V'] },
  tft:     { rating: 2340, v: 120, d: 60, mejor: '1º',     mains: ['Reroll'],         racha: ['V', 'V', 'V', 'V', 'D'] },
  tekken:  { rating: 1890, v: 33,  d: 29, mejor: 'Top 16', mains: ['King'],           racha: ['D', 'V', 'D', 'V', 'V'] },
  sf6:     { rating: 2120, v: 70,  d: 41, mejor: 'Top 8',  mains: ['Cammy', 'Juri'],  racha: ['V', 'D', 'V', 'V', 'V'] },
}
export function usuarioStatDe(juegoId: string): StatUsuario {
  return USUARIO_STATS[juegoId] ?? { rating: 1500, v: 0, d: 0, mejor: '—', mains: [], racha: [] }
}
export function puestoUsuario(juegoId: string): number {
  return rankingPorJuego(juegoId).filter(p => p.rating > usuarioStatDe(juegoId).rating).length + 1
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
        { id: 'q1', a: N[0], b: N[7], scoreA: 2, scoreB: 0, estado: 'jugado', ganador: 'a', setup: 'Mesa 1' },
        { id: 'q2', a: N[3], b: N[4], scoreA: 1, scoreB: 2, estado: 'jugado', ganador: 'b', setup: 'Mesa 2' },
        { id: 'q3', a: N[1], b: N[6], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Mesa 3' },
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
          { id: 'wq1', a: N[0], b: N[7], scoreA: 2, scoreB: 0, estado: 'jugado', ganador: 'a', setup: 'Mesa 1' },
          { id: 'wq2', a: N[3], b: N[4], scoreA: 1, scoreB: 2, estado: 'jugado', ganador: 'b', setup: 'Mesa 2' },
          { id: 'wq3', a: N[1], b: N[6], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Mesa 3' },
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
          { id: 'lr1', a: N[7], b: N[3], scoreA: 2, scoreB: 1, estado: 'jugado', ganador: 'a', setup: 'Mesa 4' },
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

// Clasificación de Suizo / Round robin (no hay cuadro de eliminación: hay rondas + tabla)
export type FilaSuizo = { nombre: string; bandera: string; v: number; d: number; e?: number; puntos: number; omw: number }
export function standingsSuizoDe(juegoId: string, rondasJugadas = 4): { rondaActual: number; totalRondas: number; filas: FilaSuizo[] } {
  const base = rankingPorJuego(juegoId).slice(0, 12)
  const totalRondas = 6
  const filas: FilaSuizo[] = base.map((p, i) => {
    const v = Math.max(0, rondasJugadas - Math.floor(i / 2) - (i % 2))
    const d = rondasJugadas - v
    return { nombre: p.nombre, bandera: p.bandera, v, d, puntos: v * 3 + 0, omw: +(66 - i * 1.7).toFixed(1) }
  }).sort((a, b) => b.puntos - a.puntos || b.omw - a.omw)
  return { rondaActual: rondasJugadas, totalRondas, filas }
}

// Clasificación final de muestra
export const STANDINGS_SAMPLE = ['Kaze', 'Sora', 'Volt', 'Zen', 'Drako', 'Lux', 'Vega', 'Kira']


// Entrada de espectador (plan de lanzamiento): solo torneos presenciales.
// Gratis si el torneo es gratis; si no, ~35% de la inscripción (mín. 2€), sin comisión.
export function precioEspectador(t: Pick<TorneoSample, 'online' | 'precio'>): number | null {
  if (t.online) return null
  if (t.precio === 0) return 0
  return Math.max(2, Math.round(t.precio * 0.35))
}
