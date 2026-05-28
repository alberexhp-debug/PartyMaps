import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * GET /api/local-panel/rrpp/buscar?q=<query>
 *
 * Buscador de RRPPs visibles públicamente. Filtra por slug, nombre público
 * o Instagram. Solo muestra RRPPs con visible_en_busqueda=true,
 * estado_alta='completo' y activo=true.
 *
 * Excluye los que ya tienen relación con este local (cualquier estado),
 * para que el panel pueda ofrecer "invitar a otros que no tengas todavía".
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  if (q.length < 2) {
    return NextResponse.json({ rrpps: [] })
  }

  const admin = await createAdminSupabaseClient()

  // RRPPs ya vinculados a este local (cualquier estado) — los excluimos
  const { data: yaVinculados } = await admin
    .from('rrpp_venue')
    .select('rrpp_id')
    .eq('local_id', t.local_id)
  const excluir = new Set((yaVinculados ?? []).map(r => r.rrpp_id))

  // Buscar por slug, nombre o instagram (case-insensitive)
  const { data, error } = await admin
    .from('rrpp')
    .select('id, slug, nombre_publico, foto_url, bio, instagram, tiktok')
    .eq('activo', true)
    .eq('visible_en_busqueda', true)
    .eq('estado_alta', 'completo')
    .or(`slug.ilike.%${q}%,nombre_publico.ilike.%${q}%,instagram.ilike.%${q}%`)
    .limit(20)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rrpps = (data ?? []).filter(r => !excluir.has(r.id))
  return NextResponse.json({ rrpps })
}
