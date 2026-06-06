// Definición de los pasos del onboarding por perfil (doc 01 §6, §10.1).
// Los `hecho`/`aplica` son funciones PURAS sobre datos ya cargados → sin tabla de
// checks, sin desincronización: si el dueño sube fotos por su cuenta, el paso se
// marca solo. Lo único persistido (onboarding_estado.pasos_visitados) son los pasos
// tipo "Revisar" que no tienen dato que comprobar (p. ej. visitar Facturación).

export type TipoPaso = 'obligatorio' | 'recomendado'
export type PerfilOnboarding = 'dueno' | 'gestor'

/** Datos reales del local + conteos que necesitan los checks. Lo rellena el endpoint. */
export interface OnboardingCtx {
  local: {
    nombre?: string | null
    direccion?: string | null
    latitud?: number | null
    longitud?: number | null
    tipo_local?: string | null
    musica?: string[] | null
    horario?: Record<string, { apertura: string; cierre: string } | null> | null
    imagenes?: string[] | null
    aforo_por_dia?: Record<string, number> | null
    aforo_maximo?: number | null
    reservas_activas?: boolean | null
  }
  equipoCount: number          // filas en usuario_local (dueño incluido)
  productosActivosCount: number
  eventosPublicadosCount: number
  mesasCount: number
  rrppCount: number            // rrpp_venue activa o pendiente
  pasosVisitados: string[]
}

export interface PasoDef {
  id: string
  titulo: string
  motivo: string
  ruta: string
  tipo: TipoPaso
  /** Si está y devuelve false, el paso no aplica (no cuenta ni se muestra). */
  aplica?: (ctx: OnboardingCtx) => boolean
  hecho: (ctx: OnboardingCtx) => boolean
}

// ---- Checks reutilizables ----
const tieneDatosBasicos = (c: OnboardingCtx) =>
  !!c.local.nombre?.trim() && !!c.local.direccion?.trim() &&
  c.local.latitud != null && c.local.longitud != null &&
  !!c.local.tipo_local && (c.local.musica?.length ?? 0) > 0

const tieneHorario = (c: OnboardingCtx) =>
  !!c.local.horario && Object.values(c.local.horario).some(v => v != null)

const tieneFotos = (c: OnboardingCtx) => (c.local.imagenes?.length ?? 0) >= 1

const tieneAforo = (c: OnboardingCtx) =>
  (!!c.local.aforo_por_dia && Object.keys(c.local.aforo_por_dia).length > 0) ||
  (c.local.aforo_maximo ?? 0) > 0

