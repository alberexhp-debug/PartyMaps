import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { JUEGOS, type TorneoSample, type Juego, type Mesa } from '@/lib/torneos/sample'

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
}
const GESTION_VACIA: GestionTorneo = {
  checkin: [], cerrado: false, generado: false, seeds: [], winners: {},
  puntos: {}, bo: { base: 3, top: 5, desde: 'semis' },
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
}

// Disputa de resultado: los reportes de los jugadores no coinciden → la resuelve
// el TO desde el modo directo. Si trae `mid`, resolverla avanza el bracket.
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
  // acciones
  inscribir: (torneoId: string, nombreTorneo: string) => void
  desinscribir: (torneoId: string) => void
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
}

let nid = 0
const nextId = () => `n${Date.now().toString(36)}${nid++}`

const NOTIS_INICIALES: Notificacion[] = [
  { id: 'seed1', tipo: 'combate', titulo: 'Te toca · Mesa 3', cuerpo: 'Cuartos vs Sora. Abre el plano para ver tu mesa.', cuando: 'hace 2 min', leida: false, href: '/torneo/t1/mesa?n=3&vs=Cuartos%20vs%20Sora' },
  { id: 'seed2', tipo: 'nuevo-torneo', titulo: 'Lima Esports publicó un torneo', cuerpo: 'Smash Arena Madrid — Major · Sáb 5 jul. ¡Plazas abiertas!', cuando: 'hace 1 h', leida: false, href: '/torneo/t11' },
  { id: 'seed3', tipo: 'lleno', titulo: 'Torneo casi lleno', cuerpo: 'Tekken 8 Arena Night está al 97%. Inscríbete antes de que se agote.', cuando: 'hace 3 h', leida: true, href: '/torneo/t5' },
  { id: 'seed4', tipo: 'sistema', titulo: 'Bienvenido a Tourneum', cuerpo: 'Descubre torneos cerca de ti y compite por subir en el ranking.', cuando: 'ayer', leida: true },
]

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => ({
      inscritos: [],
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

      inscribir: (torneoId, nombreTorneo) => set((s) => {
        if (s.inscritos.includes(torneoId)) return s
        const noti: Notificacion = {
          id: nextId(), tipo: 'inscripcion', titulo: 'Inscripción confirmada',
          cuerpo: `Estás dentro de "${nombreTorneo}". Lo tienes en tu cartera.`,
          cuando: 'ahora', leida: false, href: '/entradas',
        }
        return { inscritos: [...s.inscritos, torneoId], notificaciones: [noti, ...s.notificaciones] }
      }),
      desinscribir: (torneoId) => set((s) => ({ inscritos: s.inscritos.filter(id => id !== torneoId) })),
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
        return { cancelados: [...s.cancelados, id], notificaciones: [noti, ...s.notificaciones] }
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
