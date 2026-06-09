import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * GET /api/admin/locales/[id]/vista — instantánea OPERATIVA del local en solo
 * lectura, para soporte ("ver como local", §5.3). NO cambia de sesión ni toca
 * nada: agrega por service_role lo que el dueño tiene delante (equipo, RRPP,
 * eventos, soporte, módulos). Cualquier admin (incluido 'soporte') puede verla;
 * es de solo lectura, así que no requiere rol con poder.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  const { id } = await params

  const db = createServiceRoleClient()
  const { data: local } = await db.from('locales')
    .select('id, nombre, tipo_local, ciudad, estado, tier, imagenes, descripcion, instagram_handle, num_suscriptores, modulos_activos, stripe_account_id, gestor_id, created_at, aforo_maximo, entradas_disponibles_noche')
    .eq('id', id).maybeSingle()
  if (!local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

  const [equipoR, rrppR, eventosR, ticketsR, gestorR] = await Promise.all([
    db.from('usuario_local').select('nombre, rol, activo, email').eq('local_id', id).order('rol'),
    db.from('rrpp_venue').select('id', { count: 'exact', head: true }).eq('local_id', id).eq('estado', 'activa'),
    db.from('eventos').select('id', { count: 'exact', head: true }).eq('local_id', id).eq('estado', 'publicado'),
    db.from('tickets_soporte').select('id', { count: 'exact', head: true }).eq('local_id', id).eq('estado', 'abierto'),
    local.gestor_id
      ? db.from('gestores').select('nombre, email').eq('id', local.gestor_id).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return NextResponse.json({
    local,
    equipo: equipoR.data ?? [],
    rrpp_activos: rrppR.count ?? 0,
    eventos_publicados: eventosR.count ?? 0,
    tickets_abiertos: ticketsR.count ?? 0,
    gestor: gestorR.data ?? null,
  })
}
