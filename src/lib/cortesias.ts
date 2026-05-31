import type { TierLocal, TipoCortesia } from '@/types'

/** Etiquetas de los tipos de cortesía. */
export const CORTESIA_LABEL: Record<TipoCortesia, string> = {
  consumicion: 'Consumiciones',
  descuento: 'Descuentos',
  entrada_gratis: 'Entradas gratis',
}

/**
 * Gating por plan: qué tipos de cortesía permite el tier del local.
 * - visibility: ninguno (no vende).
 * - venta/basico: consumiciones y descuentos.
 * - pro/destacado: todo, incl. entradas gratis (incentivo de upgrade).
 */
export function cortesiaPermitidaPorPlan(tier: TierLocal | undefined, tipo: TipoCortesia): boolean {
  if (!tier || tier === 'visibility') return false
  if (tipo === 'entrada_gratis') return tier === 'pro' || tier === 'destacado'
  return true // consumicion y descuento en cualquier tier de venta
}

export type PermisosCortesia = {
  cortesia_consumiciones: boolean
  cortesia_descuentos: boolean
  cortesia_entradas_gratis: boolean
}

/**
 * Presets de nivel. El dueño aplica un nivel y luego puede afinar
 * (p.ej. nivel 2 pero sin entradas gratis). El gating por plan se aplica
 * encima: aunque el preset active un tipo, si el plan no lo permite, queda off.
 */
export const NIVELES_CORTESIA: { nivel: number; label: string; desc: string; permisos: PermisosCortesia }[] = [
  { nivel: 0, label: 'Sin cortesías', desc: 'No puede regalar nada', permisos: { cortesia_consumiciones: false, cortesia_descuentos: false, cortesia_entradas_gratis: false } },
  { nivel: 1, label: 'Nivel 1', desc: 'Consumiciones', permisos: { cortesia_consumiciones: true, cortesia_descuentos: false, cortesia_entradas_gratis: false } },
  { nivel: 2, label: 'Nivel 2', desc: 'Consumiciones y descuentos', permisos: { cortesia_consumiciones: true, cortesia_descuentos: true, cortesia_entradas_gratis: false } },
  { nivel: 3, label: 'Nivel 3', desc: 'Todo, incl. entradas gratis', permisos: { cortesia_consumiciones: true, cortesia_descuentos: true, cortesia_entradas_gratis: true } },
]
