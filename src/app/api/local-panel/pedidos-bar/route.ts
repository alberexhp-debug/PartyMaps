import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const ROLES = ['dueno', 'gestor', 'barman']
type Nivel = 'alta' | 'media' | 'baja'
const ORDEN_NIVEL: Record<Nivel, number> = { alta: 0, media: 1, baja: 2 }

/**
 * GET  /api/local-panel/pedidos-bar?estado=...
 *   Lista pedidos del local con items y usuario. La cola 'pagado' se ordena por
 *   prioridad: override manual primero, luego por zona (locales.prioridad_zonas
 *   según el tipo de la mesa del pedido), y dentro de cada nivel FIFO.
 * POST { accion: 'priorizar', pedido_id, quitar? } — sube/quita un pedido a mano.
 */
export async function GET(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: trabajador } = await admin
    .from('usuario_local').select('local_id, activo').eq('email', user.email).eq('activo', true).maybeSingle()
  if (!trabajador) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const estado = new URL(req.url).searchParams.get('estado') ?? 'pagado'

  const { data, error } = await admin
    .from('pedidos_bar')
    .select(`
      id, qr_code, estado, precio_total, notas, origen, mesa_id, priorizado_at,
      pagado_at, expira_at, entregado_at,
      usuarios(nombre, foto_perfil_url),
      pedido_items(id, nombre_snapshot, cantidad, precio_unitario)
    `)
    .eq('local_id', trabajador.local_id)
    .eq('estado', estado)
    .order('pagado_at', { ascending: estado === 'pagado' })
    .limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let pedidos = data ?? []
  // Orden por prioridad solo para la cola activa.
  if (estado === 'pagado' && pedidos.length) {
    const mesaIds = [...new Set(pedidos.map(p => p.mesa_id).filter(Boolean) as string[])]
    const [mesasRes, locRes] = await Promise.all([
      mesaIds.length
        ? admin.from('mesas').select('id, tipo').in('id', mesaIds)
        : Promise.resolve({ data: [] as { id: string; tipo: string }[] }),
      admin.from('locales').select('prioridad_zonas').eq('id', trabajador.local_id).maybeSingle(),
    ])
    const tipoPorMesa = new Map((mesasRes.data ?? []).map(m => [m.id, m.tipo]))
    const prio = (locRes.data?.prioridad_zonas || {}) as Record<string, Nivel>
    const nivelDe = (p: typeof pedidos[number]): number => {
      const tipo = p.origen === 'mesa' && p.mesa_id ? (tipoPorMesa.get(p.mesa_id) || 'mesa') : 'barra'
      return ORDEN_NIVEL[prio[tipo] || 'media'] ?? 1
    }
    pedidos = [...pedidos].sort((a, b) => {
      // Override manual primero (el más reciente arriba).
      if (!!a.priorizado_at !== !!b.priorizado_at) return a.priorizado_at ? -1 : 1
      if (a.priorizado_at && b.priorizado_at) return String(b.priorizado_at).localeCompare(String(a.priorizado_at))
      // Luego por nivel de zona, y dentro del nivel FIFO (más antiguo primero).
      const na = nivelDe(a), nb = nivelDe(b)
      if (na !== nb) return na - nb
      return String(a.pagado_at).localeCompare(String(b.pagado_at))
    })
  }
  return NextResponse.json({ pedidos })
}

export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceRoleClient()
  const { data: trab } = await admin
    .from('usuario_local').select('id, local_id, rol, activo').eq('email', user.email).eq('activo', true).maybeSingle()
  if (!trab || !ROLES.includes(trab.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  const body = await req.json().catch(() => null) as { accion?: string; pedido_id?: string; quitar?: boolean } | null
  if (body?.accion === 'priorizar' && body.pedido_id) {
    const { data: ped } = await admin.from('pedidos_bar').select('id, local_id').eq('id', body.pedido_id).maybeSingle()
    if (!ped || ped.local_id !== trab.local_id) return NextResponse.json({ error: 'Pedido no válido' }, { status: 400 })
    await admin.from('pedidos_bar').update({
      priorizado_at: body.quitar ? null : new Date().toISOString(),
      priorizado_por: body.quitar ? null : trab.id,
    }).eq('id', body.pedido_id)
    return NextResponse.json({ ok: true })
  }
  return NextResponse.json({ error: 'Acción no soportada' }, { status: 400 })
}
