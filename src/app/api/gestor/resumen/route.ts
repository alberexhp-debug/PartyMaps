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

  // RRPP activos en la cartera: relaciones rrpp_venue 'activa' en sus locales.
  const { data: misLocales } = await admin
    .from('locales').select('id').eq('gestor_id', ctx.gestor.id).neq('estado', 'eliminado')
  const localIds = (misLocales ?? []).map(l => l.id)
  let rrppActivos = 0
  let comisionGeneradaMes = 0
  if (localIds.length) {
    const { data: rels } = await admin
      .from('rrpp_venue').select('rrpp_id').in('local_id', localIds).eq('estado', 'activa')
    rrppActivos = new Set((rels ?? []).map(r => r.rrpp_id)).size

    // Comisión RRPP generada por la cartera este mes (base del incentivo del gestor).
    const periodo = new Date().toISOString().slice(0, 7)
    const { data: liqs } = await admin
      .from('liquidacion_rrpp').select('monto_total').in('local_id', localIds).eq('periodo', periodo)
    comisionGeneradaMes = Math.round((liqs ?? []).reduce((s, l) => s + Number(l.monto_total || 0), 0) * 100) / 100
  }

  // Lo que se lleva el gestor: su incentivo % sobre lo generado por la cartera.
  const incentivoGanadoMes = Math.round(comisionGeneradaMes * (ctx.gestor.incentivo_pct / 100) * 100) / 100

  return NextResponse.json({
    locales_total: localesTotal ?? 0,
    locales_activos: localesActivos ?? 0,
    rrpp_activos: rrppActivos,
    incentivo_pct: ctx.gestor.incentivo_pct,
    comision_generada_mes: comisionGeneradaMes,
    incentivo_ganado_mes: incentivoGanadoMes,
  })
}
