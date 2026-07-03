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
  // Tarjetas de torneo
  'card.abierta': ['Abierta', 'Open'],
  'card.listaEspera': ['Lista de espera', 'Waitlist'],
  'card.bote': ['Bote', 'Pot'],
  'card.entrada': ['Entrada', 'Entry'],
  'card.free': ['Free', 'Free'],

  // Entradas
  'entradas.eyebrow': ['Tu cartera', 'Your wallet'],
  'entradas.titulo': ['Mis torneos', 'My tournaments'],
  'entradas.proximos': ['Próximos', 'Upcoming'],
  'entradas.historial': ['Historial', 'History'],

  // Buscar
  'buscar.placeholder': ['Torneos, TOs, locales, jugadores…', 'Tournaments, TOs, venues, players…'],
  'buscar.sugeridas': ['Búsquedas sugeridas', 'Suggested searches'],
  'buscar.tendencia': ['En tendencia', 'Trending'],
  'buscar.tos': ['Organizadores destacados', 'Featured organizers'],

  // Notificaciones
  'notis.eyebrow': ['Bandeja', 'Inbox'],
  'notis.titulo': ['Notificaciones', 'Notifications'],
  'notis.hoy': ['Hoy', 'Today'],
  'notis.anteriores': ['Anteriores', 'Earlier'],
  'notis.leidas': ['Leídas', 'Read all'],
  // Bracket / resultados / directo
  'bracket.enVivo': ['Bracket en vivo', 'Live bracket'],
  'bracket.clasifVivo': ['Clasificación en vivo', 'Live standings'],
  'bracket.verFinal': ['Ver clasificación final y premios', 'View final standings & prizes'],
  'bracket.porJugar': ['Por jugar', 'Upcoming'],
  'bracket.enJuego': ['En juego', 'Playing'],
  'bracket.oficial': ['Bracket oficial del organizador · resultados por sets en vivo', 'Official bracket · live set scores'],
  'res.clasifFinal': ['Clasificación final', 'Final standings'],
  'res.campeon': ['Campeón', 'Champion'],
  'res.puesto': ['º puesto', 'nd place'],
  'res.clasifCompleta': ['Clasificación completa', 'Full standings'],
  'res.oficiales': ['Resultados oficiales del organizador', 'Official results from the organizer'],
  'directo.combate': ['Combate en el escenario', 'Match on stage'],
  'directo.chat': ['Chat del directo', 'Live chat'],
  'directo.verBracket': ['Ver bracket completo', 'View full bracket'],
  'directo.escribe': ['Escribe en el chat…', 'Type in the chat…'],
  'directo.viendo': ['viendo', 'watching'],

  // Vista de mesa (te toca)
  'mesa.teToca': ['¡Te toca! Ve a la', "You're up! Go to"],
  'mesa.mesa': ['mesa', 'table'],
  'mesa.vibrara': ['El móvil vibrará hasta que confirmes que vas de camino.', 'Your phone will vibrate until you confirm you are on your way.'],
  'mesa.confirmado': ['Confirmado, te esperan en la mesa', "Confirmed — they're waiting at table"],
  'mesa.toSabe': ['El organizador ya sabe que vas de camino.', 'The organizer knows you are on your way.'],
  'mesa.voy': ['Confirmo, voy de camino', "I'm on my way"],
  'mesa.abrirChat': ['Abrir chat del combate', 'Open match chat'],
  'mesa.plano': ['tu mesa parpadea en verde', 'your table blinks in green'],
  'mesa.planoDe': ['Plano de', 'Floor plan of'],
  'mesa.quienGana': ['¿Quién ha ganado?', 'Who won?'],
  'mesa.enviar': ['Enviar', 'Submit'],
  'mesa.esperandoRival': ['Esperando a tu rival…', 'Waiting for your opponent…'],
  'mesa.consenso': ['Resultado confirmado por consenso', 'Result confirmed by consensus'],
  'mesa.abrirDisputa': ['¿No estáis de acuerdo? Abrir disputa al organizador', "Don't agree? Open a dispute with the organizer"],
  'mesa.disputaAbierta': ['Disputa abierta', 'Dispute opened'],
  'mesa.verBracket': ['Ver el bracket', 'View bracket'],
  'mesa.sede': ['Sede', 'Venue'],

  // Mini-perfil / perfil de jugador
  'mp.rating': ['Rating', 'Rating'],
  'mp.record': ['Récord', 'Record'],
  'mp.winrate': ['Winrate', 'Win rate'],
  'mp.main': ['Main', 'Main'],
  'mp.mejorPuesto': ['Mejor puesto', 'Best finish'],
  'mp.torneosJugados': ['Torneos jugados', 'Events played'],
  'mp.verPerfil': ['Ver perfil completo', 'View full profile'],
  'mp.anadirAmigo': ['Añadir amigo', 'Add friend'],
  'mp.solicitudEnviada': ['Solicitud enviada', 'Request sent'],
  'mp.historial': ['Historial reciente', 'Recent history'],
  'mp.racha': ['Racha', 'Streak'],
  'mp.enLinea': ['En línea', 'Online'],

  // Amigos
  'amigos.titulo': ['Amigos', 'Friends'],
  'amigos.grupos': ['Grupos', 'Groups'],
  'amigos.invitar': ['Invitar', 'Invite'],
  'amigos.solicitudes': ['Solicitudes', 'Requests'],
  'amigos.tus': ['Tus amigos', 'Your friends'],
  // Panel del TO
  'to.consola': ['Consola TO', 'TO Console'],
  'to.resumen': ['Resumen', 'Overview'],
  'to.crearTorneo': ['Crear torneo', 'Create tournament'],
  'to.modoDirecto': ['Modo directo', 'Live mode'],
  'to.sedes': ['Sedes', 'Venues'],
  'to.miPagina': ['Mi página pública', 'My public page'],
  'to.volver': ['Volver a la app', 'Back to the app'],
  'to.panelDe': ['Panel del organizador', 'Organizer panel'],
  'to.agenda': ['Agenda', 'Schedule'],
  'to.acciones': ['Acciones', 'Actions'],
  'to.torneosActivos': ['Torneos activos', 'Active tournaments'],
  'to.inscritos': ['Inscritos', 'Entrants'],
  'to.ingresosMes': ['Ingresos del mes', 'Monthly revenue'],
  'to.nuevosSeguidores': ['Nuevos seguidores', 'New followers'],
  'to.proximoTorneo': ['Próximo torneo', 'Next tournament'],
  'to.comunidad': ['Comunidad', 'Community'],
  'to.abierto': ['Abierto', 'Open'],
  'to.sedeLista': ['Sede lista', 'Venue ready'],

  // Gestionar
  'ges.tabInscritos': ['Inscritos', 'Entrants'],
  'ges.tabBracket': ['Bracket', 'Bracket'],
  'ges.tabAjustes': ['Ajustes', 'Settings'],
  'ges.checkinMasivo': ['Check-in masivo', 'Bulk check-in'],
  'ges.generarBracket': ['Generar bracket', 'Generate bracket'],
  'ges.cerrarInscripcion': ['Cerrar inscripción', 'Close registration'],
  'ges.reabrir': ['Reabrir', 'Reopen'],
  'ges.fichaPublica': ['Ficha pública', 'Public page'],
  'ges.conCheckin': ['Con check-in', 'Checked in'],
  'ges.bote': ['Bote', 'Pot'],
  'ges.formato': ['Formato', 'Format'],
  'ges.setsPorRonda': ['Sets por ronda', 'Sets per round'],
  'ges.guardar': ['Guardar cambios', 'Save changes'],
  'ges.guardado': ['Guardado', 'Saved'],
  'ges.publicarResultados': ['Publicar resultados a los jugadores', 'Publish results to players'],
  'ges.campeon': ['Campeón', 'Champion'],

  // Modo directo
  'md.titulo': ['Modo directo', 'Live mode'],
  'md.directo': ['Directo', 'Live'],
  'md.proximo': ['Próximo', 'Upcoming'],
  'md.mesas': ['Mesas', 'Tables'],
  'md.cola': ['Cola de combates', 'Match queue'],
  'md.colaPrevista': ['Cola prevista (primera ronda)', 'Planned queue (first round)'],
  'md.listos': ['listos', 'ready'],
  'md.siguiente': ['Siguiente', 'Next'],
  'md.listo': ['Listo', 'Ready'],
  'md.enJuego': ['en juego', 'playing'],
  'md.libres': ['libres', 'free'],
  'md.asignar': ['Asignar siguiente →', 'Assign next →'],
  'md.liberar': ['Liberar', 'Free up'],
  'md.gana': ['Gana', 'Winner:'],
  'md.disputaEn': ['Disputa en Mesa', 'Dispute at Table'],

  // Crear torneo
  'ct.titulo': ['Crear torneo', 'Create tournament'],
  'ct.vistaPrevia': ['Vista previa en vivo', 'Live preview'],
  'ct.basico': ['Lo básico', 'The basics'],
  'ct.imagen': ['Imagen del torneo', 'Tournament image'],
  'ct.cuandoDonde': ['Cuándo y dónde', 'When & where'],
  'ct.plazasPrecio': ['Plazas y precio', 'Slots & price'],
  'ct.premios': ['Premios (bote por % de inscripciones)', 'Prizes (pot from entry %)'],
  'ct.videoDirecto': ['Vídeo o directo (opcional)', 'Video or stream (optional)'],
  'ct.comentarios': ['Otros comentarios', 'Other notes'],
  'ct.acceso': ['Acceso', 'Access'],
  'ct.publicar': ['Publicar torneo de', 'Publish'],
  'ct.elegirSede': ['Elegir sede de la app', 'Pick a venue from the app'],
  'ct.anadirJuego': ['Añadir juego', 'Add game'],

  // Sedes (mapa TO)
  'sd.titulo': ['Sedes · contacta y reserva', 'Venues · contact & book'],
  'sd.misSolicitudes': ['Mis solicitudes', 'My requests'],
  'sd.pedirFecha': ['Pedir fecha', 'Request a date'],
  'sd.ficha': ['Ficha', 'Details'],
  'sd.pendiente': ['Pendiente', 'Pending'],
  'sd.confirmada': ['Confirmada', 'Confirmed'],
  'sd.rechazada': ['Rechazada', 'Declined'],
  'sd.contraoferta': ['Contraoferta', 'Counteroffer'],
} as const

export type ClaveI18n = keyof typeof D

export function useT() {
  const idioma = useDemoStore(s => s.idioma)
  const t = (k: ClaveI18n): string => D[k]?.[idioma === 'en' ? 1 : 0] ?? D[k]?.[0] ?? k
  return { t, idioma }
}
