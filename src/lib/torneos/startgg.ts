// Utilidades del espejo start.gg (cliente y servidor).
// La API pública de start.gg es GraphQL de SOLO LECTURA para torneos: se puede
// leer un torneo (inscritos, standings, estado) pero NO crearlos desde fuera.
// Por eso el flujo es: el TO vincula su torneo de start.gg y Tourneum lo lee.

export type StartggEvento = {
  nombre: string
  entrants: number
  estado: 'inscripciones' | 'en-juego' | 'finalizado'
}

export type StartggDatos = {
  demo?: boolean
  nombre: string
  slug: string
  url: string
  asistentes: number
  inicio: number | null            // epoch ms
  evento: StartggEvento | null
  top8: { puesto: number; nombre: string }[]
}

// Juegos del catálogo con presencia real en start.gg (id de videogame allí).
// smash/sf6/tekken tienen escena en España; tft/pokemon/valorant/lol solo
// global (el ranking cae a Global si España no da para una tabla). Magic y
// CoD no viven en start.gg → se quedan con la muestra de la demo.
export const STARTGG_VIDEOGAMES: Record<string, number> = {
  smash: 1386, sf6: 43868, tekken: 49783,
  tft: 33594, pokemon: 49385, valorant: 34223, lol: 10,
}
export const JUEGOS_CON_STARTGG = new Set(Object.keys(STARTGG_VIDEOGAMES))

// Acepta la URL completa (con o sin /event/...), "tournament/<slug>" o el slug pelado.
export function parseStartggSlug(input: string): { torneo: string; evento?: string } | null {
  const s = input.trim()
  if (!s) return null
  const m = s.match(/tournament\/([a-zA-Z0-9_-]+)(?:\/event\/([a-zA-Z0-9_-]+))?/)
  if (m) return { torneo: m[1], evento: m[2] }
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return { torneo: s }
  return null
}
