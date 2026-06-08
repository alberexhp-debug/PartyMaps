import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

const ROLES_CANJE = ['dueno', 'gestor', 'barman'] as const

/**
 * POST /api/local-panel/consumiciones/canjear
 * Body: { qr_code: 'PM2:uuid' }
 * Canjea UNA consumición de la entrada (modo barra del scanner). El contador vive en
 * servidor (anti-falsificación) y el decremento es atómico (función canjear_consumicion
 * con FOR UPDATE): dos barmans a la vez no pueden canjear la misma. Convive con la
 * consumición de bienvenida legacy (consumicion_id booleano).
 */
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { qr_code?: string } | null
  if (!body?.qr_code || !body.qr_code.startsWith('PM2:')) {
    return NextResponse.json({ error: 'QR de entrada no válido' }, { status: 400 })
  }

  const admin = createServiceRoleClient()

  // Trabajador activo (resuelto por su email de cuenta, como en pedidos-bar/canjear).
  const { data: trabajador } = await admin
    .from('usuario_local')
    .select('id, local_id, rol, activo')
    .eq('email', user.email).eq('activo', true).maybeSingle()
  if (!trabajador) return NextResponse.json({ error: 'No eres trabajador' }, { status: 403 })
  if (!ROLES_CANJE.includes(trabajador.rol as typeof ROLES_CANJE[number])) {
    return NextResponse.json({ error: 'Tu rol no permite canjear consumiciones' }, { status: 403 })
  }

  const { data: entrada } = await admin
    .from('entradas')
    .select('id, local_id, consumiciones_incluidas, consumicion_id, consumicion_canjeada')
    .eq('qr_code', body.qr_code).maybeSingle()
  if (!entrada) return NextResponse.json({ error: 'Entrada no encontrada' }, { status: 404 })
  if (entrada.local_id !== trabajador.local_id) {
    return NextResponse.json({ error: 'Esta entrada no es de tu local' }, { status: 403 })
  }

  // Modelo contador (consumiciones incluidas en la entrada): canje atómico vía RPC.
  if ((entrada.consumiciones_incluidas ?? 0) > 0) {
    const { data, error } = await admin.rpc('canjear_consumicion', {
      p_entrada_id: entrada.id, p_trabajador: trabajador.id,
    })
    const row = (Array.isArray(data) ? data[0] : data) as
      { ok: boolean; incluidas: number; canjeadas: number; descripcion: string | null; motivo: string } | null
    if (error || !row) return NextResponse.json({ error: 'No se pudo canjear' }, { status: 500 })
    if (!row.ok) {
      if (row.motivo === 'agotadas') {
        return NextResponse.json(
          { error: 'Sin consumiciones disponibles', incluidas: row.incluidas, canjeadas: row.canjeadas, disponibles: 0 },
          { status: 409 },
        )
      }
      return NextResponse.json({ error: 'Esta entrada no incluye consumiciones' }, { status: 400 })
    }
    return NextResponse.json({
      ok: true, incluidas: row.incluidas, canjeadas: row.canjeadas,
      disponibles: row.incluidas - row.canjeadas, descripcion: row.descripcion,
    })
  }

  // Legacy: consumición de bienvenida (booleana). Canje atómico vía optimistic lock.
  if (entrada.consumicion_id) {
    const { data: upd } = await admin
      .from('entradas').update({ consumicion_canjeada: true })
      .eq('id', entrada.id).eq('consumicion_canjeada', false).select('id').maybeSingle()
    if (!upd) {
      return NextResponse.json({ error: 'Consumición ya canjeada', incluidas: 1, canjeadas: 1, disponibles: 0 }, { status: 409 })
    }
    return NextResponse.json({ ok: true, incluidas: 1, canjeadas: 1, disponibles: 0, descripcion: 'Consumición de bienvenida' })
  }

  return NextResponse.json({ error: 'Esta entrada no incluye consumición' }, { status: 400 })
}
