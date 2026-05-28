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
  const { data: venues } = await admin
    .from('rrpp_venue')
    .select('*, locales!inner(id, nombre, foto_url, tier)')
    .eq('rrpp_id', ctx.rrpp.id)
    .in('estado', ['pendiente', 'activa', 'pausada'])

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
