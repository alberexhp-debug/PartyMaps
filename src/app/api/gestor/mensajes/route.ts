import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado } from '@/lib/gestor/auth'

type FilaG = { local_id: string; emisor: string; mensaje: string; leido: boolean; created_at: string }

/**
 * GET /api/gestor/mensajes — bandeja del gestor.
 * Lista los locales de su cartera con el último mensaje y los no leídos del
 * chat local↔gestor. Graceful: si la 053 aún no está aplicada, devuelve la
 * lista de locales con cero mensajes (no rompe).
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: locales } = await db.from('locales')
    .select('id, nombre, imagenes')
    .eq('gestor_id', ctx.gestor.id).neq('estado', 'eliminado')
  const lista = (locales ?? []) as { id: string; nombre: string; imagenes: string[] | null }[]
  if (!lista.length) return NextResponse.json({ conversaciones: [], no_leidos_total: 0 })

  const { data: msgs } = await db.from('mensajes_gestor')
    .select('local_id, emisor, mensaje, leido, created_at')
    .eq('gestor_id', ctx.gestor.id)
    .order('created_at', { ascending: false }).limit(2000)

  const porLocal = new Map<string, { ult: FilaG; noLeidos: number }>()
  for (const m of (msgs ?? []) as FilaG[]) {
    if (!porLocal.has(m.local_id)) porLocal.set(m.local_id, { ult: m, noLeidos: 0 })
    if (m.emisor === 'local' && !m.leido) porLocal.get(m.local_id)!.noLeidos++
  }

  const conversaciones = lista.map(l => {
    const e = porLocal.get(l.id)
    return {
      local_id: l.id,
      nombre: l.nombre,
      imagen: Array.isArray(l.imagenes) ? (l.imagenes[0] ?? null) : null,
      ultimo_mensaje: e?.ult.mensaje ?? '',
      ultimo_at: e?.ult.created_at ?? null,
      no_leidos: e?.noLeidos ?? 0,
    }
  })
  conversaciones.sort((a, b) => {
    const ua = a.no_leidos > 0 ? 1 : 0, ub = b.no_leidos > 0 ? 1 : 0
    if (ua !== ub) return ub - ua
    return (b.ultimo_at || '').localeCompare(a.ultimo_at || '')
  })
  const no_leidos_total = conversaciones.reduce((s, c) => s + c.no_leidos, 0)
  return NextResponse.json({ conversaciones, no_leidos_total })
}
