import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { calcularComision } from '@/lib/utils'
import { devengarComisionBar, parseCookieRef } from '@/lib/rrpp/atribucion'
import { validarRrppCodigo, descuentoCategoria } from '@/lib/rrppCodigos'

interface ItemBody { producto_id: string; cantidad: number }

/**
 * POST /api/pedidos-bar
 * Body: { local_id, items: [{producto_id, cantidad}], notas? }
 * Crea un pedido en estado 'pagado' (de momento sin Stripe), genera QR PMB:...,
 * snapshot de nombres y precios. La comisión sale del tier del local
 * (calcularComision, igual que las entradas), no es fija.
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    local_id?: string; items?: ItemBody[]; notas?: string; codigo?: string;
  } | null
  if (!body?.local_id || !Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  // Sanity: cantidades válidas y máximo 20 items por pedido
  if (body.items.length > 20) {
    return NextResponse.json({ error: 'Máximo 20 productos por pedido' }, { status: 400 })
  }
  for (const it of body.items) {
    if (!it.producto_id || !Number.isInteger(it.cantidad) || it.cantidad < 1 || it.cantidad > 10) {
      return NextResponse.json({ error: 'Cantidades inválidas (1-10 por producto)' }, { status: 400 })
    }
  }

  const admin = await createAdminSupabaseClient()

  // Resolver usuario
  const { data: usuario } = await admin
    .from('usuarios').select('id, estado_cuenta').eq('auth_id', user.id).maybeSingle()
  if (!usuario || usuario.estado_cuenta !== 'activa') {
    return NextResponse.json({ error: 'Cuenta no activa' }, { status: 403 })
  }

  // Cargar productos del local pedidos + tier del local
  const productoIds = [...new Set(body.items.map(i => i.producto_id))]
  const [{ data: productos }, { data: localInfo }] = await Promise.all([
    admin.from('productos_local').select('id, local_id, nombre, precio, disponible').in('id', productoIds),
    admin.from('locales').select('tier, comision_porcentaje_override').eq('id', body.local_id).maybeSingle(),
  ])
  if (!productos || productos.length !== productoIds.length) {
    return NextResponse.json({ error: 'Productos no encontrados' }, { status: 404 })
  }
  // Verificar que todos pertenecen al mismo local y están disponibles
  for (const p of productos) {
    if (p.local_id !== body.local_id) {
      return NextResponse.json({ error: 'Producto fuera del local' }, { status: 400 })
    }
    if (!p.disponible) {
      return NextResponse.json({ error: `"${p.nombre}" ya no está disponible` }, { status: 409 })
    }
  }

  // Calcular total + comisión (snapshot de precios actuales)
  const productosMap = new Map(productos.map(p => [p.id, p]))
  let subtotal = 0
  for (const it of body.items) {
    const p = productosMap.get(it.producto_id)!
    subtotal += p.precio * it.cantidad
  }
  // Código del RRPP (opcional): aplica el descuento de la categoría "consumición"
  // y, al registrar el uso, atribuye la comisión a ese RRPP (vínculo explícito).
  let rrppCodigo: { codigo_id: string; rrpp_id: string; descuento: number } | null = null
  if (body.codigo?.trim()) {
    const svc = createServiceRoleClient()
    const rc = await validarRrppCodigo(svc, body.codigo.trim(), body.local_id)
    if (rc && rc.valido) {
      const { data: usado } = await svc.from('rrpp_codigo_uso')
        .select('id').eq('codigo_id', rc.codigo_id).eq('usuario_id', usuario.id).maybeSingle()
      if (!usado) {
        rrppCodigo = { codigo_id: rc.codigo_id, rrpp_id: rc.rrpp_id, descuento: descuentoCategoria(rc.descuentos, 'consumicion', subtotal) }
      }
    }
  }
  const subtotalNeto = Math.round((subtotal - (rrppCodigo?.descuento ?? 0)) * 100) / 100

  // Comisión por tier del local (con override si lo hay), sobre el neto.
  const tier = localInfo?.tier || 'venta'
  const comision = localInfo?.comision_porcentaje_override != null
    ? Math.round(subtotalNeto * (localInfo.comision_porcentaje_override / 100) * 100) / 100
    : calcularComision(subtotalNeto, tier)
  const total = Math.round((subtotalNeto + comision) * 100) / 100

  // Generar QR único
  const qrCode = `PMB:${crypto.randomUUID()}`

  // Insertar pedido
  const { data: pedido, error: errPedido } = await admin
    .from('pedidos_bar')
    .insert({
      usuario_id: usuario.id,
      local_id: body.local_id,
      qr_code: qrCode,
      estado: 'pagado',
      precio_total: total,
      comision_plataforma: comision,
      metodo_pago: 'app',
      notas: body.notas?.trim().slice(0, 200) || null,
      rrpp_id: rrppCodigo?.rrpp_id ?? null,
    })
    .select()
    .single()
  if (errPedido || !pedido) {
    console.error('[pedidos-bar] insert', errPedido)
    return NextResponse.json({ error: 'No se pudo crear el pedido' }, { status: 500 })
  }

  // Insertar items (snapshot)
  const items = body.items.map(it => {
    const p = productosMap.get(it.producto_id)!
    return {
      pedido_id: pedido.id,
      producto_id: it.producto_id,
      nombre_snapshot: p.nombre,
      precio_unitario: p.precio,
      cantidad: it.cantidad,
    }
  })
  const { error: errItems } = await admin.from('pedido_items').insert(items)
  if (errItems) {
    // Rollback: borrar pedido
    await admin.from('pedidos_bar').delete().eq('id', pedido.id)
    return NextResponse.json({ error: 'No se pudo registrar el pedido' }, { status: 500 })
  }

  // Registrar el uso del código del RRPP (incrementa usos + evita reutilización).
  if (rrppCodigo) {
    try {
      const svc = createServiceRoleClient()
      const { data: cc } = await svc.from('rrpp_codigo').select('usos_actuales').eq('id', rrppCodigo.codigo_id).maybeSingle()
      await svc.from('rrpp_codigo').update({ usos_actuales: (cc?.usos_actuales ?? 0) + 1 }).eq('id', rrppCodigo.codigo_id)
      await svc.from('rrpp_codigo_uso').insert({
        codigo_id: rrppCodigo.codigo_id, usuario_id: usuario.id, entrada_id: null, descuento_aplicado: rrppCodigo.descuento,
      })
    } catch (err) {
      console.error('[rrpp_codigo] registrar uso bar falló', err)
    }
  }

  // Atribución de comisión RRPP por consumo de barra. Con código del RRPP se
  // fuerza (vínculo explícito); sin código respeta el disparador del local
  // (OFF por defecto). No bloquea el pedido.
  try {
    const { data: uFull } = await admin.from('usuarios').select('nombre, telefono').eq('id', usuario.id).maybeSingle()
    await devengarComisionBar({
      db: createServiceRoleClient(),
      usuario: { id: usuario.id, nombre: uFull?.nombre, telefono: uFull?.telefono, email: user.email },
      localId: body.local_id,
      pedidoBarId: pedido.id,
      subtotal: subtotalNeto,
      cookieRef: rrppCodigo ? { r: rrppCodigo.rrpp_id, t: Date.now() } : parseCookieRef(req.cookies.get('rumbo_ref')?.value),
      forzar: !!rrppCodigo,
    })
  } catch (err) {
    console.error('[atribucion] devengo bar falló', err)
  }

  return NextResponse.json({ pedido })
}

/**
 * GET /api/pedidos-bar
 * Lista los pedidos del usuario actual (todos los estados).
 */
export async function GET(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const url = new URL(req.url)
  const estado = url.searchParams.get('estado')

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin
    .from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  let q = admin
    .from('pedidos_bar')
    .select(`
      *,
      locales(id, nombre, imagenes),
      pedido_items(id, nombre_snapshot, cantidad, precio_unitario)
    `)
    .eq('usuario_id', usuario.id)
    .order('created_at', { ascending: false })
    .limit(50)
  if (estado) q = q.eq('estado', estado)

  const { data, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pedidos: data ?? [] })
}
