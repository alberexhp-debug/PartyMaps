import { create } from 'zustand'
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware'
import { JUEGOS, LOCALES, getTorneo, esperaDe, plantillaDe, registrarLectorPerfilOrg, type PerfilOrgOverride, type TorneoSample, type Juego, type Jugador, type Mesa, type MesaTipo } from '@/lib/torneos/sample'
import { puedeCancelarConDevolucion } from '@/lib/torneos/cancelacion'
import { CREW_USUARIO, TAG_RE, MAX_CREWS_POR_JUEGO, type Crew } from '@/lib/torneos/crews'
import { generarTagUsuario, tagUsuarioDe } from '@/lib/torneos/tags'
import type { BoDesde } from '@/lib/torneos/bracket'
import { useSesionStore, claveDemo, claveDemoActual, CUENTAS_DEMO, EMAILS_LEGACY, type Sesion } from '@/lib/stores/useSesionStore'

// Store de DEMO (modo sin backend): mantiene en memoria + localStorage el estado
// interactivo de la sesión para que inscribirse / seguir / crear torneo / leer
// notificaciones persista mientras se navega. Cuando exista el backend real esto
// se reemplaza por queries a Supabase. NO es la fuente de verdad de producción.

export type NotiTipo = 'combate' | 'disputa' | 'lleno' | 'nuevo-torneo' | 'sistema' | 'inscripcion' | 'inactividad'

// Estado de gestión del TO por torneo (check-in, bracket congelado, resultados).
// Los seeds son ids de jugador del ranking de muestra; el bracket se reconstruye
// determinísticamente con construirRondas(seeds, winners).
// Sets: cada combate se juega a Bo1/Bo3/Bo5. `bo.base` aplica al principio del
// cuadro y `bo.top` desde la ronda elegida (como en Smash: Bo3 y Bo5 en top 8).
// El tipo vive en bracket.ts; 'final' es legado y se lee como 'semis'.
export type { BoDesde } from '@/lib/torneos/bracket'
export type BoConfig = { base: number; top: number; desde: BoDesde }
export type GestionTorneo = {
  checkin: string[]
  cerrado: boolean
  generado: boolean
  seeds: string[]
  winners: Record<string, 'a' | 'b'>
  puntos: Record<string, { a: number; b: number }>
  bo: BoConfig
  bajas: string[]         // inscritos dados de baja por el TO (liberan plaza)
}
const GESTION_VACIA: GestionTorneo = {
  checkin: [], cerrado: false, generado: false, seeds: [], winners: {},
  puntos: {}, bo: { base: 3, top: 5, desde: 'semis' }, bajas: [],
}
// Solicitud de un TO a una sede para organizar un evento allí.
// La sede la ve en su panel y al aceptar/rechazar el TO recibe la respuesta.
export type SolicitudSede = {
  id: string
  localId: string
  orgId?: string       // organizador que la envía (identidad por cuenta)
  fecha: string        // 'Sáb 12 jul'
  franja: string       // 'Tarde (16-21h)'
  personas: number
  juego: string        // clave de JUEGOS
  estado: 'pendiente' | 'aceptada' | 'rechazada' | 'contraoferta'
  // La sede puede responder con otra fecha/franja/precio; el TO acepta o rechaza.
  contraoferta?: { fecha: string; franja: string; precio: number }
  recursos?: string[]          // qué pone el local (mesas, pantallas, consolas…)
  repartoTO?: number           // % del reparto para el TO (el resto, local)
}

// Disponibilidad recurrente que publica la sede: días de la semana (0=Lun…6=Dom),
// franja horaria, setups y precio. La ven los TOs en la ficha del local y alimenta
// el calendario del panel de sede. `excepciones` bloquea días sueltos ('YYYY-MM-DD')
// aunque caigan en un día disponible del patrón semanal.
export type DispoSede = {
  dias: number[]
  desdeH: number       // hora de inicio (0-23)
  hastaH: number       // hora de fin (1-24)
  setups: number
  precioNoche: number
  publicada: boolean
  excepciones?: string[]
  // Mesas que la sede ofrece a los TOs, por tipo. El plano solo aporta el valor
  // inicial: la sede pone libremente lo que tenga (sin tope).
  mesasDispo?: Partial<Record<MesaTipo, number>>
  material?: string[]  // extras de equipamiento (ids de MATERIAL_SEDE en DispoSede.tsx)
  // Juegos que la sede marca como jugables (sin definir = los que sugieren sus
  // mesas según la plantilla de cada juego). La sede puede activar/quitar a mano.
  juegosSel?: string[]
  aforoMax?: number    // máximo de personas por evento (sin definir = aforo del local)
  notas?: string       // nota corta para los TOs (parking, comida, normas de la casa…)
}

// Expediente de alta de una sede: lo rellena el local en /alta-local y lo
// resuelve el admin en Verificación. Sin datos fiscales no se aprueba.
export type ExpedienteSede = {
  id: string; nombre: string; zona: string; representante: string; email: string
  telefono: string; cif: string; direccion: string; aforo: number; setups: number
  docs: string[]; estado: 'pendiente' | 'aprobada' | 'rechazada'
}

// Expediente de un TO candidato (alta con entrevista, además del perfil dual).
export type ExpedienteTO = {
  id: string; nombre: string; representante: string; email: string; telefono: string
  experiencia: string; juegos: string[]; enlaces: string
  estado: 'pendiente' | 'aprobado' | 'rechazado'
}

// Juego propuesto por un organizador: no entra al catálogo hasta que el admin
// lo revisa y lo da de alta (con su plantilla) en el panel de Juegos.
export type PropuestaJuego = { id: string; nombre: string; color: string; emoji: string; to: string }

// Grupo de chat entre amigos (capa social): miembros por nombre de jugador y
// mensajes persistidos. `propio` = lo creaste tú (puedes disolverlo).
// `crewId` (F6): el grupo es el chat OFICIAL de una crew — crear la crew lo
// abre solo, y por él llegan los avisos de inscripción por equipos. Un mensaje
// con `torneoId`+`crewId` es una convocatoria: se pinta como tarjeta clicable
// con el estado del cupo y lleva a la ficha con ?crew=.
export type MensajeGrupo = { autor: string; texto: string; hora: string; torneoId?: string; crewId?: string }
export type GrupoChat = {
  id: string
  nombre: string
  emoji: string
  miembros: string[]
  mensajes: MensajeGrupo[]
  propio?: boolean
  crewId?: string
}

// Re-export del modelo de crew (definido en lib/torneos/crews.ts).
export type { Crew } from '@/lib/torneos/crews'
// Cupo de inscripción por equipos de un torneo: qué crew va y quién ha pagado
// ya su plaza (nombres del pool o CREW_USUARIO). Las plazas del cupo son el
// tamGrupo de la plantilla del juego.
export type CupoCrew = { crewId: string; inscritos: string[] }

// Ficha administrativa de una sede (contacto, fiscal, tarifa, suspensión): el
// admin la edita y persiste como override sobre los datos de muestra del local.
export type FichaSedeAdmin = {
  contacto: string; email: string; telefono: string; cif: string; direccion: string
  precioNoche: number; suspendida: boolean
}

// Disputa de resultado: los reportes de los jugadores no coinciden → la resuelve
// el TO desde el modo directo. Si trae `mid`, resolverla avanza el bracket.
export type ReporteTO = {
  id: string
  torneoId: string
  torneoNombre: string
  tipo: 'bracket' | 'seeding'
  motivo: string
  mensaje?: string
  estado: 'abierto' | 'cambiado' | 'rebatido'
  respuesta?: string
}

export type Disputa = {
  id: string
  torneoId: string
  mesa: number
  a: string
  b: string
  mid?: string
}

// ── Doble reporte de resultados (Fase 5) ──
// Cada jugador reporta desde su móvil el marcador del combate (en orden A/B del
// match) y sus propios personajes (≤2, solo en juegos que los llevan). Si los
// MARCADORES coinciden hay consenso y el resultado se escribe en el bracket sin
// pasar por el TO; si no, se abre la disputa de siempre (la resuelve el modo
// directo). Los personajes NUNCA disputan: cada jugador es la fuente del suyo.
export type ReporteJugador = {
  marcador: [number, number]   // [sets de A, sets de B], gane quien gane
  personajes?: string[]        // los del REPORTANTE (≤2)
  deUsuario?: boolean          // el reporte lo envía el usuario demo → alimenta su perfil
}
export type ReportesCombate = { A?: ReporteJugador; B?: ReporteJugador }

// ── Mundo compartido (30-08): relaciones ENTRE cuentas demo ──
// Las amistades entre cuentas viven en el MUNDO ('todh-mundo'), identificadas
// por email: así la solicitud que envía Javier le aparece a Lucía al entrar.
export type AmistadCuenta = { de: string; a: string; estado: 'pendiente' | 'aceptada' }
// Perfil público de cada cuenta (lo actualiza su dueño al editar el perfil):
// es lo que ven las demás cuentas en el buscador, la lista de amigos y el
// mini-perfil. Sin stats falsas: una cuenta nueva no tiene historial.
export type PerfilCuenta = { nombre: string; tag: string; foto?: string | null; bio?: string }

// Mensaje del chat directo entre dos cuentas amigas (backlog E): `de` es el
// email del autor; el nombre lo resuelve la UI con el perfil público.
export type MensajeAmigos = { de: string; texto: string; hora: string }
// La conversación de una pareja vive bajo una clave estable (emails ordenados).
export const claveAmigos = (a: string, b: string) => [a.toLowerCase(), b.toLowerCase()].sort().join('|')

export type Notificacion = {
  id: string
  tipo: NotiTipo
  titulo: string
  cuerpo: string
  cuando: string
  leida: boolean
  href?: string
  // i18n (F9): si existen, la vista traduce por clave al idioma activo con
  // sustitución de {params}; titulo/cuerpo quedan como fallback legacy (ES)
  // para notis ya persistidas en localStorage.
  tituloKey?: string
  cuerpoKey?: string
  params?: Record<string, string | number>
}

