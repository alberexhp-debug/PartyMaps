import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { obtenerClientesCRM } from '@/lib/crm/clientes'
import { aplicarSegmento, type FiltroSegmento } from '@/lib/crm/segmentos'
import { enviarPushAUsuarios } from '@/lib/push'

const GESTION = ['dueno', 'gestor']

/**
 * GET  /api/local-panel/crm/campanas — histórico de campañas del local.
 * POST — push a un segmento: solo a los CONTACTABLES (consentimiento en el momento del envío).
 *        Body: { filtros, segmento_nombre?, titulo, cuerpo, enlace? }. Tier Pro+.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data } = await db.from('crm_campanas').select('id, tipo, segmento_nombre, titulo, enviados, resultado, created_at').eq('local_id', t.local_id).order('created_at', { ascending: false }).limit(50)
  return NextResponse.json({ campanas: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: local } = await db.from('locales').select('tier').eq('id', t.local_id).maybeSingle()
  const tier = local?.tier ?? 'visibility'
  if (tier !== 'pro' && tier !== 'destacado') return NextResponse.json({ error: 'El push a segmento es una función de Pro' }, { status: 403 })

  const body = await req.json().catch(() => null) as { filtros?: FiltroSegmento[]; segmento_nombre?: string; titulo?: string; cuerpo?: string; enlace?: string } | null
  if (!body?.titulo?.trim() || !body?.cuerpo?.trim()) return NextResponse.json({ error: 'Falta título o cuerpo' }, { status: 400 })

  const objetivo = aplicarSegmento(await obtenerClientesCRM(db, t.local_id), body.filtros ?? []).filter(c => c.contactable)
  const ids = objetivo.map(c => c.usuario_id)

  const stats = await enviarPushAUsuarios(ids, {
    title: body.titulo.trim(), body: body.cuerpo.trim(), url: body.enlace?.trim() || `/local/${t.local_id}`,
  }).catch(() => ({ enviadas: 0, falladas: 0, eliminadas: 0 }))

  await db.from('crm_campanas').insert({
    local_id: t.local_id, tipo: 'push', segmento_nombre: body.segmento_nombre ?? null, filtros: body.filtros ?? [],
    titulo: body.titulo.trim(), enviados: ids.length, resultado: stats,
  }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, enviados: ids.length, push: stats })
}
