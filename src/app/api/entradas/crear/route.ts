import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { calcularComision, calcularPrecioDinamico } from '@/lib/utils'
import { devengarComisionEntrada, parseCookieRef } from '@/lib/rrpp/atribucion'
import { validarCodigo, calcularDescuento } from '@/lib/codigos'
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
    const { local_id, evento_id, consumicion_id, cantidad = 1, codigo } = body

    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, tier, comision_porcentaje_override, precio_entrada_min, precio_entrada_max, precio_dinamico, precio_promocional, promo_ultima_hora_hasta, aforo_maximo, nombre')
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

    // Código de descuento (pactado por el Gestor con el local). Se valida y
    // aplica sobre el precio_local por entrada antes de calcular la comisión.
    let codigoAplicado: { codigo_id: string; descuentoPorEntrada: number } | null = null
    if (codigo && typeof codigo === 'string' && codigo.trim()) {
      const svc = createServiceRoleClient()
      const v = await validarCodigo(svc, codigo, local_id)
      if (!v.valido) return NextResponse.json({ error: v.error }, { status: 400 })
      // Un usuario no puede reutilizar el mismo código
      const { data: usado } = await svc.from('codigo_descuento_uso')
        .select('id').eq('codigo_id', v.codigo_id).eq('usuario_id', usuarioRow.id).maybeSingle()
      if (usado) return NextResponse.json({ error: 'Ya has usado este código' }, { status: 400 })
      const descuentoPorEntrada = calcularDescuento(v.tipo, v.valor, precioBase)
      precioBase = Math.round((precioBase - descuentoPorEntrada) * 100) / 100
      codigoAplicado = { codigo_id: v.codigo_id, descuentoPorEntrada }
    }

    // Si el admin definió un override personalizado para este local, lo usamos.
    // Si no, la comisión sale del tier (4% venta, 2.5% pro, 1.5% destacado, etc.).
    const comision = local.comision_porcentaje_override != null
      ? Math.round(precioBase * (local.comision_porcentaje_override / 100) * 100) / 100
      : calcularComision(precioBase, local.tier)
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

    // Registrar el uso del código de descuento (incrementa contador + traza).
    if (codigoAplicado && created && created.length > 0) {
      try {
        const svc = createServiceRoleClient()
        const { data: c } = await svc.from('codigos_descuento').select('usos_actuales').eq('id', codigoAplicado.codigo_id).maybeSingle()
        await svc.from('codigos_descuento').update({ usos_actuales: (c?.usos_actuales ?? 0) + 1 }).eq('id', codigoAplicado.codigo_id)
        await svc.from('codigo_descuento_uso').insert({
          codigo_id: codigoAplicado.codigo_id,
          usuario_id: usuarioRow.id,
          entrada_id: created[0].id,
          descuento_aplicado: codigoAplicado.descuentoPorEntrada,
        })
      } catch (err) {
        console.error('[codigo] registrar uso falló', err)
      }
    }

    // Atribución de comisión RRPP (last-touch 24h). No bloquea el checkout.
    if (created && created.length > 0) {
      try {
        const { data: usuarioFull } = await supabase
          .from('usuarios').select('nombre, telefono').eq('id', usuarioRow.id).maybeSingle()
        await devengarComisionEntrada({
          db: createServiceRoleClient(),
          usuario: { id: usuarioRow.id, nombre: usuarioFull?.nombre, telefono: usuarioFull?.telefono, email: user.email },
          localId: local_id,
          eventoId: evento_id || null,
          entradaIds: created.map(e => e.id),
          precioLocalPorEntrada: precioBase,
          cookieRef: parseCookieRef(req.cookies.get('rumbo_ref')?.value),
        })
      } catch (err) {
        console.error('[atribucion] devengo entrada falló', err)
      }
    }

    // Confirmación por email (no bloquea la respuesta; falla silenciosamente si no hay Resend)
    if (user.email && created && created.length > 0) {
      const { emailConfirmacionEntrada } = await import('@/lib/email')
      const { data: evento } = evento_id
        ? await supabase.from('eventos').select('fecha_inicio, nombre').eq('id', evento_id).maybeSingle()
        : { data: null }
      const { data: usuarioFull } = await supabase
        .from('usuarios').select('nombre').eq('id', usuarioRow.id).maybeSingle()
      emailConfirmacionEntrada(user.email, {
        nombreUsuario: usuarioFull?.nombre || 'cliente',
        nombreLocal: local.nombre,
        fechaEvento: evento?.fecha_inicio,
        precio: precioTotal,
        entradaId: created[0].id,
      }).catch(() => {})
    }

    return NextResponse.json({ entradas: created })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
