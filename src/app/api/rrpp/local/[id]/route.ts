import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { sanearDescuentos } from '@/lib/rrppCodigos'

/**
 * GET /api/rrpp/local/[id]
 * Ficha del local para el RRPP: datos del local, "datos de la noche" (eventos
 * publicados + aforo + promo + carta), la relación (comisión + descuentos) y
 * con quién habla por chat (manager del grupo si lo hay, o el local).
 * Requiere que el RRPP tenga relación con el local.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: venue } = await db
    .from('rrpp_venue').select('*').eq('rrpp_id', ctx.rrpp.id).eq('local_id', id).maybeSingle()
  if (!venue) return NextResponse.json({ error: 'No tienes relación con este local' }, { status: 403 })

  const { data: local } = await db
    .from('locales')
    .select('id, nombre, descripcion, tipo_local, musica, direccion, ciudad, imagenes, instagram_handle, aforo_maximo, aforo_estimado_porcentaje, precio_entrada_min, precio_entrada_max, precio_promocional, promo_ultima_hora_hasta, horario, tier, num_suscriptores, grupo_id')
    .eq('id', id).maybeSingle()
  if (!local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

  // Datos de la noche: próximos eventos publicados + carta disponible.
  const ahora = new Date().toISOString()
  const [{ data: eventos }, { data: productos }] = await Promise.all([
    db.from('eventos')
      .select('id, nombre, fecha_inicio, fecha_fin, imagen_url, estado')
      .eq('local_id', id).eq('estado', 'publicado').gte('fecha_inicio', ahora)
      .order('fecha_inicio', { ascending: true }).limit(8),
    db.from('productos_local')
      .select('id, nombre, categoria, precio, disponible')
      .eq('local_id', id).eq('disponible', true).order('categoria').limit(40),
  ])

  // Interlocutor del chat: manager del grupo si el local pertenece a uno.
  let interlocutor = { tipo: 'local' as 'local' | 'manager', nombre: local.nombre }
  if (local.grupo_id) {
    const { data: grupo } = await db.from('grupos').select('nombre').eq('id', local.grupo_id).maybeSingle()
    if (grupo) interlocutor = { tipo: 'manager', nombre: `Manager · ${grupo.nombre}` }
  }

  return NextResponse.json({
    local: { ...local, foto_url: local.imagenes?.[0] ?? null },
    relacion: {
      estado: venue.estado,
      comision_pct: venue.comision_pct,
      tope_por_venta: venue.tope_por_venta ?? null,
      descuentos: sanearDescuentos((venue as Record<string, unknown>).descuentos),
    },
    noche: {
      eventos: eventos ?? [],
      productos: productos ?? [],
      aforo_maximo: local.aforo_maximo,
      promo_activa: local.precio_promocional != null && local.promo_ultima_hora_hasta != null
        && new Date(local.promo_ultima_hora_hasta) > new Date(),
      precio_promocional: local.precio_promocional ?? null,
    },
    interlocutor,
  })
}