interface DemoState {
  inscritos: string[]                 // ids de torneos inscritos
  listaEspera: string[]               // ids de torneos donde el usuario está en la cola de espera
  entradosEspera: Record<string, string[]>  // por torneo: nombres de la cola que ya entraron (en orden de entrada)
  plazasPendientes: Record<string, number>  // por torneo: plazas liberadas por cancelaciones, pendientes de que el TO decida (F7)
  seguidos: string[]                  // ids de organizadores seguidos
  creados: TorneoSample[]             // torneos creados por el TO en demo
  juegosCustom: Record<string, Juego> // juegos añadidos por el TO (no contemplados en la app)
  editados: Record<string, Partial<TorneoSample>>  // overrides de edición (muestra o creado)
  cancelados: string[]                // ids de torneos cancelados por el TO
  gestion: Record<string, GestionTorneo>   // estado de gestión del TO por torneo
  mesasSede: Record<string, Mesa[]>        // plano de mesas editado por cada sede (override del de muestra)
  solicitudesSede: SolicitudSede[]         // peticiones del TO a sedes (organizar evento allí)
  dispoSedes: Record<string, DispoSede>    // disponibilidad publicada por cada sede
  disputas: Disputa[]                      // disputas de resultado pendientes de resolver por el TO
  reportesMatch: Record<string, Record<string, ReportesCombate>>  // doble reporte por torneo → combate (lados A/B)
  personajesPorMatch: Record<string, Record<string, { A: string[]; B: string[] }>>  // personajes declarados por combate
  personajesJugados: Record<string, Record<string, number>>  // perfil demo: juego → personaje → veces jugado
  checkinsJugador: string[]                // torneos donde el jugador ya hizo check-in (QR)
  notificaciones: Notificacion[]
  descartadas: string[]                    // ids de notificaciones quitadas (swipe/X); persisten fuera de la vista
  juegoPerfil: string                 // juego activo en el perfil
  avatarEmoji: string | null          // avatar elegido en el perfil (demo)
  // ── Paquete Chat (30-08): identidad editable del perfil ──
  fotoPerfil: string | null           // foto propia (dataURL comprimido ≤512px/≤200KB); sustituye al emoji/inicial
  bannerPerfil: string | null         // fondo de la cabecera del perfil (CSS background de preset o dataURL subido)
  bioPerfil: string                   // bio corta (≤160)
  userTag: string | null              // tag de usuario #XABCD (tags.ts): se genera al primer uso y persiste
  tagRegenerado: boolean              // regenerarTag solo se puede usar UNA vez
  mainsPerfil: Record<string, string[]>  // mains elegidos por juego (iconos de personaje)
  juegosFavoritos: string[]              // juegos elegidos en el onboarding (personalizan feed y ranking)
  onboardingVisto: boolean
  idioma: 'es' | 'en' | 'ja'             // idioma de la interfaz (i18n fase 9: 3 idiomas)
  entradasEspectador: string[]           // torneos con entrada de espectador comprada
  referidos: { codigo: string; jugados: number; canjeados: number[] }  // programa invita-y-gana (niveles 1/3/5)
  preregistro: { unido: boolean; pos: number; compartidos: number }    // lista de espera del lanzamiento
  reportes: ReporteTO[]                  // reportes de bracket/seeding del jugador al TO (reunión 5-jul)
  paisJugador: string                    // país donde compites (elegido al registrarte; ver puntos.ts)
  juegosOcultos: string[]                // juegos desactivados por el admin (no salen en Explorar/mapa/ranking/alta)
  perfilTO: 'no' | 'pendiente' | 'aprobado'  // rol de organizador (alta self-service)
  tierUsuario: null | 'Oro' | 'Platino' | 'Diamante'   // tier de pago (o regalo por rango)
  chatsTorneo: Record<string, { autor: string; texto: string; hora: string }[]>
  expedientesSede: ExpedienteSede[]        // altas de sede: /alta-local → las resuelve el admin
  expedientesTO: ExpedienteTO[]            // TOs candidatos con expediente (los resuelve el admin)
  propuestasJuego: PropuestaJuego[]        // juegos propuestos por TOs, pendientes de revisión
  valoracionesSedes: Record<string, number>   // estrellas del TO a la sede, por solicitud aceptada
  valoracionesTO: Record<string, number>      // estrellas del jugador al TO, por torneo con resultados
  tosConfianza: Record<string, string[]>      // TOs de confianza de cada sede (reserva directa)
  fichasSede: Record<string, Partial<FichaSedeAdmin>>  // overrides del admin sobre cada sede
  amigos: string[]                         // amigos agregados (nombres del pool de jugadores)
  solicitudesAmistad: string[]             // solicitudes de amistad recibidas, pendientes
  gruposChat: GrupoChat[]                  // grupos de chat con amigos (persisten mensajes)
  // No-leídos estilo WhatsApp (pedido 31-08): por conversación, cuántos
  // mensajes llevaba el hilo la última vez que lo abriste. PERSONAL: cada
  // cuenta lleva su propia lectura. Claves: 'amigo:{email}' · 'grupo:{id}'.
  leidosChat: Record<string, number>
  crews: Crew[]                            // crews (F6): en orden de creación — la 1ª coincidencia representa al jugador
  crewTorneo: Record<string, CupoCrew>     // por torneo: inscripción por equipos abierta (crew + quién pagó ya)
  usuariosSuspendidos: string[]            // ids de cuentas suspendidas por el admin
  betaCerrada: boolean                     // acceso por invitación (admin)
  codigosBeta: string[]                    // códigos de invitación generados
  moderacionChat: Record<string, { silenciados: string[]; borrados: number[] }>  // por torneo
  // Preparación de sala ANTES del directo (decisión 30-08): marcas del TO por
  // torneo y nº de mesa — 'caido' (arranca caída), 'fuera' (quitada del torneo)
  // o 'dentro' (mesa del plano añadida al torneo fuera de los setups base).
  // El modo directo las fusiona al montar, antes y al empezar el directo.
  prepMesas: Record<string, Record<number, 'caido' | 'fuera' | 'dentro'>>
  // ── Mundo compartido (30-08) ──
  amistadesCuentas: AmistadCuenta[]              // solicitudes/amistades entre cuentas (ids = emails)
  perfilesCuentas: Record<string, PerfilCuenta>  // perfil público de cada cuenta, por email
  inscripcionesCuentas: Record<string, string[]> // por torneo: emails de cuentas inscritas (no legacy)
  // Perfil de organizador editado por su dueño desde /perfil/organizador
  // (decisión Albert 30-08). Clave de MUNDO: todas las cuentas lo ven.
  perfilesOrg: Record<string, PerfilOrgOverride>
  // ── Backlog mundo compartido 31-08 (B/C/E) ──
  // (B) Buzón cruzado: notis destinadas a OTRA cuenta, por email. Se entregan
  // (pasan al buzón personal) cuando esa cuenta entra — drenarBuzon del layout.
  buzonCuentas: Record<string, Notificacion[]>
  // (C) Cola de espera del MUNDO por torneo (emails de cuentas, orden FIFO):
  // el TO ve y promociona esperas de otras cuentas desde /gestionar.
  esperasCuentas: Record<string, string[]>
  // (E) Chat directo entre cuentas amigas, por clave de pareja (claveAmigos).
  chatsAmigos: Record<string, MensajeAmigos[]>
  // Sets EN JUEGO (pedido 31-08): epoch ms del «todo listo» por torneo→combate.
  // MUNDO: el crono del set se ve en la bracket en tiempo real desde cualquier
  // cuenta; se limpia al escribirse el resultado (gestionConResultado/disputa).
  setsEnJuego: Record<string, Record<string, number>>
  // Espectadores del MUNDO por torneo (emails de cuentas, pedido 31-08): el
  // cupo de espectador es aparte del de competidor y lo abre/cierra el TO.
  espectadoresCuentas: Record<string, string[]>
  // Torneos PRIVADOS (31-08): emails invitados por el TO — solo ellos pueden
  // inscribirse; el torneo se publica con candado «Solo con invitación».
  invitadosTorneo: Record<string, string[]>
  // Página pública editable de cada SEDE (pedido 31-08): logo, banner, galería,
  // consolas/equipo con cantidad y ajuste fino de juegos disponibles. MUNDO:
  // lo que edita la sede lo ven jugadores y TOs en /local/[id] y MiniLocal.
  perfilesSede: Record<string, PerfilSede>
  // acciones
  inscribir: (torneoId: string, nombreTorneo: string, crewId?: string) => void
  desinscribir: (torneoId: string, nombreTorneo: string) => void
  apuntarEspera: (torneoId: string, nombreTorneo: string, puesto: number) => void
  salirEspera: (torneoId: string) => void
  liberarPlazas: (torneoId: string, nombreTorneo: string, n: number) => void
  promoverDeEspera: (torneoId: string, nombreTorneo: string, quien?: string) => void
  descartarPlazasPendientes: (torneoId: string) => void
  alternarSeguir: (orgId: string, nombreOrg: string) => void
  crearTorneo: (t: TorneoSample) => void
  crearJuego: (j: Juego) => void
  editarTorneo: (id: string, patch: Partial<TorneoSample>) => void
  cancelarTorneo: (id: string, nombre: string) => void
  setGestion: (id: string, patch: Partial<GestionTorneo>) => void
  setMesasSede: (localId: string, mesas: Mesa[]) => void
  prepararMesa: (torneoId: string, n: number, estado: 'caido' | 'fuera' | 'dentro' | null) => void
  setDispoSede: (localId: string, dispo: DispoSede) => void
  crearSolicitudSede: (s: Omit<SolicitudSede, 'id' | 'estado'>, nombreLocal: string) => void
  resolverSolicitudSede: (id: string, estado: 'aceptada' | 'rechazada', nombreLocal: string) => void
  contraofertarSede: (id: string, datos: { fecha: string; franja: string; precio: number }, nombreLocal: string) => void
  crearDisputa: (d: Omit<Disputa, 'id'>, nombreTorneo: string) => void
  reportarResultado: (args: {
    torneoId: string; matchId: string; lado: 'A' | 'B'; reporte: ReporteJugador
    ctx: { nombreTorneo: string; mesa: number; a: string; b: string; juego: string }
  }) => void
  hacerCheckin: (torneoId: string, nombreTorneo: string) => void
  resolverDisputa: (id: string, lado: 'a' | 'b', marcador?: { a: number; b: number }) => void
  responderContraoferta: (id: string, acepta: boolean, nombreLocal: string) => void
  pushNoti: (n: Omit<Notificacion, 'id' | 'leida' | 'cuando'> & { cuando?: string }) => void
  marcarLeidas: () => void
  noLeidas: () => number
  descartarNoti: (id: string) => void
  descartarTodasNotis: () => void
  avisarInactividad: (titulo: string, cuerpo: string, extra?: Pick<Notificacion, 'tituloKey' | 'cuerpoKey' | 'params'>) => void
  setJuegoPerfil: (j: string) => void
  setAvatarEmoji: (e: string | null) => void
  setFotoPerfil: (dataUrl: string | null) => void
  setBannerPerfil: (banner: string | null) => void
  setBioPerfil: (bio: string) => void
  asegurarUserTag: () => void
  regenerarTag: () => void
  setMainsPerfil: (juego: string, mains: string[]) => void
  setJuegosFavoritos: (ids: string[]) => void
  setIdioma: (i: 'es' | 'en' | 'ja') => void
  inscribirEspectador: (id: string, nombre: string) => void
  canjearReferido: (nivel: 1 | 3 | 5) => void
  unirsePreregistro: () => void
  compartirPreregistro: () => void
  crearReporte: (r: Omit<ReporteTO, 'id' | 'estado'>) => void
  setPaisJugador: (pais: string) => void
  alternarJuegoOculto: (juegoId: string) => void
  resolverReporte: (id: string, accion: 'cambiado' | 'rebatido', respuesta?: string) => void
  solicitarTO: () => void
  aprobarTO: () => void
  rechazarTO: () => void
  suscribirTier: (tier: 'Oro' | 'Platino' | 'Diamante') => void
  enviarChat: (torneoId: string, texto: string) => void
  crearExpedienteSede: (e: Omit<ExpedienteSede, 'id' | 'estado'>) => void
  resolverExpedienteSede: (id: string, aprueba: boolean) => void
  resolverExpedienteTO: (id: string, aprueba: boolean) => void
  proponerJuego: (p: Omit<PropuestaJuego, 'id'>) => void
  retirarPropuestaJuego: (id: string) => void
  rechazarPropuestaJuego: (id: string) => void
  valorarSede: (solicitudId: string, nombreLocal: string, estrellas: number) => void
  valorarOrganizador: (torneoId: string, nombreOrg: string, estrellas: number) => void
  agregarTOConfianza: (localId: string, orgId: string, nombreOrg: string, nombreLocal: string) => void
  quitarTOConfianza: (localId: string, orgId: string) => void
  patchFichaSede: (localId: string, patch: Partial<FichaSedeAdmin>) => void
  alternarUsuarioSuspendido: (id: string) => void
  setBetaCerrada: (v: boolean) => void
  agregarCodigoBeta: (codigo: string) => void
  alternarSilenciado: (torneoId: string, autor: string) => void
  alternarBorrado: (torneoId: string, idx: number) => void
  agregarAmigo: (nombre: string) => void
  quitarAmigo: (nombre: string) => void
  responderAmistad: (nombre: string, acepta: boolean) => void
  crearGrupoChat: (nombre: string, emoji: string, miembros: string[]) => void
  marcarChatLeido: (clave: string, total: number) => void
  enviarChatGrupo: (grupoId: string, texto: string) => void
  salirGrupoChat: (grupoId: string) => void
  crearCrew: (c: { nombre: string; tag: string; juego: string; emoji?: string; color?: string; miembros: string[] }) => void
  salirCrew: (crewId: string) => void
  editarCrew: (crewId: string, patch: { nombre?: string; descripcion?: string; banner?: string | null }) => void
  agregarMiembroCrew: (crewId: string, nombre: string) => void
  quitarMiembroCrew: (crewId: string, nombre: string) => void
  alternarAdminCrew: (crewId: string, nombre: string) => void
  abrirInscripcionCrew: (torneoId: string, nombreTorneo: string, crewId: string) => void
  confirmarPlazaCrew: (torneoId: string, quien: string) => void
  // ── Mundo compartido (30-08): amistades entre cuentas ──
  solicitarAmistadCuenta: (email: string) => void
  responderAmistadCuenta: (email: string, acepta: boolean) => void
  quitarAmigoCuenta: (email: string) => void
  // El TO inicia el torneo cuando quiere (aunque no esté lleno ni sea la
  // fecha): lo pone EN DIRECTO para TODAS las cuentas y cierra inscripciones.
  iniciarTorneo: (id: string, nombre: string) => void
  editarPerfilOrg: (orgId: string, patch: PerfilOrgOverride) => void
  // (B) Vuelca las notis del buzón del mundo destinadas a MI cuenta en mi
  // buzón personal (lo llama el layout al montar; idempotente).
  drenarBuzon: () => void
  // (E) Mensaje directo a una cuenta amiga (persiste en el mundo común).
  enviarMensajeAmigo: (email: string, texto: string) => void
  // Arranca el crono del set cuando ambos jugadores dan «Todo listo» (idempotente:
  // si el rival ya lo arrancó, ambos comparten el mismo inicio).
  avisarInscritosTorneo: (torneoId: string, noti: Omit<Notificacion, 'id' | 'cuando' | 'leida'>) => void
  iniciarSetEnJuego: (torneoId: string, mid: string) => void
  editarPerfilSede: (localId: string, patch: Partial<PerfilSede>) => void
  invitarATorneo: (torneoId: string, nombreTorneo: string, email: string) => void
}

// Personalización de la página pública de una sede (31-08). `equipos` es
// catálogo fijo (EQUIPOS_SEDE en PerfilSedeEditor) → cantidad; los juegos
// disponibles parten de juegosJugables() y aquí se AÑADEN o QUITAN a mano.
export type PerfilSede = {
  foto?: string | null      // logo del local (dataURL comprimido)
  banner?: string | null    // CSS de preset o dataURL (pintar con fondoBanner)
  galeria?: string[]        // hasta 6 imágenes del local (dataURL)
  equipos?: Record<string, number>   // id de equipo → cantidad (0 = no tiene)
  juegosExtra?: string[]    // juegos añadidos a mano sobre los derivados
  juegosQuitados?: string[] // juegos quitados a mano de los derivados
}

let nid = 0
const nextId = () => `n${Date.now().toString(36)}${nid++}`

// Escribir un resultado en la gestión del torneo (winners + puntos del combate):
// la ÚNICA vía por la que un marcador entra al bracket. La usan el consenso del
// doble reporte y la resolución de disputas del TO (misma lógica, sin duplicar).
function gestionConResultado(
  s: DemoState, torneoId: string, mid: string,
  puntos: { a: number; b: number }, lado?: 'a' | 'b',
): Pick<DemoState, 'gestion'> & Partial<Pick<DemoState, 'setsEnJuego'>> {
  const ganador: 'a' | 'b' = lado ?? (puntos.a > puntos.b ? 'a' : 'b')
  return {
    gestion: {
      ...s.gestion,
      [torneoId]: {
        ...GESTION_VACIA, ...s.gestion[torneoId],
        winners: { ...(s.gestion[torneoId]?.winners ?? {}), [mid]: ganador },
        puntos: { ...(s.gestion[torneoId]?.puntos ?? {}), [mid]: puntos },
      },
    },
    // Con resultado escrito el set deja de estar EN JUEGO: su crono sale de la
    // bracket (única vía de escritura → única vía de apagado).
    ...sinSetEnJuego(s, torneoId, mid),
  }
}

// Quita el crono de un set (si estaba corriendo) del mapa del mundo.
function sinSetEnJuego(s: DemoState, torneoId: string, mid: string): Partial<Pick<DemoState, 'setsEnJuego'>> {
  const enJuego = s.setsEnJuego[torneoId]
  if (!enJuego?.[mid]) return {}
  const resto = { ...enJuego }
  delete resto[mid]
  return { setsEnJuego: { ...s.setsEnJuego, [torneoId]: resto } }
}

// La noti de bienvenida vive aparte: es la ÚNICA que estrena una cuenta nueva.
const NOTI_BIENVENIDA: Notificacion = { id: 'seed4', tipo: 'sistema', titulo: 'Bienvenido a Torneum', cuerpo: 'Descubre torneos cerca de ti y compite por subir en el ranking.', tituloKey: 'ntfs.s4t', cuerpoKey: 'ntfs.s4c', cuando: 'ayer', leida: true }

const NOTIS_INICIALES: Notificacion[] = [
  { id: 'seed1', tipo: 'combate', titulo: 'Te toca · Mesa 3', cuerpo: 'Cuartos vs Sora. Abre el plano para ver tu mesa.', tituloKey: 'ntfs.s1t', cuerpoKey: 'ntfs.s1c', params: { rival: 'Sora' }, cuando: 'hace 2 min', leida: false, href: '/torneo/t1/mesa?n=3&vs=Cuartos%20vs%20Sora' },
  { id: 'seed2', tipo: 'nuevo-torneo', titulo: 'Lima Esports publicó un torneo', cuerpo: 'Smash Arena Madrid — Major · Sáb 5 jul. ¡Plazas abiertas!', tituloKey: 'ntfs.s2t', cuerpoKey: 'ntfs.s2c', params: { to: 'Lima Esports', torneo: 'Smash Arena Madrid — Major', fecha: 'Sáb 5 jul' }, cuando: 'hace 1 h', leida: false, href: '/torneo/t11' },
  { id: 'seed3', tipo: 'lleno', titulo: 'Torneo casi lleno', cuerpo: 'Tekken 8 Arena Night está al 97%. Inscríbete antes de que se agote.', tituloKey: 'ntfs.s3t', cuerpoKey: 'ntfs.s3c', params: { torneo: 'Tekken 8 Arena Night' }, cuando: 'hace 3 h', leida: true, href: '/torneo/t5' },
  NOTI_BIENVENIDA,
]

// Identificador del jugador de la demo dentro de la cola de espera (los demás
// puestos son nombres de muestra de esperaDe). El TO lo usa para «meterle» a él.
export const ESPERA_USUARIO = '@usuario'

// Crew AJENA de juego de equipo (scouting v1): sin el usuario entre los
// miembros, VALORANT (plantilla scouting 'equipo') → su página ofrece
// «Estudiar equipo». Definida aparte porque la usan el seed Y la migración v2
// (estados persistidos de antes de scouting no la tienen).
const CREW_SKUADRA_SEED: Crew = {
  id: 'crew-sqd', nombre: 'Skuadra', tag: 'SKDR', juego: 'valorant', emoji: '🦅', color: '#4F8EF7',
  miembros: ['Nyx', 'Volt', 'Zen', 'Aqua', 'Pyra'], creador: 'Nyx', admins: ['Nyx'],
  descripcion: 'Stack fijo de ranked que se pasó a los presenciales.',
}

// Crew AJENA de Smash (del pool): también forma parte del mundo de una cuenta
// nueva — es de Zen, no del usuario (extraída para reusarla en la plantilla).
const CREW_DOJO_SEED: Crew = {
  id: 'crew-dojo', nombre: 'Dojo Zen', tag: 'DOJO', juego: 'smash', emoji: '⛩️', color: '#2EC4B6',
  miembros: ['Zen', 'Nyx', 'Rei'], creador: 'Zen', admins: ['Zen'],
}

