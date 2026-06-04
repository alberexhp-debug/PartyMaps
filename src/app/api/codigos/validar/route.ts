import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { validarCodigo, calcularDescuento } from '@/lib/codigos'
import { validarRrppCodigo, descuentoCategoria } from '@/lib/rrppCodigos'

/**
 * POST /api/codigos/validar { codigo, local_id, precio? }
 * Previsualiza un código en el checkout de entrada (sin consumirlo). Reconoce
 * DOS sistemas: códigos de descuento del gestor/local (codigos_descuento) y
 * códigos del RRPP (rrpp_codigo). Devuelve { valido, descripcion, descuento? }
 * o { valido:false, error }.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { codigo?: string; local_id?: string; precio?: number } | null
  if (!body?.codigo || !body.local_id) return NextResponse.json({ valido: false, error: 'Faltan datos' }, { status: 400 })

  const admin = createServiceRoleClient()

  // 1) Código de descuento del gestor/local.
  const res = await validarCodigo(admin, body.codigo, body.local_id)
  if (res.valido) {
    const descuento = body.precio != null ? calcularDescuento(res.tipo, res.valor, Number(body.precio)) : undefined
    return NextResponse.json({ valido: true, codigo: res.codigo, tipo: res.tipo, valor: res.valor, descripcion: res.descripcion, descuento })
  }

  // 2) Si no, ¿es un código del RRPP para este local?
  const rc = await validarRrppCodigo(admin, body.codigo, body.local_id)
  if (rc?.valido) {
    const descuento = body.precio != null ? descuentoCategoria(rc.descuentos, 'entrada', Number(body.precio)) : 0
    return NextResponse.json({
      valido: true,
      codigo: body.codigo.trim(),
      tipo: 'rrpp',
      descripcion: descuento > 0 ? 'Código de promotor' : 'Código de promotor (sin descuento en la entrada)',
      descuento,
    })
  }
  // Código RRPP existente pero caducado/agotado: error específico.
  if (rc && !rc.valido) return NextResponse.json({ valido: false, error: rc.error })

  // Ni gestor ni RRPP: el error del validador de gestor.
  return NextResponse.json(res)
}
