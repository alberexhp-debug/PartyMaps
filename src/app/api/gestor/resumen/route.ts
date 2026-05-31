import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado } from '@/lib/gestor/auth'

/**
 * GET /api/gestor/resumen
 * KPIs de cabecera del Panel del Gestor: tamaño de cartera y RRPP.
 * (Las comisiones generadas llegarán con el motor de atribución.)
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = createServiceRoleClient()

  const { count: localesTotal } = await admin
    .from('locales')
    .select('id', { count: 'exact', head: true })
    .eq('gestor_id', ctx.gestor.id)
    .neq('estado', 'eliminado')

  const { count: localesActivos } = await admin
    .from('locales')
    .select('id', { count: 'exact', head: true })
    .eq('gestor_id', ctx.gestor.id)
    .eq('estado', 'activo')

  return NextResponse.json({
    locales_total: localesTotal ?? 0,
    locales_activos: localesActivos ?? 0,
    rrpp_activos: 0, // se rellenará al vincular RRPP a la cartera
    incentivo_pct: ctx.gestor.incentivo_pct,
  })
}
