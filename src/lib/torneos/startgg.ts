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

// Acepta la URL completa (con o sin /event/...), "tournament/<slug>" o el slug pelado.
export function parseStartggSlug(input: string): { torneo: string; evento?: string } | null {
  const s = input.trim()
  if (!s) return null
  const m = s.match(/tournament\/([a-zA-Z0-9_-]+)(?:\/event\/([a-zA-Z0-9_-]+))?/)
  if (m) return { torneo: m[1], evento: m[2] }
  if (/^[a-zA-Z0-9_-]+$/.test(s)) return { torneo: s }
  return null
}
