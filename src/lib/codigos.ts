import type { SupabaseClient } from '@supabase/supabase-js'

export type CodigoValido = {
  valido: true
  codigo_id: string
  codigo: string
  tipo: 'porcentaje' | 'importe'
  valor: number
  descripcion: string
}
export type CodigoInvalido = { valido: false; error: string }

/** Etiqueta legible del descuento (ej. "20% de descuento", "5 € de descuento"). */
function describir(tipo: 'porcentaje' | 'importe', valor: number): string {
  return tipo === 'porcentaje' ? `${valor}% de descuento` : `${valor} € de descuento`
}

/**
 * Valida un código de descuento para un local (sin consumirlo).
 * Solo lectura: comprueba activo, caducidad y cupo.
 */
export async function validarCodigo(db: SupabaseClient, codigo: string, localId: string): Promise<CodigoValido | CodigoInvalido> {
  const limpio = (codigo || '').trim()
  if (!limpio) return { valido: false, error: 'Introduce un código' }

  const { data } = await db
    .from('codigos_descuento')
    .select('id, codigo, tipo, valor, usos_max, usos_actuales, expira_at, activo')
    .eq('local_id', localId)
    .ilike('codigo', limpio)
    .eq('activo', true)
    .maybeSingle()

  if (!data) return { valido: false, error: 'Código no válido para este local' }
  if (data.expira_at && new Date(data.expira_at) < new Date()) return { valido: false, error: 'Código caducado' }
  if (data.usos_max != null && data.usos_actuales >= data.usos_max) return { valido: false, error: 'Código agotado' }

  return {
    valido: true,
    codigo_id: data.id,
    codigo: data.codigo,
    tipo: data.tipo,
    valor: Number(data.valor),
    descripcion: describir(data.tipo, Number(data.valor)),
  }
}

/** Descuento en € sobre un precio base, sin pasarse del propio precio. */
export function calcularDescuento(tipo: 'porcentaje' | 'importe', valor: number, precioBase: number): number {
  const bruto = tipo === 'porcentaje' ? precioBase * (valor / 100) : valor
  return Math.min(precioBase, Math.round(bruto * 100) / 100)
}