// Promoción de UNA persona desde la lista de espera (F7). `quien` es un nombre
// de la cola de muestra (o ESPERA_USUARIO para el jugador de la demo); sin
// `quien` entra el primero pendiente: la cola de muestra por orden y, agotada
// esta, el usuario si espera. Consume una plaza pendiente si la hay y devuelve
// el parcial de estado a mezclar, o null si no había a quién promover.
function promoverUnoDeEspera(s: DemoState, torneoId: string, nombreTorneo: string, quien?: string): Partial<DemoState> | null {
  const base = getTorneo(torneoId) || s.creados.find(c => c.id === torneoId)
  if (!base) return null
  const cola = esperaDe({ ...base, ...(s.editados[torneoId] || {}) })
  const entrados = s.entradosEspera[torneoId] ?? []
  const pendientes = cola.filter(n => !entrados.includes(n))
  const usuarioEspera = s.listaEspera.includes(torneoId)
  // (C) Cola del mundo: cuentas en espera (quien = 'cuenta-{email}').
  const colaCuentas = s.esperasCuentas[torneoId] ?? []
  const objetivo = quien
    ?? pendientes[0]
    ?? (colaCuentas[0] ? ID_CUENTA_PREFIJO + colaCuentas[0] : undefined)
    ?? (usuarioEspera ? ESPERA_USUARIO : undefined)
  if (!objetivo) return null
  if (objetivo.startsWith(ID_CUENTA_PREFIJO)) {
    const emailCuenta = objetivo.slice(ID_CUENTA_PREFIJO.length)
    if (!colaCuentas.includes(emailCuenta)) return null
    const nombre = nombreCuentaDemo(emailCuenta, s.perfilesCuentas)
    const notiTO: Notificacion = {
      id: nextId(), tipo: 'sistema', titulo: `¡${nombre} está dentro!`,
      cuerpo: `Se liberó una plaza en «${nombreTorneo}» y el organizador se la ha dado desde la lista de espera.`,
      tituloKey: 'ntf.dentroOtroT', cuerpoKey: 'ntf.dentroOtroC', params: { nombre, torneo: nombreTorneo },
      cuando: 'ahora', leida: false, href: `/torneo/${torneoId}`,
    }
    return {
      plazasPendientes: { ...s.plazasPendientes, [torneoId]: Math.max(0, (s.plazasPendientes[torneoId] ?? 0) - 1) },
      esperasCuentas: { ...s.esperasCuentas, [torneoId]: colaCuentas.filter(e => e !== emailCuenta) },
      inscripcionesCuentas: { ...s.inscripcionesCuentas, [torneoId]: [...(s.inscripcionesCuentas[torneoId] ?? []), emailCuenta] },
      notificaciones: [notiTO, ...s.notificaciones],
      // (B) La cuenta promocionada se entera al entrar: está dentro.
      buzonCuentas: buzonConEntregas(s, [{ email: emailCuenta, noti: {
        tipo: 'inscripcion', titulo: '🎟️ ¡Estás dentro! Plaza liberada',
        cuerpo: `Se liberó una plaza en «${nombreTorneo}» y el organizador te la ha dado desde la lista de espera. Pago procesado: tu entrada ya está en la cartera.`,
        tituloKey: 'ntf.dentroT', cuerpoKey: 'ntf.dentroC', params: { torneo: nombreTorneo }, href: '/entradas',
      } }]),
    }
  }
  const menosPendiente = {
    plazasPendientes: { ...s.plazasPendientes, [torneoId]: Math.max(0, (s.plazasPendientes[torneoId] ?? 0) - 1) },
  }
  if (objetivo === ESPERA_USUARIO) {
    if (!usuarioEspera) return null
    const noti: Notificacion = {
      id: nextId(), tipo: 'inscripcion', titulo: '🎟️ ¡Estás dentro! Plaza liberada',
      cuerpo: `Se ha liberado una plaza en «${nombreTorneo}» y el organizador te la ha dado desde la lista de espera. Pago procesado: tu entrada ya está en la cartera.`,
      tituloKey: 'ntf.dentroT', cuerpoKey: 'ntf.dentroC', params: { torneo: nombreTorneo },
      cuando: 'ahora', leida: false, href: '/entradas',
    }
    return {
      ...menosPendiente,
      listaEspera: s.listaEspera.filter(id => id !== torneoId),
      inscritos: [...s.inscritos, torneoId],
      notificaciones: [noti, ...s.notificaciones],
    }
  }
  if (!pendientes.includes(objetivo)) return null
  const noti: Notificacion = {
    id: nextId(), tipo: 'sistema', titulo: `¡${objetivo} está dentro!`,
    cuerpo: `Se liberó una plaza en «${nombreTorneo}» y el organizador se la ha dado desde la lista de espera.`,
    tituloKey: 'ntf.dentroOtroT', cuerpoKey: 'ntf.dentroOtroC', params: { nombre: objetivo, torneo: nombreTorneo },
    cuando: 'ahora', leida: false, href: `/torneo/${torneoId}`,
  }
  return {
    ...menosPendiente,
    entradosEspera: { ...s.entradosEspera, [torneoId]: [...entrados, objetivo] },
    notificaciones: [noti, ...s.notificaciones],
  }
}

// ── Datos iniciales del mundo demo (sin las acciones) ──
// Extraídos a constante para poder: (a) resetear la memoria al cambiar a un
// namespace de cuenta sin blob y (b) derivar la plantilla de cuenta VACÍA.
type DatosDemo = {
  [K in keyof DemoState as DemoState[K] extends (...args: never[]) => unknown ? never : K]: DemoState[K]
}

const DATOS_INICIALES: DatosDemo = {
  // t4 viene inscrito de serie: la cartera y la ficha lo cuentan igual
  // (antes la cartera lo sembraba por su cuenta y la ficha no lo sabía).
  inscritos: ['t4'],
      listaEspera: [],
      entradosEspera: {},
      plazasPendientes: {},
      seguidos: [],
      creados: [],
      juegosCustom: {},
      editados: {},
      cancelados: [],
      gestion: {},
      mesasSede: {},
      prepMesas: {},
      // Dos solicitudes de muestra de otros organizadores: la sede decide sobre
      // ellas con el MISMO flujo del store que las peticiones reales del TO.
      solicitudesSede: [
        { id: 'sol-seed1', localId: 'gamba', orgId: 'arcade-to', fecha: 'Vie 27 jun', franja: 'Noche (19-24h)', personas: 32, juego: 'tekken', estado: 'pendiente', recursos: ['8 consolas', '2 pantallas stream'], repartoTO: 30 },
        { id: 'sol-seed2', localId: 'gamba', orgId: 'respawn-to', fecha: 'Dom 29 jun', franja: 'Tarde (16-21h)', personas: 24, juego: 'sf6', estado: 'pendiente', recursos: ['6 setups', 'micro y altavoces'], repartoTO: 20 },
      ],
      // Sedes de muestra con horario ya publicado: el filtro «Disponibles» del
      // mapa de TO y el aro lima salen de aquí, no de "no tener torneos".
      dispoSedes: {
        nexus: { dias: [3, 4, 5], desdeH: 17, hastaH: 23, setups: 14, precioNoche: 55, publicada: true },
        comarca: { dias: [5, 6], desdeH: 11, hastaH: 21, setups: 12, precioNoche: 30, publicada: true },
      },
      // Disputa de muestra en el torneo live para que el modo directo luzca vivo
      disputas: [{ id: 'dsp-seed', torneoId: 't1', mesa: 5, a: 'Lux', b: 'Nyx' }],
      reportesMatch: {},
      // Personajes ya guardados en combates jugados del torneo en directo (t1,
      // Smash): las brackets lucen los iconos de serie, sin jugar nada. Los ids
      // cubren el cuadro de muestra (wq*/lr*/q*) del bracket público.
      personajesPorMatch: {
        t1: {
          wq1: { A: ['Joker'], B: ['Sonic', 'Kirby'] },
          wq2: { A: ['Pyra/Mythra'], B: ['Steve'] },
          wq3: { A: ['Fox'], B: ['Cloud', 'Roy'] },
          lr1: { A: ['Sonic'], B: ['Pyra/Mythra'] },
          q1: { A: ['Joker'], B: ['Sonic', 'Kirby'] },
          q2: { A: ['Pyra/Mythra'], B: ['Steve'] },
          q3: { A: ['Fox'], B: ['Cloud', 'Roy'] },
        },
      },
      // Contador real del perfil demo (se suma con cada consenso del jugador)
      personajesJugados: { smash: { Pikachu: 3, Fox: 1 } },
      checkinsJugador: [],
      notificaciones: NOTIS_INICIALES,
      descartadas: [],
      juegoPerfil: 'smash',
      avatarEmoji: null,
      fotoPerfil: null,
      bannerPerfil: null,
      bioPerfil: '',
      userTag: null,
      tagRegenerado: false,
      mainsPerfil: {},
      juegosFavoritos: [],
      onboardingVisto: false,
      idioma: 'es',
      entradasEspectador: [],
      referidos: { codigo: 'ALBERT-3F7', jugados: 2, canjeados: [] },
      preregistro: { unido: false, pos: 347, compartidos: 0 },
      reportes: [
        { id: 'rep-seed', torneoId: 't1', torneoNombre: 'Lima Smash Weekly #42', tipo: 'seeding', motivo: 'Me toca otra vez contra el mismo jugador en ronda 1', mensaje: 'Tercera semana seguida contra Sora en R1, tenemos nivel parecido y nos cruzáis pronto.', estado: 'abierto' },
      ],
      paisJugador: 'ES',
      juegosOcultos: [],
      perfilTO: 'no',
      tierUsuario: null,
      chatsTorneo: {},
      expedientesSede: [
        {
          id: 'exp1', nombre: 'Nivel 99', zona: 'Moncloa', representante: 'Marta Ruiz Salas', email: 'marta@nivel99.es',
          telefono: '+34 611 22 33 44', cif: 'B-88412367', direccion: 'C/ Princesa 82, 28008 Madrid',
          aforo: 90, setups: 14, docs: ['Licencia de actividad', 'Seguro RC', 'Titularidad del local'], estado: 'pendiente',
        },
        {
          id: 'exp2', nombre: 'Dado Crítico', zona: 'Getafe', representante: 'Jorge Lamas Peña', email: 'hola@dadocritico.com',
          telefono: '+34 622 87 90 11', cif: 'B-87201455', direccion: 'Av. de España 14, 28901 Getafe',
          aforo: 55, setups: 10, docs: ['Licencia de actividad', 'Seguro RC'], estado: 'pendiente',
        },
      ],
      expedientesTO: [
        {
          id: 'expto1', nombre: 'Trinity Games', representante: 'Lucía Vega', email: 'lucia@trinitygames.gg',
          telefono: '+34 655 09 12 87', experiencia: 'Semanales de Melee en Alcorcón (2 años) y liga universitaria UC3M.',
          juegos: ['smash', 'tft'], enlaces: 'start.gg/trinity-weekly', estado: 'pendiente',
        },
      ],
      propuestasJuego: [
        { id: 'pj1', nombre: 'Guilty Gear Strive', color: '#FF5C8A', emoji: '🥊', to: 'FGC Madrid' },
        { id: 'pj2', nombre: 'EA FC 26', color: '#3FA65C', emoji: '⚽', to: 'Bracket Club' },
      ],
      valoracionesSedes: {},
      // t10 viene valorado de serie: así «Enviadas» en /perfil/valoraciones
      // enseña el patrón completo (enviadas + pendientes por rellenar).
      valoracionesTO: { t10: 5 },
      tosConfianza: { gamba: ['lima', 'dragon-to'] },
      fichasSede: {},
      amigos: ['Kaze', 'Sora', 'Volt', 'Lux', 'Drako'],
      solicitudesAmistad: ['Nyx'],
      gruposChat: [
        {
          id: 'gc1', nombre: 'Club Gamba', emoji: '🎮', miembros: ['Kaze', 'Sora', 'Volt', 'Lux'], propio: true,
          mensajes: [
            { autor: 'Kaze', texto: '¿Vamos todos al Weekly del jueves?', hora: '12:10' },
            { autor: 'Sora', texto: 'Yo me apunto, quiero la revancha 😤', hora: '12:14' },
            { autor: 'Volt', texto: 'Reservad mesa para amistosos antes', hora: '12:20' },
          ],
        },
        {
          id: 'gc2', nombre: 'Liga Magic Madrid', emoji: '🃏', miembros: ['Drako', 'Sora'],
          mensajes: [
            { autor: 'Drako', texto: 'Jornada 5 este viernes, no falléis', hora: 'ayer' },
          ],
        },
        // Chats OFICIALES de las crews del usuario (F6): crear una crew abre
        // su grupo vinculado; por él llegan las convocatorias de inscripción.
        {
          id: 'gc-nox', nombre: 'Nocturna', emoji: '🌙', miembros: ['Kaze', 'Sora', 'Volt'], propio: true, crewId: 'crew-nox',
          mensajes: [
            { autor: 'Kaze', texto: 'Semanal del jueves: ¿vamos los 4 con el tag?', hora: 'ayer' },
          ],
        },
        {
          id: 'gc-vnd', nombre: 'Vandalia', emoji: '🎯', miembros: ['Lux', 'Drako', 'Rei', 'Mist'], crewId: 'crew-vnd',
          mensajes: [
            { autor: 'Rei', texto: 'Hay Community Cup 5v5 el sábado, ojo al cupo 👀', hora: 'ayer' },
          ],
        },
      ],
      // Crews sembradas (F6, reseed paquete Chat: tags de 4 LETRAS + creador y
      // admins): dos del usuario (Nocturna en Smash y Vandalia en VALORANT,
      // juego de equipos) y una del pool (Dojo Zen) para que ranking y brackets
      // de Smash luzcan tags de serie. Orden = antigüedad. En Vandalia el
      // usuario es creador y Kaze admin (entra como miembro: un admin siempre
      // es miembro) para demostrar concesión/revocación del rol.
      // Skuadra (scouting v1): crew AJENA de juego de equipo — es la que hace
      // demostrable «Estudiar equipo» (solo aparece en crews que no son tuyas).
      crews: [
        { id: 'crew-nox', nombre: 'Nocturna', tag: 'NOCT', juego: 'smash', emoji: '🌙', color: '#9B5DE5', miembros: [CREW_USUARIO, 'Kaze', 'Sora', 'Volt'], creadaPorMi: true, creador: CREW_USUARIO, admins: [CREW_USUARIO], descripcion: 'Los búhos del Smash madrileño: labs entre semana, bracket los jueves.' },
        CREW_DOJO_SEED,
        { id: 'crew-vnd', nombre: 'Vandalia', tag: 'VNDL', juego: 'valorant', emoji: '🎯', color: '#FF4655', miembros: [CREW_USUARIO, 'Kaze', 'Lux', 'Drako', 'Rei', 'Mist'], creadaPorMi: true, creador: CREW_USUARIO, admins: [CREW_USUARIO, 'Kaze'] },
        CREW_SKUADRA_SEED,
      ],
      crewTorneo: {},
      usuariosSuspendidos: [],
      betaCerrada: true,
      codigosBeta: ['TOUR-B7K2', 'TOUR-M4X9'],
      moderacionChat: {},
      amistadesCuentas: [],
      perfilesCuentas: {},
      inscripcionesCuentas: {},
      perfilesOrg: {},
      buzonCuentas: {},
      esperasCuentas: {},
      chatsAmigos: {},
      setsEnJuego: {},
      espectadoresCuentas: {},
      invitadosTorneo: {},
      leidosChat: {},  // se re-siembra tras DATOS_INICIALES (grupos seed nacen leídos)
      perfilesSede: {},
}

// Los grupos de muestra empiezan LEÍDOS: las burbujas de no-leídos solo
// cuentan mensajes que lleguen después (convocatorias, chats del mundo…).
DATOS_INICIALES.leidosChat = Object.fromEntries(DATOS_INICIALES.gruposChat.map(g => [`grupo:${g.id}`, g.mensajes.length]))

// ── Mundo compartido (30-08): clasificación WORLD/PERSONAL de las claves ──
// Criterio: describe el mundo u otros actores → MUNDO (clave 'todh-mundo',
// común a TODAS las cuentas); describe a ESTE usuario → PERSONAL (clave de la
// cuenta). El adaptador de persistencia separa/junta por esta lista.
export const CLAVES_MUNDO = [
  'creados', 'editados', 'cancelados', 'juegosCustom', 'juegosOcultos',
  'gestion', 'prepMesas', 'plazasPendientes', 'entradosEspera',
  'solicitudesSede', 'dispoSedes', 'mesasSede', 'fichasSede',
  'disputas', 'reportes', 'reportesMatch', 'personajesPorMatch',
  'chatsTorneo', 'moderacionChat',
  'expedientesSede', 'expedientesTO', 'propuestasJuego', 'tosConfianza',
  'valoracionesSedes', 'valoracionesTO',
  'usuariosSuspendidos', 'betaCerrada', 'codigosBeta',
  'crews', 'crewTorneo',
  'amistadesCuentas', 'perfilesCuentas', 'inscripcionesCuentas', 'perfilesOrg',
  'buzonCuentas', 'esperasCuentas', 'chatsAmigos', 'setsEnJuego', 'perfilesSede',
  'espectadoresCuentas', 'invitadosTorneo',
] as const satisfies readonly (keyof DatosDemo)[]
export type ClaveMundo = (typeof CLAVES_MUNDO)[number]
export type DatosPersonales = Omit<DatosDemo, ClaveMundo>
const ES_MUNDO = new Set<string>(CLAVES_MUNDO)

function soloMundo(s: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(s).filter(([k]) => ES_MUNDO.has(k)))
}
function soloPersonal(s: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(s).filter(([k]) => !ES_MUNDO.has(k)))
}

// Email de la sesión activa si es una cuenta de JUGADOR (las amistades entre
// cuentas y los perfiles públicos son de jugadores; sedes y admin no).
function emailSesionJugador(): string | null {
  const ses = useSesionStore.getState().sesion
  return ses && ses.rol === 'jugador' ? ses.email.toLowerCase() : null
}
// Las cuentas legacy comparten el blob 'todh-demo' entre ellas (jugador@/to@…):
// su inscripción ya cuenta como «el usuario demo» (+1 personal); anotar además
// su email en el mundo la contaría DOBLE al cambiar entre cuentas legacy.
function emailMundoInscripciones(): string | null {
  const e = emailSesionJugador()
  return e && !EMAILS_LEGACY.has(e) ? e : null
}

// (B) Buzón cruzado: deja notis en el buzón del MUNDO de otras cuentas — se
// entregan cuando esa cuenta entra (drenarBuzon). Solo cuentas reales: nunca a
// uno mismo ni a las legacy (comparten blob personal y ya se ven las notis).
type Entrega = { email?: string | null; noti: Omit<Notificacion, 'id' | 'cuando' | 'leida'> }
function buzonConEntregas(s: DemoState, entregas: Entrega[]): Record<string, Notificacion[]> {
  const yo = useSesionStore.getState().sesion?.email?.toLowerCase()
  let buzon: Record<string, Notificacion[]> | null = null
  for (const { email, noti } of entregas) {
    const el = email?.toLowerCase()
    if (!el || el === yo || EMAILS_LEGACY.has(el)) continue
    buzon ??= { ...s.buzonCuentas }
    buzon[el] = [{ ...noti, id: nextId(), cuando: 'ahora', leida: false }, ...(buzon[el] ?? [])]
  }
  return buzon ?? s.buzonCuentas
}

