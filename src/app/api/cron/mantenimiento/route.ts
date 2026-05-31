import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'

// Cron de mantenimiento diario. Ejecuta varias tareas:
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

  // 11. Expirar bindings de atribución RRPP vencidos (ventana 24h)
  const { data: bindingsExpirados } = await supabase.rpc('expirar_bindings_rrpp')
  stats.bindings_rrpp_expirados = typeof bindingsExpirados === 'number' ? bindingsExpirados : 0

  return NextResponse.json({ ok: true, stats, timestamp: nowIso })
}
