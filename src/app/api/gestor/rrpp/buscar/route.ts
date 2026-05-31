import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, gestorPoseeLocal } from '@/lib/gestor/auth'

/**
 * GET /api/gestor/rrpp/buscar?local_id=&q=
 * Busca RRPP públicos (visibles, completos, activos) para vincular a un
 * local de la cartera, excluyendo los ya vinculados a ese local.
 */
export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const localId = url.searchParams.get('local_id') || ''
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()

  if (!(await gestorPoseeLocal(ctx.gestor.id, localId))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }
  if (q.length < 2) return NextResponse.json({ rrpps: [] })

  const admin = createServiceRoleClient()

  const { data: yaVinculados } = await admin
    .from('rrpp_venue').select('rrpp_id').eq('local_id', localId)
  const excluir = new Set((yaVinculados ?? []).map(r => r.rrpp_id))

  const { data, error } = await admin
    .from('rrpp')
    .select('id, slug, nombre_publico, foto_url, instagram')
    .eq('activo', true)
    .eq('visible_en_busqueda', true)
    .eq('estado_alta', 'completo')
    .or(`slug.ilike.%${q}%,nombre_publico.ilike.%${q}%,instagram.ilike.%${q}%`)
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ rrpps: (data ?? []).filter(r => !excluir.has(r.id)) })
}
