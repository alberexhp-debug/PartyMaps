import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * POST /api/rrpp/venues/[id]/respuesta { decision: 'aceptar' | 'rechazar' }
 * El RRPP responde a una invitación de venue pendiente (rrpp_venue.estado='pendiente').
 * - 'aceptar' → estado='activa'
 * - 'rechazar' → estado='archivada' (mantiene histórico, no se borra)
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const body = await req.json().catch(() => null) as { decision?: 'aceptar' | 'rechazar' } | null
  if (!body?.decision || !['aceptar', 'rechazar'].includes(body.decision)) {
    return NextResponse.json({ error: "decision: 'aceptar' o 'rechazar'" }, { status: 400 })
  }

  // service_role: la autorización ya se valida abajo (rel.rrpp_id === ctx.rrpp.id).
  // La RLS de rrpp_venue solo deja UPDATE a los trabajadores del local, no al
  // RRPP, así que con el cliente por-usuario el aceptar/rechazar fallaba en silencio.
  const admin = createServiceRoleClient()
  const { data: rel } = await admin
    .from('rrpp_venue')
    .select('id, rrpp_id, estado')
    .eq('id', id).maybeSingle()
  if (!rel || rel.rrpp_id !== ctx.rrpp.id) {
    return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  }
  if (rel.estado !== 'pendiente') {
    return NextResponse.json({
      error: 'Esta invitación ya fue respondida',
      estado_actual: rel.estado,
    }, { status: 409 })
  }

  const nuevoEstado = body.decision === 'aceptar' ? 'activa' : 'archivada'
  const { data, error } = await admin
    .from('rrpp_venue').update({ estado: nuevoEstado }).eq('id', id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ relacion: data })
}
