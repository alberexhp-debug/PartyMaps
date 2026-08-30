import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Sesión de la DEMO: la app entera entra por login con cuentas de muestra.
// Cada rol ve solo su panel; el guard (RequireSesion) redirige al resto.
// Cuando llegue el backend real esto se sustituye por Supabase Auth.

export type RolSesion = 'jugador' | 'admin' | 'local'
export type Sesion = {
  email: string
  nombre: string
  rol: RolSesion
  // La cuenta de TO va VINCULADA a la de jugador (para ser TO primero eres
  // jugador): es rol 'jugador' con la capa de organizador ya aprobada.
  to?: boolean
  // Identidad de organizador de la cuenta (los datos dejan de asumir «lima»):
  // la trae de serie la cuenta de TO. Las sedes NO organizan (decisión 28-08).
  orgId?: string
  // Local que gestiona la cuenta de rol 'local' (los datos dejan de asumir «gamba»).
  localId?: string
  // Cuenta VACÍA que empieza desde cero (30-08): sin el escaparate fijo de Álex
  // (historial, valoraciones, stats, logros…) — sus vistas enseñan empty-states.
  fresca?: boolean
}

export type CuentaDemo = Sesion & {
  password: string
  descripcion: string
  // Cuenta legacy sin botón en el login: sigue entrando TECLEANDO el email
  // (la usan todas las suites y el mundo rico de Álex/Lima).
  oculta?: boolean
}

export const CUENTAS_DEMO: CuentaDemo[] = [
  // ── Legacy (mundo rico de muestra, namespace compartido 'todh-demo') ──
  { email: 'jugador@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Álex', oculta: true, descripcion: 'Jugador — explora, se inscribe y compite' },
  { email: 'to@torneum.com', password: 'torneum', rol: 'jugador', to: true, orgId: 'lima', nombre: 'Lima', oculta: true, descripcion: 'Organizador — cuenta de jugador con el menú de TO expandido' },
  { email: 'local@torneum.com', password: 'torneum', rol: 'local', localId: 'gamba', nombre: 'Gamba Esports', oculta: true, descripcion: 'Sede — solicitudes de TOs, plano y torneos alojados' },
  // ── Jugadores nuevos (VACÍOS, empiezan desde cero) ──
  { email: 'javier@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Javier', fresca: true, descripcion: 'Jugador — empieza de cero' },
  { email: 'lucia@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Lucía', fresca: true, descripcion: 'Jugadora — empieza de cero' },
  { email: 'marcos@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Marcos', fresca: true, descripcion: 'Jugador — empieza de cero' },
  { email: 'carmen@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Carmen', fresca: true, descripcion: 'Jugadora — empieza de cero' },
  { email: 'alvaro@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Álvaro', fresca: true, descripcion: 'Jugador — empieza de cero' },
  { email: 'paula@torneum.com', password: 'torneum', rol: 'jugador', nombre: 'Paula', fresca: true, descripcion: 'Jugadora — empieza de cero' },
  // ── Jugador + organizador nuevo (VACÍO; su orgId no existe en ORGANIZADORES
  //    → cae al perfil «Organizador nuevo» de organizadorEfectivo, a su nombre) ──
  { email: 'david@torneum.com', password: 'torneum', rol: 'jugador', to: true, orgId: 'david-to', nombre: 'David', fresca: true, descripcion: 'Jugador + organizador (TO)' },
  // ── Sedes (una por local de muestra; operan con los datos de SU local) ──
  { email: 'gamba@torneum.com', password: 'torneum', rol: 'local', localId: 'gamba', nombre: 'Gamba Esports', descripcion: 'Panel de sede — Malasaña' },
  { email: 'dragon@torneum.com', password: 'torneum', rol: 'local', localId: 'dragon', nombre: 'La Tienda del Dragón', descripcion: 'Panel de sede — Chamberí' },
  { email: 'arcade@torneum.com', password: 'torneum', rol: 'local', localId: 'arcade', nombre: 'Arcade Planet', descripcion: 'Panel de sede — Tetuán' },
  // ── Admin (la cuenta existente, tal cual) ──
  { email: 'admin@torneum.com', password: 'torneum', rol: 'admin', nombre: 'Equipo Torneum', descripcion: 'Admin — verificación, catálogo y acceso a la app' },
]

// ── Persistencia POR CUENTA del demo store (30-08) ──
// Las cuentas legacy (y sin sesión) comparten la clave histórica 'todh-demo'
// (compatibilidad total con las suites y los usuarios actuales); cada cuenta
// nueva vive en su propio namespace 'todh-demo@{slug-del-email}'.
const EMAILS_LEGACY = new Set(['jugador@torneum.com', 'to@torneum.com', 'local@torneum.com', 'admin@torneum.com'])

export function claveDemo(email?: string | null): string {
  if (!email || EMAILS_LEGACY.has(email.toLowerCase())) return 'todh-demo'
  return `todh-demo@${email.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

// Clave del blob de la SESIÓN ACTIVA en el momento de la llamada (SSR-safe:
// en servidor no hay sesión → clave legacy, que nunca se lee allí).
export function claveDemoActual(): string {
  if (typeof window === 'undefined') return 'todh-demo'
  return claveDemo(useSesionStore.getState().sesion?.email)
}

// A dónde va cada rol nada más entrar. El TO ya no tiene panel aparte: entra a
// la app como cualquier jugador y su menú trae la sección de organizador.
export function rutaInicial(s: Sesion): string {
  if (s.rol === 'admin') return '/admin-demo'
  if (s.rol === 'local') return '/sede'
  return '/explorar'
}

interface SesionState {
  sesion: Sesion | null
  login: (email: string, password: string) => Sesion | null
  logout: () => void
}

export const useSesionStore = create<SesionState>()(
  persist(
    (set) => ({
      sesion: null,
      login: (email, password) => {
        const c = CUENTAS_DEMO.find(x => x.email.toLowerCase() === email.trim().toLowerCase())
        if (!c || c.password !== password) return null
        const sesion: Sesion = {
          email: c.email, nombre: c.nombre, rol: c.rol,
          ...(c.to ? { to: true } : {}), ...(c.orgId ? { orgId: c.orgId } : {}), ...(c.localId ? { localId: c.localId } : {}),
          ...(c.fresca ? { fresca: true } : {}),
        }
        set({ sesion })
        return sesion
      },
      logout: () => set({ sesion: null }),
    }),
    { name: 'todh-sesion' }
  )
)

// ¿La sesión activa es una cuenta nueva VACÍA? Gatea el escaparate fijo de la
// demo (historial/valoraciones/stats/logros de Álex) → empty-states dignos.
export const useEsCuentaFresca = (): boolean => useSesionStore(s => !!s.sesion?.fresca)
