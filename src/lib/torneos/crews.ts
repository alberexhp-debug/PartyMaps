import { Crown } from '@/components/todh/iconosTorneum'
import { Flag, Medal, Gem } from 'lucide-react'
import { rankingPorJuego, usuarioStatDe } from '@/lib/torneos/sample'
import { nivelPorPuntuacion, UMBRALES_NIVEL_CREW, type NivelCrew } from '@/components/todh/CrewEmblema'
import type { ClaveI18n } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// CREWS (Fase 6, spec §7 + paquete Chat 30-08): equipos de jugadores. Una crew
// pertenece a UN juego, tiene un tag de EXACTAMENTE 4 LETRAS (#NOCT) que
// identifica a sus miembros SOLO en torneo y ranking, y su puntuación es la
// MEDIA de las puntuaciones de sus miembros en ese juego → de ahí sale su
// emblema (CrewEmblema, 5 niveles). Límite: un jugador puede estar como mucho
// en 2 crews del MISMO juego.
// Administración (30-08): cada crew tiene un CREADOR (admin permanente: nadie
// puede echarle, solo salirse él) y ADMINS que pueden editar nombre/descripcion/
// banner, meter/quitar miembros y CONCEDER el rol a otros; revocarlo solo puede
// el creador. La herencia al salir el creador vive en salirCrew (useDemoStore).
// El estado vivo (lista de crews, crear/salir, cupos de inscripción por
// equipos) vive en useDemoStore; aquí van el modelo y los helpers puros.
// ─────────────────────────────────────────────────────────────────────────────

export type Crew = {
  id: string
  nombre: string
  tag: string          // EXACTAMENTE 4 letras A-Z, en MAYÚSCULAS; se muestra siempre como #TAG; único entre crews
  juego: string        // clave de JUEGOS (cada crew pertenece a un solo juego)
  emoji?: string
  color?: string       // color del tag y acentos de la crew
  miembros: string[]   // nombres del pool + CREW_USUARIO para el jugador de la demo
  creadaPorMi?: boolean
  creador: string      // miembro fundador: admin permanente, solo puede salirse él mismo
  admins: string[]     // miembros con rol de administración (el creador siempre dentro)
  descripcion?: string // qué define a la crew (editable por admins)
  banner?: string      // fondo de la cabecera: valor CSS de background (preset/gradiente)
}

// Identificador del jugador de la demo dentro de una crew (mismo sentinel que
// la lista de espera: los demás miembros son nombres del pool de muestra).
export const CREW_USUARIO = '@usuario'

// Tag de crew = 4 LETRAS exactas, sin números (paquete Chat): el dígito
// inicial de los tags de USUARIO (#3KZTQ, tags.ts) los distingue a la vista.
export const TAG_RE = /^[A-Z]{4}$/
export const MAX_CREWS_POR_JUEGO = 2

// ¿Puede `quien` administrar la crew? El creador siempre; los demás si tienen
// el rol concedido. Tolerante con estado antiguo persistido sin admins.
export function esAdminCrew(c: Crew, quien: string): boolean {
  return c.creador === quien || (c.admins ?? []).includes(quien)
}

// Rating de un miembro en el juego de la crew: el usuario usa su identidad
// competitiva (USUARIO_STATS); los nombres del pool, su fila del ranking.
export function ratingEnJuego(nombre: string, juegoId: string): number {
  if (nombre === CREW_USUARIO) return usuarioStatDe(juegoId).rating
  return rankingPorJuego(juegoId).find(p => p.nombre === nombre)?.rating ?? 1500
}

// Puntuación de la crew = MEDIA de las puntuaciones de sus miembros en su juego.
export function puntuacionCrew(c: Crew): number {
  if (c.miembros.length === 0) return 0
  return Math.round(c.miembros.reduce((acc, m) => acc + ratingEnJuego(m, c.juego), 0) / c.miembros.length)
}

export function nivelCrew(c: Crew): NivelCrew {
  return nivelPorPuntuacion(puntuacionCrew(c))
}

// Distancia al siguiente emblema (null = ya en el nivel máximo).
export function siguienteNivelCrew(puntuacion: number): { nivel: NivelCrew; faltan: number } | null {
  const sig = UMBRALES_NIVEL_CREW.find(u => u.min > puntuacion)
  return sig ? { nivel: sig.nivel, faltan: sig.min - puntuacion } : null
}

// Crews de un jugador (todas, o las de un juego).
export function crewsDe(crews: Crew[], nombre: string, juego?: string): Crew[] {
  return crews.filter(c => c.miembros.includes(nombre) && (!juego || c.juego === juego))
}

// Crew que REPRESENTA al jugador en un juego (la de su tag en torneo/ranking):
// si está en 2 crews del mismo juego, manda la MÁS ANTIGUA — el array `crews`
// del store se mantiene en orden de creación (los seeds primero, crearCrew
// añade al final), así que es simplemente la primera coincidencia.
export function crewQueRepresenta(crews: Crew[], nombre: string, juego: string): Crew | undefined {
  return crews.find(c => c.juego === juego && c.miembros.includes(nombre))
}

export function tagDe(crews: Crew[], nombre: string, juego: string): string | undefined {
  return crewQueRepresenta(crews, nombre, juego)?.tag
}

// Nombre i18n de cada nivel de emblema (el emblema en sí no lleva texto).
export const CLAVE_NIVEL_CREW: Record<NivelCrew, ClaveI18n> = {
  1: 'crew.nivel1', 2: 'crew.nivel2', 3: 'crew.nivel3', 4: 'crew.nivel4', 5: 'crew.nivel5',
}

// ─────────────────────────────────────────────────────────────────────────────
// Logros de crew: mismos tiles que los logros del perfil (lucide + color).
// Los dos primeros vienen desbloqueados con la historia sembrada; los de
// emblema se desbloquean al ALCANZAR el nivel (la media de la crew sube con
// las puntuaciones de sus miembros) — los de nivel superior salen bloqueados.
// ─────────────────────────────────────────────────────────────────────────────
export type LogroCrew = {
  id: string
  icon: React.ElementType
  color: string
  titulo: ClaveI18n
  condicion: ClaveI18n
  nivelMin: NivelCrew   // nivel de emblema necesario para tenerlo desbloqueado
}

export const LOGROS_CREW: LogroCrew[] = [
  { id: 'primer-torneo', icon: Flag,  color: '#B6FF3A', titulo: 'crew.lgPrimer',   condicion: 'crew.lgPrimerC',   nivelMin: 1 },
  { id: 'top4-weekly',   icon: Medal, color: '#E0BE63', titulo: 'crew.lgTop4',     condicion: 'crew.lgTop4C',     nivelMin: 1 },
  { id: 'diamante',      icon: Gem,   color: '#7DD3FC', titulo: 'crew.lgDiamante', condicion: 'crew.lgDiamanteC', nivelMin: 4 },
  { id: 'elite',         icon: Crown, color: '#E63E54', titulo: 'crew.lgElite',    condicion: 'crew.lgEliteC',    nivelMin: 5 },
]

export function logrosDeCrew(c: Crew): { logro: LogroCrew; desbloqueado: boolean }[] {
  const nivel = nivelCrew(c)
  return LOGROS_CREW.map(logro => ({ logro, desbloqueado: nivel >= logro.nivelMin }))
}
