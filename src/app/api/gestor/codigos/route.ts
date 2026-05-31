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
  const localId = new URL(req.url).searchParams.get('local_id') || ''
  if (!(await gestorPoseeLocal(ctx.gestor.id, localId))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('codigos_descuento')
    .select('id, codigo, tipo, valor, usos_max, usos_actuales, expira_at, activo, created_at')
    .eq('local_id', localId)
    .order('created_at', { ascending: false })
  return NextResponse.json({ codigos: data ?? [] })
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
