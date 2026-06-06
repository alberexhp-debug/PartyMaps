import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'
import { obligatoriosCompletos, faltantesObligatorios } from '@/lib/onboarding/gate'

/**
 * GET /api/admin/onboarding-metricas — salud del onboarding de los locales (doc 01 §12).
 * % con los obligatorios (datos/horarios/fotos/aforo) completos. Barato: se calcula del
 * propio row del local (sin counts). Solo admin.
 */
export async function GET() {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const { data } = await db.from('locales')
    .select('nombre, direccion, latitud, longitud, tipo_local, musica, horario, imagenes, aforo_por_dia, aforo_maximo')
    .eq('estado', 'activo')
    .limit(5000)

  const locales = data ?? []
  const total = locales.length
  const completos = locales.filter(l => obligatoriosCompletos(l)).length
  // Qué obligatorio falla más (para saber dónde apretar).
  const faltaPorPaso: Record<string, number> = {}
  for (const l of locales) for (const f of faltantesObligatorios(l)) faltaPorPaso[f.titulo] = (faltaPorPaso[f.titulo] ?? 0) + 1

  return NextResponse.json({
    total,
    completos,
    pct: total ? Math.round((completos / total) * 100) : 0,
    faltaPorPaso,
  })
}
