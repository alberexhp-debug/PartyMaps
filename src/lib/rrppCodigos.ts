import type { SupabaseClient } from '@supabase/supabase-js'

/** Categorías de descuento que un local/manager configura por RRPP. */
export type CategoriaDescuento = 'entrada' | 'consumicion' | 'reservado'
export const CATEGORIAS_DESCUENTO: CategoriaDescuento[] = ['entrada', 'consumicion', 'reservado']
export const LABEL_CATEGORIA: Record<CategoriaDescuento, string> = {
  entrada: 'Entrada',
  consumicion: 'Consumición',
  reservado: 'Reservado',
}

export type Descuentos = Partial<Record<CategoriaDescuento, number>>

/** Normaliza un objeto de descuentos: solo categorías válidas, % en [0,100]. */
export function sanearDescuentos(input: unknown): Descuentos {
  const out: Descuentos = {}
  if (input && typeof input === 'object') {
    for (const c of CATEGORIAS_DESCUENTO) {
      const v = Number((input as Record<string, unknown>)[c])
      if (Number.isFinite(v) && v > 0) out[c] = Math.min(100, Math.round(v))
    }
  }
  return out
}

export type RrppCodigoValido = {
  valido: true
  codigo_id: string
  rrpp_id: string
  descuentos: Descuentos
}
export type RrppCodigoInvalido = { valido: false; error: string }

/**
 * Valida un código de RRPP para un local (sin consumirlo): activo, no caducado,
 * con cupo. Devuelve el rrpp_id (para atribuir la comisión) y los descuentos
 * congelados del código.
 */
export async function validarRrppCodigo(
  db: SupabaseClient, codigo: string, localId: string,
): Promise<RrppCodigoValido | RrppCodigoInvalido | null> {
  const limpio = (codigo || '').trim()
  if (!limpio) return null
  const { data, error } = await db
    .from('rrpp_codigo')
    .select('id, rrpp_id, usos_max, usos_actuales, descuentos, activo, expira_at')
    .eq('local_id', localId)
    .ilike('codigo', limpio)
    .eq('activo', true)
    .maybeSingle()
  if (error || !data) return null // no es un código de RRPP (puede ser de gestor)
  if (data.expira_at && new Date(data.expira_at) < new Date()) return { valido: false, error: 'Código caducado' }
  if (data.usos_max != null && data.usos_actuales >= data.usos_max) return { valido: false, error: 'Código agotado' }
  return { valido: true, codigo_id: data.id, rrpp_id: data.rrpp_id, descuentos: sanearDescuentos(data.descuentos) }
}

/** Descuento en € sobre el precio base para una categoría, sin pasarse del precio. */
export function descuentoCategoria(descuentos: Descuentos, categoria: CategoriaDescuento, precioBase: number): number {
  const pct = Number(descuentos?.[categoria] ?? 0)
  if (!pct) return 0
  return Math.min(precioBase, Math.round(precioBase * (pct / 100) * 100) / 100)
}
