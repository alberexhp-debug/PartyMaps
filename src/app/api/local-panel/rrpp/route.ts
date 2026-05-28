import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * GET  /api/local-panel/rrpp — lista de RRPPs vinculados al local (todas las
 *                              relaciones, no solo activas)
 * POST /api/local-panel/rrpp { rrpp_slug | rrpp_id, comision_pct, tope_por_venta?,
 *                              triggers_activos? } — invitar/crear relación
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('rrpp_venue')
    .select(`
      *,
      rrpp!inner(id, slug, nombre_publico, foto_url, bio, instagram, tiktok)
    `)
    .eq('local_id', t.local_id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ relaciones: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Partial<{
    rrpp_slug: string; rrpp_id: string;
    comision_pct: number; tope_por_venta: number;
    triggers_activos: { entrada_vendida: boolean; escaneada_en_puerta: boolean; consumo_bar: boolean };
  }> | null
  if (!body || (!body.rrpp_slug && !body.rrpp_id)) {
    return NextResponse.json({ error: 'rrpp_slug o rrpp_id obligatorio' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  // Resolver el RRPP destino
  let rrpp: { id: string } | null = null
  if (body.rrpp_id) {
    const { data } = await admin.from('rrpp').select('id').eq('id', body.rrpp_id).maybeSingle()
    rrpp = data
  } else if (body.rrpp_slug) {
    const { data } = await admin.from('rrpp').select('id').eq('slug', body.rrpp_slug).maybeSingle()
    rrpp = data
  }
  if (!rrpp) return NextResponse.json({ error: 'RRPP no encontrado' }, { status: 404 })

  // Insertar/upsertar relación. Si ya existe, devolvemos la existente sin tocar.
  const { data: existente } = await admin
    .from('rrpp_venue').select('*')
    .eq('rrpp_id', rrpp.id).eq('local_id', t.local_id).maybeSingle()
  if (existente) {
    return NextResponse.json({ relacion: existente, ya_existia: true })
  }

  const { data, error } = await admin
    .from('rrpp_venue')
    .insert({
      rrpp_id: rrpp.id,
      local_id: t.local_id,
      estado: 'pendiente',                       // el RRPP debe aceptar
      iniciado_por: 'venue',
      comision_pct: body.comision_pct ?? 0,
      tope_por_venta: body.tope_por_venta ?? null,
      triggers_activos: body.triggers_activos ?? {
        entrada_vendida: true,
        escaneada_en_puerta: false,
        consumo_bar: false,
      },
    })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ relacion: data, creada: true })
}
