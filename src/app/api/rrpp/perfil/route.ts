import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getRRPPAutenticado } from '@/lib/rrpp/auth'

/**
 * GET /api/rrpp/perfil
 * Devuelve el perfil RRPP del usuario autenticado + sus venues activos
 * + sumario rápido (ventas mes, pendiente de liquidar).
 */
export async function GET() {
  const ctx = await getRRPPAutenticado()
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: venuesRaw } = await admin
    .from('rrpp_venue')
    .select('*, locales!inner(id, nombre, imagenes, tier)')
    .eq('rrpp_id', ctx.rrpp.id)
    .in('estado', ['pendiente', 'activa', 'pausada'])

  // locales usa `imagenes` (array), no `foto_url`. Normalizamos para la UI.
  const venues = (venuesRaw ?? []).map(v => {
    const loc = v.locales as { id: string; nombre: string; imagenes?: string[]; tier: string } | null
    return { ...v, locales: loc ? { id: loc.id, nombre: loc.nombre, tier: loc.tier, foto_url: loc.imagenes?.[0] ?? null } : null }
  })

  // Liquidaciones de este mes (formato yyyy-mm)
  const periodo = new Date().toISOString().slice(0, 7)
  const { data: liquidaciones } = await admin
    .from('liquidacion_rrpp')
    .select('*')
    .eq('rrpp_id', ctx.rrpp.id)
    .gte('periodo', periodo)

  return NextResponse.json({
    rrpp: ctx.rrpp,
    venues: venues ?? [],
    liquidaciones: liquidaciones ?? [],
  })
}
