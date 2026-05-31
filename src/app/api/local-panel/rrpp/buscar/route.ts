import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * GET /api/local-panel/rrpp/buscar?q=<query>
 *
 * Directorio de RRPP con perfil público (visible_en_busqueda=true, completos y
 * activos). Sin `q` devuelve el listado para navegar; con `q` filtra por slug,
 * nombre o Instagram. Excluye los ya vinculados a este local.
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()

  const admin = createServiceRoleClient()

  // RRPPs ya vinculados a este local (cualquier estado) — los excluimos
  const { data: yaVinculados } = await admin
    .from('rrpp_venue')
    .select('rrpp_id')
    .eq('local_id', t.local_id)
  const excluir = new Set((yaVinculados ?? []).map(r => r.rrpp_id))

  // Directorio de RRPP públicos. Con q filtra; sin q lista los más recientes.
  let query = admin
    .from('rrpp')
    .select('id, slug, nombre_publico, foto_url, bio, instagram, tiktok')
    .eq('activo', true)
    .eq('visible_en_busqueda', true)
    .eq('estado_alta', 'completo')
    .order('created_at', { ascending: false })
    .limit(q ? 20 : 40)
  if (q.length >= 2) query = query.or(`slug.ilike.%${q}%,nombre_publico.ilike.%${q}%,instagram.ilike.%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rrpps = (data ?? []).filter(r => !excluir.has(r.id))
  return NextResponse.json({ rrpps })
}
