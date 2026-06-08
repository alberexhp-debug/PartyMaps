import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const NIVELES = ['alta', 'media', 'baja']
const ZONAS = ['reservado', 'mesa', 'barra', 'otro']

/**
 * POST /api/local-panel/prioridad-zonas { prioridad_zonas: {reservado, mesa, barra, otro} }
 * Guarda la prioridad de la cola por tipo de zona (solo dueño/gestor).
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !['dueno', 'gestor'].includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { prioridad_zonas?: Record<string, string> } | null
  if (!body?.prioridad_zonas) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

  const limpio: Record<string, string> = {}
  for (const z of ZONAS) limpio[z] = NIVELES.includes(body.prioridad_zonas[z]) ? body.prioridad_zonas[z] : 'media'

  const db = createServiceRoleClient()
  const { error } = await db.from('locales').update({ prioridad_zonas: limpio }).eq('id', t.local_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, prioridad_zonas: limpio })
}
