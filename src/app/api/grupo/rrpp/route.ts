import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getMiembroGrupoAutenticado } from '@/lib/grupo/auth'
import { sanearDescuentos } from '@/lib/rrppCodigos'

/**
 * GET /api/grupo/rrpp
 * RRPP activos de los locales en el alcance del miembro (propietario o manager),
 * con sus descuentos por categoría, agrupados por local.
 */
export async function GET(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const svc = createServiceRoleClient()
  const ids = ctx.localesIds
  if (ids.length === 0) return NextResponse.json({ locales: [] })

  const [{ data: rels }, { data: locales }] = await Promise.all([
    svc.from('rrpp_venue')
      .select('id, local_id, comision_pct, estado, descuentos, rrpp!inner(id, slug, nombre_publico, foto_url)')
      .in('local_id', ids).eq('estado', 'activa'),
    svc.from('locales').select('id, nombre').in('id', ids).order('nombre'),
  ])

  const porLocal = (locales ?? []).map(l => ({
    local_id: l.id, local_nombre: l.nombre,
    rrpps: (rels ?? []).filter(r => r.local_id === l.id).map(r => {
      const rrpp = r.rrpp as unknown as { id: string; slug: string; nombre_publico: string; foto_url: string | null }
      return {
        rrpp_venue_id: r.id,
        comision_pct: r.comision_pct,
        descuentos: sanearDescuentos((r as Record<string, unknown>).descuentos),
        rrpp: { id: rrpp.id, slug: rrpp.slug, nombre_publico: rrpp.nombre_publico, foto_url: rrpp.foto_url },
      }
    }),
  })).filter(l => l.rrpps.length > 0)

  return NextResponse.json({ locales: porLocal })
}

/**
 * PATCH /api/grupo/rrpp  { rrpp_venue_id, descuentos }
 * El manager/propietario fija los descuentos por RRPP. Solo sobre locales de su
 * alcance.
 */
export async function PATCH(req: NextRequest) {
  const ctx = await getMiembroGrupoAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => ({}))
  const id = String(body.rrpp_venue_id || '')
  if (!id || !body.descuentos) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: rel } = await svc.from('rrpp_venue').select('id, local_id').eq('id', id).maybeSingle()
  if (!rel || !ctx.localesIds.includes(rel.local_id)) {
    return NextResponse.json({ error: 'Esa relación no es de un local de tu grupo' }, { status: 403 })
  }
  const { error } = await svc.from('rrpp_venue').update({ descuentos: sanearDescuentos(body.descuentos) }).eq('id', id)
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  return NextResponse.json({ ok: true })
}
