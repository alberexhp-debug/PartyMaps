import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { sanearDescuentos } from '@/lib/rrppCodigos'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * PUT    /api/local-panel/rrpp/[id]   — actualiza comisión, tope, triggers, estado
 * DELETE /api/local-panel/rrpp/[id]   — archiva la relación (no borra, mantiene histórico)
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }
  const { id } = await params
  const admin = await createAdminSupabaseClient()

  // Verificar que la relación pertenece a este local
  const { data: rel } = await admin
    .from('rrpp_venue').select('id, local_id').eq('id', id).maybeSingle()
  if (!rel || rel.local_id !== t.local_id) {
    return NextResponse.json({ error: 'Relación no encontrada' }, { status: 404 })
  }

  const body = await req.json().catch(() => null) as Partial<{
    comision_pct: number; tope_por_venta: number | null;
    triggers_activos: Record<string, boolean>;
    estado: 'pendiente' | 'activa' | 'pausada' | 'archivada';
    descuentos: Record<string, number>;
  }> | null
  if (!body) return NextResponse.json({ error: 'body vacío' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (typeof body.comision_pct === 'number') patch.comision_pct = body.comision_pct
  if (body.tope_por_venta !== undefined) patch.tope_por_venta = body.tope_por_venta
  if (body.triggers_activos) patch.triggers_activos = body.triggers_activos
  if (body.estado) patch.estado = body.estado
  // Descuentos por RRPP por categoría (entrada/consumición/reservado). Requiere
  // la columna rrpp_venue.descuentos (migración 030).
  if (body.descuentos) patch.descuentos = sanearDescuentos(body.descuentos)

  const { data, error } = await admin
    .from('rrpp_venue').update(patch).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ relacion: data })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }
  const { id } = await params
  const admin = await createAdminSupabaseClient()
  const { data: rel } = await admin
    .from('rrpp_venue').select('id, local_id').eq('id', id).maybeSingle()
  if (!rel || rel.local_id !== t.local_id) {
    return NextResponse.json({ error: 'Relación no encontrada' }, { status: 404 })
  }
  const { error } = await admin
    .from('rrpp_venue').update({ estado: 'archivada' }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
