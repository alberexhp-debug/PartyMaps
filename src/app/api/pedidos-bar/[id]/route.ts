import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/pedidos-bar/[id] — un pedido de barra del usuario actual.
 * Vía service_role + verificación de propiedad: leer pedidos_bar desde el
 * cliente evalúa la policy "Trabajadores ven pedidos de su local", que hace
 * JOIN a auth.users (42501) hasta aplicar la migración 036. Así el QR se ve
 * siempre. El barman canjea por su propio endpoint (también service_role).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: usuario } = await admin.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const { data: pedido } = await admin
    .from('pedidos_bar')
    .select(`id, qr_code, estado, precio_total, notas, pagado_at, expira_at, entregado_at, usuario_id,
      locales(id, nombre, imagenes),
      pedido_items(id, nombre_snapshot, cantidad, precio_unitario)`)
    .eq('id', id)
    .maybeSingle()
  if (!pedido || pedido.usuario_id !== usuario.id) {
    return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
  }
  return NextResponse.json({ pedido })
}
