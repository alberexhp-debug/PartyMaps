import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * GET /api/admin/soporte?estado=abierto
 * Cola global de tickets para el equipo de Torneum. Une el nombre del local.
 * Degrada a lista vacía si la migración 028 no está aplicada.
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminAutenticado(req)
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const estado = url.searchParams.get('estado')

  const svc = createServiceRoleClient()
  let q = svc
    .from('tickets_soporte')
    .select('id, local_id, asunto, categoria, prioridad, estado, no_leido_admin, ultimo_mensaje_at, created_at, abierto_por_email, locales(nombre)')
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(200)
  if (estado && estado !== 'todos') q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ tickets: [], pendiente_migracion: true })

  const tickets = (data ?? []).map(t => {
    const loc = t.locales as unknown as { nombre?: string } | { nombre?: string }[] | null
    const nombre = Array.isArray(loc) ? loc[0]?.nombre : loc?.nombre
    return { ...t, locales: undefined, local_nombre: nombre ?? 'Local' }
  })

  // Conteo rápido de novedades para el badge del nav.
  const sinLeer = tickets.filter(t => t.no_leido_admin).length
  return NextResponse.json({ tickets, sin_leer: sinLeer })
}
