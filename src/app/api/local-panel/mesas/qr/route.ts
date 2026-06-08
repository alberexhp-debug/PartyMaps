import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES = ['dueno', 'gestor']

/**
 * GET /api/local-panel/mesas/qr — mesas del local con su qr_token (PMM), generando
 * uno para las que aún no lo tengan. Alimenta la hoja imprimible "QR de las mesas".
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !ROLES.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: mesas } = await db.from('mesas')
    .select('id, codigo, tipo, zona, qr_token')
    .eq('local_id', t.local_id).eq('activa', true).order('codigo')

  // Genera token para las mesas que no lo tengan (idempotente; respeta el existente).
  for (const m of (mesas ?? []).filter(x => !x.qr_token)) {
    const token = crypto.randomUUID().replace(/-/g, '')
    const { data: upd } = await db.from('mesas')
      .update({ qr_token: token }).eq('id', m.id).is('qr_token', null).select('qr_token').maybeSingle()
    m.qr_token = upd?.qr_token || token
  }

  const { data: local } = await db.from('locales').select('nombre').eq('id', t.local_id).maybeSingle()
  return NextResponse.json({ local_id: t.local_id, local_nombre: local?.nombre || '', mesas: mesas ?? [] })
}