// Nombre público → email de cuenta (los brackets hablan en nombres): busca en
// los perfiles publicados del mundo y en el directorio de cuentas demo.
function emailDeNombre(nombre: string, perfiles: Record<string, PerfilCuenta>): string | null {
  const n = nombre.trim().toLowerCase()
  for (const [email, p] of Object.entries(perfiles)) {
    if (p.nombre.trim().toLowerCase() === n) return email
  }
  const c = CUENTAS_DEMO.find(x => x.rol === 'jugador' && x.nombre.trim().toLowerCase() === n)
  return c && !EMAILS_LEGACY.has(c.email.toLowerCase()) ? c.email.toLowerCase() : null
}

// Email de la CUENTA (no legacy) dueña de un organizadorId, para avisos al TO.
// Un org de muestra sin cuenta (lima…) devuelve null: se mantiene el
// comportamiento legacy (la noti se queda en el blob compartido y ya la ve).
function emailDeOrgCuenta(organizadorId?: string): string | null {
  if (!organizadorId) return null
  const email = CUENTAS_DEMO.find(x => x.orgId === organizadorId)?.email.toLowerCase() ?? null
  return email && !EMAILS_LEGACY.has(email) ? email : null
}

// El perfil público de la cuenta activa se re-publica en el mundo cada vez que
// su dueño edita identidad (foto/bio/tag): las demás cuentas ven lo último.
function conPerfilCuenta(s: DemoState, patch: Partial<DemoState>): Partial<DemoState> {
  const ses = useSesionStore.getState().sesion
  if (!ses || ses.rol !== 'jugador') return patch
  const email = ses.email.toLowerCase()
  const n = { ...s, ...patch }
  return {
    ...patch,
    perfilesCuentas: {
      ...n.perfilesCuentas,
      [email]: {
        nombre: ses.nombre,
        tag: n.userTag ?? tagUsuarioDe(ses.nombre),
        foto: n.fotoPerfil,
        bio: n.bioPerfil,
      },
    },
  }
}

// Nombre y tag públicos de una cuenta demo: manda su perfil publicado en el
// mundo; sin él, el nombre de CUENTAS_DEMO y el tag determinista del nombre.
export function nombreCuentaDemo(email: string, perfiles: Record<string, PerfilCuenta>): string {
  return perfiles[email]?.nombre ?? CUENTAS_DEMO.find(c => c.email.toLowerCase() === email)?.nombre ?? email.split('@')[0]
}
export function tagCuentaDemo(email: string, perfiles: Record<string, PerfilCuenta>): string {
  return perfiles[email]?.tag ?? tagUsuarioDe(nombreCuentaDemo(email, perfiles))
}

// ── Mundo compartido: una cuenta inscrita como jugador de bracket/listas ──
// Id 'cuenta-{email}': así entra en check-in, seeds y cuadros con su NOMBRE.
// Stats neutras de cuenta nueva (récord 0-0, sin mejor puesto): nada inventado.
export const ID_CUENTA_PREFIJO = 'cuenta-'
export function jugadorDeCuenta(email: string, juego: string, perfiles: Record<string, PerfilCuenta>): Jugador {
  const nombre = nombreCuentaDemo(email, perfiles)
  return {
    id: `${ID_CUENTA_PREFIJO}${email}`, nombre, handle: `@${nombre.toLowerCase()}`,
    pais: 'ES', bandera: '', juego, rating: 800, tier: 'Oro', victorias: 0, derrotas: 0,
    torneosJugados: 0, mejorPuesto: '—', tendencia: 0,
  }
}
// Resolver de seeds tolerante a cuentas: primero el pool de muestra; un id
// 'cuenta-{email}' se reconstruye del directorio (todas las vistas de bracket
// pasan por aquí para que los cuadros con cuentas se vean en cualquier sesión).
export function resolverSeeds(sids: string[], pool: Jugador[], juego: string, perfiles: Record<string, PerfilCuenta>): Jugador[] {
  return sids
    .map(sid => pool.find(p => p.id === sid)
      ?? (sid.startsWith(ID_CUENTA_PREFIJO) ? jugadorDeCuenta(sid.slice(ID_CUENTA_PREFIJO.length), juego, perfiles) : undefined))
    .filter(Boolean) as Jugador[]
}

// ── Plantilla de cuenta VACÍA (30-08, v2 mundo compartido): SOLO lo PERSONAL ──
// Todo lo que en el seed es «de Álex» (inscripciones, amigos, valoraciones
// emitidas, personajes jugados, identidad del perfil…) arranca vacío. Las
// claves de MUNDO ya no van aquí: el mundo es común ('todh-mundo') y las crews
// de Álex dejan de «ser tuyas» gracias al mapeo de identidad del adaptador.
// Notificaciones: SOLO la bienvenida.
export const ESTADO_CUENTA_NUEVA: DatosPersonales = {
  ...(soloPersonal(DATOS_INICIALES) as DatosPersonales),
  inscritos: [],
  listaEspera: [],
  entradasEspectador: [],
  seguidos: [],
  amigos: [],
  solicitudesAmistad: [],
  gruposChat: [],
  notificaciones: [{ ...NOTI_BIENVENIDA, cuando: 'ahora', leida: false }],
  descartadas: [],
  personajesJugados: {},
  tierUsuario: null,
  fotoPerfil: null,
  bannerPerfil: null,
  bioPerfil: '',
  userTag: null,          // se genera al primer uso (asegurarUserTag)
  tagRegenerado: false,
  referidos: { codigo: 'ALBERT-3F7', jugados: 0, canjeados: [] },
  checkinsJugador: [],
  avatarEmoji: null,
  mainsPerfil: {},
  juegosFavoritos: [],
  onboardingVisto: false, // una cuenta nueva pasa por el onboarding de verdad
}

// ── Storage v2 (30-08): MUNDO COMPARTIDO + parte personal por cuenta ──
// El estado se parte en dos al persistir: las CLAVES_MUNDO van a la clave común
// 'todh-mundo' (el mundo de TODAS las cuentas, legacy incluidas) y el resto a
// la clave personal de la cuenta activa (claveDemoActual). Al leer se juntan.
//
// Compatibilidad (restricción nº1):
// · El blob legacy 'todh-demo' se sigue escribiendo COMPLETO (mundo+personal),
//   marcado con `mundo: 1` en la envoltura: las suites que leen
//   JSON.parse(localStorage.getItem('todh-demo')).state.X siguen funcionando.
// · Un 'todh-demo' SIN marca es un blob externo (suite que siembra gestion/etc.
//   o usuario de la app anterior): su mundo se ADOPTA como el mundo común
//   (se deriva 'todh-mundo' de él), exactamente la semántica v1 del seed.
//
// Identidad en el mundo: el usuario legacy se guarda con sus sentinelas de
// siempre ('@usuario' en crews, 'Tú' en chats) — así el blob legacy es
// bit-compatible. Cada cuenta NUEVA se guarda por su NOMBRE público; al leer,
// su nombre se convierte en el sentinela (es «tú») y el sentinela del legacy
// se muestra como «Álex». Así Javier no «hereda» las crews de Álex.
const CLAVE_MUNDO = 'todh-mundo'
const CLAVE_LEGACY = 'todh-demo'
const VERSION_DEMO = 2
const NOMBRE_LEGACY_MUNDO = 'Álex'

type EnvolturaDemo = { state?: Record<string, unknown>; version?: number; mundo?: 1 }

function leerEnvoltura(clave: string): EnvolturaDemo | null {
  try {
    const raw = window.localStorage.getItem(clave)
    const env = raw ? (JSON.parse(raw) as EnvolturaDemo) : null
    return env && typeof env === 'object' ? env : null
  } catch { return null }
}

// Nombre público de la sesión si NO es legacy (las legacy comparten identidad
// de sentinela). Es la clave del mapeo de identidad del mundo.
function nombreMundoSesion(): string | null {
  const ses = useSesionStore.getState().sesion
  if (!ses || EMAILS_LEGACY.has(ses.email.toLowerCase())) return null
  return ses.nombre
}

// Mapeo de identidad sobre las estructuras del mundo que nombran al usuario:
// crews (miembros/creador/admins), cupos de crew y chats de torneo.
// dir 'leer':   sentinela → 'Álex' (es el legacy) · miNombre → sentinela (soy yo)
// dir 'guardar': sentinela → miNombre · 'Álex' → sentinela (inversa exacta)
function mapearMundo(mundo: Record<string, unknown>, nombrePropio: string | null, dir: 'leer' | 'guardar'): Record<string, unknown> {
  if (!nombrePropio) return mundo
  const f = (x: string, sentinela: string): string => dir === 'leer'
    ? (x === sentinela ? NOMBRE_LEGACY_MUNDO : x === nombrePropio ? sentinela : x)
    : (x === sentinela ? nombrePropio : x === NOMBRE_LEGACY_MUNDO ? sentinela : x)
  const out: Record<string, unknown> = { ...mundo }
  if (Array.isArray(out.crews)) {
    out.crews = (out.crews as Crew[]).map(c => {
      const creadorBase = c.creador ?? (c.creadaPorMi ? CREW_USUARIO : undefined)
      const creador = creadorBase ? f(creadorBase, CREW_USUARIO) : undefined
      return {
        ...c,
        miembros: c.miembros.map(m => f(m, CREW_USUARIO)),
        ...(creador ? { creador } : {}),
        ...(c.admins ? { admins: c.admins.map(a => f(a, CREW_USUARIO)) } : {}),
        creadaPorMi: creador === CREW_USUARIO,
      }
    })
  }
  if (out.crewTorneo && typeof out.crewTorneo === 'object') {
    out.crewTorneo = Object.fromEntries(Object.entries(out.crewTorneo as Record<string, CupoCrew>)
      .map(([k, v]) => [k, { ...v, inscritos: v.inscritos.map(m => f(m, CREW_USUARIO)) }]))
  }
  if (out.chatsTorneo && typeof out.chatsTorneo === 'object') {
    out.chatsTorneo = Object.fromEntries(Object.entries(out.chatsTorneo as Record<string, { autor: string; texto: string; hora: string }[]>)
      .map(([k, v]) => [k, v.map(m => ({ ...m, autor: f(m.autor, 'Tú') }))]))
  }
  return out
}

// Resuelve el MUNDO vigente (envoltura {state, version}) y hace la migración
// de compatibilidad: un 'todh-demo' sin marca manda (se adopta su mundo).
function resolverMundo(): EnvolturaDemo | null {
  const legacy = leerEnvoltura(CLAVE_LEGACY)
  let w = leerEnvoltura(CLAVE_MUNDO)
  const legacySinMarca = !!legacy?.state && !legacy.mundo
  if (legacySinMarca && (claveDemoActual() === CLAVE_LEGACY || !w)) {
    // Blob externo (suite o app anterior): su mundo ES el mundo común.
    w = { state: soloMundo(legacy.state as Record<string, unknown>), version: legacy.version ?? 0 }
    try {
      window.localStorage.setItem(CLAVE_MUNDO, JSON.stringify(w))
      // Marcar el blob como adoptado (contenido intacto): a partir de aquí
      // manda 'todh-mundo' hasta que alguien vuelva a sembrar desde fuera.
      window.localStorage.setItem(CLAVE_LEGACY, JSON.stringify({ ...legacy, mundo: 1 }))
    } catch { /* almacenamiento lleno o bloqueado: seguimos en memoria */ }
  }
  if (!w && legacy?.state) w = { state: soloMundo(legacy.state as Record<string, unknown>), version: legacy.version ?? 0 }
  return w
}

