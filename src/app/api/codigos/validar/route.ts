import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validarCodigo, calcularDescuento } from '@/lib/codigos'

/**
 * POST /api/codigos/validar { codigo, local_id, precio? }
 * Previsualiza un código de descuento en el checkout (sin consumirlo).
 * Devuelve { valido, descripcion, descuento? } o { valido:false, error }.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { codigo?: string; local_id?: string; precio?: number } | null
  if (!body?.codigo || !body.local_id) return NextResponse.json({ valido: false, error: 'Faltan datos' }, { status: 400 })

  const admin = createServiceRoleClient()
  const res = await validarCodigo(admin, body.codigo, body.local_id)
  if (!res.valido) return NextResponse.json(res)

  const descuento = body.precio != null ? calcularDescuento(res.tipo, res.valor, Number(body.precio)) : undefined
  return NextResponse.json({ valido: true, codigo: res.codigo, tipo: res.tipo, valor: res.valor, descripcion: res.descripcion, descuento })
}
