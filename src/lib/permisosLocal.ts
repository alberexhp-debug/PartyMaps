import type { RolLocal } from '@/types'

/**
 * Identifica cada zona del panel del local. Una zona = una URL bajo
 * /local-panel/<zona>. El tipo es exhaustivo: si se añade una zona nueva
 * hay que actualizar las matrices ROLES_HOME y ROLES_PERMISOS.
 */
export type ZonaPanel =
  | 'dashboard'
  | 'puesta-a-punto'
  | 'configuracion'
  | 'mi-local'
  | 'eventos'
  | 'scanner'
  | 'taquilla'
  | 'pedidos-bar'
  | 'sala'
  | 'productos'
  | 'clientes'
  | 'crm'
  | 'rrpp'
  | 'cortesias'
  | 'sugerencias'
  | 'notificaciones'
  | 'reviews'
  | 'analytics'
  | 'equipo'
  | 'mensajes'
  | 'facturacion'
  | 'soporte'

/**
 * Para cada rol, su pantalla por defecto al hacer login (o tras pulsar el logo).
 * Puerta y barman van directo a su única tarea — no pasan por dashboard.
 */
export const ROLES_HOME: Record<RolLocal, ZonaPanel> = {
  dueno:           'dashboard',
  gestor:          'dashboard',
  puerta:          'scanner',
  barman:          'pedidos-bar',
}

/**
 * Permisos por rol. Cada rol tiene la lista exacta de zonas que puede ver
 * en el nav y a las que puede acceder por URL. Centralizado para mantener
 * coherencia entre layout, redirects y guards.
 */
export const ROLES_PERMISOS: Record<RolLocal, ZonaPanel[]> = {
  // Dueño: control total del negocio
  dueno: [
    'dashboard', 'puesta-a-punto', 'configuracion', 'mi-local', 'eventos', 'scanner', 'taquilla', 'pedidos-bar', 'sala', 'productos',
    'clientes', 'crm', 'rrpp', 'cortesias', 'sugerencias', 'notificaciones', 'reviews',
    'analytics', 'equipo', 'mensajes', 'facturacion', 'soporte',
  ],
  // Gestor: todo menos facturación/tier (decisión financiera del dueño)
  gestor: [
    'dashboard', 'puesta-a-punto', 'configuracion', 'mi-local', 'eventos', 'scanner', 'taquilla', 'pedidos-bar', 'sala', 'productos',
    'clientes', 'crm', 'rrpp', 'cortesias', 'sugerencias', 'notificaciones', 'reviews',
    'analytics', 'equipo', 'mensajes', 'soporte',
  ],
  // Puerta: escanear entradas, vender en taquilla + emitir/canjear cortesías
  puerta: [
    'scanner', 'taquilla', 'cortesias', 'mensajes',
  ],
  // Barman: sirve pedidos, ve la sala/mesas y emite cortesías de su nivel
  barman: [
    'pedidos-bar', 'sala', 'scanner', 'cortesias', 'mensajes',
  ],
}

export function puedeAcceder(rol: RolLocal | undefined, zona: ZonaPanel): boolean {
  if (!rol) return false
  return ROLES_PERMISOS[rol].includes(zona)
}

export function homeDeRol(rol: RolLocal | undefined): ZonaPanel {
  return ROLES_HOME[rol ?? 'dueno']
}

/** Etiqueta legible del rol, usada en headers/badges */
export const ROL_LABEL: Record<RolLocal, string> = {
  dueno: 'Dueño',
  gestor: 'Encargado',
  puerta: 'Check-in',
  barman: 'Árbitro',
}

/**
 * Zonas que el dueño/encargado puede conceder o retirar a su equipo a la carta
 * (§2.1 avanzado). Excluye las sensibles (facturación, equipo, configuración,
 * mi-local, soporte, puesta-a-punto), que siguen ligadas al rol base.
 */
export const ZONAS_ASIGNABLES: ZonaPanel[] = [
  'dashboard', 'scanner', 'taquilla', 'pedidos-bar', 'sala', 'productos',
  'cortesias', 'eventos', 'rrpp', 'clientes', 'crm', 'reviews',
  'sugerencias', 'notificaciones', 'analytics', 'mensajes',
]

/** Etiqueta legible de cada zona, para el editor de permisos del equipo. */
export const ZONA_LABEL: Record<ZonaPanel, string> = {
  dashboard: 'Resumen', 'puesta-a-punto': 'Puesta a punto', configuracion: 'Configuración',
  'mi-local': 'Mi sede', eventos: 'Torneos', scanner: 'Check-in & Aforo', taquilla: 'Inscripciones',
  'pedidos-bar': 'Pedidos', sala: 'Setups', productos: 'Productos', clientes: 'Jugadores',
  crm: 'Jugadores', rrpp: 'Organizadores', cortesias: 'Bonos', sugerencias: 'Sugerencias',
  notificaciones: 'Notificaciones', reviews: 'Valoraciones', analytics: 'Analítica', equipo: 'Equipo',
  mensajes: 'Mensajes', facturacion: 'Facturación', soporte: 'Soporte',
}

type TrabajadorPerm = { rol: RolLocal; permisos_override?: { extra?: string[]; quitar?: string[] } | null } | null | undefined

/**
 * Zonas EFECTIVAS de un trabajador: las de su rol base, más las concedidas a
 * medida (extra) y menos las retiradas (quitar) — todo acotado a ZONAS_ASIGNABLES.
 * Si no hay override, devuelve exactamente las del rol (comportamiento previo,
 * 100% compatible). El dueño nunca se restringe (evita auto-bloqueos).
 */
export function zonasDeTrabajador(trabajador: TrabajadorPerm): ZonaPanel[] {
  if (!trabajador?.rol) return []
  const base = ROLES_PERMISOS[trabajador.rol]
  if (trabajador.rol === 'dueno') return base
  const ov = trabajador.permisos_override
  if (!ov) return base
  const asignable = (z: string): z is ZonaPanel => ZONAS_ASIGNABLES.includes(z as ZonaPanel)
  const extra = (ov.extra ?? []).filter(z => asignable(z) && !base.includes(z as ZonaPanel)) as ZonaPanel[]
  const quitar = new Set((ov.quitar ?? []).filter(asignable))
  return [...base, ...extra].filter(z => !quitar.has(z))
}

/** Home efectivo: el del rol si sigue permitido; si no, la primera zona disponible. */
export function homeDeTrabajador(trabajador: TrabajadorPerm): ZonaPanel {
  const zonas = zonasDeTrabajador(trabajador)
  const home = homeDeRol(trabajador?.rol)
  return zonas.includes(home) ? home : (zonas[0] ?? 'dashboard')
}
