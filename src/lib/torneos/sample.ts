// Datos de muestra para el MVP visual de TODH mientras no existe la tabla real de
// torneos. Cuando se construya el modelo (juegos, torneos, inscripciones) esto se
// sustituye por la query a Supabase. NO usar en producción con datos reales.

export type Juego = { id: string; nombre: string; corto: string; color: string }

export const JUEGOS: Record<string, Juego> = {
  smash:   { id: 'smash',   nombre: 'Super Smash Bros. Ultimate', corto: 'Smash', color: '#E63E54' },
  magic:   { id: 'magic',   nombre: 'Magic: The Gathering',       corto: 'Magic', color: '#F4912B' },
  pokemon: { id: 'pokemon', nombre: 'Pokémon TCG',                corto: 'Pokémon', color: '#FFC83D' },
  tft:     { id: 'tft',     nombre: 'Teamfight Tactics',          corto: 'TFT', color: '#4F8EF7' },
  tekken:  { id: 'tekken',  nombre: 'Tekken 8',                   corto: 'Tekken', color: '#9B5DE5' },
  sf6:     { id: 'sf6',     nombre: 'Street Fighter 6',           corto: 'SF6', color: '#2EC4B6' },
}

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
  local: string
  ciudad: string
  distanciaKm: number
  inscritos: number
  plazas: number
  precio: number           // 0 = gratis
  bote?: number            // € en juego (opcional)
  enDirecto?: boolean
  vip?: Tier | null
  popularidad: number      // para ordenar
}

export const TORNEOS_SAMPLE: TorneoSample[] = [
  {
    id: 't1', nombre: 'Lima Smash Weekly #42', juego: 'smash', formato: 'Doble eliminación',
    fechaLabel: 'Hoy · 18:00', esHoy: true, local: 'Gamba Esports', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 58, plazas: 64, precio: 8, bote: 320, enDirecto: true,
    vip: null, popularidad: 98,
  },
  {
    id: 't2', nombre: 'Liga Magic Standard — Jornada 5', juego: 'magic', formato: 'Suizo',
    fechaLabel: 'Hoy · 19:30', esHoy: true, local: 'La Tienda del Dragón', ciudad: 'Madrid',
    distanciaKm: 2.6, inscritos: 24, plazas: 32, precio: 12, bote: 0, enDirecto: true,
    vip: null, popularidad: 86,
  },
  {
    id: 't3', nombre: 'Pokémon TCG City League', juego: 'pokemon', formato: 'Suizo',
    fechaLabel: 'Mañana · 11:00', local: 'Card Kingdom', ciudad: 'Madrid',
    distanciaKm: 3.1, inscritos: 41, plazas: 48, precio: 10, bote: 0, enDirecto: false,
    vip: null, popularidad: 81,
  },
  {
    id: 't4', nombre: 'TFT Iberian Cup — Clasificatorio', juego: 'tft', formato: 'Pools → Top cut',
    fechaLabel: 'Sáb 28 jun · 17:00', local: 'Online + Gamba', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 96, plazas: 128, precio: 5, bote: 500, enDirecto: true,
    vip: null, popularidad: 90,
  },
  {
    id: 't5', nombre: 'Tekken 8 Arena Night', juego: 'tekken', formato: 'Doble eliminación',
    fechaLabel: 'Vie 27 jun · 20:00', local: 'Arcade Planet', ciudad: 'Madrid',
    distanciaKm: 4.8, inscritos: 31, plazas: 32, precio: 6, bote: 180, enDirecto: false,
    vip: null, popularidad: 74,
  },
  {
    id: 't6', nombre: 'SF6 Invitational — Platino', juego: 'sf6', formato: 'Doble eliminación',
    fechaLabel: 'Dom 29 jun · 16:00', local: 'Gamba Esports', ciudad: 'Madrid',
    distanciaKm: 1.2, inscritos: 14, plazas: 16, precio: 0, bote: 1000, enDirecto: false,
    vip: 'Platino', popularidad: 95,
  },
  {
    id: 't7', nombre: 'Smash Singles — Casual Bracket', juego: 'smash', formato: 'Eliminación simple',
    fechaLabel: 'Mañana · 18:30', local: 'Respawn Bar', ciudad: 'Madrid',
    distanciaKm: 5.4, inscritos: 12, plazas: 32, precio: 0, bote: 0, enDirecto: false,
    vip: null, popularidad: 62,
  },
  {
    id: 't8', nombre: 'Magic Commander League', juego: 'magic', formato: 'Round robin',
    fechaLabel: 'Mié 25 jun · 18:00', local: 'La Tienda del Dragón', ciudad: 'Madrid',
    distanciaKm: 2.6, inscritos: 16, plazas: 16, precio: 7, bote: 0, enDirecto: false,
    vip: 'Oro', popularidad: 70,
  },
  {
    id: 't9', nombre: 'Pokémon Junior Cup', juego: 'pokemon', formato: 'Suizo',
    fechaLabel: 'Sáb 28 jun · 10:00', local: 'Card Kingdom', ciudad: 'Madrid',
    distanciaKm: 3.1, inscritos: 28, plazas: 64, precio: 5, bote: 0, enDirecto: false,
    vip: null, popularidad: 66,
  },
  {
    id: 't10', nombre: 'TFT Friday Showdown', juego: 'tft', formato: 'Pools → Top cut',
    fechaLabel: 'Hoy · 21:00', esHoy: true, local: 'Online', ciudad: 'Online',
    distanciaKm: 0, inscritos: 64, plazas: 64, precio: 3, bote: 150, enDirecto: false,
    vip: null, popularidad: 79,
  },
]
