import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { cortesiaPermitidaPorPlan } from '@/lib/cortesias'
import type { TipoCortesia } from '@/types'

const TIPOS: TipoCortesia[] = ['consumicion', 'descuento', 'entrada_gratis']

/**
 * GET /api/local-panel/cortesias — últimas cortesías del local (panel).
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('cortesias')
    .select('id, tipo, descripcion, descuento_pct, beneficiario_nombre, qr_code, estado, created_at, canjeada_at, otorgada_por')
    .eq('local_id', t.local_id)
    .order('created_at', { ascending: false })
    .limit(40)
  return NextResponse.json({ cortesias: data ?? [] })
}

/**
 * POST /api/local-panel/cortesias — emitir una cortesía.
 * Valida: permiso del trabajador para ese tipo, gating por plan y tope diario.
 * Body: { tipo, descripcion?, producto_id?, descuento_pct?, beneficiario_nombre?, beneficiario_telefono? }
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as Partial<{
    tipo: TipoCortesia; descripcion: string; producto_id: string
    descuento_pct: number; beneficiario_nombre: string; beneficiario_telefono: string
  }> | null
  if (!body?.tipo || !TIPOS.includes(body.tipo)) {
    return NextResponse.json({ error: 'Tipo de cortesía no válido' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Datos del trabajador (permisos) + tier del local
  const [{ data: worker }, { data: local }] = await Promise.all([
    admin.from('usuario_local').select('rol, cortesia_consumiciones, cortesia_descuentos, cortesia_entradas_gratis, cortesia_max_dia').eq('id', t.id).maybeSingle(),
    admin.from('locales').select('tier').eq('id', t.local_id).maybeSingle(),
  ])
  if (!worker) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })

  const esDueno = worker.rol === 'dueno'

  // Gating por plan
  if (!cortesiaPermitidaPorPlan(local?.tier, body.tipo)) {
    return NextResponse.json({ error: 'El plan del local no incluye este tipo de cortesía' }, { status: 403 })
  }

  // Permiso del trabajador (el dueño puede todo lo que permita el plan)
  const flag = body.tipo === 'consumicion' ? worker.cortesia_consumiciones
    : body.tipo === 'descuento' ? worker.cortesia_descuentos
      : worker.cortesia_entradas_gratis
  if (!esDueno && !flag) {
    return NextResponse.json({ error: 'No tienes permiso para regalar este tipo de cortesía' }, { status: 403 })
  }

  // Tope diario (no aplica al dueño). max_dia 0 = sin límite.
  const maxDia = worker.cortesia_max_dia ?? 0
  if (!esDueno && maxDia > 0) {
    const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0)
    const { count } = await admin
      .from('cortesias').select('id', { count: 'exact', head: true })
      .eq('otorgada_por', t.id).gte('created_at', inicioHoy.toISOString())
    if ((count ?? 0) >= maxDia) {
      return NextResponse.json({ error: `Has alcanzado tu límite de ${maxDia} cortesías hoy` }, { status: 403 })
    }
  }

  const descripcion = (body.descripcion || '').trim() || defaultDescripcion(body.tipo, body.descuento_pct)
  const qr = `PMK:${crypto.randomUUID()}`
  const expira = new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString() // caduca en 12h

  const { data: cortesia, error } = await admin.from('cortesias').insert({
    local_id: t.local_id,
    otorgada_por: t.id,
    tipo: body.tipo,
    producto_id: body.producto_id || null,
    descripcion,
    descuento_pct: body.tipo === 'descuento' ? (body.descuento_pct ?? null) : null,
    beneficiario_nombre: body.beneficiario_nombre?.trim() || null,
    beneficiario_telefono: body.beneficiario_telefono?.trim() || null,
    qr_code: qr,
    estado: 'emitida',
    expira_at: expira,
  }).select('id, tipo, descripcion, descuento_pct, beneficiario_nombre, qr_code, estado, created_at, expira_at').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ cortesia })
}

function defaultDescripcion(tipo: TipoCortesia, pct?: number): string {
  if (tipo === 'consumicion') return 'Consumición gratis'
  if (tipo === 'entrada_gratis') return 'Entrada gratis'
  return pct ? `${pct}% de descuento` : 'Descuento'
}