const storagePorCuenta: StateStorage = {
  getItem: (_name) => {
    if (typeof window === 'undefined') return null
    const clave = claveDemoActual()
    const p = leerEnvoltura(clave)
    const w = resolverMundo()
    if (!p?.state && !w?.state) return null
    // El mundo SIEMPRE se materializa completo (defaults del seed + blob):
    // así el mapeo de identidad cubre también los defaults — sin esto, una
    // cuenta nueva sin 'todh-mundo' heredaría las crews de Álex sin mapear.
    const mundoBase = {
      ...soloMundo(DATOS_INICIALES as unknown as Record<string, unknown>),
      ...(w?.state ? soloMundo(w.state) : {}),
    }
    const mundo = mapearMundo(mundoBase, nombreMundoSesion(), 'leer')
    const personal = p?.state ? soloPersonal(p.state) : {}
    // La versión más BAJA manda: así un seed v0 de suite sigue pasando por
    // migrate() como en v1 (las migraciones son idempotentes).
    const version = Math.min(p?.version ?? VERSION_DEMO, w?.version ?? VERSION_DEMO)
    return JSON.stringify({ state: { ...personal, ...mundo }, version })
  },
  setItem: (_name, value) => {
    if (typeof window === 'undefined') return
    let env: EnvolturaDemo
    try { env = JSON.parse(value) as EnvolturaDemo } catch { return }
    const state = env.state ?? {}
    const clave = claveDemoActual()
    const mundo = mapearMundo(soloMundo(state), nombreMundoSesion(), 'guardar')
    try {
      window.localStorage.setItem(CLAVE_MUNDO, JSON.stringify({ state: mundo, version: env.version ?? VERSION_DEMO }))
      window.localStorage.setItem(clave, clave === CLAVE_LEGACY
        // Blob legacy COMPLETO y marcado (compatibilidad con las suites).
        ? JSON.stringify({ state, version: env.version ?? VERSION_DEMO, mundo: 1 })
        : JSON.stringify({ state: soloPersonal(state), version: env.version ?? VERSION_DEMO }))
    } catch { /* cuota llena: la demo sigue en memoria */ }
  },
  removeItem: (_name) => {
    // Borra SOLO la parte personal de la cuenta activa; el mundo es de todos.
    if (typeof window !== 'undefined') window.localStorage.removeItem(claveDemoActual())
  },
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      ...DATOS_INICIALES,

      // `crewId` (F6): la inscripción va EN NOMBRE de esa crew — el pago sigue
      // siendo individual; solo se anota tu plaza en el cupo del torneo.
      inscribir: (torneoId, nombreTorneo, crewId) => set((s) => {
        if (s.inscritos.includes(torneoId)) return s
        const crew = crewId ? s.crews.find(c => c.id === crewId) : undefined
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: 'Inscripción confirmada',
          cuerpo: crew
            ? `Estás dentro de "${nombreTorneo}" en nombre de ${crew.nombre} #${crew.tag}. Lo tienes en tu cartera.`
            : `Estás dentro de "${nombreTorneo}". Lo tienes en tu cartera.`,
          tituloKey: 'ntf.inscT', cuerpoKey: crew ? 'ntf.inscCrewC' : 'ntf.inscC',
          params: crew ? { torneo: nombreTorneo, crew: `${crew.nombre} #${crew.tag}` } : { torneo: nombreTorneo },
          cuando: 'ahora', leida: false, href: '/entradas',
        }
        const cupoPrevio = s.crewTorneo[torneoId]
        const conCupo = crew
          ? { crewTorneo: { ...s.crewTorneo, [torneoId]: {
              crewId: crew.id,
              inscritos: [...(cupoPrevio?.crewId === crew.id ? cupoPrevio.inscritos : []).filter(x => x !== CREW_USUARIO), CREW_USUARIO],
            } } }
          : {}
        // Mundo compartido: la inscripción de una cuenta nueva se anota por
        // email en el mundo — así el resto de cuentas (y el TO) la ven.
        const email = emailMundoInscripciones()
        const conMundo = email
          ? { inscripcionesCuentas: { ...s.inscripcionesCuentas, [torneoId]: [...(s.inscripcionesCuentas[torneoId] ?? []).filter(e => e !== email), email] } }
          : {}
        return { inscritos: [...s.inscritos, torneoId], notificaciones: [noti, ...s.notificaciones], ...conCupo, ...conMundo }
      }),
      // Cancelar inscripción (F7): la plaza NO se cubre sola — queda pendiente y
      // el TO decide quién entra de la cola (promoverDeEspera). La devolución
      // sigue la ventana de 24 h (cancelacion.ts); gratis → texto neutro.
      desinscribir: (torneoId, nombreTorneo) => set((s) => {
        const base = getTorneo(torneoId) || s.creados.find(c => c.id === torneoId)
        const t = base ? { ...base, ...(s.editados[torneoId] || {}) } : undefined
        const precio = t?.precio ?? 0
        const conDevolucion = !t || puedeCancelarConDevolucion(t)
        const notiJugador: Notificacion = precio === 0
          ? {
              id: nextId(), tipo: 'sistema', titulo: 'Inscripción cancelada',
              cuerpo: `Has cancelado tu plaza en «${nombreTorneo}». Queda libre para otro jugador.`,
              tituloKey: 'ntf.cancT', cuerpoKey: 'ntf.cancC', params: { torneo: nombreTorneo },
              cuando: 'ahora', leida: false,
            }
          : conDevolucion
            ? {
                id: nextId(), tipo: 'sistema', titulo: 'Devolución emitida',
                cuerpo: `Has cancelado tu plaza en «${nombreTorneo}» avisando con más de 24 h: ${precio}€ de vuelta en tu método de pago.`,
                tituloKey: 'ntf.devolucionT', cuerpoKey: 'ntf.devolucionC', params: { torneo: nombreTorneo, precio },
                cuando: 'ahora', leida: false,
              }
            : {
                id: nextId(), tipo: 'sistema', titulo: 'Inscripción cancelada sin devolución',
                cuerpo: `Has cancelado tu plaza en «${nombreTorneo}» con menos de 24 h de aviso: la inscripción (${precio}€) no se reembolsa.`,
                tituloKey: 'ntf.sinDevolucionT', cuerpoKey: 'ntf.sinDevolucionC', params: { torneo: nombreTorneo, precio },
                cuando: 'ahora', leida: false,
              }
        // Alerta al TO: la plaza liberada la resuelve él en /gestionar (F7).
        const notiTO: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Plaza liberada en «${nombreTorneo}»`,
          cuerpo: 'Un jugador ha cancelado su inscripción. Decide quién entra de la cola de espera.',
          tituloKey: 'ntf.plazaLibreT', cuerpoKey: 'ntf.plazaLibreC', params: { torneo: nombreTorneo },
          cuando: 'ahora', leida: false, href: `/gestionar/${torneoId}`,
        }
        // Si ibas en nombre de una crew (F6), tu plaza sale también del cupo.
        const cupo = s.crewTorneo[torneoId]
        const sinMiPlaza = cupo?.inscritos.includes(CREW_USUARIO)
          ? { crewTorneo: { ...s.crewTorneo, [torneoId]: { ...cupo, inscritos: cupo.inscritos.filter(x => x !== CREW_USUARIO) } } }
          : {}
        // Mundo compartido: al cancelar, el email de la cuenta sale del mundo.
        const email = emailMundoInscripciones()
        const sinMundo = email && s.inscripcionesCuentas[torneoId]?.includes(email)
          ? { inscripcionesCuentas: { ...s.inscripcionesCuentas, [torneoId]: s.inscripcionesCuentas[torneoId].filter(e => e !== email) } }
          : {}
        // (B) Si el torneo es de una CUENTA, la alerta va a su buzón del mundo
        // (la verá el TO en la suya); con orgs de muestra el blob compartido
        // legacy ya la enseña, así que se queda en las notis propias como hoy.
        const emailTO = emailDeOrgCuenta(t?.organizadorId)
        return {
          inscritos: s.inscritos.filter(id => id !== torneoId),
          plazasPendientes: { ...s.plazasPendientes, [torneoId]: (s.plazasPendientes[torneoId] ?? 0) + 1 },
          notificaciones: emailTO ? [notiJugador, ...s.notificaciones] : [notiJugador, notiTO, ...s.notificaciones],
          ...(emailTO ? { buzonCuentas: buzonConEntregas(s, [{ email: emailTO, noti: {
            tipo: 'sistema', titulo: notiTO.titulo, cuerpo: notiTO.cuerpo,
            tituloKey: notiTO.tituloKey, cuerpoKey: notiTO.cuerpoKey, params: notiTO.params, href: notiTO.href,
          } }]) } : {}),
          ...sinMiPlaza,
          ...sinMundo,
        }
      }),
      apuntarEspera: (torneoId, nombreTorneo, puesto) => set((s) => {
        if (s.listaEspera.includes(torneoId) || s.inscritos.includes(torneoId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: `En lista de espera · puesto ${puesto}`,
          cuerpo: `«${nombreTorneo}» está completo. Si se libera una plaza, el organizador decide quién entra de la cola; te avisaremos y cobraremos solo si entras.`,
          tituloKey: 'ntf.esperaT', cuerpoKey: 'ntf.esperaC', params: { puesto, torneo: nombreTorneo },
          cuando: 'ahora', leida: false, href: '/entradas',
        }
        // (C) La espera de una CUENTA vive también en el mundo: el TO la ve
        // en su cola de /gestionar y puede meterla cuando se libere plaza.
        const emailEspera = emailMundoInscripciones()
        const colaMundo = s.esperasCuentas[torneoId] ?? []
        const conMundo = emailEspera && !colaMundo.includes(emailEspera)
          ? { esperasCuentas: { ...s.esperasCuentas, [torneoId]: [...colaMundo, emailEspera] } }
          : {}
        return { listaEspera: [...s.listaEspera, torneoId], notificaciones: [noti, ...s.notificaciones], ...conMundo }
      }),
      salirEspera: (torneoId) => set((s) => {
        const emailEspera = emailMundoInscripciones()
        const conMundo = emailEspera && s.esperasCuentas[torneoId]?.includes(emailEspera)
          ? { esperasCuentas: { ...s.esperasCuentas, [torneoId]: s.esperasCuentas[torneoId].filter(e => e !== emailEspera) } }
          : {}
        return { listaEspera: s.listaEspera.filter(id => id !== torneoId), ...conMundo }
      }),
      // Acción EXPLÍCITA del TO (ampliar plazas o dar de baja a un inscrito):
      // la cola entra sola por orden (FIFO), n veces, vía la promoción única.
      liberarPlazas: (torneoId, nombreTorneo, n) => set((s) => {
        let acc = s
        for (let i = 0; i < n; i++) {
          const p = promoverUnoDeEspera(acc, torneoId, nombreTorneo)
          if (!p) break
          acc = { ...acc, ...p }
        }
        return acc === s ? s : acc
      }),
      // El TO decide (F7): mete a `quien` desde la cola; sin `quien`, al primero.
      promoverDeEspera: (torneoId, nombreTorneo, quien) => set((s) => promoverUnoDeEspera(s, torneoId, nombreTorneo, quien) ?? s),
      // O deja la plaza libre para nuevas inscripciones (también es decidir).
      descartarPlazasPendientes: (torneoId) => set((s) => ({
        plazasPendientes: { ...s.plazasPendientes, [torneoId]: 0 },
      })),

      alternarSeguir: (orgId, nombreOrg) => set((s) => {
        const sigue = s.seguidos.includes(orgId)
        if (sigue) return { seguidos: s.seguidos.filter(id => id !== orgId) }
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Sigues a ${nombreOrg}`,
          cuerpo: 'Te avisaremos cuando publique nuevos torneos.',
          tituloKey: 'ntf.siguesT', cuerpoKey: 'ntf.siguesC', params: { nombre: nombreOrg },
          cuando: 'ahora', leida: false,
        }
        return { seguidos: [...s.seguidos, orgId], notificaciones: [noti, ...s.notificaciones] }
      }),

      crearTorneo: (t) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Torneo publicado',
          cuerpo: `"${t.nombre}" ya es visible en Explorar.`, cuando: 'ahora', leida: false, href: `/torneo/${t.id}`,
        }
        return { creados: [t, ...s.creados], notificaciones: [noti, ...s.notificaciones] }
      }),

      // El juego custom se registra también en el catálogo en memoria (JUEGOS) para
      // que Explorar, mapa, fichas… lo resuelvan igual que un juego de serie.
      crearJuego: (j) => set((s) => {
        JUEGOS[j.id] = j
        return { juegosCustom: { ...s.juegosCustom, [j.id]: j } }
      }),

      editarTorneo: (id, patch) => set((s) => ({
        editados: { ...s.editados, [id]: { ...s.editados[id], ...patch } },
        creados: s.creados.map(c => c.id === id ? { ...c, ...patch } : c),
      })),

      cancelarTorneo: (id, nombre) => set((s) => {
        if (s.cancelados.includes(id)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Torneo cancelado',
          cuerpo: `Has cancelado "${nombre}". Se reembolsa el 100% a los inscritos.`, cuando: 'ahora', leida: false,
        }
        // La cola de espera del torneo cancelado se disuelve (no hay plaza que esperar)
        return { cancelados: [...s.cancelados, id], listaEspera: s.listaEspera.filter(x => x !== id), notificaciones: [noti, ...s.notificaciones] }
      }),

      setGestion: (id, patch) => set((s) => ({
        gestion: { ...s.gestion, [id]: { ...GESTION_VACIA, ...s.gestion[id], ...patch } },
      })),

      setMesasSede: (localId, mesas) => set((s) => ({
        mesasSede: { ...s.mesasSede, [localId]: mesas },
      })),

      // Preparar una mesa antes del directo: persiste la marca (o la limpia con
      // null) para que la sala preparada sobreviva a recargas y al arranque.
      prepararMesa: (torneoId, n, estado) => set((s) => {
        const marcas = { ...(s.prepMesas[torneoId] ?? {}) }
        if (estado === null) delete marcas[n]
        else marcas[n] = estado
        return { prepMesas: { ...s.prepMesas, [torneoId]: marcas } }
      }),

      // Disponibilidad de la sede: al publicarla (transición off→on) se avisa,
      // porque desde ese momento los TOs pueden reservar directo.
      setDispoSede: (localId, dispo) => set((s) => {
        const antes = s.dispoSedes[localId]
        const publicaAhora = dispo.publicada && !antes?.publicada
        const noti: Notificacion | null = publicaAhora ? {
          id: nextId(), tipo: 'sistema', titulo: 'Disponibilidad publicada',
          cuerpo: 'Tu horario ya es visible en tu ficha: los TOs de confianza pueden reservar directo.',
          cuando: 'ahora', leida: false,
        } : null
        return {
          dispoSedes: { ...s.dispoSedes, [localId]: dispo },
          ...(noti ? { notificaciones: [noti, ...s.notificaciones] } : {}),
        }
      }),

      crearSolicitudSede: (sol, nombreLocal) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Solicitud enviada',
          cuerpo: `Petición a ${nombreLocal}: ${sol.fecha} · ${sol.franja} · ${sol.personas} jugadores. Te avisaremos de su respuesta.`,
          cuando: 'ahora', leida: false,
        }
        return {
          solicitudesSede: [{ ...sol, id: nextId(), estado: 'pendiente' }, ...s.solicitudesSede],
          notificaciones: [noti, ...s.notificaciones],
        }
      }),

      hacerCheckin: (torneoId, nombreTorneo) => set((s) => {
        if (s.checkinsJugador.includes(torneoId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'combate', titulo: 'Check-in hecho ✓',
          cuerpo: `Ya estás dentro de «${nombreTorneo}». Te avisaremos (con vibración) cuando te toque mesa.`,
          tituloKey: 'ntf.checkinT', cuerpoKey: 'ntf.checkinC', params: { torneo: nombreTorneo },
          cuando: 'ahora', leida: false,
        }
        return { checkinsJugador: [...s.checkinsJugador, torneoId], notificaciones: [noti, ...s.notificaciones] }
      }),

      crearDisputa: (d, nombreTorneo) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'disputa', titulo: '⚠️ Disputa en Mesa ' + d.mesa,
          cuerpo: `${d.a} y ${d.b} no coinciden en el resultado («${nombreTorneo}»). Resuélvela en el modo directo.`,
          tituloKey: 'ntf.disputaT', cuerpoKey: 'ntf.disputaC', params: { mesa: d.mesa, a: d.a, b: d.b, torneo: nombreTorneo },
          cuando: 'ahora', leida: false, href: '/modo-directo',
        }
        return { disputas: [...s.disputas, { ...d, id: nextId() }], notificaciones: [noti, ...s.notificaciones] }
      }),

      // Doble reporte real: cada lado reporta una vez (el primero manda; nada de
      // re-reportar). Con AMBOS reportes: los personajes se guardan siempre —
      // cada jugador declara los suyos — y el marcador decide: coincide →
      // consenso (resultado al bracket por la misma vía que la disputa resuelta);
      // difiere → disputa para el TO en el modo directo.
      reportarResultado: ({ torneoId, matchId, lado, reporte, ctx }) => set((s) => {
        const previos = s.reportesMatch[torneoId]?.[matchId] ?? {}
        if (previos[lado]) return s
        const ambos: ReportesCombate = { ...previos, [lado]: reporte }
        const base: Partial<DemoState> = {
          reportesMatch: { ...s.reportesMatch, [torneoId]: { ...s.reportesMatch[torneoId], [matchId]: ambos } },
        }
        const rA = ambos.A, rB = ambos.B
        if (!rA || !rB) return base

        // Personajes declarados (cada uno del suyo, sin disputa posible)
        const pj = { A: (rA.personajes ?? []).slice(0, 2), B: (rB.personajes ?? []).slice(0, 2) }
        if (pj.A.length || pj.B.length) {
          base.personajesPorMatch = {
            ...s.personajesPorMatch,
            [torneoId]: { ...s.personajesPorMatch[torneoId], [matchId]: pj },
          }
          // Contador del perfil del jugador demo (solo sus propios reportes)
          const cont = { ...(s.personajesJugados[ctx.juego] ?? {}) }
          let tocado = false
          for (const r of [rA, rB]) {
            if (!r.deUsuario) continue
            for (const p of (r.personajes ?? []).slice(0, 2)) { cont[p] = (cont[p] ?? 0) + 1; tocado = true }
          }
          if (tocado) base.personajesJugados = { ...s.personajesJugados, [ctx.juego]: cont }
        }

        const coincide = rA.marcador[0] === rB.marcador[0] && rA.marcador[1] === rB.marcador[1]
        if (coincide) {
          const puntos = { a: rA.marcador[0], b: rA.marcador[1] }
          const ganador = puntos.a > puntos.b ? ctx.a : ctx.b
          const noti: Notificacion = {
            id: nextId(), tipo: 'combate', titulo: '✅ Resultado verificado',
            cuerpo: `Ambos reportes coinciden: ${ganador} gana ${Math.max(puntos.a, puntos.b)}–${Math.min(puntos.a, puntos.b)} en «${ctx.nombreTorneo}». El bracket ya ha avanzado.`,
            tituloKey: 'ntf.verificadoT', cuerpoKey: 'ntf.verificadoC',
            params: { ganador, marcador: `${Math.max(puntos.a, puntos.b)}–${Math.min(puntos.a, puntos.b)}`, torneo: ctx.nombreTorneo },
            cuando: 'ahora', leida: false, href: `/torneo/${torneoId}/bracket`,
          }
          return {
            ...base, ...gestionConResultado(s, torneoId, matchId, puntos),
            notificaciones: [noti, ...s.notificaciones],
            // (QA 01-09) El rival también se entera EN SU CUENTA del resultado
            buzonCuentas: buzonConEntregas(s, [ctx.a, ctx.b].map(nombre => ({
              email: emailDeNombre(nombre, s.perfilesCuentas),
              noti: { tipo: 'combate', titulo: noti.titulo, cuerpo: noti.cuerpo, tituloKey: noti.tituloKey, cuerpoKey: noti.cuerpoKey, params: noti.params, href: noti.href },
            }))),
          }
        }
        const noti: Notificacion = {
          id: nextId(), tipo: 'disputa', titulo: '⚠️ Disputa en Mesa ' + ctx.mesa,
          cuerpo: `${ctx.a} y ${ctx.b} no coinciden en el resultado («${ctx.nombreTorneo}»). Resuélvela en el modo directo.`,
          tituloKey: 'ntf.disputaT', cuerpoKey: 'ntf.disputaC', params: { mesa: ctx.mesa, a: ctx.a, b: ctx.b, torneo: ctx.nombreTorneo },
          cuando: 'ahora', leida: false, href: '/modo-directo',
        }
        return {
          ...base,
          disputas: [...s.disputas, { id: nextId(), torneoId, mesa: ctx.mesa, a: ctx.a, b: ctx.b, mid: matchId }],
          notificaciones: [noti, ...s.notificaciones],
          // En disputa el set ya no está jugándose: el crono se apaga.
          ...sinSetEnJuego(s, torneoId, matchId),
        }
      }),

      // Resolver: quita la disputa y, si venía de un combate real, escribe el
      // resultado para que el bracket avance. Con `marcador` el TO fija el
      // tanteo exacto (2-1, 3-0…); sin él se anota 2-1 por defecto (admin).
      resolverDisputa: (id, lado, marcador) => set((s) => {
        const d = s.disputas.find(x => x.id === id)
        if (!d) return s
        const ganador = lado === 'a' ? d.a : d.b
        const puntos = marcador ?? (lado === 'a' ? { a: 2, b: 1 } : { a: 1, b: 2 })
        const tanteo = `${Math.max(puntos.a, puntos.b)}–${Math.min(puntos.a, puntos.b)}`
        const noti: Notificacion = {
          id: nextId(), tipo: 'disputa', titulo: 'Disputa resuelta por el organizador',
          cuerpo: `${ganador} gana ${tanteo} el combate de la mesa ${d.mesa}. El resultado ya cuenta en el bracket.`,
          tituloKey: 'ntf.disputaResueltaT', cuerpoKey: 'ntf.disputaResueltaC', params: { ganador, tanteo, mesa: d.mesa },
          cuando: 'ahora', leida: false, href: d.mid ? `/torneo/${d.torneoId}/bracket` : undefined,
        }
        const g = d.mid ? gestionConResultado(s, d.torneoId, d.mid, puntos, lado) : {}
        return { disputas: s.disputas.filter(x => x.id !== id), notificaciones: [noti, ...s.notificaciones], ...g }
      }),

      contraofertarSede: (id, datos, nombreLocal) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: '↩️ Contraoferta de la sede',
          cuerpo: `${nombreLocal} propone: ${datos.fecha} · ${datos.franja} · ${datos.precio}€/noche. Acéptala o recházala en Sedes.`,
          cuando: 'ahora', leida: false, href: '/sedes',
        }
        return {
          solicitudesSede: s.solicitudesSede.map(x => x.id === id ? { ...x, estado: 'contraoferta' as const, contraoferta: datos } : x),
          notificaciones: [noti, ...s.notificaciones],
        }
      }),

      responderContraoferta: (id, acepta, nombreLocal) => set((s) => {
        const sol = s.solicitudesSede.find(x => x.id === id)
        const c = sol?.contraoferta
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema',
          titulo: acepta ? '✅ Sede confirmada (contraoferta)' : 'Contraoferta rechazada',
          cuerpo: acepta && c
            ? `Trato hecho con ${nombreLocal}: ${c.fecha} · ${c.franja} · ${c.precio}€/noche. ¡A publicar el torneo!`
            : `Has rechazado la contraoferta de ${nombreLocal}.`,
          cuando: 'ahora', leida: false, href: acepta ? '/crear-torneo' : undefined,
        }
        return {
          solicitudesSede: s.solicitudesSede.map(x => x.id === id
            ? { ...x, estado: acepta ? 'aceptada' as const : 'rechazada' as const, ...(acepta && c ? { fecha: c.fecha, franja: c.franja } : {}) }
            : x),
          notificaciones: [noti, ...s.notificaciones],
        }
      }),

      resolverSolicitudSede: (id, estado, nombreLocal) => set((s) => {
        const sol = s.solicitudesSede.find(x => x.id === id)
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema',
          titulo: estado === 'aceptada' ? '✅ Sede confirmada' : 'Solicitud rechazada',
          cuerpo: sol
            ? `${nombreLocal} ha ${estado === 'aceptada' ? 'aceptado' : 'rechazado'} tu petición (${sol.fecha} · ${sol.franja}).${estado === 'aceptada' ? ' ¡A publicar el torneo!' : ''}`
            : `${nombreLocal} ha respondido a tu solicitud.`,
          cuando: 'ahora', leida: false, href: estado === 'aceptada' ? '/crear-torneo' : undefined,
        }
        return {
          solicitudesSede: s.solicitudesSede.map(x => x.id === id ? { ...x, estado } : x),
          notificaciones: [noti, ...s.notificaciones],
        }
      }),

      pushNoti: (n) => set((s) => ({
        notificaciones: [{ id: nextId(), leida: false, cuando: n.cuando || 'ahora', ...n }, ...s.notificaciones],
      })),
      marcarLeidas: () => set((s) => ({ notificaciones: s.notificaciones.map(n => ({ ...n, leida: true })) })),
      noLeidas: () => {
        const s = get()
        return s.notificaciones.filter(n => !n.leida && !s.descartadas.includes(n.id)).length
      },
      // R1: quitar una notificación (swipe en móvil, X en PC). Se guarda el id
      // en `descartadas` en vez de borrarla: así los avisos autogenerados (p. ej.
      // inactividad) no reaparecen al volver a evaluarse.
      descartarNoti: (id) => set((s) => ({
        descartadas: s.descartadas.includes(id) ? s.descartadas : [...s.descartadas, id],
      })),
      descartarTodasNotis: () => set((s) => ({
        descartadas: Array.from(new Set([...s.descartadas, ...s.notificaciones.map(n => n.id)])),
      })),
      // Aviso de inactividad (>45 días sin jugar): id fijo para no duplicarlo
      // entre visitas; si el usuario lo descarta, no vuelve a entrar.
      avisarInactividad: (titulo, cuerpo, extra) => set((s) => s.notificaciones.some(n => n.id === 'inactividad-45') ? s : ({
        notificaciones: [{ id: 'inactividad-45', tipo: 'inactividad' as const, titulo, cuerpo, ...extra, cuando: 'ahora', leida: false, href: '/explorar' }, ...s.notificaciones],
      })),
      setJuegoPerfil: (juegoPerfil) => set({ juegoPerfil }),
      setAvatarEmoji: (avatarEmoji) => set({ avatarEmoji }),
      // ── Paquete Chat: identidad editable del perfil (persisten en la demo) ──
      setFotoPerfil: (fotoPerfil) => set((s) => conPerfilCuenta(s, { fotoPerfil })),
      setBannerPerfil: (bannerPerfil) => set({ bannerPerfil }),
      setBioPerfil: (bio) => set((s) => conPerfilCuenta(s, { bioPerfil: bio.slice(0, 160) })),
      // Perfil de organizador editable desde /perfil/organizador (decisión
      // 30-08). organizadorEfectivo() lo funde vía el lector registrado abajo.
      editarPerfilOrg: (orgId, patch) => set((s) => ({
        perfilesOrg: { ...s.perfilesOrg, [orgId]: { ...s.perfilesOrg[orgId], ...patch } },
      })),
      // (B) Entrega del buzón cruzado + reconciliación con el mundo. Al entrar
      // una cuenta: sus notis pendientes pasan al buzón personal, y las
      // inscripciones hechas EN SU NOMBRE por el TO (promoción desde la cola)
      // entran a su cartera — el TO no puede escribir el blob personal ajeno.
      drenarBuzon: () => set((s) => {
        const email = useSesionStore.getState().sesion?.email?.toLowerCase()
        if (!email || EMAILS_LEGACY.has(email)) return s
        const pendientes = s.buzonCuentas[email] ?? []
        const delMundo = Object.keys(s.inscripcionesCuentas).filter(tid => s.inscripcionesCuentas[tid].includes(email))
        const nuevas = delMundo.filter(tid => !s.inscritos.includes(tid))
        if (pendientes.length === 0 && nuevas.length === 0) return s
        const buzon = { ...s.buzonCuentas }
        delete buzon[email]
        return {
          ...(pendientes.length ? { notificaciones: [...pendientes, ...s.notificaciones], buzonCuentas: buzon } : {}),
          ...(nuevas.length ? { inscritos: [...s.inscritos, ...nuevas], listaEspera: s.listaEspera.filter(id => !nuevas.includes(id)) } : {}),
        }
      }),
      // (E) Chat directo entre cuentas amigas: persiste en el mundo común y el
      // amigo recibe además un aviso en su buzón (solo del primer mensaje
      // seguido, para no inundar de notis una conversación).
      enviarMensajeAmigo: (email, texto) => set((s) => {
        const yo = emailSesionJugador()
        const el = email.toLowerCase()
        const limpio = texto.trim()
        if (!yo || yo === el || !limpio) return s
        const clave = claveAmigos(yo, el)
        const hilo = s.chatsAmigos[clave] ?? []
        const miNombre = s.perfilesCuentas[yo]?.nombre ?? useSesionStore.getState().sesion?.nombre ?? yo
        const avisar = hilo[hilo.length - 1]?.de !== yo
        return {
          chatsAmigos: { ...s.chatsAmigos, [clave]: [...hilo, { de: yo, texto: limpio.slice(0, 500), hora: 'ahora' }] },
          ...(avisar ? { buzonCuentas: buzonConEntregas(s, [{ email: el, noti: {
            tipo: 'sistema', titulo: `💬 Mensaje de ${miNombre}`,
            cuerpo: limpio.slice(0, 120), tituloKey: 'bz.msjT', params: { nombre: miNombre }, href: '/amigos',
          } }]) } : {}),
        }
      }),
      // Crono del set (pedido 31-08): arranca con el «todo listo» y es
      // idempotente — si el rival ya lo arrancó, se comparte el mismo inicio.
      // Aviso del TO a TODOS los inscritos de cuentas (bracket listo, resultados
      // publicados, avisos manuales): antes se lo quedaba el propio TO (QA 01-09).
      avisarInscritosTorneo: (torneoId, noti) => set((s) => ({
        buzonCuentas: buzonConEntregas(s, (s.inscripcionesCuentas[torneoId] ?? []).map(email => ({ email, noti }))),
      })),
      iniciarSetEnJuego: (torneoId, mid) => set((s) => {
        if (s.setsEnJuego[torneoId]?.[mid]) return s
        return { setsEnJuego: { ...s.setsEnJuego, [torneoId]: { ...s.setsEnJuego[torneoId], [mid]: Date.now() } } }
      }),
      // Torneo PRIVADO (31-08): el TO invita a una cuenta — queda en la lista
      // del mundo y el invitado se entera por su buzón al entrar.
      invitarATorneo: (torneoId, nombreTorneo, email) => set((s) => {
        const el = email.toLowerCase()
        const lista = s.invitadosTorneo[torneoId] ?? []
        if (lista.includes(el)) return s
        return {
          invitadosTorneo: { ...s.invitadosTorneo, [torneoId]: [...lista, el] },
          buzonCuentas: buzonConEntregas(s, [{ email: el, noti: {
            tipo: 'inscripcion', titulo: `🎟️ Invitación a «${nombreTorneo}»`,
            cuerpo: 'El organizador te ha invitado a su torneo privado. Tu plaza te espera: entra a la ficha e inscríbete.',
            tituloKey: 'pv.invT', cuerpoKey: 'pv.invC', params: { torneo: nombreTorneo }, href: `/torneo/${torneoId}`,
          } }]),
        }
      }),
      // Página pública de la sede (31-08): cada control guarda al momento.
      editarPerfilSede: (localId, patch) => set((s) => ({
        perfilesSede: { ...s.perfilesSede, [localId]: { ...s.perfilesSede[localId], ...patch } },
      })),
      // El tag de usuario #XABCD se genera al primer uso y queda fijo. Se
      // re-publica también en el perfil público del mundo (búsqueda exacta).
      asegurarUserTag: () => set((s) => s.userTag ? s : conPerfilCuenta(s, { userTag: generarTagUsuario() })),
      // Regenerable UNA sola vez (como en Discord con el discriminador: evita
      // el abuso de rotar identidad y mantiene el tag citable entre amigos).
      regenerarTag: () => set((s) => s.tagRegenerado ? s : conPerfilCuenta(s, { userTag: generarTagUsuario(), tagRegenerado: true })),
      setMainsPerfil: (juego, mains) => set((s) => ({ mainsPerfil: { ...s.mainsPerfil, [juego]: mains } })),
      setJuegosFavoritos: (juegosFavoritos) => set({ juegosFavoritos, onboardingVisto: true }),
      setIdioma: (idioma) => set({ idioma }),
      inscribirEspectador: (id, nombre) => set((s) => {
        if (s.entradasEspectador.includes(id)) return s
        // Cupo de espectador (31-08): cerrado por el TO o lleno → no entra.
        const base = getTorneo(id) || s.creados.find(c => c.id === id)
        const t = base ? { ...base, ...(s.editados[id] || {}) } : undefined
        if (t?.verCerrado) return s
        const lista = s.espectadoresCuentas[id] ?? []
        if (t?.plazasVer != null && t.plazasVer > 0 && lista.length >= t.plazasVer) return s
        const n: Notificacion = { id: nextId(), tipo: 'inscripcion', titulo: 'Entrada de espectador', cuerpo: `Ya tienes tu entrada para ver «${nombre}». Enséñala en la puerta.`, tituloKey: 'ntf.espectadorT', cuerpoKey: 'ntf.espectadorC', params: { torneo: nombre }, cuando: 'ahora', leida: false, href: '/entradas' }
        // Mundo compartido: el cupo de espectadores se comparte entre cuentas.
        const email = emailMundoInscripciones()
        const conMundo = email && !lista.includes(email)
          ? { espectadoresCuentas: { ...s.espectadoresCuentas, [id]: [...lista, email] } }
          : {}
        return { entradasEspectador: [...s.entradasEspectador, id], notificaciones: [n, ...s.notificaciones], ...conMundo }
      }),
      canjearReferido: (nivel) => set((s) => {
        if (s.referidos.canjeados.includes(nivel) || s.referidos.jugados < nivel) return s
        const premio = nivel === 1 ? 'Entrada de espectador gratis' : nivel === 3 ? 'Inscripción estándar gratis' : 'Acceso a un torneo Oro este mes'
        const cuerpoKey = nivel === 1 ? 'ntf.recompensaC1' : nivel === 3 ? 'ntf.recompensaC3' : 'ntf.recompensaC5'
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: 'Recompensa canjeada', cuerpo: `${premio} — ya está aplicada en tu cuenta.`, tituloKey: 'ntf.recompensaT', cuerpoKey, cuando: 'ahora', leida: false, href: '/perfil' }
        return {
          referidos: { ...s.referidos, canjeados: [...s.referidos.canjeados, nivel] },
          notificaciones: [n, ...s.notificaciones],
        }
      }),
      unirsePreregistro: () => set((s) => s.preregistro.unido ? s : ({ preregistro: { ...s.preregistro, unido: true } })),
      compartirPreregistro: () => set((s) => ({
        preregistro: { ...s.preregistro, compartidos: s.preregistro.compartidos + 1, pos: Math.max(12, s.preregistro.pos - 47) },
      })),
      // País competitivo: se elige al registrarte y puede corregirse. Tus puntos
      // van siempre al ranking de TU país, juegues donde juegues.
      setPaisJugador: (paisJugador) => set({ paisJugador }),
      // Interruptor del catálogo (admin): un juego oculto deja de salir en la
      // app de jugador y en el alta de torneos; sus torneos ya creados no se tocan.
      alternarJuegoOculto: (juegoId) => set((s) => ({
        juegosOcultos: s.juegosOcultos.includes(juegoId) ? s.juegosOcultos.filter(x => x !== juegoId) : [...s.juegosOcultos, juegoId],
      })),
      crearReporte: (r) => set((s) => {
        const rep: ReporteTO = { ...r, id: nextId(), estado: 'abierto' }
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: `Revisar ${r.tipo}`, cuerpo: `Reporte en «${r.torneoNombre}»: ${r.motivo}`, cuando: 'ahora', leida: false, href: `/gestionar/${r.torneoId}` }
        return { reportes: [rep, ...s.reportes], notificaciones: [n, ...s.notificaciones] }
      }),
      resolverReporte: (id, accion, respuesta) => set((s) => {
        const rep = s.reportes.find(r => r.id === id)
        if (!rep) return s
        const n: Notificacion = {
          id: nextId(), tipo: 'sistema',
          titulo: accion === 'cambiado' ? 'Seeding revisado' : 'Reporte respondido',
          cuerpo: accion === 'cambiado' ? `El organizador ha ajustado el ${rep.tipo} de «${rep.torneoNombre}».` : `El organizador mantiene el ${rep.tipo}: ${respuesta || 'revisado y correcto'}.`,
          cuando: 'ahora', leida: false, href: `/torneo/${rep.torneoId}/bracket`,
        }
        return {
          reportes: s.reportes.map(r => r.id === id ? { ...r, estado: accion, respuesta } : r),
          notificaciones: [n, ...s.notificaciones],
        }
      }),
      suscribirTier: (tier) => set((s) => {
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: `Torneum ${tier} activado`, cuerpo: 'Ya puedes entrar en torneos de tu tier y lucir la insignia. Se renueva cada mes; cancela cuando quieras.', tituloKey: 'ntf.tierT', cuerpoKey: 'ntf.tierC', params: { tier }, cuando: 'ahora', leida: false, href: '/perfil' }
        return { tierUsuario: tier, notificaciones: [n, ...s.notificaciones] }
      }),
      enviarChat: (torneoId, texto) => set((s) => ({
        chatsTorneo: { ...s.chatsTorneo, [torneoId]: [...(s.chatsTorneo[torneoId] || []), { autor: 'Tú', texto, hora: 'ahora' }] },
      })),

      // Alta de sede self-service (/alta-local): crea el expediente que el admin
      // resuelve en Verificación. Cierra el callejón de /para-locales.
      crearExpedienteSede: (e) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Solicitud de alta de sede enviada',
          cuerpo: `Expediente de «${e.nombre}» recibido. Revisamos la documentación y te contactamos en 24-48 h.`,
          cuando: 'ahora', leida: false,
        }
        return {
          expedientesSede: [{ ...e, id: nextId(), estado: 'pendiente' as const }, ...s.expedientesSede],
          notificaciones: [noti, ...s.notificaciones],
        }
      }),
      // Aprobar y rechazar hacen cosas DISTINTAS y quedan registradas (antes ambos
      // botones solo borraban el expediente de la lista sin avisar a nadie).
      resolverExpedienteSede: (id, aprueba) => set((s) => {
        const e = s.expedientesSede.find(x => x.id === id)
        if (!e || e.estado !== 'pendiente') return s
        const noti: Notificacion = aprueba
          ? { id: nextId(), tipo: 'sistema', titulo: `🏟️ Sede aprobada: ${e.nombre}`, cuerpo: 'Expediente verificado. La sede ya puede publicar disponibilidad y recibir solicitudes de organizadores.', cuando: 'ahora', leida: false }
          : { id: nextId(), tipo: 'sistema', titulo: `Expediente rechazado: ${e.nombre}`, cuerpo: 'Falta documentación o datos fiscales. El representante puede volver a solicitarlo completando el expediente.', cuando: 'ahora', leida: false }
        return {
          expedientesSede: s.expedientesSede.map(x => x.id === id ? { ...x, estado: aprueba ? 'aprobada' as const : 'rechazada' as const } : x),
          notificaciones: [noti, ...s.notificaciones],
        }
      }),
      resolverExpedienteTO: (id, aprueba) => set((s) => {
        const e = s.expedientesTO.find(x => x.id === id)
        if (!e || e.estado !== 'pendiente') return s
        const noti: Notificacion = aprueba
          ? { id: nextId(), tipo: 'sistema', titulo: `🎉 Organizador aprobado: ${e.nombre}`, cuerpo: 'Expediente y entrevista superados. Ya puede crear y cobrar torneos.', cuando: 'ahora', leida: false }
          : { id: nextId(), tipo: 'sistema', titulo: `Expediente rechazado: ${e.nombre}`, cuerpo: 'No supera la revisión por ahora. Puede volver a presentarse con más experiencia.', cuando: 'ahora', leida: false }
        return {
          expedientesTO: s.expedientesTO.map(x => x.id === id ? { ...x, estado: aprueba ? 'aprobado' as const : 'rechazado' as const } : x),
          notificaciones: [noti, ...s.notificaciones],
        }
      }),

      // Un TO ya no mete juegos directamente en el catálogo: los propone y el
      // admin los revisa en su panel de Juegos (con plantilla) antes del alta.
      proponerJuego: (p) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Juego propuesto: ${p.nombre}`,
          cuerpo: 'Lo revisa el equipo de Torneum. Si se aprueba, podrás crear torneos suyos y aparecerá en el catálogo.',
          cuando: 'ahora', leida: false,
        }
        return { propuestasJuego: [{ ...p, id: nextId() }, ...s.propuestasJuego], notificaciones: [noti, ...s.notificaciones] }
      }),
      retirarPropuestaJuego: (id) => set((s) => ({ propuestasJuego: s.propuestasJuego.filter(x => x.id !== id) })),
      rechazarPropuestaJuego: (id) => set((s) => {
        const p = s.propuestasJuego.find(x => x.id === id)
        if (!p) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Propuesta rechazada: ${p.nombre}`,
          cuerpo: 'De momento no entra en el catálogo. Puedes volver a proponerlo con más contexto (comunidad, formatos, torneos previos).',
          cuando: 'ahora', leida: false,
        }
        return { propuestasJuego: s.propuestasJuego.filter(x => x.id !== id), notificaciones: [noti, ...s.notificaciones] }
      }),

      // Reputación bidireccional PERSISTENTE (antes las estrellas se perdían al recargar).
      valorarSede: (solicitudId, nombreLocal, estrellas) => set((s) => {
        if (s.valoracionesSedes[solicitudId]) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Sede valorada',
          cuerpo: `Has puntuado a ${nombreLocal} con ${estrellas}★. Su reputación ayuda a otros organizadores.`,
          cuando: 'ahora', leida: false,
        }
        return { valoracionesSedes: { ...s.valoracionesSedes, [solicitudId]: estrellas }, notificaciones: [noti, ...s.notificaciones] }
      }),
      valorarOrganizador: (torneoId, nombreOrg, estrellas) => set((s) => {
        if (s.valoracionesTO[torneoId]) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Organizador valorado',
          cuerpo: `Has puntuado a ${nombreOrg} con ${estrellas}★ por este torneo. Las valoraciones construyen su reputación.`,
          cuando: 'ahora', leida: false,
        }
        return { valoracionesTO: { ...s.valoracionesTO, [torneoId]: estrellas }, notificaciones: [noti, ...s.notificaciones] }
      }),

      agregarTOConfianza: (localId, orgId, nombreOrg, nombreLocal) => set((s) => {
        const lista = s.tosConfianza[localId] ?? []
        if (lista.includes(orgId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `⭐ TO de confianza: ${nombreOrg}`,
          cuerpo: `${nombreLocal} le da reserva directa: sus solicitudes de fecha se confirman al momento.`,
          cuando: 'ahora', leida: false,
        }
        return { tosConfianza: { ...s.tosConfianza, [localId]: [...lista, orgId] }, notificaciones: [noti, ...s.notificaciones] }
      }),
      quitarTOConfianza: (localId, orgId) => set((s) => ({
        tosConfianza: { ...s.tosConfianza, [localId]: (s.tosConfianza[localId] ?? []).filter(x => x !== orgId) },
      })),

      // Overrides del admin sobre las sedes (persisten; antes se perdían al recargar).
      patchFichaSede: (localId, patch) => set((s) => ({
        fichasSede: { ...s.fichasSede, [localId]: { ...s.fichasSede[localId], ...patch } },
      })),
      alternarUsuarioSuspendido: (id) => set((s) => ({
        usuariosSuspendidos: s.usuariosSuspendidos.includes(id)
          ? s.usuariosSuspendidos.filter(x => x !== id)
          : [...s.usuariosSuspendidos, id],
      })),
      setBetaCerrada: (betaCerrada) => set({ betaCerrada }),
      agregarCodigoBeta: (codigo) => set((s) => ({ codigosBeta: [...s.codigosBeta, codigo] })),
      alternarSilenciado: (torneoId, autor) => set((s) => {
        const m = s.moderacionChat[torneoId] ?? { silenciados: [], borrados: [] }
        const silenciados = m.silenciados.includes(autor) ? m.silenciados.filter(x => x !== autor) : [...m.silenciados, autor]
        return { moderacionChat: { ...s.moderacionChat, [torneoId]: { ...m, silenciados } } }
      }),
      alternarBorrado: (torneoId, idx) => set((s) => {
        const m = s.moderacionChat[torneoId] ?? { silenciados: [], borrados: [] }
        const borrados = m.borrados.includes(idx) ? m.borrados.filter(x => x !== idx) : [...m.borrados, idx]
        return { moderacionChat: { ...s.moderacionChat, [torneoId]: { ...m, borrados } } }
      }),

      // ── Capa social: amigos y grupos de chat (persisten en la demo) ──
      agregarAmigo: (nombre) => set((s) => {
        if (s.amigos.includes(nombre)) return s
        const n: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `${nombre} y tú ya sois amigos`,
          cuerpo: 'Veréis en qué torneos compite cada uno y podéis compartir grupo de chat.',
          cuando: 'ahora', leida: false, href: '/amigos',
        }
        return { amigos: [...s.amigos, nombre], solicitudesAmistad: s.solicitudesAmistad.filter(x => x !== nombre), notificaciones: [n, ...s.notificaciones] }
      }),
      quitarAmigo: (nombre) => set((s) => ({
        amigos: s.amigos.filter(x => x !== nombre),
        // También sale de tus grupos propios (los ajenos no se tocan)
        gruposChat: s.gruposChat.map(g => g.propio ? { ...g, miembros: g.miembros.filter(m => m !== nombre) } : g),
      })),
      responderAmistad: (nombre, acepta) => set((s) => {
        if (!s.solicitudesAmistad.includes(nombre)) return s
        const n: Notificacion | null = acepta ? {
          id: nextId(), tipo: 'sistema', titulo: `${nombre} y tú ya sois amigos`,
          cuerpo: 'Solicitud aceptada. Añádele a un grupo de chat cuando quieras.',
          cuando: 'ahora', leida: false, href: '/amigos',
        } : null
        return {
          solicitudesAmistad: s.solicitudesAmistad.filter(x => x !== nombre),
          ...(acepta ? { amigos: [...s.amigos, nombre] } : {}),
          ...(n ? { notificaciones: [n, ...s.notificaciones] } : {}),
        }
      }),
      crearGrupoChat: (nombre, emoji, miembros) => set((s) => {
        const n: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Grupo «${nombre}» creado`,
          cuerpo: `${miembros.length} ${miembros.length === 1 ? 'amigo añadido' : 'amigos añadidos'}. El chat ya está abierto.`,
          cuando: 'ahora', leida: false, href: '/amigos',
        }
        return {
          gruposChat: [{ id: nextId(), nombre, emoji, miembros, mensajes: [], propio: true }, ...s.gruposChat],
          notificaciones: [n, ...s.notificaciones],
        }
      }),
      // Marca una conversación como leída hasta `total` (nunca retrocede).
      marcarChatLeido: (clave, total) => set((s) => {
        if ((s.leidosChat[clave] ?? 0) >= total) return s
        return { leidosChat: { ...s.leidosChat, [clave]: total } }
      }),
      enviarChatGrupo: (grupoId, texto) => set((s) => ({
        gruposChat: s.gruposChat.map(g => g.id === grupoId
          ? { ...g, mensajes: [...g.mensajes, { autor: 'Tú', texto, hora: 'ahora' }] }
          : g),
      })),
      salirGrupoChat: (grupoId) => set((s) => ({ gruposChat: s.gruposChat.filter(g => g.id !== grupoId) })),

      // ── Crews (F6) ──
      // Crear una crew: valida tag (2-4 A-Z0-9, único) y el límite de 2 crews
      // por juego por jugador (la UI enseña el motivo; aquí se re-garantiza).
      // Abre AUTOMÁTICAMENTE su grupo de chat vinculado (crewId) — por él
      // llegan las convocatorias de inscripción por equipos.
      crearCrew: ({ nombre, tag, juego, emoji, color, miembros }) => set((s) => {
        const TAG = tag.trim().toUpperCase()
        if (!nombre.trim() || !TAG_RE.test(TAG)) return s
        if (s.crews.some(c => c.tag === TAG)) return s
        if (s.crews.filter(c => c.juego === juego && c.miembros.includes(CREW_USUARIO)).length >= MAX_CREWS_POR_JUEGO) return s
        const crew: Crew = {
          id: nextId(), nombre: nombre.trim(), tag: TAG, juego, emoji, color,
          miembros: [CREW_USUARIO, ...miembros.filter(m => m !== CREW_USUARIO)], creadaPorMi: true,
          creador: CREW_USUARIO, admins: [CREW_USUARIO],
        }
        const grupo: GrupoChat = {
          id: nextId(), nombre: crew.nombre, emoji: emoji || '⚔️',
          miembros: miembros.filter(m => m !== CREW_USUARIO), mensajes: [], propio: true, crewId: crew.id,
        }
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `⚔️ Crew «${crew.nombre}» #${TAG} creada`,
          cuerpo: `${grupo.miembros.length} ${grupo.miembros.length === 1 ? 'miembro' : 'miembros'} · su grupo de chat ya está abierto. El tag os identificará en torneos y ranking de ${JUEGOS[juego]?.corto ?? juego}.`,
          cuando: 'ahora', leida: false, href: '/amigos',
        }
        // Al final del array: el orden es la antigüedad (representación de tag).
        return { crews: [...s.crews, crew], gruposChat: [grupo, ...s.gruposChat], notificaciones: [noti, ...s.notificaciones] }
      }),
      // Salir de una crew (modelo de administración 30-08): al creador NADIE
      // puede echarle — solo puede salirse él mismo, desde aquí. Si el creador
      // sale y quedan miembros, la crew PERSISTE y hereda creador/gestión el
      // ADMIN MÁS ANTIGUO (admins se mantiene en orden de concesión, así que
      // es el primero que quede); sin más admins, el miembro más antiguo. Solo
      // si la crew queda vacía se disuelve (y su tag desaparece con ella).
      // El grupo de chat vinculado no se toca (se sale aparte, como siempre).
      salirCrew: (crewId) => set((s) => {
        const c = s.crews.find(x => x.id === crewId)
        if (!c) return s
        const miembros = c.miembros.filter(m => m !== CREW_USUARIO)
        const admins = (c.admins ?? []).filter(a => a !== CREW_USUARIO)
        const creador = c.creador ?? (c.creadaPorMi ? CREW_USUARIO : c.miembros[0])
        if (creador !== CREW_USUARIO) {
          // Miembro raso o admin no creador: sale y la crew sigue igual.
          return { crews: s.crews.map(x => x.id === crewId ? { ...x, miembros, admins } : x) }
        }
        if (miembros.length === 0) return { crews: s.crews.filter(x => x.id !== crewId) }
        const heredero = admins[0] ?? miembros[0]
        return {
          crews: s.crews.map(x => x.id === crewId
            ? { ...x, miembros, creador: heredero, admins: admins.includes(heredero) ? admins : [heredero, ...admins], creadaPorMi: false }
            : x),
        }
      }),
      // ── Administración de crews (paquete Chat): las hojas de edición solo se
      // abren para admins (esAdminCrew); el store re-garantiza los invariantes
      // duros — el creador no se puede quitar ni perder el rol.
      editarCrew: (crewId, patch) => set((s) => ({
        crews: s.crews.map(c => c.id === crewId
          ? {
              ...c,
              ...(patch.nombre?.trim() ? { nombre: patch.nombre.trim() } : {}),
              ...(patch.descripcion !== undefined ? { descripcion: patch.descripcion.trim() } : {}),
              ...(patch.banner !== undefined ? { banner: patch.banner ?? undefined } : {}),
            }
          : c),
      })),
      agregarMiembroCrew: (crewId, nombre) => set((s) => ({
        crews: s.crews.map(c => c.id === crewId && !c.miembros.includes(nombre)
          ? { ...c, miembros: [...c.miembros, nombre] }
          : c),
      })),
      // Quitar a cualquiera MENOS al creador (él solo puede salirse: salirCrew).
      quitarMiembroCrew: (crewId, nombre) => set((s) => ({
        crews: s.crews.map(c => c.id === crewId && nombre !== c.creador
          ? { ...c, miembros: c.miembros.filter(m => m !== nombre), admins: (c.admins ?? []).filter(a => a !== nombre) }
          : c),
      })),
      // Conceder el rol puede cualquier admin; REVOCARLO solo el creador (lo
      // gatea la UI); el creador nunca entra ni sale del array por aquí.
      alternarAdminCrew: (crewId, nombre) => set((s) => ({
        crews: s.crews.map(c => {
          if (c.id !== crewId || nombre === c.creador || !c.miembros.includes(nombre)) return c
          const admins = c.admins ?? [c.creador]
          return { ...c, admins: admins.includes(nombre) ? admins.filter(a => a !== nombre) : [...admins, nombre] }
        }),
      })),
      // Inscripción por equipos (spec §7.6): cualquier miembro la inicia → se
      // abre el cupo (tamGrupo de la plantilla del juego) y cae la convocatoria
      // en el grupo de chat de la crew, clicable hacia la ficha con ?crew=.
      // Cada jugador entra por el enlace y paga SU plaza por su cuenta.
      abrirInscripcionCrew: (torneoId, nombreTorneo, crewId) => set((s) => {
        if (s.crewTorneo[torneoId]) return s
        const crew = s.crews.find(c => c.id === crewId)
        if (!crew) return s
        const plazas = plantillaDe(crew.juego).tamGrupo
        const msg: MensajeGrupo = {
          autor: 'Tú', hora: 'ahora', torneoId, crewId,
          texto: `⚔️ He abierto la inscripción de ${crew.nombre} #${crew.tag} a «${nombreTorneo}» — ${plazas} plazas. Entra y paga tu plaza:`,
        }
        const yaHayGrupo = s.gruposChat.some(g => g.crewId === crewId)
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: `⚔️ Cupo de ${crew.nombre} abierto`,
          cuerpo: `Convocatoria enviada al grupo de la crew: ${plazas} plazas para «${nombreTorneo}». Cada miembro paga su plaza por su cuenta.`,
          cuando: 'ahora', leida: false, href: `/torneo/${torneoId}?crew=${crewId}`,
        }
        return {
          crewTorneo: { ...s.crewTorneo, [torneoId]: { crewId, inscritos: [] } },
          gruposChat: yaHayGrupo
            ? s.gruposChat.map(g => g.crewId === crewId ? { ...g, mensajes: [...g.mensajes, msg] } : g)
            // Estado antiguo sin el grupo sembrado: se abre aquí (resiliencia).
            : [{ id: nextId(), nombre: crew.nombre, emoji: crew.emoji || '⚔️', miembros: crew.miembros.filter(m => m !== CREW_USUARIO), mensajes: [msg], propio: !!crew.creadaPorMi, crewId }, ...s.gruposChat],
          notificaciones: [noti, ...s.notificaciones],
        }
      }),
      // Un miembro seed paga su plaza (lo simula la ficha a los pocos segundos,
      // patrón del rival demo de F5): avanza el cupo y avisa en el chat.
      confirmarPlazaCrew: (torneoId, quien) => set((s) => {
        const cupo = s.crewTorneo[torneoId]
        if (!cupo || cupo.inscritos.includes(quien)) return s
        const crew = s.crews.find(c => c.id === cupo.crewId)
        if (!crew || !crew.miembros.includes(quien)) return s
        const plazas = plantillaDe(crew.juego).tamGrupo
        if (cupo.inscritos.length >= plazas) return s
        const inscritos = [...cupo.inscritos, quien]
        const msg: MensajeGrupo = { autor: quien, hora: 'ahora', texto: `Plaza pagada ✅ Vamos ${inscritos.length}/${plazas}.` }
        return {
          crewTorneo: { ...s.crewTorneo, [torneoId]: { ...cupo, inscritos } },
          gruposChat: s.gruposChat.map(g => g.crewId === crew.id ? { ...g, mensajes: [...g.mensajes, msg] } : g),
        }
      }),
      // ── Mundo compartido (30-08): amistades ENTRE cuentas demo ──
      // Ids = emails. La solicitud vive en el mundo: el destinatario la ve en
      // su pestaña de Solicitudes al entrar con su cuenta (Aceptar/Rechazar).
      solicitarAmistadCuenta: (email) => set((s) => {
        const yo = emailSesionJugador()
        const el = email.toLowerCase()
        if (!yo || yo === el) return s
        if (s.amistadesCuentas.some(a => (a.de === yo && a.a === el) || (a.de === el && a.a === yo))) return s
        const nombre = nombreCuentaDemo(el, s.perfilesCuentas)
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Solicitud de amistad enviada',
          cuerpo: `Le has pedido amistad a ${nombre}. La verá al entrar con su cuenta.`,
          tituloKey: 'mc.ntfSolT', cuerpoKey: 'mc.ntfSolC', params: { nombre },
          cuando: 'ahora', leida: false, href: '/amigos',
        }
        // (B) El destinatario se entera en SU cuenta: buzón cruzado del mundo.
        const miNombre = s.perfilesCuentas[yo]?.nombre ?? useSesionStore.getState().sesion?.nombre ?? yo
        return conPerfilCuenta(s, {
          amistadesCuentas: [...s.amistadesCuentas, { de: yo, a: el, estado: 'pendiente' as const }],
          notificaciones: [noti, ...s.notificaciones],
          buzonCuentas: buzonConEntregas(s, [{ email: el, noti: {
            tipo: 'sistema', titulo: 'Nueva solicitud de amistad',
            cuerpo: `${miNombre} quiere ser tu amigo. Acéptala en Chat.`,
            tituloKey: 'bz.solT', cuerpoKey: 'bz.solC', params: { nombre: miNombre }, href: '/amigos',
          } }]),
        })
      }),
      responderAmistadCuenta: (email, acepta) => set((s) => {
        const yo = emailSesionJugador()
        const el = email.toLowerCase()
        if (!yo) return s
        const sol = s.amistadesCuentas.find(a => a.de === el && a.a === yo && a.estado === 'pendiente')
        if (!sol) return s
        if (!acepta) {
          // Rechazar: la solicitud desaparece (sin rencor y sin aviso al otro).
          return conPerfilCuenta(s, { amistadesCuentas: s.amistadesCuentas.filter(a => a !== sol) })
        }
        const nombre = nombreCuentaDemo(el, s.perfilesCuentas)
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `${nombre} y tú ya sois amigos`,
          cuerpo: 'Solicitud aceptada: os veis en vuestras listas de amigos.',
          tituloKey: 'mc.ntfAmigosT', cuerpoKey: 'mc.ntfAmigosC', params: { nombre },
          cuando: 'ahora', leida: false, href: '/amigos',
        }
        // (B) Quien pidió la amistad se entera de la aceptación en SU cuenta.
        const miNombre = s.perfilesCuentas[yo]?.nombre ?? useSesionStore.getState().sesion?.nombre ?? yo
        return conPerfilCuenta(s, {
          amistadesCuentas: s.amistadesCuentas.map(a => a === sol ? { ...a, estado: 'aceptada' as const } : a),
          notificaciones: [noti, ...s.notificaciones],
          buzonCuentas: buzonConEntregas(s, [{ email: el, noti: {
            tipo: 'sistema', titulo: `${miNombre} aceptó tu solicitud`,
            cuerpo: 'Ya sois amigos: os veis en vuestras listas y podéis chatear.',
            tituloKey: 'bz.acepT', cuerpoKey: 'bz.acepC', params: { nombre: miNombre }, href: '/amigos',
          } }]),
        })
      }),
      quitarAmigoCuenta: (email) => set((s) => {
        const yo = emailSesionJugador()
        const el = email.toLowerCase()
        if (!yo) return s
        return { amistadesCuentas: s.amistadesCuentas.filter(a => !((a.de === yo && a.a === el) || (a.de === el && a.a === yo))) }
      }),
      // Iniciar el torneo (30-08): override compartido vía `editados` (y el
      // propio objeto en `creados`) — enDirecto pasa a true para TODAS las
      // cuentas al instante (explorar, mapa, ficha, live). Las inscripciones
      // quedan cerradas por la regla de la ficha (torneo en directo).
      iniciarTorneo: (id, nombre) => set((s) => {
        // Un torneo EN DIRECTO no puede decir «Próximamente» (QA 01-09)
        const actual = { ...(getTorneo(id) ?? s.creados.find(c => c.id === id)), ...s.editados[id] }
        const fechaFix = (actual.fechaLabel ?? '').startsWith('Próximamente') ? { fechaLabel: 'Hoy' } : {}
        const noti: Notificacion = {
          id: nextId(), tipo: 'combate', titulo: '🔴 Torneo en directo',
          cuerpo: `Has iniciado «${nombre}»: ya está EN DIRECTO para todos y las inscripciones quedan cerradas.`,
          tituloKey: 'mc.ntfLiveT', cuerpoKey: 'mc.ntfLiveC', params: { torneo: nombre },
          cuando: 'ahora', leida: false, href: '/modo-directo',
        }
        // (B) Cada cuenta inscrita se entera al entrar: su torneo ha empezado.
        const notiInscrito: Omit<Notificacion, 'id' | 'cuando' | 'leida'> = {
          tipo: 'combate', titulo: `🔴 «${nombre}» ha empezado`,
          cuerpo: 'El torneo está EN DIRECTO. Entra a tu sala live para seguirlo.',
          tituloKey: 'bz.liveT', cuerpoKey: 'bz.liveC', params: { torneo: nombre }, href: `/torneo/${id}/directo`,
        }
        return {
          editados: { ...s.editados, [id]: { ...s.editados[id], enDirecto: true, ...fechaFix } },
          creados: s.creados.map(c => c.id === id ? { ...c, enDirecto: true, ...fechaFix } : c),
          // El confirm promete cerrar inscripciones: la gestión lo refleja (QA 01-09)
          gestion: { ...s.gestion, [id]: { ...GESTION_VACIA, ...s.gestion[id], cerrado: true } },
          notificaciones: [noti, ...s.notificaciones],
          buzonCuentas: buzonConEntregas(s, (s.inscripcionesCuentas[id] ?? []).map(email => ({ email, noti: notiInscrito }))),
        }
      }),
      solicitarTO: () => set((s) => {
        if (s.perfilTO !== 'no') return s
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: 'Solicitud de organizador enviada', cuerpo: 'Revisaremos tu experiencia y te haremos una breve entrevista. Te avisamos aquí.', cuando: 'ahora', leida: false, href: '/perfil' }
        return { perfilTO: 'pendiente', notificaciones: [n, ...s.notificaciones] }
      }),
      // Resolución desde el panel admin (control de accesos): cierra el ciclo
      // solicitud → revisión → perfil dual activo.
      aprobarTO: () => set((s) => {
        if (s.perfilTO === 'aprobado') return s
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: '🎉 Ya eres organizador', cuerpo: 'Tu solicitud está aprobada. Tu menú ya incluye la sección Organizador con todas tus herramientas; tu cuenta de jugador no cambia.', cuando: 'ahora', leida: false, href: '/consola' }
        return { perfilTO: 'aprobado', notificaciones: [n, ...s.notificaciones] }
      }),
      rechazarTO: () => set((s) => {
        if (s.perfilTO !== 'pendiente') return s
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: 'Solicitud de organizador rechazada', cuerpo: 'De momento no podemos aprobarla. Puedes volver a solicitarlo con más experiencia u otros torneos de referencia.', cuando: 'ahora', leida: false, href: '/perfil' }
        return { perfilTO: 'no', notificaciones: [n, ...s.notificaciones] }
      }),
    }),
    {
      name: 'todh-demo',
      // La clave REAL depende de la sesión activa (ver storagePorCuenta):
      // este name queda como etiqueta legacy del middleware.
      storage: createJSONStorage(() => storagePorCuenta),
      // Rehidratar SIEMPRE desde la base seed (no desde la memoria del momento):
      // al cambiar de cuenta, la memoria trae el mundo de la cuenta anterior y
      // un blob antiguo sin alguna clave nueva la heredaría de allí.
      merge: (persisted, current) => ({ ...current, ...DATOS_INICIALES, ...(persisted as Partial<DemoState>) }),
      // v1 (paquete Chat): tags de crew a 4 letras (#NOCT/#VNDL) + creador y
      // admins en crews persistidas de antes del modelo de administración.
      // v2 (scouting v1): entra la crew ajena de juego de equipo (Skuadra)
      // en estados ya persistidos, para que «Estudiar equipo» sea demostrable.
      version: VERSION_DEMO,
      migrate: (persisted, version) => {
        const s = persisted as Partial<DemoState>
        if (version < 2 && Array.isArray(s?.crews) && !s.crews.some(c => c.id === CREW_SKUADRA_SEED.id)) {
          s.crews = [...s.crews, CREW_SKUADRA_SEED]
        }
        if (version < 1 && Array.isArray(s?.crews)) {
          const NUEVO_TAG: Record<string, string> = { 'crew-nox': 'NOCT', 'crew-vnd': 'VNDL' }
          s.crews = s.crews.map((c) => {
            const base = { ...c, tag: NUEVO_TAG[c.id] ?? c.tag }
            if (c.id === 'crew-dojo') return { ...base, creador: c.creador ?? 'Zen', admins: c.admins ?? ['Zen'] }
            if (c.id === 'crew-vnd') return {
              ...base, creadaPorMi: true, creador: CREW_USUARIO,
              admins: c.admins ?? [CREW_USUARIO, 'Kaze'],
              miembros: c.miembros.includes('Kaze') ? c.miembros : [c.miembros[0], 'Kaze', ...c.miembros.slice(1)],
            }
            const creador = c.creador ?? (c.creadaPorMi ? CREW_USUARIO : c.miembros[0] ?? CREW_USUARIO)
            return { ...base, creador, admins: c.admins ?? [creador] }
          })
        }
        return s as DemoState
      },
      // Al rehidratar, los juegos custom persistidos vuelven al catálogo en memoria.
      onRehydrateStorage: () => (state) => {
        if (state?.juegosCustom) Object.assign(JUEGOS, state.juegosCustom)
      },
    }
  )
)

