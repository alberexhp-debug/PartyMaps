import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { enviarPushARRPP } from '@/lib/push'

const GESTION = ['dueno', 'gestor']

/**
 * GET   /api/local-panel/rrpp/liquidaciones — lo que el local debe a cada RRPP.
 * PATCH /api/local-panel/rrpp/liquidaciones { id, nota? } — marcar como pagada.
 * Pago manual (fuera de la app): deja rastro para que el RRPP confirme o dispute.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: liqs, error } = await db
    .from('liquidacion_rrpp')
    .select('id, rrpp_id, periodo, monto_total, num_ventas, estado, marcado_pagado_at, marcado_pagado_nota, confirmado_at, disputado_at, disputa_nota')
    .eq('local_id', t.local_id)
    .order('periodo', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ids = [...new Set((liqs ?? []).map(l => l.rrpp_id))]
  const { data: rrpps } = ids.length
    ? await db.from('rrpp').select('id, nombre_publico, slug').in('id', ids)
    : { data: [] as { id: string; nombre_publico: string; slug: string }[] }
  const nombre: Record<string, string> = Object.fromEntries((rrpps ?? []).map(r => [r.id, r.nombre_publico]))

  return NextResponse.json({ liquidaciones: (liqs ?? []).map(l => ({ ...l, rrpp_nombre: nombre[l.rrpp_id] ?? 'RRPP' })) })
}

export async function PATCH(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { id?: string; nota?: string } | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })
  const db = createServiceRoleClient()

  // La liquidación debe ser de este local y estar pendiente o disputada (re-marcable).
  const { data: liq } = await db.from('liquidacion_rrpp').select('id, local_id, rrpp_id, monto_total, estado').eq('id', body.id).maybeSingle()
  if (!liq || liq.local_id !== t.local_id) return NextResponse.json({ error: 'Liquidación no encontrada' }, { status: 404 })
  if (liq.estado === 'confirmado') return NextResponse.json({ error: 'Ya confirmada por el RRPP' }, { status: 409 })

  const { error } = await db.from('liquidacion_rrpp').update({
    estado: 'marcado_pagado',
    marcado_pagado_at: new Date().toISOString(),
    marcado_pagado_por: t.id,
    marcado_pagado_nota: body.nota?.trim().slice(0, 200) || null,
    disputado_at: null, disputa_nota: null,
    updated_at: new Date().toISOString(),
  }).eq('id', body.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Avisar al RRPP para que confirme el cobro.
  const eur = `${(Number(liq.monto_total) || 0).toFixed(2).replace(/\.00$/, '')} €`
  await enviarPushARRPP(liq.rrpp_id, { title: 'Un local te marcó un pago', body: `Te han marcado como pagado ${eur}. Confírmalo en tu panel.`, url: '/rrpp' })
  return NextResponse.json({ ok: true })
}
