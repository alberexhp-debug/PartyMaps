import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { registrarConsentimiento, resolverIdentidadPorTelefono } from '@/lib/consentimiento'

const VENDEDORES = ['dueno', 'gestor', 'puerta']
const METODOS = ['efectivo', 'datafono', 'bizum', 'otro']

/**
 * GET  /api/local-panel/taquilla/vender — resumen de ventas de taquilla de hoy.
 * POST /api/local-panel/taquilla/vender — vende entradas en puerta a un walk-in.
 *   Body: { evento_id?, precio, cantidad, metodo_pago, comprador_nombre?, comprador_telefono?, consumicion_id? }
 *   Crea entradas anónimas (usuario_id null) canal='taquilla' con QR PM2: válido.
 *   El dinero lo cobra el local en mano → comisión de plataforma 0.
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t || !VENDEDORES.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()

  const inicioHoy = new Date(); inicioHoy.setHours(0, 0, 0, 0)
  const { data, error } = await db
    .from('entradas')
    .select('precio_total, metodo_pago')
    .eq('local_id', t.local_id).eq('canal', 'taquilla')
    .gte('created_at', inicioHoy.toISOString())
  if (error) return NextResponse.json({ hoy: { num: 0, total: 0 }, pendiente_migracion: true })

  const num = (data ?? []).length
  const total = (data ?? []).reduce((s, e) => s + Number(e.precio_total || 0), 0)
  const porMetodo: Record<string, number> = {}
  for (const e of data ?? []) porMetodo[e.metodo_pago || 'otro'] = (porMetodo[e.metodo_pago || 'otro'] || 0) + Number(e.precio_total || 0)
  return NextResponse.json({ hoy: { num, total, por_metodo: porMetodo } })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !VENDEDORES.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as {
    evento_id?: string; precio?: number; cantidad?: number; metodo_pago?: string;
    comprador_nombre?: string; comprador_telefono?: string; consumicion_id?: string;
    consentimiento_marketing?: boolean;
  } | null
  if (!body) return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const precio = Number(body.precio)
  const cantidad = Math.floor(Number(body.cantidad) || 1)
  const metodo = String(body.metodo_pago || 'efectivo')
  if (!Number.isFinite(precio) || precio < 0) return NextResponse.json({ error: 'Precio no válido' }, { status: 400 })
  if (cantidad < 1 || cantidad > 20) return NextResponse.json({ error: 'Cantidad entre 1 y 20' }, { status: 400 })
  if (!METODOS.includes(metodo)) return NextResponse.json({ error: 'Método de pago no válido' }, { status: 400 })

  const db = createServiceRoleClient()

  // Verifica que el evento (si lo hay) es de este local.
  if (body.evento_id) {
    const { data: ev } = await db.from('eventos').select('id, local_id').eq('id', body.evento_id).maybeSingle()
    if (!ev || ev.local_id !== t.local_id) return NextResponse.json({ error: 'Evento no válido' }, { status: 400 })
  }

  const precioRedondeado = Math.round(precio * 100) / 100
  const filas = Array.from({ length: cantidad }, () => ({
    usuario_id: null,
    local_id: t.local_id,
    evento_id: body.evento_id || null,
    consumicion_id: body.consumicion_id || null,
    consumicion_canjeada: false,
    precio_local: precioRedondeado,
    comision_plataforma: 0,                 // venta en mano: Rumbo no procesa el dinero
    precio_total: precioRedondeado,
    qr_code: `PM2:${crypto.randomUUID()}`,
    estado: 'activa',
    canal: 'taquilla',
    metodo_pago: metodo,
    vendido_por: t.id,
    comprador_nombre: body.comprador_nombre?.trim().slice(0, 80) || null,
    comprador_telefono: body.comprador_telefono?.trim().slice(0, 30) || null,
  }))

  const { data: creadas, error } = await db.from('entradas').insert(filas)
    .select('id, qr_code, precio_total, evento_id, estado')
  if (error) {
    const faltaMigracion = /canal|metodo_pago|vendido_por|null value.*usuario_id|comprador/i.test(error.message)
    return NextResponse.json({
      error: faltaMigracion ? 'La taquilla necesita la migración 032 aplicada en Supabase.' : `No se pudo vender: ${error.message}`,
    }, { status: faltaMigracion ? 409 : 500 })
  }

  // Suma a las entradas vendidas del evento (para precio dinámico/aforo).
  if (body.evento_id) {
    try { await db.rpc('incrementar_entradas_vendidas', { p_evento_id: body.evento_id, p_cantidad: cantidad }) } catch { /* no bloquea */ }
  }

  // Consentimiento de marketing del local (RGPD), si el taquillero lo marcó y
  // hay teléfono para identificar al cliente.
  if (body.consentimiento_marketing === true && body.comprador_telefono?.trim()) {
    try {
      const ident = await resolverIdentidadPorTelefono(db, body.comprador_telefono, t.local_id, body.comprador_nombre)
      if (ident) await registrarConsentimiento(db, { ...ident, local_id: t.local_id, estado: 'acepta', origen: 'taquilla' })
    } catch { /* no bloquea la venta */ }
  }

  return NextResponse.json({ ok: true, entradas: creadas })
}
