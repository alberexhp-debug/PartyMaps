import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * POST /api/admin/locales/reset-totp { local_id }
 * Reinicia la verificación en dos pasos del dueño del local (p. ej. perdió el
 * móvil, §5.2). Borra el secreto; en el próximo acceso podrá configurarlo de nuevo.
 */
export async function POST(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { local_id } = await req.json().catch(() => ({})) as { local_id?: string }
  if (!local_id) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: dueno } = await svc.from('usuario_local')
    .select('id').eq('local_id', local_id).eq('rol', 'dueno').limit(1).maybeSingle()
  if (!dueno) return NextResponse.json({ error: 'Este local no tiene cuenta de dueño' }, { status: 404 })

  await svc.from('usuario_local').update({ totp_activado: false }).eq('id', dueno.id)
  await svc.from('trabajador_totp').delete().eq('usuario_local_id', dueno.id)
  return NextResponse.json({ ok: true })
}