// ── Cambio de cuenta (30-08, v2 mundo compartido) ──
// Al entrar o salir de una cuenta, el demo store se re-apunta a la parte
// PERSONAL de esa cuenta y al mundo común: si la clave personal está virgen se
// siembra primero su plantilla (vacía para cuentas `fresca`, seed personal para
// el resto) y después se rehidrata SIEMPRE por el adaptador — que junta
// personal + 'todh-mundo', aplica migraciones y el mapeo de identidad.
function activarCuentaDemo(sesion: Sesion | null) {
  if (typeof window === 'undefined') return
  const clave = claveDemo(sesion?.email)
  if (window.localStorage.getItem(clave) == null) {
    // Clave personal virgen → sembrar SOLO lo personal (el mundo es común y lo
    // resuelve getItem). El blob legacy nace marcado: aquí no hay mundo externo
    // que adoptar, y sin marca la adopción machacaría 'todh-mundo' con el seed.
    const plantilla = sesion?.fresca ? { ...ESTADO_CUENTA_NUEVA } : soloPersonal(DATOS_INICIALES)
    const env = clave === CLAVE_LEGACY
      ? { state: plantilla, version: VERSION_DEMO, mundo: 1 as const }
      : { state: plantilla, version: VERSION_DEMO }
    try { window.localStorage.setItem(clave, JSON.stringify(env)) } catch { /* cuota */ }
  }
  useDemoStore.persist.rehydrate()
}

