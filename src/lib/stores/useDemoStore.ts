import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JUEGOS, getTorneo, esperaDe, type TorneoSample, type Juego, type Mesa } from '@/lib/torneos/sample'

// Store de DEMO (modo sin backend): mantiene en memoria + localStorage el estado
// interactivo de la sesión para que inscribirse / seguir / crear torneo / leer
// notificaciones persista mientras se navega. Cuando exista el backend real esto
// se reemplaza por queries a Supabase. NO es la fuente de verdad de producción.

export type NotiTipo = 'combate' | 'disputa' | 'lleno' | 'nuevo-torneo' | 'sistema' | 'inscripcion'

// Estado de gestión del TO por torneo (check-in, bracket congelado, resultados).
// Los seeds son ids de jugador del ranking de muestra; el bracket se reconstruye
// determinísticamente con construirRondas(seeds, winners).
// Sets: cada combate se juega a Bo1/Bo3/Bo5. `bo.base` aplica al principio del
// cuadro y `bo.top` desde la ronda elegida (como en Smash: Bo3 y Bo5 en top 8,
// o LoL: Bo1 y Bo3 en finales). `puntos` guarda los juegos ganados por lado.
export type BoDesde = 'final' | 'semis' | 'top8'
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
// Solicitud de un TO a una sede para organizar un evento allí (demo: TO = Lima).
// La sede la ve en su panel y al aceptar/rechazar el TO recibe la respuesta.
export type SolicitudSede = {
  id: string
  localId: string
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

export type Notificacion = {
  id: string
  tipo: NotiTipo
  titulo: string
  cuerpo: string
  cuando: string
  leida: boolean
  href?: string
}

interface DemoState {
  inscritos: string[]                 // ids de torneos inscritos
  listaEspera: string[]               // ids de torneos donde el usuario está en la cola de espera
  promovidosEspera: Record<string, number>  // por torneo: cuántos de la cola ya entraron (FIFO)
  seguidos: string[]                  // ids de organizadores seguidos
  creados: TorneoSample[]             // torneos creados por el TO en demo
  juegosCustom: Record<string, Juego> // juegos añadidos por el TO (no contemplados en la app)
  editados: Record<string, Partial<TorneoSample>>  // overrides de edición (muestra o creado)
  cancelados: string[]                // ids de torneos cancelados por el TO
  gestion: Record<string, GestionTorneo>   // estado de gestión del TO por torneo
  mesasSede: Record<string, Mesa[]>        // plano de mesas editado por cada sede (override del de muestra)
  solicitudesSede: SolicitudSede[]         // peticiones del TO a sedes (organizar evento allí)
  disputas: Disputa[]                      // disputas de resultado pendientes de resolver por el TO
  checkinsJugador: string[]                // torneos donde el jugador ya hizo check-in (QR)
  notificaciones: Notificacion[]
  juegoPerfil: string                 // juego activo en el perfil
  avatarEmoji: string | null          // avatar elegido en el perfil (demo)
  mainsPerfil: Record<string, string[]>  // mains elegidos por juego (iconos de personaje)
  juegosFavoritos: string[]              // juegos elegidos en el onboarding (personalizan feed y ranking)
  onboardingVisto: boolean
  idioma: 'es' | 'en'                    // idioma de la interfaz (i18n fase 1)
  entradasEspectador: string[]           // torneos con entrada de espectador comprada
  referidos: { codigo: string; jugados: number; canjeados: number[] }  // programa invita-y-gana (niveles 1/3/5)
  preregistro: { unido: boolean; pos: number; compartidos: number }    // lista de espera del lanzamiento
  reportes: ReporteTO[]                  // reportes de bracket/seeding del jugador al TO (reunión 5-jul)
  puntuadosStartgg: string[]             // torneos espejo cuyos resultados ya puntuaron en el ranking Tourneum
  tagStartgg: string | null              // tag del jugador en start.gg (identidad en el ranking real)
  perfilTO: 'no' | 'pendiente' | 'aprobado'  // alta de TO self-service (perfil dual)
  tierUsuario: null | 'Oro' | 'Platino' | 'Diamante'   // tier de pago (o regalo por rango)
  bonosComprados: { id: string; localId: string; localNombre: string; titulo: string; precio: number }[]
  chatsTorneo: Record<string, { autor: string; texto: string; hora: string }[]>
  // acciones
  inscribir: (torneoId: string, nombreTorneo: string) => void
  desinscribir: (torneoId: string, nombreTorneo: string) => void
  apuntarEspera: (torneoId: string, nombreTorneo: string, puesto: number) => void
  salirEspera: (torneoId: string) => void
  liberarPlazas: (torneoId: string, nombreTorneo: string, n: number) => void
  estaInscrito: (torneoId: string) => boolean
  alternarSeguir: (orgId: string, nombreOrg: string) => void
  sigue: (orgId: string) => boolean
  crearTorneo: (t: TorneoSample) => void
  crearJuego: (j: Juego) => void
  editarTorneo: (id: string, patch: Partial<TorneoSample>) => void
  cancelarTorneo: (id: string, nombre: string) => void
  setGestion: (id: string, patch: Partial<GestionTorneo>) => void
  setMesasSede: (localId: string, mesas: Mesa[]) => void
  crearSolicitudSede: (s: Omit<SolicitudSede, 'id' | 'estado'>, nombreLocal: string) => void
  resolverSolicitudSede: (id: string, estado: 'aceptada' | 'rechazada', nombreLocal: string) => void
  contraofertarSede: (id: string, datos: { fecha: string; franja: string; precio: number }, nombreLocal: string) => void
  crearDisputa: (d: Omit<Disputa, 'id'>, nombreTorneo: string) => void
  hacerCheckin: (torneoId: string, nombreTorneo: string) => void
  resolverDisputa: (id: string, lado: 'a' | 'b') => void
  responderContraoferta: (id: string, acepta: boolean, nombreLocal: string) => void
  pushNoti: (n: Omit<Notificacion, 'id' | 'leida' | 'cuando'> & { cuando?: string }) => void
  marcarLeidas: () => void
  noLeidas: () => number
  setJuegoPerfil: (j: string) => void
  setAvatarEmoji: (e: string | null) => void
  setMainsPerfil: (juego: string, mains: string[]) => void
  setJuegosFavoritos: (ids: string[]) => void
  setIdioma: (i: 'es' | 'en') => void
  inscribirEspectador: (id: string, nombre: string) => void
  canjearReferido: (nivel: 1 | 3 | 5) => void
  unirsePreregistro: () => void
  compartirPreregistro: () => void
  crearReporte: (r: Omit<ReporteTO, 'id' | 'estado'>) => void
  puntuarStartgg: (torneoId: string, nombreTorneo: string) => void
  vincularStartgg: (tag: string | null) => void
  resolverReporte: (id: string, accion: 'cambiado' | 'rebatido', respuesta?: string) => void
  solicitarTO: () => void
  aprobarTO: () => void
  rechazarTO: () => void
  suscribirTier: (tier: 'Oro' | 'Platino' | 'Diamante') => void
  comprarBono: (localId: string, localNombre: string, titulo: string, precio: number) => void
  enviarChat: (torneoId: string, texto: string) => void
}

let nid = 0
const nextId = () => `n${Date.now().toString(36)}${nid++}`

const NOTIS_INICIALES: Notificacion[] = [
  { id: 'seed1', tipo: 'combate', titulo: 'Te toca · Mesa 3', cuerpo: 'Cuartos vs Sora. Abre el plano para ver tu mesa.', cuando: 'hace 2 min', leida: false, href: '/torneo/t1/mesa?n=3&vs=Cuartos%20vs%20Sora' },
  { id: 'seed2', tipo: 'nuevo-torneo', titulo: 'Lima Esports publicó un torneo', cuerpo: 'Smash Arena Madrid — Major · Sáb 5 jul. ¡Plazas abiertas!', cuando: 'hace 1 h', leida: false, href: '/torneo/t11' },
  { id: 'seed3', tipo: 'lleno', titulo: 'Torneo casi lleno', cuerpo: 'Tekken 8 Arena Night está al 97%. Inscríbete antes de que se agote.', cuando: 'hace 3 h', leida: true, href: '/torneo/t5' },
  { id: 'seed4', tipo: 'sistema', titulo: 'Bienvenido a Tourneum', cuerpo: 'Descubre torneos cerca de ti y compite por subir en el ranking.', cuando: 'ayer', leida: true },
]

// Promoción FIFO de la lista de espera al liberarse (o ampliarse) n plazas:
// entran primero los de la cola de muestra pendientes y, si aún queda hueco y el
// usuario está en la cola, entra él (con aviso + cobro simulado). Devuelve el
// parcial de estado a mezclar en el set() del llamador.
function promocionEspera(s: DemoState, torneoId: string, nombreTorneo: string, n: number): Partial<DemoState> {
  const base = getTorneo(torneoId) || s.creados.find(c => c.id === torneoId)
  if (!base || n <= 0) return {}
  const cola = esperaDe({ ...base, ...(s.editados[torneoId] || {}) })
  const ya = s.promovidosEspera[torneoId] ?? 0
  const entran = cola.slice(ya, ya + n)
  const usuarioEntra = entran.length < n && s.listaEspera.includes(torneoId)
  if (entran.length === 0 && !usuarioEntra) return {}

  const notis: Notificacion[] = []
  if (usuarioEntra) {
    notis.push({
      id: nextId(), tipo: 'inscripcion', titulo: '🎟️ ¡Entras! Plaza liberada',
      cuerpo: `Se ha liberado una plaza en «${nombreTorneo}» y eras el primero de la lista de espera. Pago procesado: tu entrada ya está en la cartera.`,
      cuando: 'ahora', leida: false, href: '/entradas',
    })
  }
  if (entran.length > 0) {
    const listado = entran.length === 1 ? entran[0] : `${entran.slice(0, -1).join(', ')} y ${entran[entran.length - 1]}`
    notis.push({
      id: nextId(), tipo: 'sistema', titulo: 'Lista de espera · plaza cubierta',
      cuerpo: `${listado} ${entran.length === 1 ? 'entra' : 'entran'} en «${nombreTorneo}» desde la lista de espera.`,
      cuando: 'ahora', leida: false, href: `/torneo/${torneoId}`,
    })
  }
  return {
    promovidosEspera: { ...s.promovidosEspera, [torneoId]: ya + entran.length },
    ...(usuarioEntra ? {
      listaEspera: s.listaEspera.filter(id => id !== torneoId),
      inscritos: [...s.inscritos, torneoId],
    } : {}),
    notificaciones: [...notis, ...s.notificaciones],
  }
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      // t4 viene inscrito de serie: la cartera y la ficha lo cuentan igual
      // (antes la cartera lo sembraba por su cuenta y la ficha no lo sabía).
      inscritos: ['t4'],
      listaEspera: [],
      promovidosEspera: {},
      seguidos: [],
      creados: [],
      juegosCustom: {},
      editados: {},
      cancelados: [],
      gestion: {},
      mesasSede: {},
      solicitudesSede: [],
      // Disputa de muestra en el torneo live para que el modo directo luzca vivo
      disputas: [{ id: 'dsp-seed', torneoId: 't1', mesa: 5, a: 'Lux', b: 'Nyx' }],
      checkinsJugador: [],
      notificaciones: NOTIS_INICIALES,
      juegoPerfil: 'smash',
      avatarEmoji: null,
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
      puntuadosStartgg: [],
      tagStartgg: null,
      perfilTO: 'no',
      tierUsuario: null,
      bonosComprados: [],
      chatsTorneo: {},

      inscribir: (torneoId, nombreTorneo) => set((s) => {
        if (s.inscritos.includes(torneoId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: 'Inscripción confirmada',
          cuerpo: `Estás dentro de "${nombreTorneo}". Lo tienes en tu cartera.`,
          cuando: 'ahora', leida: false, href: '/entradas',
        }
        return { inscritos: [...s.inscritos, torneoId], notificaciones: [noti, ...s.notificaciones] }
      }),
      // Cancelar inscripción: libera la plaza y, si hay cola, el primero entra.
      desinscribir: (torneoId, nombreTorneo) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: 'Inscripción cancelada',
          cuerpo: `Has cancelado tu plaza en «${nombreTorneo}». Reembolso emitido según la política del torneo.`,
          cuando: 'ahora', leida: false,
        }
        const tras: DemoState = { ...s, inscritos: s.inscritos.filter(id => id !== torneoId), notificaciones: [noti, ...s.notificaciones] }
        return { inscritos: tras.inscritos, notificaciones: tras.notificaciones, ...promocionEspera(tras, torneoId, nombreTorneo, 1) }
      }),
      apuntarEspera: (torneoId, nombreTorneo, puesto) => set((s) => {
        if (s.listaEspera.includes(torneoId) || s.inscritos.includes(torneoId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: `En lista de espera · puesto ${puesto}`,
          cuerpo: `«${nombreTorneo}» está completo. Si se libera una plaza entra el primero de la cola; te avisaremos y cobraremos solo si entras.`,
          cuando: 'ahora', leida: false, href: '/entradas',
        }
        return { listaEspera: [...s.listaEspera, torneoId], notificaciones: [noti, ...s.notificaciones] }
      }),
      salirEspera: (torneoId) => set((s) => ({ listaEspera: s.listaEspera.filter(id => id !== torneoId) })),
      // El TO libera n plazas (baja de un jugador o ampliación de aforo).
      liberarPlazas: (torneoId, nombreTorneo, n) => set((s) => promocionEspera(s, torneoId, nombreTorneo, n)),
      estaInscrito: (torneoId) => get().inscritos.includes(torneoId),

      alternarSeguir: (orgId, nombreOrg) => set((s) => {
        const sigue = s.seguidos.includes(orgId)
        if (sigue) return { seguidos: s.seguidos.filter(id => id !== orgId) }
        const noti: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Sigues a ${nombreOrg}`,
          cuerpo: 'Te avisaremos cuando publique nuevos torneos.', cuando: 'ahora', leida: false,
        }
        return { seguidos: [...s.seguidos, orgId], notificaciones: [noti, ...s.notificaciones] }
      }),
      sigue: (orgId) => get().seguidos.includes(orgId),

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
          cuando: 'ahora', leida: false,
        }
        return { checkinsJugador: [...s.checkinsJugador, torneoId], notificaciones: [noti, ...s.notificaciones] }
      }),

      crearDisputa: (d, nombreTorneo) => set((s) => {
        const noti: Notificacion = {
          id: nextId(), tipo: 'disputa', titulo: '⚠️ Disputa en Mesa ' + d.mesa,
          cuerpo: `${d.a} y ${d.b} no coinciden en el resultado («${nombreTorneo}»). Resuélvela en el modo directo.`,
          cuando: 'ahora', leida: false, href: '/modo-directo',
        }
        return { disputas: [...s.disputas, { ...d, id: nextId() }], notificaciones: [noti, ...s.notificaciones] }
      }),

      // Resolver: quita la disputa y, si venía de un combate real, escribe el
      // ganador (2-1) para que el bracket avance. Avisa a los jugadores.
      resolverDisputa: (id, lado) => set((s) => {
        const d = s.disputas.find(x => x.id === id)
        if (!d) return s
        const ganador = lado === 'a' ? d.a : d.b
        const noti: Notificacion = {
          id: nextId(), tipo: 'disputa', titulo: 'Disputa resuelta por el organizador',
          cuerpo: `${ganador} gana el combate de la mesa ${d.mesa}. El resultado ya cuenta en el bracket.`,
          cuando: 'ahora', leida: false, href: d.mid ? `/torneo/${d.torneoId}/bracket` : undefined,
        }
        const g = d.mid ? {
          gestion: {
            ...s.gestion,
            [d.torneoId]: {
              ...GESTION_VACIA, ...s.gestion[d.torneoId],
              winners: { ...(s.gestion[d.torneoId]?.winners ?? {}), [d.mid]: lado },
              puntos: { ...(s.gestion[d.torneoId]?.puntos ?? {}), [d.mid]: lado === 'a' ? { a: 2, b: 1 } : { a: 1, b: 2 } },
            },
          },
        } : {}
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
      noLeidas: () => get().notificaciones.filter(n => !n.leida).length,
      setJuegoPerfil: (juegoPerfil) => set({ juegoPerfil }),
      setAvatarEmoji: (avatarEmoji) => set({ avatarEmoji }),
      setMainsPerfil: (juego, mains) => set((s) => ({ mainsPerfil: { ...s.mainsPerfil, [juego]: mains } })),
      setJuegosFavoritos: (juegosFavoritos) => set({ juegosFavoritos, onboardingVisto: true }),
      setIdioma: (idioma) => set({ idioma }),
      inscribirEspectador: (id, nombre) => set((s) => {
        if (s.entradasEspectador.includes(id)) return s
        const n: Notificacion = { id: nextId(), tipo: 'inscripcion', titulo: 'Entrada de espectador', cuerpo: `Ya tienes tu entrada para ver «${nombre}». Enséñala en la puerta.`, cuando: 'ahora', leida: false, href: '/entradas' }
        return { entradasEspectador: [...s.entradasEspectador, id], notificaciones: [n, ...s.notificaciones] }
      }),
      canjearReferido: (nivel) => set((s) => {
        if (s.referidos.canjeados.includes(nivel) || s.referidos.jugados < nivel) return s
        const premio = nivel === 1 ? 'Entrada de espectador gratis' : nivel === 3 ? 'Inscripción estándar gratis' : 'Acceso a un torneo Oro este mes'
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: 'Recompensa canjeada', cuerpo: `${premio} — ya está aplicada en tu cuenta.`, cuando: 'ahora', leida: false, href: '/perfil' }
        return {
          referidos: { ...s.referidos, canjeados: [...s.referidos.canjeados, nivel] },
          notificaciones: [n, ...s.notificaciones],
        }
      }),
      unirsePreregistro: () => set((s) => s.preregistro.unido ? s : ({ preregistro: { ...s.preregistro, unido: true } })),
      compartirPreregistro: () => set((s) => ({
        preregistro: { ...s.preregistro, compartidos: s.preregistro.compartidos + 1, pos: Math.max(12, s.preregistro.pos - 47) },
      })),
      // Ingesta del espejo: el torneo vinculado a start.gg ha terminado → sus
      // resultados puntúan también en el ranking Tourneum (una sola vez).
      puntuarStartgg: (torneoId, nombreTorneo) => set((s) => {
        if (s.puntuadosStartgg.includes(torneoId)) return s
        const n: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: '🏆 Resultados importados de start.gg',
          cuerpo: `«${nombreTorneo}» ha terminado. Sus resultados ya puntúan en el ranking Tourneum; los puntos de start.gg no se tocan.`,
          cuando: 'ahora', leida: false, href: '/ranking',
        }
        return { puntuadosStartgg: [...s.puntuadosStartgg, torneoId], notificaciones: [n, ...s.notificaciones] }
      }),
      // Identidad start.gg: al vincular tu tag, el ranking real te reconoce
      vincularStartgg: (tag) => set((s) => {
        if (!tag) return { tagStartgg: null }
        const n: Notificacion = {
          id: nextId(), tipo: 'sistema', titulo: `Tag vinculado: ${tag}`,
          cuerpo: 'Tus resultados reales de start.gg ya te identifican en el ranking. Al llegar el backend, tu historial sembrará tu rating inicial.',
          cuando: 'ahora', leida: false, href: '/ranking',
        }
        return { tagStartgg: tag, notificaciones: [n, ...s.notificaciones] }
      }),
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
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: `Tourneum ${tier} activado`, cuerpo: 'Ya puedes entrar en torneos de tu tier y lucir la insignia. Se renueva cada mes; cancela cuando quieras.', cuando: 'ahora', leida: false, href: '/perfil' }
        return { tierUsuario: tier, notificaciones: [n, ...s.notificaciones] }
      }),
      comprarBono: (localId, localNombre, titulo, precio) => set((s) => {
        const n: Notificacion = { id: nextId(), tipo: 'inscripcion', titulo: 'Bono comprado', cuerpo: `${titulo} en ${localNombre}. Enséñalo en la barra desde tu cartera.`, cuando: 'ahora', leida: false, href: '/entradas' }
        return {
          bonosComprados: [{ id: nextId(), localId, localNombre, titulo, precio }, ...s.bonosComprados],
          notificaciones: [n, ...s.notificaciones],
        }
      }),
      enviarChat: (torneoId, texto) => set((s) => ({
        chatsTorneo: { ...s.chatsTorneo, [torneoId]: [...(s.chatsTorneo[torneoId] || []), { autor: 'Tú', texto, hora: 'ahora' }] },
      })),
      solicitarTO: () => set((s) => {
        if (s.perfilTO !== 'no') return s
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: 'Solicitud de organizador enviada', cuerpo: 'Revisaremos tu experiencia y te haremos una breve entrevista. Te avisamos aquí.', cuando: 'ahora', leida: false, href: '/perfil' }
        return { perfilTO: 'pendiente', notificaciones: [n, ...s.notificaciones] }
      }),
      // Resolución desde el panel admin (control de accesos): cierra el ciclo
      // solicitud → revisión → perfil dual activo.
      aprobarTO: () => set((s) => {
        if (s.perfilTO === 'aprobado') return s
        const n: Notificacion = { id: nextId(), tipo: 'sistema', titulo: '🎉 Ya eres organizador', cuerpo: 'Tu solicitud está aprobada. Tienes la consola de TO en tu perfil; tu cuenta de jugador no cambia.', cuando: 'ahora', leida: false, href: '/consola' }
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
      // Al rehidratar, los juegos custom persistidos vuelven al catálogo en memoria.
      onRehydrateStorage: () => (state) => {
        if (state?.juegosCustom) Object.assign(JUEGOS, state.juegosCustom)
      },
    }
  )
)
