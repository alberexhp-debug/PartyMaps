import type { RolLocal } from '@/types'

/**
 * Identifica cada zona del panel del local. Una zona = una URL bajo
 * /local-panel/<zona>. El tipo es exhaustivo: si se añade una zona nueva
 * hay que actualizar las matrices ROLES_HOME y ROLES_PERMISOS.
 */
export type ZonaPanel =
  | 'dashboard'
  | 'configuracion'
  | 'mi-local'
  | 'eventos'
  | 'scanner'
  | 'pedidos-bar'
  | 'productos'
  | 'concursos'
  | 'retos'
  | 'sugerencias'
  | 'notificaciones'
  | 'reviews'
  | 'analytics'
  | 'equipo'
  | 'facturacion'

/**
 * Para cada rol, su pantalla por defecto al hacer login (o tras pulsar el logo).
 * Puerta y barman van directo a su única tarea — no pasan por dashboard.
 */
export const ROLES_HOME: Record<RolLocal, ZonaPanel> = {
  dueno:           'dashboard',
  gestor:          'dashboard',
  operador_noche:  'dashboard',
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
    'dashboard', 'configuracion', 'mi-local', 'eventos', 'scanner', 'pedidos-bar', 'productos',
    'concursos', 'retos', 'sugerencias', 'notificaciones', 'reviews',
    'analytics', 'equipo', 'facturacion',
  ],
  // Gestor: todo menos facturación/tier (decisión financiera del dueño)
  gestor: [
    'dashboard', 'configuracion', 'mi-local', 'eventos', 'scanner', 'pedidos-bar', 'productos',
    'concursos', 'retos', 'sugerencias', 'notificaciones', 'reviews',
    'analytics', 'equipo',
  ],
  // Operador de noche: lo que se usa "esta noche"
  operador_noche: [
    'dashboard', 'scanner', 'pedidos-bar', 'notificaciones', 'sugerencias',
    'concursos', 'retos',
  ],
  // Puerta: una sola función — escanear entradas
  puerta: [
    'scanner',
  ],
  // Barman: una sola función — servir pedidos
  barman: [
    'pedidos-bar', 'scanner',
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
  gestor: 'Gestor',
  operador_noche: 'Operador de noche',
  puerta: 'Puerta',
  barman: 'Barman',
}