if (typeof window !== 'undefined') {
  // Arranque: si la sesión persistida no tiene blob personal (borrado a mano,
  // p. ej.), sembrarlo — una cuenta fresca no debe heredar lo personal de Álex.
  const s0 = useSesionStore.getState().sesion
  if (s0 && window.localStorage.getItem(claveDemo(s0.email)) == null) {
    activarCuentaDemo(s0)
  }
  let emailPrev = s0?.email ?? null
  useSesionStore.subscribe((st) => {
    const email = st.sesion?.email ?? null
    if (email === emailPrev) return
    emailPrev = email
    activarCuentaDemo(st.sesion)
  })
  // Multi-pestaña: si OTRA pestaña escribe el mundo común, esta se rehidrata
  // (con debounce: varias escrituras seguidas → una sola recarga del estado).
  let tMundo: ReturnType<typeof setTimeout> | null = null
  window.addEventListener('storage', (e) => {
    if (e.key !== CLAVE_MUNDO) return
    if (tMundo) clearTimeout(tMundo)
    tMundo = setTimeout(() => { useDemoStore.persist.rehydrate() }, 250)
  })
}

// ¿La cuenta tiene el rol de organizador? (to@ de serie o solicitud aprobada.
// Las sedes NO: son solo sedes, sin perfil de TO — decisión 28-ago.)
// Ya no hay "modo" conmutable: con el rol, la capa de TO aparece siempre
// (sección Organizador en el menú, precios de sede, locales disponibles…).
export const useEsTO = () => {
  const aprobado = useDemoStore(s => s.perfilTO === 'aprobado')
  const sesion = useSesionStore(s => s.sesion)
  // Las sedes son SOLO sedes (decisión 28-ago): sin perfil de organizador.
  return sesion?.rol !== 'local' && (!!sesion?.to || aprobado)
}

