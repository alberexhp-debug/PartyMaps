import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * GET /api/local-panel/estado — estado actual del local del trabajador
 * autenticado, leído FRESCO (no del store persistido). Lo usa el aviso de
 * "en revisión" para reflejar al instante cuando el admin aprueba o suspende
 * el local, sin obligar a re-loguear. Reusa locales.estado (§2.3).
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data } = await db.from('locales').select('estado').eq('id', t.local_id).maybeSingle()
  return NextResponse.json({ estado: data?.estado ?? null })
}
