import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// Cron de mantenimiento diario. Ejecuta varias tareas:
// 1. Cierra concursos cuya hora_cierre ya pasó
// 2. Cierra retos vencidos (hora_cierre pasada o >24h sin cierre manual)
// 3. Marca como completados los planes públicos pasados
// 4. Elimina mensajes de chat de planes cuyo plan ya terminó hace >12h
// 5. Limpia solicitudes pendientes >30 min como expiradas
// 6. Elimina checkins zombi (>6h sin salida_at)
//
// Autorización: Bearer CRON_SECRET
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createAdminSupabaseClient()
  const ahora = new Date()
  const nowIso = ahora.toISOString()

  const stats: Record<string, number> = {}

  // 1. Cerrar concursos vencidos y calcular ganador
  const { data: concursosVencidos } = await supabase
    .from('concursos')
    .select('id, local_id')
    .eq('estado', 'activo')
    .lt('hora_cierre', nowIso)

  if (concursosVencidos?.length) {
    for (const c of concursosVencidos) {
      const { data: ganador } = await supabase
        .from('participaciones_concurso')
        .select('id, num_votos, created_at')
        .eq('concurso_id', c.id)
        .eq('estado', 'aprobada')
        .order('num_votos', { ascending: false })
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()

      await supabase
        .from('concursos')
        .update({
          estado: 'cerrado',
          ganador_participacion_id: ganador?.id || null,
        })
        .eq('id', c.id)
    }
    stats.concursos_cerrados = concursosVencidos.length
  }

  // 2. Cerrar retos vencidos
  const { data: retosVencidos } = await supabase
    .from('retos')
    .select('id, hora_cierre, created_at')
    .eq('estado', 'activo')

  if (retosVencidos?.length) {
    const aCerrar: string[] = []
    for (const r of retosVencidos) {
      if (r.hora_cierre && new Date(r.hora_cierre) < ahora) {
        aCerrar.push(r.id)
      } else if (!r.hora_cierre) {
        // Sin hora_cierre, cerrar si lleva >24h
        const horasVida = (ahora.getTime() - new Date(r.created_at).getTime()) / (1000 * 60 * 60)
        if (horasVida > 24) aCerrar.push(r.id)
      }
    }
    if (aCerrar.length > 0) {
      await supabase.from('retos').update({ estado: 'cerrado' }).in('id', aCerrar)
      stats.retos_cerrados = aCerrar.length
    }
  }

  // 3. Planes públicos pasados → completados
  const hace12h = new Date(ahora.getTime() - 12 * 60 * 60 * 1000).toISOString()
  const { data: planesViejos } = await supabase
    .from('planes_publicos')
    .select('id')
    .eq('estado', 'activo')
    .lt('hora_llegada', hace12h)

  if (planesViejos?.length) {
    const ids = planesViejos.map(p => p.id)
    await supabase.from('planes_publicos').update({ estado: 'completado' }).in('id', ids)
    stats.planes_completados = ids.length
  }

  // 4. Eliminar mensajes de chat de planes completados >12h
  const { data: planesParaLimpiar } = await supabase
    .from('planes_publicos')
    .select('id')
    .eq('estado', 'completado')
    .lt('updated_at', new Date(ahora.getTime() - 12 * 60 * 60 * 1000).toISOString())

  if (planesParaLimpiar?.length) {
    const ids = planesParaLimpiar.map(p => p.id)
    const { count } = await supabase
      .from('mensajes_chat_plan')
      .delete({ count: 'exact' })
      .in('plan_id', ids)
    stats.mensajes_eliminados = count || 0
  }

  // 5. Expirar solicitudes pendientes >30 min
  const hace30Min = new Date(ahora.getTime() - 30 * 60 * 1000).toISOString()
  const { count: solicitudesExpiradas } = await supabase
    .from('participantes_plan')
    .update({ estado: 'expirada' }, { count: 'exact' })
    .eq('estado', 'pendiente')
    .lt('created_at', hace30Min)
  stats.solicitudes_expiradas = solicitudesExpiradas || 0

  // 6. Cerrar checkins zombi (sin salida_at >6h)
  const hace6h = new Date(ahora.getTime() - 6 * 60 * 60 * 1000).toISOString()
  const { count: checkinsCerrados } = await supabase
    .from('checkins')
    .update({ salida_at: nowIso }, { count: 'exact' })
    .is('salida_at', null)
    .lt('entrada_at', hace6h)
  stats.checkins_cerrados = checkinsCerrados || 0

  // 7. Resetear contador semanal de notificaciones del local cada lunes
  if (ahora.getDay() === 1 && ahora.getHours() < 6) {
    const { count: localesReseteados } = await supabase
      .from('locales')
      .update({ notificaciones_semana_count: 0 }, { count: 'exact' })
      .gt('notificaciones_semana_count', 0)
    stats.locales_reseteo_notif = localesReseteados || 0
  }

  // 8. Limpiar correcciones manuales de aforo expiradas (Doc4 §5.3)
  const { count: aforosLimpiados } = await supabase
    .from('locales')
    .update({
      aforo_correccion_manual: null,
      aforo_correccion_manual_expires: null,
    }, { count: 'exact' })
    .not('aforo_correccion_manual_expires', 'is', null)
    .lt('aforo_correccion_manual_expires', nowIso)
  stats.aforos_manual_expirados = aforosLimpiados || 0

  // 9. Limpiar promos de última hora expiradas (Doc4 §6.3)
  const { count: promosLimpiadas } = await supabase
    .from('locales')
    .update({
      precio_promocional: null,
      promo_ultima_hora_hasta: null,
    }, { count: 'exact' })
    .not('promo_ultima_hora_hasta', 'is', null)
    .lt('promo_ultima_hora_hasta', nowIso)
  stats.promos_ultima_hora_expiradas = promosLimpiadas || 0

  // 10. Expirar pedidos de bar pagados pero no canjeados en 6h
  const { data: expirados } = await supabase.rpc('expirar_pedidos_bar')
  stats.pedidos_bar_expirados = typeof expirados === 'number' ? expirados : 0

  return NextResponse.json({ ok: true, stats, timestamp: nowIso })
}
