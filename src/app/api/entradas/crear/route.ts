import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcularComision, calcularPrecioDinamico } from '@/lib/utils'
import type { PrecioDinamicoConfig } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Resolve auth user → usuarios.id (the FK target in entradas)
    const { data: usuarioRow } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!usuarioRow) return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })

    const body = await req.json()
    const { local_id, evento_id, consumicion_id, cantidad = 1 } = body

    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, tier, precio_entrada_min, precio_entrada_max, precio_dinamico, precio_promocional, promo_ultima_hora_hasta, aforo_maximo, nombre')
      .eq('id', local_id)
      .single()
    if (localError || !local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

    let precioBase: number = local.precio_entrada_min ?? 0

    if (evento_id) {
      const { data: evento } = await supabase
        .from('eventos')
        .select('precio_base, precio_maximo, precio_early_bird, early_bird_hasta, early_bird_cupo, precio_dinamico, entradas_vendidas, aforo_maximo, estado')
        .eq('id', evento_id)
        .single()
      if (evento && evento.estado === 'publicado') {
        const ahora = new Date()
        const earlyBirdActivo = evento.precio_early_bird && evento.early_bird_hasta && new Date(evento.early_bird_hasta) > ahora
          && (evento.early_bird_cupo == null || evento.entradas_vendidas < evento.early_bird_cupo)
        if (earlyBirdActivo) {
          precioBase = evento.precio_early_bird!
        } else {
          const pctVendido = evento.aforo_maximo > 0 ? (evento.entradas_vendidas / evento.aforo_maximo) * 100 : 0
          const { precio } = calcularPrecioDinamico(
            evento.precio_base,
            evento.precio_maximo,
            evento.precio_dinamico as PrecioDinamicoConfig | null,
            pctVendido,
          )
          precioBase = precio
        }
      }
    } else {
      // Noche regular sin evento: usar precio dinámico del local con entradas vendidas hoy
      const inicioHoy = new Date()
      inicioHoy.setHours(0, 0, 0, 0)
      const { count: vendidasHoy } = await supabase
        .from('entradas')
        .select('id', { count: 'exact', head: true })
        .eq('local_id', local.id)
        .is('evento_id', null)
        .gte('created_at', inicioHoy.toISOString())

      const pctVendido = local.aforo_maximo > 0 ? ((vendidasHoy ?? 0) / local.aforo_maximo) * 100 : 0
      const { precio } = calcularPrecioDinamico(
        local.precio_entrada_min ?? 0,
        local.precio_entrada_max,
        local.precio_dinamico as PrecioDinamicoConfig | null,
        pctVendido,
      )
      precioBase = precio

      // Promoción de última hora (Doc4 §6.3) sobreescribe si está activa y es menor
      if (local.precio_promocional != null && local.promo_ultima_hora_hasta
        && new Date(local.promo_ultima_hora_hasta) > new Date()
        && local.precio_promocional < precioBase) {
        precioBase = local.precio_promocional
      }
    }

    const comision = calcularComision(precioBase, local.tier)
    const precioTotal = precioBase + comision

    // Create tickets
    const entradas = Array.from({ length: cantidad }, () => ({
      usuario_id: usuarioRow.id,
      local_id,
      evento_id: evento_id || null,
      consumicion_id: consumicion_id || null,
      consumicion_canjeada: false,
      precio_local: precioBase,
      comision_plataforma: comision,
      precio_total: precioTotal,
      qr_code: `PM2:${crypto.randomUUID()}`,
      estado: 'activa',
    }))

    const { data: created, error } = await supabase
      .from('entradas')
      .insert(entradas)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update event entradas_vendidas if applicable
    if (evento_id) {
      await supabase.rpc('incrementar_entradas_vendidas', { p_evento_id: evento_id, p_cantidad: cantidad })
    }

    return NextResponse.json({ entradas: created })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
