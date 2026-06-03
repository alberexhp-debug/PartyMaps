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

/** GET /api/rrpp/codigos[?local_id=] — códigos del RRPP (con nombre del local). */
export async function GET(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const localFiltro = new URL(req.url).searchParams.get('local_id')

  const COLS = 'id, local_id, codigo, usos_max, usos_actuales, descuentos, activo, expira_at, created_at'
  const base = (cols: string) => {
    let q = db.from('rrpp_codigo').select(cols).eq('rrpp_id', ctx.rrpp.id)
    if (localFiltro) q = q.eq('local_id', localFiltro)
    return q.order('created_at', { ascending: false })
  }
  // Intenta incluir `etiqueta` (migración 031); si la columna aún no existe,
  // reintenta sin ella para no romper la lista.
  let codigos: Record<string, unknown>[] | null = null
  const conEtiqueta = await base(`${COLS}, etiqueta`)
  if (!conEtiqueta.error) {
    codigos = conEtiqueta.data as unknown as Record<string, unknown>[]
  } else {
    const sinEtiqueta = await base(COLS)
    if (sinEtiqueta.error) return NextResponse.json({ codigos: [], pendiente_migracion: true })
    codigos = ((sinEtiqueta.data ?? []) as unknown as Record<string, unknown>[]).map(c => ({ ...c, etiqueta: null }))
  }

  const ids = [...new Set((codigos ?? []).map(c => c.local_id as string))]
  const { data: locales } = ids.length
    ? await db.from('locales').select('id, nombre').in('id', ids)
    : { data: [] as { id: string; nombre: string }[] }
  const nombre: Record<string, string> = Object.fromEntries((locales ?? []).map(l => [l.id, l.nombre]))
  return NextResponse.json({ codigos: (codigos ?? []).map(c => ({ ...c, local_nombre: nombre[c.local_id as string] ?? 'Local' })) })
}

/** Horas de validez del código de una persona desde que se genera. */
const VALIDEZ_HORAS = 24

/**
 * POST /api/rrpp/codigos — el RRPP genera un código/QR para UNA persona en un
 * local de su lista. Cada código es único, caduca a las 24h de generarse y
 * tiene un nº de usos configurable. El descuento se congela desde
 * rrpp_venue.descuentos (lo fija el local/manager).
 * Body: { local_id, etiqueta?, usos_max?, codigo? }
 */
export async function POST(req: NextRequest) {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const body = await req.json().catch(() => ({}))
  const localId = String(body.local_id || '')
  const usosMax = body.usos_max != null && Number(body.usos_max) > 0 ? Math.floor(Number(body.usos_max)) : 1
  const etiqueta = String(body.etiqueta || '').trim().slice(0, 60) || null
  const expiraAt = new Date(Date.now() + VALIDEZ_HORAS * 3600 * 1000).toISOString()
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
    const base = {
      rrpp_id: ctx.rrpp.id, local_id: localId, codigo: cand,
      usos_max: usosMax, usos_actuales: 0, descuentos, activo: true, expira_at: expiraAt,
    }
    const SEL = 'id, codigo, local_id, usos_max, usos_actuales, descuentos, activo, expira_at, created_at'

    // Intenta con `etiqueta` (031); si esa columna aún no existe, sin ella.
    let creado: Record<string, unknown> | null = null
    let error = null
    const conEt = await db.from('rrpp_codigo').insert({ ...base, etiqueta }).select(`${SEL}, etiqueta`).single()
    if (!conEt.error) {
      creado = conEt.data
    } else if (/etiqueta/i.test(conEt.error.message)) {
      const sinEt = await db.from('rrpp_codigo').insert(base).select(SEL).single()
      creado = sinEt.data ? { ...sinEt.data, etiqueta: null } : null
      error = sinEt.error
    } else {
      error = conEt.error
    }

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
