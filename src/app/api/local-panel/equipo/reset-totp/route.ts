import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTORES = ['dueno', 'gestor']

/**
 * POST /api/local-panel/equipo/reset-totp — el dueño/gestor reinicia el
 * authenticator de un trabajador (p.ej. si cambió de móvil). En su próximo
 * acceso volverá a escanear el QR. Body: { id }.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!GESTORES.includes(t.rol)) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
  const { id } = await req.json().catch(() => ({})) as { id?: string }
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: target } = await svc.from('usuario_local').select('id, local_id').eq('id', id).maybeSingle()
  if (!target || target.local_id !== t.local_id) return NextResponse.json({ error: 'Trabajador no encontrado' }, { status: 404 })

  await svc.from('trabajador_totp').delete().eq('usuario_local_id', id)
  await svc.from('usuario_local').update({ totp_activado: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