// ---- Pasos del dueño (doc 01 §6.1) ----
const PASO_DATOS: PasoDef = {
  id: 'datos', titulo: 'Datos básicos', tipo: 'obligatorio',
  motivo: 'Es tu carta de presentación en el mapa.',
  ruta: '/local-panel/configuracion?tab=info', hecho: tieneDatosBasicos,
}
const PASO_HORARIOS: PasoDef = {
  id: 'horarios', titulo: 'Horarios de apertura', tipo: 'obligatorio',
  motivo: 'La gente verá tu local «abierto» en el mapa. Sin esto sales sin estado.',
  ruta: '/local-panel/configuracion?tab=horario', hecho: tieneHorario,
}
const PASO_FOTOS: PasoDef = {
  id: 'fotos', titulo: 'Fotos', tipo: 'obligatorio',
  motivo: 'Los locales con fotos reciben muchas más visitas a su ficha.',
  ruta: '/local-panel/configuracion?tab=galeria', hecho: tieneFotos,
}
const PASO_AFORO: PasoDef = {
  id: 'aforo', titulo: 'Aforo por día', tipo: 'obligatorio',
  motivo: 'Controla el aforo en vivo la noche que abres.',
  ruta: '/local-panel/configuracion?tab=aforo', hecho: tieneAforo,
}
const PASO_EQUIPO: PasoDef = {
  id: 'equipo', titulo: 'Tu equipo', tipo: 'recomendado',
  motivo: 'Portero con scanner y barman con su cola: cada uno su pantalla.',
  ruta: '/local-panel/equipo', hecho: c => c.equipoCount > 1,
}
const PASO_CARTA: PasoDef = {
  id: 'carta', titulo: 'Carta de la barra', tipo: 'recomendado',
  motivo: 'Tus clientes piden desde el móvil y tú cobras sin colas.',
  ruta: '/local-panel/configuracion?tab=bar', hecho: c => c.productosActivosCount >= 3,
}
const PASO_EVENTO: PasoDef = {
  id: 'evento', titulo: 'Primer evento', tipo: 'recomendado',
  motivo: 'Un evento publicado es tu escaparate de la semana.',
  ruta: '/local-panel/eventos', hecho: c => c.eventosPublicadosCount >= 1,
}
const PASO_SALA: PasoDef = {
  id: 'sala', titulo: 'Plano de sala', tipo: 'recomendado',
  motivo: 'Para aceptar reservas de mesa y reservados.',
  ruta: '/local-panel/sala',
  aplica: c => c.local.reservas_activas === true, // condicional: solo si activó reservas
  hecho: c => c.mesasCount >= 1,
}
const PASO_RRPP: PasoDef = {
  id: 'rrpp', titulo: 'Tus RRPP', tipo: 'recomendado',
  motivo: 'Los RRPP te traen gente; aquí los gestionas con comisiones claras.',
  ruta: '/local-panel/rrpp', hecho: c => c.rrppCount >= 1,
}
const PASO_TIER: PasoDef = {
  id: 'tier', titulo: 'Revisa tu tier', tipo: 'recomendado',
  motivo: 'Mira lo que pagas y la calculadora: sin sorpresas.',
  ruta: '/local-panel/facturacion', hecho: c => c.pasosVisitados.includes('tier'),
}

// Dueño: todos. Gestor (encargado): igual SIN facturación/tier (doc 01 §6.2).
const PASOS_DUENO: PasoDef[] = [
  PASO_DATOS, PASO_HORARIOS, PASO_FOTOS, PASO_AFORO,
  PASO_EQUIPO, PASO_CARTA, PASO_EVENTO, PASO_SALA, PASO_RRPP, PASO_TIER,
]
const PASOS_GESTOR: PasoDef[] = PASOS_DUENO.filter(p => p.id !== 'tier')

export const PASOS_POR_PERFIL: Record<PerfilOnboarding, PasoDef[]> = {
  dueno: PASOS_DUENO,
  gestor: PASOS_GESTOR,
}

export interface PasoResuelto {
  id: string
  titulo: string
  motivo: string
  ruta: string
  tipo: TipoPaso
  estado: 'hecho' | 'pendiente'
}

export interface ResumenOnboarding {
  pasos: PasoResuelto[]
  pct: number
  obligatoriosPendientes: number
}

/** Resuelve el checklist de un perfil contra el contexto real. */
export function resolverOnboarding(perfil: PerfilOnboarding, ctx: OnboardingCtx): ResumenOnboarding {
  const aplicables = PASOS_POR_PERFIL[perfil].filter(p => !p.aplica || p.aplica(ctx))
  const pasos: PasoResuelto[] = aplicables.map(p => ({
    id: p.id, titulo: p.titulo, motivo: p.motivo, ruta: p.ruta, tipo: p.tipo,
    estado: p.hecho(ctx) ? 'hecho' : 'pendiente',
  }))
  const hechos = pasos.filter(p => p.estado === 'hecho').length
  const pct = pasos.length ? Math.round((hechos / pasos.length) * 100) : 100
  const obligatoriosPendientes = pasos.filter(p => p.tipo === 'obligatorio' && p.estado === 'pendiente').length
  return { pasos, pct, obligatoriosPendientes }
}
