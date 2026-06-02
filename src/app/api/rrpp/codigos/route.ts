import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'
import { sanearDescuentos } from '@/lib/rrppCodigos'

/** Código corto y legible: 4 letras del slug/aleatorio + 3 dígitos. */
function generarCodigo(seed: string): string {
  const base = (seed || 'RRPP').replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 5) || 'RRPP'
  const n = Math.floor(100 + Math.random() * 900)
  return `${base}${n}`
}

/** GET /api/rrpp/codigos — códigos del RRPP autenticado (con nombre del local). */
export async function GET() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const { data: codigos, error } = await db
    .from('rrpp_codigo')
    .select('id, local_id, codigo, usos_max, usos_actuales, descuentos, activo, expira_at, created_at')
    .eq('rrpp_id', ctx.rrpp.id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ codigos: [], pendiente_migracion: true })

  const ids = [...new Set((codigos ?? []).map(c => c.local_id))]
  const { data: locales } = ids.length
    ? await db.from('locales').select('id, nombre').in('id', ids)
    : { data: [] as { id: string; nombre: string }[] }
  const nombre = Object.fromEntries((locales ?? []).map(l => [l.id, l.nombre]))
  return NextResponse.json({ codigos: (codigos ?? []).map(c => ({ ...c, local_nombre: nombre[c.local_id] ?? 'Local' })) })
}

/**
 * POST /api/rrpp/codigos — el RRPP genera un código para un local de su lista.
 * El descuento se congela desde rrpp_venue.descuentos (lo fija el local/manager).
 * Body: { local_id, usos_max?, codigo? }
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const body = await req.json().catch(() => ({}))
  const localId = String(body.local_id || '')
  const usosMax = body.usos_max != null && Number(body.usos_max) > 0 ? Math.floor(Number(body.usos_max)) : null
  if (!localId) return NextResponse.json({ error: 'Elige un local' }, { status: 400 })

  // El RRPP debe tener relación ACTIVA con ese local.
  const { data: venue } = await db
    .from('rrpp_venue').select('*').eq('rrpp_id', ctx.rrpp.id).eq('local_id', localId).eq('estado', 'activa').maybeSingle()
  if (!venue) return NextResponse.json({ error: 'No trabajas activamente con ese local' }, { status: 403 })

  // Descuentos pactados (puede no existir la columna si 030 no está aplicada → {}).
  const descuentos = sanearDescuentos((venue as Record<string, unknown>).descuentos)

  // Genera un código único para el local (reintentos por colisión).
  let codigo = String(body.codigo || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
  if (codigo && (codigo.length < 3 || codigo.length > 20)) {
    return NextResponse.json({ error: 'El código debe tener entre 3 y 20 caracteres' }, { status: 400 })
  }
  for (let intento = 0; intento < 6; intento++) {
    const cand = codigo || generarCodigo(ctx.rrpp.slug || ctx.rrpp.nombre_publico)
    const { data: existe } = await db.from('rrpp_codigo').select('id').eq('local_id', localId).ilike('codigo', cand).maybeSingle()
    if (existe) { if (codigo) return NextResponse.json({ error: 'Ese código ya existe para este local' }, { status: 409 }); continue }
    const { data: creado, error } = await db.from('rrpp_codigo').insert({
      rrpp_id: ctx.rrpp.id, local_id: localId, codigo: cand,
      usos_max: usosMax, usos_actuales: 0, descuentos, activo: true,
    }).select('id, codigo, local_id, usos_max, usos_actuales, descuentos, activo, created_at').single()
    if (error) {
      if (intento === 5) return NextResponse.json({ error: 'No se pudo crear el código. ¿Está aplicada la migración 030?' }, { status: 500 })
      continue
    }
    return NextResponse.json({ ok: true, codigo: creado })
  }
  return NextResponse.json({ error: 'No se pudo generar un código único' }, { status: 500 })
}

/** PATCH /api/rrpp/codigos — activar/desactivar un código propio. */
export async function PATCH(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = String(body.id || '')
  if (!id || typeof body.activo !== 'boolean') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })
  const db = createServiceRoleClient()
  const { error } = await db.from('rrpp_codigo').update({ activo: body.activo }).eq('id', id).eq('rrpp_id', ctx.rrpp.id)
  if (error) return NextResponse.json({ error: 'No se pudo actualizar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
