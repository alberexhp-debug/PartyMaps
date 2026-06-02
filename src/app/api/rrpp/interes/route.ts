import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * GET /api/rrpp/interes
 * Estado del RRPP frente a los locales: con qué locales ya trabaja (activa) y a
 * cuáles ya envió interés (solicitud). Lo usa el mapa para marcar marcadores.
 */
export async function GET() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const [{ data: venues }, { data: sols }] = await Promise.all([
    db.from('rrpp_venue').select('local_id, estado').eq('rrpp_id', ctx.rrpp.id),
    db.from('rrpp_solicitud').select('local_id, estado').eq('rrpp_id', ctx.rrpp.id),
  ])
  return NextResponse.json({
    venues: venues ?? [],
    solicitudes: sols ?? [],
  })
}

/**
 * POST /api/rrpp/interes  { local_id, mensaje? }
 * El RRPP marca "me interesa trabajar contigo". Crea/actualiza una solicitud
 * que el local verá en su panel. Respeta el modelo anti-spam: no abre chat en
 * frío, solo deja constancia del interés.
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (ctx.rrpp.estado_alta !== 'completo') {
    return NextResponse.json({ error: 'Completa tu perfil antes de contactar locales' }, { status: 403 })
  }
  const body = await req.json().catch(() => ({}))
  const localId = String(body.local_id || '')
  const mensaje = String(body.mensaje || '').trim().slice(0, 500) || null
  if (!localId) return NextResponse.json({ error: 'Falta el local' }, { status: 400 })

  const db = createServiceRoleClient()
  // Si ya hay relación activa, no tiene sentido una solicitud.
  const { data: venue } = await db
    .from('rrpp_venue').select('estado').eq('rrpp_id', ctx.rrpp.id).eq('local_id', localId).maybeSingle()
  if (venue?.estado === 'activa') return NextResponse.json({ error: 'Ya trabajas con este local', ya_activo: true }, { status: 409 })

  const { error } = await db.from('rrpp_solicitud').upsert({
    rrpp_id: ctx.rrpp.id, local_id: localId, mensaje, estado: 'pendiente',
  }, { onConflict: 'rrpp_id,local_id' })
  if (error) return NextResponse.json({ error: 'No se pudo enviar el interés. ¿Migración 030 aplicada?' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
