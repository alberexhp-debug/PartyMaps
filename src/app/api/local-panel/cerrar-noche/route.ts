import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

// Offset de Madrid respecto a UTC, en minutos (60 = CET, 120 = CEST) en un instante dado.
function offsetMadridMin(d: Date): number {
  const madrid = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Madrid' }))
  const utc = new Date(d.toLocaleString('en-US', { timeZone: 'UTC' }))
  return Math.round((madrid.getTime() - utc.getTime()) / 60000)
}

// Instante (ISO) de "mañana a las 12:00" en hora de Madrid. Se calcula en servidor
// (no se confía en el reloj del cliente) y resuelve el cambio de hora vía la zona.
function mananaMediodiaMadrid(now: Date): string {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(now).split('-').map(Number)
  const tentativo = new Date(Date.UTC(y, m - 1, d + 1, 12, 0, 0)) // 12:00 UTC de mañana
  const off = offsetMadridMin(tentativo)
  return new Date(tentativo.getTime() - off * 60000).toISOString()
}

/**
 * POST /api/local-panel/cerrar-noche — activa o reactiva el cierre puntual.
 * Body: { cerrar: boolean }. cerrar=true → cerrado_hasta = mañana 12:00 Madrid; false → null.
 * Solo dueño/gestor. Escritura con service_role tras verificar identidad.
 */
export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (t.rol !== 'dueno' && t.rol !== 'gestor') {
    return NextResponse.json({ error: 'Solo el dueño o el gestor pueden cerrar el local' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { cerrar?: boolean } | null
  const cerrar = body?.cerrar === true

  const admin = createServiceRoleClient()
  const cerrado_hasta = cerrar ? mananaMediodiaMadrid(new Date()) : null
  const { error } = await admin
    .from('locales')
    .update({
      cerrado_hasta,
      cerrado_por: cerrar ? t.id : null,
      cerrado_en: cerrar ? new Date().toISOString() : null,
    })
    .eq('id', t.local_id)

  if (error) return NextResponse.json({ error: 'No se pudo actualizar el estado del local' }, { status: 500 })
  return NextResponse.json({ cerrado_hasta })
}
