import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

const ROLES_CANJE = ['dueno', 'gestor', 'barman'] as const

/**
 * POST /api/pedidos-bar/canjear
 * Body: { qr_code: 'PMB:uuid' }
 * Marca un pedido como entregado. Solo trabajadores activos del local que
 * emite el pedido pueden canjearlo. Rechaza si ya está entregado/expirado.
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { qr_code?: string } | null
  if (!body?.qr_code) return NextResponse.json({ error: 'Falta qr_code' }, { status: 400 })
  if (!body.qr_code.startsWith('PMB:')) {
    return NextResponse.json({ error: 'QR no es de pedido de bar' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()

  // Resolver trabajador
  const { data: trabajador } = await admin
    .from('usuario_local')
    .select('id, local_id, rol, activo')
    .eq('email', user.email)
    .eq('activo', true)
    .maybeSingle()
  if (!trabajador) return NextResponse.json({ error: 'No eres trabajador' }, { status: 403 })
  if (!ROLES_CANJE.includes(trabajador.rol as typeof ROLES_CANJE[number])) {
    return NextResponse.json({ error: 'Tu rol no permite canjear pedidos' }, { status: 403 })
  }

  // Buscar pedido
  const { data: pedido } = await admin
    .from('pedidos_bar')
    .select('id, local_id, estado, expira_at, usuario_id, precio_total')
    .eq('qr_code', body.qr_code)
    .maybeSingle()
  if (!pedido) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

  if (pedido.local_id !== trabajador.local_id) {
    return NextResponse.json({ error: 'Este pedido no es de tu local' }, { status: 403 })
  }

  if (pedido.estado === 'entregado') {
    return NextResponse.json({ error: 'Este pedido ya fue entregado', estado: 'entregado' }, { status: 409 })
  }
  if (pedido.estado === 'expirado' || pedido.estado === 'cancelado') {
    return NextResponse.json({ error: `Pedido ${pedido.estado}`, estado: pedido.estado }, { status: 409 })
  }
  if (new Date(pedido.expira_at).getTime() < Date.now()) {
    await admin.from('pedidos_bar').update({
      estado: 'expirado',
      cancelado_at: new Date().toISOString(),
      cancelado_motivo: 'Expiró al intentar canjear',
    }).eq('id', pedido.id)
    return NextResponse.json({ error: 'Pedido expirado', estado: 'expirado' }, { status: 409 })
  }

  // Marcar entregado
  const { data: actualizado, error } = await admin
    .from('pedidos_bar')
    .update({
      estado: 'entregado',
      entregado_at: new Date().toISOString(),
      entregado_por: trabajador.id,
    })
    .eq('id', pedido.id)
    .eq('estado', 'pagado')   // optimistic lock
    .select(`
      *,
      pedido_items(id, nombre_snapshot, cantidad, precio_unitario),
      usuarios(nombre, foto_perfil_url)
    `)
    .single()

  if (error || !actualizado) {
    return NextResponse.json({ error: 'No se pudo canjear (concurrencia)' }, { status: 500 })
  }

  return NextResponse.json({ pedido: actualizado })
}
