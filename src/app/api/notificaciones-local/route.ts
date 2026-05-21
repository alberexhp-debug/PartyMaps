import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { enviarPushASuscriptoresDeLocal } from '@/lib/push'

// Envío de notificación manual desde el panel local (Doc4 §8).
// Verifica permisos, respeta el límite semanal del tier básico y dispara push real.

const ROLES_PERMITIDOS = ['dueno', 'gestor']
const LIMITES_TIER: Record<string, number> = {
  basico: 2,
  pro: Infinity,
  destacado: Infinity,
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { local_id, titulo, cuerpo, enlace } = await req.json()
  if (!local_id || !titulo?.trim() || !cuerpo?.trim()) {
    return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const { data: trabajador } = await supabase
    .from('usuario_local')
    .select('rol')
    .eq('local_id', local_id)
    .eq('email', user.email!)
    .eq('activo', true)
    .single()
  if (!trabajador || !ROLES_PERMITIDOS.includes(trabajador.rol)) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: local } = await supabase
    .from('locales')
    .select('id, nombre, tier')
    .eq('id', local_id)
    .single()
  if (!local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

  // Límite semanal del tier (solo cuenta tipo 'manual')
  const lunes = new Date()
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  lunes.setHours(0, 0, 0, 0)
  const { count: enviadasSemana } = await supabase
    .from('notificaciones_enviadas')
    .select('id', { count: 'exact', head: true })
    .eq('local_id', local_id)
    .eq('tipo', 'manual')
    .gte('enviada_at', lunes.toISOString())

  const limite = LIMITES_TIER[local.tier] ?? 2
  if ((enviadasSemana ?? 0) >= limite) {
    return NextResponse.json({
      error: `Límite semanal alcanzado (${limite}). Sube a Pro para envíos ilimitados.`,
    }, { status: 429 })
  }

  const { count: numSuscriptores } = await supabase
    .from('suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('local_id', local_id)
    .eq('silenciada', false)

  const { data: registro, error: insertErr } = await supabase
    .from('notificaciones_enviadas')
    .insert({
      local_id,
      titulo: titulo.trim(),
      cuerpo: cuerpo.trim(),
      enlace: enlace?.trim() || null,
      num_destinatarios: numSuscriptores ?? 0,
      num_aperturas: 0,
      tipo: 'manual',
    })
    .select()
    .single()
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  const stats = await enviarPushASuscriptoresDeLocal(local_id, {
    title: titulo.trim(),
    body: cuerpo.trim(),
    url: enlace?.trim() || `/local/${local_id}`,
  }).catch(() => ({ enviadas: 0, falladas: 0, eliminadas: 0 }))

  return NextResponse.json({ ok: true, notificacion: registro, push: stats })
}
