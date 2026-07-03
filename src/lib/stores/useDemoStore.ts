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
  notificaciones: Notificacion[]
  juegoPerfil: string                 // juego activo en el perfil
  avatarEmoji: string | null          // avatar elegido en el perfil (demo)
  mainsPerfil: Record<string, string[]>  // mains elegidos por juego (iconos de personaje)
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
  pushNoti: (n: Omit<Notificacion, 'id' | 'leida' | 'cuando'> & { cuando?: string }) => void
  marcarLeidas: () => void
  noLeidas: () => number
  setJuegoPerfil: (j: string) => void
  setAvatarEmoji: (e: string | null) => void
  setMainsPerfil: (juego: string, mains: string[]) => void
}

let nid = 0
const nextId = () => `n${Date.now().toString(36)}${nid++}`

const NOTIS_INICIALES: Notificacion[] = [
  { id: 'seed1', tipo: 'combate', titulo: 'Te toca · Mesa 3', cuerpo: 'Cuartos vs Sora. Abre el plano para ver tu mesa.', cuando: 'hace 2 min', leida: false, href: '/torneo/t1/mesa?n=3&vs=Cuartos%20vs%20Sora' },
  { id: 'seed2', tipo: 'nuevo-torneo', titulo: 'Lima Esports publicó un torneo', cuerpo: 'Smash Arena Madrid — Major · Sáb 5 jul. ¡Plazas abiertas!', cuando: 'hace 1 h', leida: false, href: '/torneo/t11' },
  { id: 'seed3', tipo: 'lleno', titulo: 'Torneo casi lleno', cuerpo: 'Tekken 8 Arena Night está al 97%. Inscríbete antes de que se agote.', cuando: 'hace 3 h', leida: true, href: '/torneo/t5' },
  { id: 'seed4', tipo: 'sistema', titulo: 'Bienvenido a TODH', cuerpo: 'Descubre torneos cerca de ti y compite por subir en el ranking.', cuando: 'ayer', leida: true },
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
      notificaciones: NOTIS_INICIALES,
      juegoPerfil: 'smash',
      avatarEmoji: null,
      mainsPerfil: {},

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

      pushNoti: (n) => set((s) => ({
        notificaciones: [{ id: nextId(), leida: false, cuando: n.cuando || 'ahora', ...n }, ...s.notificaciones],
      })),
      marcarLeidas: () => set((s) => ({ notificaciones: s.notificaciones.map(n => ({ ...n, leida: true })) })),
      noLeidas: () => get().notificaciones.filter(n => !n.leida).length,
      setJuegoPerfil: (juegoPerfil) => set({ juegoPerfil }),
      setAvatarEmoji: (avatarEmoji) => set({ avatarEmoji }),
      setMainsPerfil: (juego, mains) => set((s) => ({ mainsPerfil: { ...s.mainsPerfil, [juego]: mains } })),
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
