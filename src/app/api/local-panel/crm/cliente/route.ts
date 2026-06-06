import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const GESTION = ['dueno', 'gestor']

/**
 * GET /api/local-panel/crm/cliente?usuario_id= — ficha de cliente: historial agregado de
 * todas las fuentes que enlazan por usuario_id (entradas, barra, reservas, valoraciones)
 * + consentimiento vigente. Solo dueño/gestor; lectura con service_role tras verificar rol.
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const usuarioId = new URL(req.url).searchParams.get('usuario_id')
  if (!usuarioId) return NextResponse.json({ error: 'Falta usuario_id' }, { status: 400 })

  const db = createServiceRoleClient()
  const L = t.local_id
  const num = (v: unknown) => Number(v) || 0

  const [ent, bar, res, rev, consent] = await Promise.all([
    db.from('entradas').select('id, precio_total, created_at, estado').eq('local_id', L).eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(50),
    db.from('pedidos_bar').select('id, precio_total, created_at, estado').eq('local_id', L).eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(50),
    db.from('reservas').select('id, fecha_noche, estado, importe').eq('local_id', L).eq('usuario_id', usuarioId).order('fecha_noche', { ascending: false }).limit(50).then(r => r.error ? { data: [] as { id: string; fecha_noche: string; estado: string; importe: number | null }[] } : r),
    db.from('reviews').select('id, puntuacion, comentario, created_at').eq('local_id', L).eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(20).then(r => r.error ? { data: [] as { id: string; puntuacion: number; comentario: string | null; created_at: string }[] } : r),
    db.from('consentimientos_marketing').select('estado, origen, created_at').eq('local_id', L).eq('usuario_id', usuarioId).order('created_at', { ascending: false }).limit(1).then(r => r.error ? { data: [] as { estado: string; origen: string; created_at: string }[] } : r),
  ])

  const cv = consent.data?.[0]
  return NextResponse.json({
    historial: {
      entradas: (ent.data ?? []).map(e => ({ id: e.id, fecha: e.created_at, importe: num(e.precio_total), estado: e.estado })),
      barra: (bar.data ?? []).map(p => ({ id: p.id, fecha: p.created_at, importe: num(p.precio_total), estado: p.estado })),
      reservas: (res.data ?? []).map(r => ({ id: r.id, fecha: r.fecha_noche, estado: r.estado, importe: r.importe != null ? num(r.importe) : null })),
      reviews: (rev.data ?? []).map(r => ({ id: r.id, fecha: r.created_at, puntuacion: r.puntuacion, comentario: r.comentario })),
    },
    consentimiento: cv ? { estado: cv.estado, origen: cv.origen, fecha: cv.created_at } : null,
  })
}
