'use client'
import { useDemoStore } from '@/lib/stores/useDemoStore'

// i18n ligero de Tourneum (fase 1): diccionario plano ES/EN + hook.
// Migración incremental: lo no traducido aún se muestra en español (fallback).
// Cuando llegue el backend se puede promover a next-intl sin cambiar las claves.

export type Idioma = 'es' | 'en'

const D = {
  // Navegación
  'nav.explorar': ['Explorar', 'Explore'],
  'nav.mapa': ['Mapa', 'Map'],
  'nav.ranking': ['Ranking', 'Rankings'],
  'nav.entradas': ['Entradas', 'Tickets'],
  'nav.perfil': ['Perfil', 'Profile'],
  'nav.buscar': ['Buscar', 'Search'],
  'nav.notificaciones': ['Notificaciones', 'Notifications'],
  'nav.organizas': ['¿Organizas torneos?', 'Running tournaments?'],
  'nav.abreConsola': ['Abre tu consola de TO', 'Open your TO console'],
  'nav.claim': ['Tu circuito de torneos', 'Your tournament circuit'],

  // Explorar
  'explorar.eyebrow': ['Próximos torneos', 'Upcoming tournaments'],
  'explorar.titulo': ['Explorar', 'Explore'],
  'explorar.cerca': ['torneos cerca de ti', 'tournaments near you'],
  'explorar.endirecto': ['En directo ahora', 'Live now'],
  'explorar.buscar': ['Buscar torneo o juego…', 'Search tournament or game…'],
  'explorar.hoy': ['Hoy', 'Today'],
  'explorar.gratis': ['Gratis', 'Free'],
  'explorar.organizas': ['¿Organizas torneos?', 'Running tournaments?'],
  'explorar.abreConsola': ['Abre tu consola de TO y publícalo en un minuto', 'Open your TO console and publish in a minute'],
  'explorar.secSeguidos': ['De tus organizadores', 'From TOs you follow'],
  'explorar.secSeguidosSub': ['TOs a los que sigues', 'Organizers you follow'],
  'explorar.secTusJuegos': ['Tus juegos', 'Your games'],
  'explorar.secTusJuegosSub': ['Lo que elegiste al entrar', 'What you picked at signup'],
  'explorar.secHoy': ['Empieza hoy', 'Starting today'],
  'explorar.secHoySub': ['No te lo pierdas', "Don't miss out"],
  'explorar.secCerca': ['Cerca de ti', 'Near you'],
  'explorar.secCercaSub': ['A menos de 3 km', 'Less than 3 km away'],
  'explorar.secMas': ['Más torneos', 'More tournaments'],
  'explorar.secMasSub': ['Esta semana y siguientes', 'This week and beyond'],

  // Ranking
  'ranking.eyebrow': ['Clasificación', 'Leaderboard'],
  'ranking.titulo': ['Ranking', 'Rankings'],
  'ranking.presencial': ['Presencial', 'In-person'],
  'ranking.online': ['Online', 'Online'],
  'ranking.espana': ['España', 'Spain'],
  'ranking.mundial': ['Mundial', 'Global'],
  'ranking.tuPosicion': ['· tu posición', '· your rank'],

  // Perfil
  'perfil.eyebrow': ['Tu cuenta', 'Your account'],
  'perfil.titulo': ['Perfil', 'Profile'],
  'perfil.logros': ['Logros', 'Achievements'],
  'perfil.historial': ['Historial reciente', 'Recent history'],
  'perfil.amigos': ['Amigos y grupos', 'Friends & groups'],
  'perfil.notis': ['Notificaciones', 'Notifications'],
  'perfil.privacidad': ['Privacidad y datos', 'Privacy & data'],
  'perfil.idioma': ['Idioma', 'Language'],
  'perfil.cerrarSesion': ['Cerrar sesión', 'Sign out'],
  'perfil.iniciarSesion': ['Iniciar sesión', 'Sign in'],

  // Ficha de torneo
  'torneo.cuando': ['Cuándo', 'When'],
  'torneo.donde': ['Dónde', 'Where'],
  'torneo.formato': ['Formato', 'Format'],
  'torneo.bote': ['Bote en juego', 'Prize pool'],
  'torneo.inscripcion': ['Inscripción', 'Entry'],
  'torneo.inscritos': ['inscritos', 'entrants'],
  'torneo.inscribirme': ['Inscribirme', 'Register'],
  'torneo.gratis': ['Gratis', 'Free'],
  'torneo.completo': ['Completo', 'Full'],
  'torneo.reglas': ['Reglas', 'Rules'],
  'torneo.sede': ['Sede', 'Venue'],
  'torneo.participantes': ['Participantes destacados', 'Featured entrants'],
  'torneo.verTodos': ['Ver todos ›', 'See all ›'],
  'torneo.compartir': ['Compartir', 'Share'],
  'torneo.verBracket': ['Ver bracket en vivo', 'View live bracket'],
  'torneo.verClasificacion': ['Ver clasificación en vivo', 'View live standings'],
  'torneo.delOrganizador': ['Del organizador', 'From the organizer'],
  'torneo.repartoBote': ['Reparto del bote', 'Prize split'],
  'torneo.emisionDirecto': ['Emisión en directo', 'Live broadcast'],
  'torneo.videoTorneo': ['Vídeo del torneo', 'Tournament video'],

  // Inicio (landing)
  'inicio.h1a': ['Tu circuito de torneos,', 'Your tournament circuit,'],
  'inicio.h1b': ['en una sola app', 'all in one app'],
  'inicio.sub': ['Descubre, inscríbete y compite en torneos presenciales de Smash, Magic, Pokémon y más. Bracket en vivo, ranking y comunidad.', 'Discover, register and compete in in-person Smash, Magic, Pokémon tournaments and more. Live brackets, rankings and community.'],
  'inicio.explorar': ['Explorar torneos', 'Explore tournaments'],
  'inicio.soyTO': ['Soy organizador', "I'm an organizer"],
  'inicio.tienesLocal': ['¿Tienes un local?', 'Own a venue?'],
  'inicio.abrePanelSede': ['Abre el panel de tu sede →', 'Open your venue panel →'],
  'inicio.juegos': ['Juegos en Tourneum', 'Games on Tourneum'],
  'inicio.comoFunciona': ['Cómo funciona', 'How it works'],
  'inicio.endirecto': ['en directo ahora', 'live now'],
} as const

export type ClaveI18n = keyof typeof D

export function useT() {
  const idioma = useDemoStore(s => s.idioma)
  const t = (k: ClaveI18n): string => D[k]?.[idioma === 'en' ? 1 : 0] ?? D[k]?.[0] ?? k
  return { t, idioma }
}
