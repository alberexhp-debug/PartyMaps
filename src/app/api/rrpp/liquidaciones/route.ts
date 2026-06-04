import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * PATCH /api/rrpp/liquidaciones { id, accion: 'confirmar' | 'disputar', nota? }
 * El RRPP responde a una liquidación que el local marcó como pagada:
 *   - confirmar → 'confirmado' (cobro recibido, cierra el ciclo)
 *   - disputar  → 'disputado' (no recibido / importe incorrecto, con nota)
 * (El listado de liquidaciones del RRPP llega por /api/rrpp/perfil.)
 */
export async function PATCH(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { id?: string; accion?: 'confirmar' | 'disputar'; nota?: string } | null
  if (!body?.id || !['confirmar', 'disputar'].includes(body.accion ?? '')) {
    return NextResponse.json({ error: "accion: 'confirmar' o 'disputar'" }, { status: 400 })
  }
  const db = createServiceRoleClient()

  const { data: liq } = await db.from('liquidacion_rrpp').select('id, rrpp_id, estado').eq('id', body.id).maybeSingle()
  if (!liq || liq.rrpp_id !== ctx.rrpp.id) return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
  if (liq.estado !== 'marcado_pagado') {
    return NextResponse.json({ error: 'Solo puedes responder a una liquidación que el local marcó como pagada' }, { status: 409 })
  }

  const ahora = new Date().toISOString()
  const patch = body.accion === 'confirmar'
    ? { estado: 'confirmado', confirmado_at: ahora, updated_at: ahora }
    : { estado: 'disputado', disputado_at: ahora, disputa_nota: body.nota?.trim().slice(0, 200) || null, updated_at: ahora }

  const { error } = await db.from('liquidacion_rrpp').update(patch).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, estado: patch.estado })
}
