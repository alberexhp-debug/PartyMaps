import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * GET /api/local-panel/pedidos-bar?estado=...
 * Lista pedidos del local del trabajador, con items y usuario.
 * Default: solo 'pagado' (los activos para servir).
 */
export async function GET(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: trabajador } = await admin
    .from('usuario_local')
    .select('local_id, activo')
    .eq('email', user.email)
    .eq('activo', true)
    .maybeSingle()
  if (!trabajador) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const url = new URL(req.url)
  const estado = url.searchParams.get('estado') ?? 'pagado'

  const { data, error } = await admin
    .from('pedidos_bar')
    .select(`
      id, qr_code, estado, precio_total, notas,
      pagado_at, expira_at, entregado_at,
      usuarios(nombre, foto_perfil_url),
      pedido_items(id, nombre_snapshot, cantidad, precio_unitario)
    `)
    .eq('local_id', trabajador.local_id)
    .eq('estado', estado)
    .order('pagado_at', { ascending: estado === 'pagado' })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ pedidos: data ?? [] })
}
