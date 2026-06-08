import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { calcularComision, calcularPrecioDinamico } from '@/lib/utils'
import { devengarComisionEntrada, parseCookieRef } from '@/lib/rrpp/atribucion'
import { validarCodigo, calcularDescuento } from '@/lib/codigos'
import { validarRrppCodigo, descuentoCategoria } from '@/lib/rrppCodigos'
import { registrarConsentimiento } from '@/lib/consentimiento'
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
    const { local_id, evento_id, consumicion_id, cantidad = 1, codigo, consentimiento_marketing } = body

    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, tier, comision_porcentaje_override, precio_entrada_min, precio_entrada_max, precio_dinamico, precio_promocional, promo_ultima_hora_hasta, aforo_maximo, entradas_disponibles_noche, nombre')
      .eq('id', local_id)
      .single()
    if (localError || !local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

    let precioBase: number = local.precio_entrada_min ?? 0
    let consumicionesIncluidas = 0
    let consumicionesDescripcion: string | null = null

    if (evento_id) {
      const { data: evento } = await supabase
        .from('eventos')
        .select('precio_base, precio_maximo, precio_early_bird, early_bird_hasta, early_bird_cupo, precio_dinamico, entradas_vendidas, aforo_maximo, estado, consumiciones_incluidas, consumiciones_descripcion')
        .eq('id', evento_id)
        .single()
      if (evento && evento.estado === 'publicado') {
        // Cupo del evento: nunca por encima del aforo que el local puso a la venta en Rumbo (§6.2).
        if (evento.aforo_maximo > 0 && evento.entradas_vendidas + cantidad > evento.aforo_maximo) {
          const quedan = Math.max(0, evento.aforo_maximo - evento.entradas_vendidas)
          return NextResponse.json({ error: quedan === 0 ? 'Entradas agotadas para este evento' : `Solo quedan ${quedan} ${quedan === 1 ? 'entrada' : 'entradas'} para este evento` }, { status: 409 })
        }
        consumicionesIncluidas = Math.max(0, Math.min(5, Number(evento.consumiciones_incluidas) || 0))
        consumicionesDescripcion = consumicionesIncluidas > 0 ? (evento.consumiciones_descripcion ?? null) : null
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

      // Cupo de la noche en Rumbo: nunca por encima de lo que el local pone a la venta aquí (§6.2).
      if (local.entradas_disponibles_noche != null && (vendidasHoy ?? 0) + cantidad > local.entradas_disponibles_noche) {
        const quedan = Math.max(0, local.entradas_disponibles_noche - (vendidasHoy ?? 0))
        return NextResponse.json({ error: quedan === 0 ? 'Cupo de entradas de esta noche agotado' : `Solo quedan ${quedan} ${quedan === 1 ? 'entrada' : 'entradas'} esta noche` }, { status: 409 })
      }

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

    // Código de descuento. Hay dos sistemas:
    //  a) Código del RRPP (rrpp_codigo): aplica el % de la categoría "entrada"
    //     que el local fijó para ese RRPP, y atribuye la venta a ese RRPP.
    //  b) Código del Gestor (codigos_descuento): el de siempre.
    // Probamos primero el del RRPP; si no es uno, caemos al del gestor.
    let codigoAplicado: { codigo_id: string; descuentoPorEntrada: number } | null = null
    let rrppCodigoAplicado: { codigo_id: string; rrpp_id: string; descuentoPorEntrada: number } | null = null
    if (codigo && typeof codigo === 'string' && codigo.trim()) {
      const svc = createServiceRoleClient()
      const rc = await validarRrppCodigo(svc, codigo, local_id)
      if (rc && !rc.valido) return NextResponse.json({ error: rc.error }, { status: 400 })
      if (rc && rc.valido) {
        const { data: usado } = await svc.from('rrpp_codigo_uso')
          .select('id').eq('codigo_id', rc.codigo_id).eq('usuario_id', usuarioRow.id).maybeSingle()
        if (usado) return NextResponse.json({ error: 'Ya has usado este código' }, { status: 400 })
        const descuentoPorEntrada = descuentoCategoria(rc.descuentos, 'entrada', precioBase)
        precioBase = Math.round((precioBase - descuentoPorEntrada) * 100) / 100
        rrppCodigoAplicado = { codigo_id: rc.codigo_id, rrpp_id: rc.rrpp_id, descuentoPorEntrada }
      } else {
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
      consumiciones_incluidas: consumicionesIncluidas,
      consumiciones_canjeadas: 0,
      consumiciones_descripcion: consumicionesDescripcion,
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

    // Consentimiento de marketing del local (RGPD), si lo marcó en el checkout.
    if (consentimiento_marketing === true) {
      try { await registrarConsentimiento(createServiceRoleClient(), { usuario_id: usuarioRow.id, local_id, estado: 'acepta', origen: 'checkout_entrada' }) } catch {}
    }

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

    // Registrar el uso del código de RRPP (incrementa contador + traza).
    if (rrppCodigoAplicado && created && created.length > 0) {
      try {
        const svc = createServiceRoleClient()
        const { data: c } = await svc.from('rrpp_codigo').select('usos_actuales').eq('id', rrppCodigoAplicado.codigo_id).maybeSingle()
        await svc.from('rrpp_codigo').update({ usos_actuales: (c?.usos_actuales ?? 0) + 1 }).eq('id', rrppCodigoAplicado.codigo_id)
        await svc.from('rrpp_codigo_uso').insert({
          codigo_id: rrppCodigoAplicado.codigo_id,
          usuario_id: usuarioRow.id,
          entrada_id: created[0].id,
          descuento_aplicado: rrppCodigoAplicado.descuentoPorEntrada,
        })
      } catch (err) {
        console.error('[rrpp_codigo] registrar uso falló', err)
      }
    }

    // Atribución de comisión RRPP (last-touch 24h). No bloquea el checkout.
    // Si se usó un código de RRPP, la venta se atribuye SIEMPRE a ese RRPP
    // (override del cookieRef de last-touch).
    if (created && created.length > 0) {
      try {
        const { data: usuarioFull } = await supabase
          .from('usuarios').select('nombre, telefono').eq('id', usuarioRow.id).maybeSingle()
        const cookieRef = rrppCodigoAplicado
          ? { r: rrppCodigoAplicado.rrpp_id, t: Date.now() }
          : parseCookieRef(req.cookies.get('rumbo_ref')?.value)
        await devengarComisionEntrada({
          db: createServiceRoleClient(),
          usuario: { id: usuarioRow.id, nombre: usuarioFull?.nombre, telefono: usuarioFull?.telefono, email: user.email },
          localId: local_id,
          eventoId: evento_id || null,
          entradaIds: created.map(e => e.id),
          precioLocalPorEntrada: precioBase,
          cookieRef,
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
