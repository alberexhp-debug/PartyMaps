import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * POST /api/local-panel/cortesias/canjear
 * Body: { qr_code }  (formato PMK:<uuid>)
 * Valida que la cortesía es de este local, está emitida y no caducada, y la
 * marca como canjeada. Devuelve la cortesía para que el scanner muestre qué dar.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { qr_code?: string } | null
  const qr = body?.qr_code?.trim()
  if (!qr || !qr.startsWith('PMK:')) {
    return NextResponse.json({ error: 'QR de cortesía no válido' }, { status: 400 })
  }

  const admin = createServiceRoleClient()
  const { data: cortesia } = await admin
    .from('cortesias')
    .select('id, local_id, tipo, descripcion, descuento_pct, beneficiario_nombre, estado, expira_at')
    .eq('qr_code', qr)
    .maybeSingle()

  if (!cortesia) return NextResponse.json({ error: 'Cortesía no encontrada' }, { status: 404 })
  if (cortesia.local_id !== t.local_id) {
    return NextResponse.json({ error: 'Esta cortesía no es de tu local' }, { status: 403 })
  }
  if (cortesia.estado === 'canjeada') {
    return NextResponse.json({ error: 'Esta cortesía ya fue canjeada', cortesia }, { status: 409 })
  }
  if (cortesia.estado === 'anulada') {
    return NextResponse.json({ error: 'Cortesía anulada', cortesia }, { status: 409 })
  }
  if (cortesia.expira_at && new Date(cortesia.expira_at) < new Date()) {
    await admin.from('cortesias').update({ estado: 'expirada' }).eq('id', cortesia.id)
    return NextResponse.json({ error: 'Cortesía caducada', cortesia }, { status: 409 })
  }

  const { error } = await admin.from('cortesias').update({
    estado: 'canjeada',
    canjeada_por: t.id,
    canjeada_at: new Date().toISOString(),
  }).eq('id', cortesia.id).eq('estado', 'emitida') // condición evita doble canje en carrera
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, cortesia: { ...cortesia, estado: 'canjeada' } })
}
