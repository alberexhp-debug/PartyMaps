import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

/**
 * POST /api/local-panel/cuenta/totp/desactivar — el propio trabajador desactiva su
 * verificación en dos pasos (es opcional, §2.4). Borra el secreto y marca
 * totp_activado=false. Si pierde el móvil, el admin puede reiniciarlo (§5.2).
 */
export async function POST() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const svc = createServiceRoleClient()
  await svc.from('usuario_local').update({ totp_activado: false }).eq('id', t.id)
  await svc.from('trabajador_totp').delete().eq('usuario_local_id', t.id)
  return NextResponse.json({ ok: true })
}
