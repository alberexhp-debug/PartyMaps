import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// Cron route — called every 10 minutes by Vercel Cron
// Authorization: Bearer CRON_SECRET header required
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminSupabaseClient()
  const ahora = new Date()
  const hora = ahora.getHours()
  const diaSemana = ahora.getDay() // 0=domingo, 6=sabado

  // Fetch active locals
  const { data: locales } = await supabase
    .from('locales')
    .select('id, aforo_maximo, aforo_estimado_porcentaje, aforo_correccion_manual, aforo_correccion_manual_expires, tier, horario')
    .eq('estado', 'activo')

  if (!locales) return NextResponse.json({ ok: true, processed: 0 })

  let processed = 0
  for (const local of locales) {
    // Use manual override if still valid
    if (local.aforo_correccion_manual !== null && local.aforo_correccion_manual_expires) {
      if (new Date(local.aforo_correccion_manual_expires) > ahora) {
        await registrarAforo(supabase, local.id, local.aforo_correccion_manual)
        processed++
        continue
      }
    }

    // Count tickets sold in the last 2 hours (proxy for people in venue)
    const dosHorasAtras = new Date(ahora.getTime() - 2 * 60 * 60 * 1000).toISOString()
    const { count: entradasRecientes } = await supabase
      .from('entradas')
      .select('id', { count: 'exact' })
      .eq('local_id', local.id)
      .eq('estado', 'activa')
      .gte('created_at', dosHorasAtras)

    // Count checkins in (no salida_at)
    const { count: checkinsActivos } = await supabase
      .from('checkins')
      .select('id', { count: 'exact' })
      .eq('local_id', local.id)
      .is('salida_at', null)
      .gte('entrada_at', new Date(ahora.getTime() - 6 * 60 * 60 * 1000).toISOString())

    // Base occupancy from checkins + recent entries
    const baseOcupantes = (checkinsActivos || 0) + (entradasRecientes || 0)
    let porcentaje = local.aforo_maximo > 0 ? (baseOcupantes / local.aforo_maximo) * 100 : 0

    // Time-of-day modifier
    const esNocheFinde = (diaSemana === 5 || diaSemana === 6) && (hora >= 23 || hora <= 4)
    const esNocheSemana = (hora >= 22 || hora <= 3)
    if (esNocheFinde) porcentaje *= 1.4
    else if (esNocheSemana) porcentaje *= 1.2
    else if (hora < 18) porcentaje = Math.min(porcentaje, 20) // day hours

    // Add base noise to make map feel alive (demo)
    const ruido = (Math.random() - 0.5) * 10
    porcentaje = Math.max(0, Math.min(100, porcentaje + ruido))

    // If no data at all, use a realistic random based on time
    if (baseOcupantes === 0 && porcentaje < 5) {
      if (esNocheFinde) porcentaje = Math.random() * 70 + 20
      else if (esNocheSemana) porcentaje = Math.random() * 50 + 10
      else porcentaje = Math.random() * 20
    }

    await registrarAforo(supabase, local.id, porcentaje)
    processed++
  }

  return NextResponse.json({ ok: true, processed, timestamp: ahora.toISOString() })
}

async function registrarAforo(supabase: Awaited<ReturnType<typeof createAdminSupabaseClient>>, localId: string, porcentaje: number) {
  const pct = Math.round(Math.max(0, Math.min(100, porcentaje)))
  await Promise.all([
    supabase.from('locales').update({ aforo_estimado_porcentaje: pct }).eq('id', localId),
    supabase.from('historial_aforo').insert({ local_id: localId, porcentaje: pct, registrado_at: new Date().toISOString() }),
  ])
}
