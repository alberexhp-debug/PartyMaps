import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { obtenerClientesCRM, type ClienteCRM } from '@/lib/crm/clientes'
import { aplicarSegmento, type FiltroSegmento } from '@/lib/crm/segmentos'

const GESTION = ['dueno', 'gestor']

// Columnas exportables (doc 04 §2.4). origen queda fuera en esta fase (sin dato fiable).
const COLUMNAS: { id: string; label: string; val: (c: ClienteCRM) => string }[] = [
  { id: 'nombre', label: 'nombre', val: c => c.nombre },
  { id: 'telefono', label: 'telefono', val: c => c.telefono ?? '' },
  { id: 'email', label: 'email', val: c => c.email ?? '' },
  { id: 'edad', label: 'edad', val: c => (c.edad != null ? String(c.edad) : '') },
  { id: 'visitas', label: 'visitas', val: c => String(c.visitas) },
  { id: 'gasto_total', label: 'gasto_total', val: c => c.gasto.toFixed(2) },
  { id: 'ticket_medio', label: 'ticket_medio', val: c => (c.visitas ? c.gasto / c.visitas : 0).toFixed(2) },
  { id: 'ultima_visita', label: 'ultima_visita', val: c => (c.ultima ? c.ultima.slice(0, 10) : '') },
  { id: 'etiquetas', label: 'etiquetas', val: c => c.etiquetas.join('|') },
  { id: 'vip', label: 'vip', val: c => (c.vip ? 'Sí' : 'No') },
  { id: 'consentimiento', label: 'consentimiento', val: c => (c.contactable ? 'Sí' : 'No') },
]

const esc = (v: string) => (/[;"\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: local } = await db.from('locales').select('tier, nombre').eq('id', t.local_id).maybeSingle()
  const tier = local?.tier ?? 'visibility'
  if (tier !== 'pro' && tier !== 'destacado') {
    return NextResponse.json({ error: 'El export es una función de Pro' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { modo?: 'operativo' | 'marketing'; columnas?: string[]; filtros?: FiltroSegmento[] } | null
  const modo = body?.modo === 'marketing' ? 'marketing' : 'operativo'
  const filtros = Array.isArray(body?.filtros) ? body!.filtros : []
  const cols = COLUMNAS.filter(c => !body?.columnas || body.columnas.includes(c.id))
  if (cols.length === 0) return NextResponse.json({ error: 'Elige al menos una columna' }, { status: 400 })

  let clientes = aplicarSegmento(await obtenerClientesCRM(db, t.local_id), filtros)
  if (modo === 'marketing') clientes = clientes.filter(c => c.contactable) // solo contactables (RGPD §9.4)

  const filas = [cols.map(c => c.label).join(';')]
  for (const c of clientes) filas.push(cols.map(col => esc(col.val(c))).join(';'))
  const csv = '﻿' + filas.join('\r\n') // BOM para Excel español

  // Auditoría (RGPD §9.4): quién, cuándo, qué filtros, cuántos. No bloquea la descarga.
  await db.from('crm_exports').insert({ local_id: t.local_id, usuario_local_id: t.id, modo, filtros, num_registros: clientes.length }).then(() => {}, () => {})

  const nombre = `clientes-${(local?.nombre ?? 'local').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().slice(0, 10)}.csv`
  return new NextResponse(csv, {
    headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${nombre}"` },
  })
}
