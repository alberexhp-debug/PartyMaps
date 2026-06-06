import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { obtenerClientesCRM } from '@/lib/crm/clientes'

const GESTION = ['dueno', 'gestor']

/**
 * GET   /api/local-panel/clientes[?q=&filtro=vip] — clientes del local enriquecidos
 *        (visitas, gasto total/barra, primera/última, edad, cumple, VIP, etiquetas, contactable).
 * PATCH /api/local-panel/clientes { usuario_id, vip?, notas?, etiquetas? } — anota un cliente.
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const soloVip = url.searchParams.get('filtro') === 'vip'

  let clientes = await obtenerClientesCRM(db, t.local_id)
  if (q) clientes = clientes.filter(c => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q))
  if (soloVip) clientes = clientes.filter(c => c.vip)
  clientes.sort((a, b) => (b.ultima ?? '').localeCompare(a.ultima ?? ''))

  return NextResponse.json({ clientes, total: clientes.length })
}

export async function PATCH(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { usuario_id?: string; vip?: boolean; notas?: string; etiquetas?: string[] } | null
  if (!body?.usuario_id) return NextResponse.json({ error: 'Falta usuario_id' }, { status: 400 })

  const db = createServiceRoleClient()
  const fila: Record<string, unknown> = { local_id: t.local_id, usuario_id: body.usuario_id, updated_at: new Date().toISOString() }
  if (typeof body.vip === 'boolean') fila.vip = body.vip
  if (body.notas !== undefined) fila.notas = String(body.notas).slice(0, 500) || null
  if (Array.isArray(body.etiquetas)) fila.etiquetas = body.etiquetas.map(e => String(e).trim()).filter(Boolean).slice(0, 30)

  const { error } = await db.from('cliente_local').upsert(fila, { onConflict: 'local_id,usuario_id' })
  if (error) {
    const faltaMigracion = /cliente_local|relation .* does not exist|column .* does not exist/i.test(error.message)
    return NextResponse.json({ error: faltaMigracion ? 'Anotar clientes necesita las migraciones 033/042.' : error.message }, { status: faltaMigracion ? 409 : 500 })
  }
  return NextResponse.json({ ok: true })
}
