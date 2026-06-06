import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * POST /api/rrpp/cuenta/password-cambiada — baja el flag tras el cambio de
 * contraseña en el primer acceso (el cambio lo hace el cliente con
 * supabase.auth.updateUser).
 */
export async function POST() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  await createServiceRoleClient().from('rrpp').update({ debe_cambiar_password: false }).eq('id', ctx.rrpp.id)
  return NextResponse.json({ ok: true })
}
