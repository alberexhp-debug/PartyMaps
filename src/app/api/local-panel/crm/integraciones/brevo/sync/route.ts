import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { tierPermite } from '@/lib/crm/tier'
import { descifrar, brevoSyncLista } from '@/lib/crm/brevo'
import { obtenerClientesCRM } from '@/lib/crm/clientes'
import { aplicarSegmento, type FiltroSegmento } from '@/lib/crm/segmentos'

const GESTION = ['dueno', 'gestor']

/**
 * POST /api/local-panel/crm/integraciones/brevo/sync — sincroniza los CONTACTABLES de un
 * segmento como lista de Brevo. Tier Pro + contrato aceptado. Body: { filtros, segmento_nombre }.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: local } = await db.from('locales').select('tier, crm_contrato_aceptado_at').eq('id', t.local_id).maybeSingle()
  if (!tierPermite(local?.tier, 'email')) return NextResponse.json({ error: 'Email (Brevo) es una función de Pro' }, { status: 403 })
  if (!local?.crm_contrato_aceptado_at) return NextResponse.json({ error: 'Acepta el contrato de encargo antes de sincronizar' }, { status: 403 })

  const { data: integ } = await db.from('local_integraciones').select('credenciales, estado').eq('local_id', t.local_id).eq('proveedor', 'brevo').maybeSingle()
  const apiKey = integ?.credenciales ? descifrar(integ.credenciales) : null
  if (!apiKey || integ?.estado !== 'conectada') return NextResponse.json({ error: 'Conecta tu cuenta de Brevo en Ajustes' }, { status: 400 })

  const body = await req.json().catch(() => null) as { filtros?: FiltroSegmento[]; segmento_nombre?: string } | null
  const contactables = aplicarSegmento(await obtenerClientesCRM(db, t.local_id), body?.filtros ?? []).filter(c => c.contactable && c.telefono)
  const nombreLista = `Tourneum · ${body?.segmento_nombre ?? 'Segmento'}`

  const res = await brevoSyncLista(apiKey, nombreLista, contactables.map(c => ({ tel: c.telefono!, nombre: c.nombre })))
  if (!res.ok) return NextResponse.json({ error: res.error || 'No se pudo sincronizar con Brevo' }, { status: 502 })

  await db.from('local_integraciones').update({ ultima_sync: new Date().toISOString() }).eq('local_id', t.local_id).eq('proveedor', 'brevo').then(() => {}, () => {})
  await db.from('crm_campanas').insert({ local_id: t.local_id, tipo: 'email', segmento_nombre: body?.segmento_nombre ?? null, filtros: body?.filtros ?? [], titulo: `Sync Brevo: ${nombreLista}`, enviados: res.importados, resultado: { importados: res.importados } }).then(() => {}, () => {})

  return NextResponse.json({ ok: true, importados: res.importados })
}