// Identidad de ORGANIZADOR de la sesión actual (nada de asumir «lima»): la
// cuenta de TO la trae de serie; un jugador aprobado self-service estrena
// identidad propia ('alex' en la demo). Las sedes no organizan (28-ago).
export const useOrgId = (): string => {
  const sesion = useSesionStore(s => s.sesion)
  if (!sesion) return 'lima'
  if (sesion.orgId) return sesion.orgId
  return 'alex'
}

// Local que gestiona la sesión de rol 'local' (nada de asumir «gamba»).
export const useLocalId = (): string => {
  const sesion = useSesionStore(s => s.sesion)
  return sesion?.localId ?? 'gamba'
}

// Precio/noche EFECTIVO de una sede — una sola fuente para toda la app:
// manda la disponibilidad publicada por la propia sede; después el override
// del admin (ficha); por último la tarifa de muestra del local.
export function precioNocheEfectivo(
  localId: string,
  dispoSedes: Record<string, DispoSede>,
  fichasSede: Record<string, Partial<FichaSedeAdmin>>,
): number {
  const dispo = dispoSedes[localId]
  return (dispo?.publicada ? dispo.precioNoche : undefined)
    ?? fichasSede[localId]?.precioNoche
    ?? LOCALES[localId]?.precioNoche
    ?? 40
}

export const usePrecioNoche = (localId: string): number => {
  const dispoSedes = useDemoStore(s => s.dispoSedes)
  const fichasSede = useDemoStore(s => s.fichasSede)
  return precioNocheEfectivo(localId, dispoSedes, fichasSede)
}

// No-leídos de Chat (estilo WhatsApp, 31-08): total de mensajes de OTROS sin
// leer en DMs de cuentas amigas y en grupos/crews. Los propios no cuentan.
export function noLeidosDe(hilo: { de?: string; autor?: string }[] | undefined, leidos: number, yo?: string | null): number {
  if (!hilo || hilo.length <= leidos) return 0
  return hilo.slice(leidos).filter(m => (m.de ? m.de !== yo : m.autor !== 'Tú')).length
}
export const useNoLeidosChat = (): number => {
  const chatsAmigos = useDemoStore(s => s.chatsAmigos)
  const grupos = useDemoStore(s => s.gruposChat)
  const leidos = useDemoStore(s => s.leidosChat)
  const amistades = useDemoStore(s => s.amistadesCuentas)
  const yo = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  let n = 0
  if (yo) {
    for (const a of amistades) {
      if (a.estado !== 'aceptada' || (a.de !== yo && a.a !== yo)) continue
      const otro = a.de === yo ? a.a : a.de
      n += noLeidosDe(chatsAmigos[claveAmigos(yo, otro)], leidos[`amigo:${otro}`] ?? 0, yo)
    }
  }
  for (const g of grupos) n += noLeidosDe(g.mensajes, leidos[`grupo:${g.id}`] ?? 0, yo)
  return n
}

// organizadorEfectivo() (sample.ts) aplica los overrides editados del perfil de
// organizador leyéndolos de aquí — registro en runtime para no crear el ciclo
// de imports sample ↔ useDemoStore.
registrarLectorPerfilOrg((id) => useDemoStore.getState().perfilesOrg?.[id])
