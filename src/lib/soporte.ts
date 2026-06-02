/**
 * Etiquetas y estilos compartidos del sistema de soporte (tickets).
 * Usado por el panel del local (/local-panel/soporte) y el panel admin
 * (/admin/soporte) para hablar el mismo idioma visual.
 */

export type EstadoTicket = 'abierto' | 'en_curso' | 'resuelto' | 'cerrado'
export type CategoriaTicket = 'general' | 'tecnico' | 'facturacion' | 'cuenta' | 'sugerencia' | 'otro'
export type PrioridadTicket = 'baja' | 'normal' | 'alta' | 'urgente'

export const ESTADO_LABEL: Record<EstadoTicket, string> = {
  abierto: 'Abierto',
  en_curso: 'En curso',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

/** Clases de badge (texto + fondo + borde) por estado. */
export const ESTADO_BADGE: Record<EstadoTicket, string> = {
  abierto: 'text-[#4F8EF7] bg-[#4F8EF7]/12 border-[#4F8EF7]/30',
  en_curso: 'text-[#F39C12] bg-[#F39C12]/12 border-[#F39C12]/30',
  resuelto: 'text-[#27AE60] bg-[#27AE60]/12 border-[#27AE60]/30',
  cerrado: 'text-[#8B8BA8] bg-white/6 border-white/10',
}

export const CATEGORIA_LABEL: Record<CategoriaTicket, string> = {
  general: 'General',
  tecnico: 'Problema técnico',
  facturacion: 'Facturación',
  cuenta: 'Cuenta y accesos',
  sugerencia: 'Sugerencia',
  otro: 'Otro',
}

export const PRIORIDAD_LABEL: Record<PrioridadTicket, string> = {
  baja: 'Baja',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const PRIORIDAD_COLOR: Record<PrioridadTicket, string> = {
  baja: '#8B8BA8',
  normal: '#4F8EF7',
  alta: '#F39C12',
  urgente: '#E94560',
}

export const CATEGORIAS: CategoriaTicket[] = ['general', 'tecnico', 'facturacion', 'cuenta', 'sugerencia', 'otro']
export const PRIORIDADES: PrioridadTicket[] = ['baja', 'normal', 'alta', 'urgente']
export const ESTADOS: EstadoTicket[] = ['abierto', 'en_curso', 'resuelto', 'cerrado']

/** Tiempo relativo corto en español a partir de una fecha ISO. */
export function haceTiempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'ahora'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `hace ${d} d`
  return new Date(iso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}
