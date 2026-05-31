import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, gestorPoseeLocal } from '@/lib/gestor/auth'

/**
 * Códigos de descuento del Gestor, acotados a un local de su cartera.
 * GET   ?local_id=  → códigos del local
 * POST  { local_id, codigo, tipo, valor, usos_max?, expira_at? }
 * PATCH { local_id, codigo_id, activo }
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const url = new URL(req.url)
  const localId = url.searchParams.get('local_id') || ''
  const clase = url.searchParams.get('clase') // 'gratis' | 'descuento' | null(todos)
  if (!(await gestorPoseeLocal(ctx.gestor.id, localId))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('codigos_descuento')
    .select('id, codigo, tipo, valor, usos_max, usos_actuales, expira_at, activo, created_at')
    .eq('local_id', localId)
    .order('created_at', { ascending: false })

  // Una "entrada gratis" es un código de 100%. Separamos las dos listas.
  const esGratis = (c: { tipo: string; valor: number }) => c.tipo === 'porcentaje' && Number(c.valor) >= 100
  let codigos = data ?? []
  if (clase === 'gratis') codigos = codigos.filter(esGratis)
  else if (clase === 'descuento') codigos = codigos.filter(c => !esGratis(c))
  return NextResponse.json({ codigos })
}

export async function POST(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as Partial<{
    local_id: string; codigo: string; tipo: 'porcentaje' | 'importe'
    valor: number; usos_max: number; expira_at: string
  }> | null
  if (!body?.local_id) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, body.local_id))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }

  const codigo = (body.codigo || '').trim().toUpperCase().replace(/\s+/g, '')
  const tipo = body.tipo === 'importe' ? 'importe' : 'porcentaje'
  const valor = Number(body.valor)
  if (!/^[A-Z0-9]{3,20}$/.test(codigo)) return NextResponse.json({ error: 'Código: 3-20 letras/números, sin espacios' }, { status: 400 })
  if (!(valor > 0)) return NextResponse.json({ error: 'El valor debe ser mayor que 0' }, { status: 400 })
  if (tipo === 'porcentaje' && valor > 100) return NextResponse.json({ error: 'El porcentaje no puede superar 100' }, { status: 400 })

  const admin = createServiceRoleClient()

  // Las ENTRADAS GRATIS (código al 100%) requieren plan Pro/Destacado.
  const esEntradaGratis = tipo === 'porcentaje' && valor >= 100
  if (esEntradaGratis) {
    const { data: local } = await admin.from('locales').select('tier').eq('id', body.local_id).maybeSingle()
    if (local?.tier !== 'pro' && local?.tier !== 'destacado') {
      return NextResponse.json({ error: 'Las entradas gratis requieren que el local esté en plan Pro o Destacado' }, { status: 403 })
    }
  }

  const { data, error } = await admin.from('codigos_descuento').insert({
    local_id: body.local_id,
    gestor_id: ctx.gestor.id,
    codigo, tipo, valor,
    usos_max: body.usos_max && body.usos_max > 0 ? Math.floor(body.usos_max) : null,
    expira_at: body.expira_at || null,
  }).select('id, codigo, tipo, valor, usos_max, usos_actuales, expira_at, activo, created_at').single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Ya existe ese código en este local' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ codigo: data })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as Partial<{ local_id: string; codigo_id: string; activo: boolean }> | null
  if (!body?.local_id || !body.codigo_id) return NextResponse.json({ error: 'Falta local_id o codigo_id' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, body.local_id))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('codigos_descuento')
    .update({ activo: !!body.activo })
    .eq('id', body.codigo_id).eq('local_id', body.local_id)
    .select('id, activo').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ codigo: data })
}
