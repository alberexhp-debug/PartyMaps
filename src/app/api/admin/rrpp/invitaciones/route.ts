import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * GET /api/admin/rrpp/invitaciones
 * Devuelve todas las invitaciones pendientes del sistema (de admins y de locales)
 * para que el admin tenga visibilidad global.
 */
export async function GET() {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const svc = await createAdminSupabaseClient()
  const { data, error } = await svc
    .from('invitacion_rrpp')
    .select(`
      id, email, nombre, telefono, estado, token, expira_at, created_at,
      comision_pct_sugerida, invitado_por_local_id, invitado_por_admin_id,
      locales:invitado_por_local_id(id, nombre)
    `)
    .in('estado', ['pendiente', 'aceptada'])
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ invitaciones: data ?? [] })
}
