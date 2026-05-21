import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { enviarPushASuscriptoresDeLocal } from '@/lib/push'
import type { SupabaseClient } from '@supabase/supabase-js'

// Promoción de última hora (Doc4 §6.3).
// POST: activa la promo durante {horas} horas (máx 4) con precio {precio}.
//       Crea automáticamente una notificación de tipo 'sistema' que NO cuenta
//       en el límite semanal del tier básico.
// DELETE: cancela la promo antes de que expire.

const ROLES_PERMITIDOS = ['dueno', 'gestor']

async function tienePermiso(supabase: SupabaseClient, localId: string, email: string) {
  const { data } = await supabase
    .from('usuario_local')
    .select('rol')
    .eq('local_id', localId)
    .eq('email', email)
    .eq('activo', true)
    .single()
  return !!data && ROLES_PERMITIDOS.includes(data.rol)
}

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { local_id, precio, horas } = await req.json()
  if (!local_id || precio == null || !horas) return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
  if (precio < 0) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
  if (horas <= 0 || horas > 4) return NextResponse.json({ error: 'Duración entre 0 y 4 horas' }, { status: 400 })

  if (!(await tienePermiso(supabase, local_id, user.email!))) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { data: local } = await supabase
    .from('locales')
    .select('nombre, precio_entrada_min')
    .eq('id', local_id)
    .single()
  if (!local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

  if (local.precio_entrada_min != null && precio < local.precio_entrada_min) {
    return NextResponse.json({
      error: `El precio promocional no puede ser menor que el precio mínimo configurado (${local.precio_entrada_min}€)`,
    }, { status: 400 })
  }

  const expira = new Date(Date.now() + horas * 60 * 60 * 1000)
  const horaTexto = expira.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  const { error: updateErr } = await supabase
    .from('locales')
    .update({
      precio_promocional: precio,
      promo_ultima_hora_hasta: expira.toISOString(),
    })
    .eq('id', local_id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Notificación automática del sistema. No cuenta en el límite semanal.
  const { count: numSuscriptores } = await supabase
    .from('suscripciones')
    .select('id', { count: 'exact', head: true })
    .eq('local_id', local_id)
    .eq('silenciada', false)

  const titulo = `Noche de última hora en ${local.nombre}`
  const cuerpo = `Entradas a ${precio.toFixed(2)}€ solo hasta las ${horaTexto}.`

  await supabase.from('notificaciones_enviadas').insert({
    local_id,
    titulo,
    cuerpo,
    num_destinatarios: numSuscriptores || 0,
    num_aperturas: 0,
    tipo: 'sistema',
  })

  // Envío push real (no bloquea la respuesta si algo falla)
  const stats = await enviarPushASuscriptoresDeLocal(local_id, {
    title: titulo,
    body: cuerpo,
    url: `/local/${local_id}`,
  }).catch(() => ({ enviadas: 0, falladas: 0, eliminadas: 0 }))

  return NextResponse.json({ ok: true, expira: expira.toISOString(), push: stats })
}

export async function DELETE(req: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { local_id } = await req.json()
  if (!local_id) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })

  if (!(await tienePermiso(supabase, local_id, user.email!))) {
    return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
  }

  const { error } = await supabase
    .from('locales')
    .update({ precio_promocional: null, promo_ultima_hora_hasta: null })
    .eq('id', local_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
