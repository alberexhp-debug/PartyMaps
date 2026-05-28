import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getAdminAutenticado } from '@/lib/admin/auth'

/**
 * GET  /api/admin/rrpp?q=&estado=&visible=
 *      Lista todos los RRPPs del sistema con filtros opcionales.
 *      Permite al admin supervisar la red completa.
 *
 * POST /api/admin/rrpp
 *      Crea un RRPP como free agent (sin local asociado) o lo enlaza a un
 *      local concreto. Dos modos:
 *        - usuario_id presente → crea rrpp directamente sobre ese usuario
 *          en estado 'invitado'.
 *        - email presente → crea invitacion_rrpp con token. El admin copia
 *          el link y se lo da a la persona.
 *      Body: { email?, usuario_id?, nombre?, local_id?, comision_pct?,
 *              tope_por_venta? }
 */
export async function GET(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const svc = await createAdminSupabaseClient()
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const estado = url.searchParams.get('estado_alta')  // 'invitado' | 'completo'
  const visible = url.searchParams.get('visible')     // 'true' | 'false'

  let query = svc.from('rrpp').select(`
    *,
    usuarios:usuario_id(id, nombre, telefono, foto_perfil_url)
  `).order('created_at', { ascending: false })

  if (q && q.length >= 2) {
    query = query.or(`slug.ilike.%${q}%,nombre_publico.ilike.%${q}%,instagram.ilike.%${q}%`)
  }
  if (estado === 'invitado' || estado === 'completo') query = query.eq('estado_alta', estado)
  if (visible === 'true') query = query.eq('visible_en_busqueda', true)
  if (visible === 'false') query = query.eq('visible_en_busqueda', false)

  const { data, error } = await query.limit(100)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Conteo de venues por RRPP
  const ids = (data ?? []).map(r => r.id)
  let venuesPorRrpp: Record<string, number> = {}
  if (ids.length > 0) {
    const { data: vens } = await svc
      .from('rrpp_venue').select('rrpp_id').in('rrpp_id', ids).eq('estado', 'activa')
    venuesPorRrpp = (vens ?? []).reduce<Record<string, number>>((acc, r) => {
      acc[r.rrpp_id] = (acc[r.rrpp_id] ?? 0) + 1; return acc
    }, {})
  }

  const rrpps = (data ?? []).map(r => ({ ...r, num_venues_activos: venuesPorRrpp[r.id] ?? 0 }))
  return NextResponse.json({ rrpps })
}

export async function POST(req: NextRequest) {
  const admin = await getAdminAutenticado()
  if (!admin) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json().catch(() => null) as Partial<{
    email: string; usuario_id: string; nombre: string;
    local_id: string;
    comision_pct: number; tope_por_venta: number;
    mensaje: string;
  }> | null
  if (!body) return NextResponse.json({ error: 'body vacío' }, { status: 400 })

  const svc = await createAdminSupabaseClient()

  // Modo A: usuario_id concreto → crea rrpp directamente
  if (body.usuario_id) {
    const { data: u } = await svc.from('usuarios').select('id, nombre').eq('id', body.usuario_id).maybeSingle()
    if (!u) return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })

    const { data: existente } = await svc.from('rrpp').select('id').eq('usuario_id', u.id).maybeSingle()
    if (existente) return NextResponse.json({ error: 'Este usuario ya es RRPP', rrpp_id: existente.id }, { status: 409 })

    const slugPlaceholder = `pendiente-${u.id.slice(0, 8)}`
    const { data: nuevo, error } = await svc
      .from('rrpp')
      .insert({
        usuario_id: u.id,
        slug: slugPlaceholder,
        nombre_publico: body.nombre || u.nombre,
        estado_alta: 'invitado',
        invitado_por_admin_id: admin.id,
        invitado_at: new Date().toISOString(),
      })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Si hay local, crear rrpp_venue pendiente
    if (body.local_id) {
      await svc.from('rrpp_venue').insert({
        rrpp_id: nuevo.id, local_id: body.local_id, estado: 'pendiente',
        iniciado_por: 'venue',  // técnicamente lo inicia admin en nombre del venue
        comision_pct: body.comision_pct ?? 0,
        tope_por_venta: body.tope_por_venta ?? null,
        triggers_activos: { entrada_vendida: true, escaneada_en_puerta: false, consumo_bar: false },
      })
    }

    return NextResponse.json({ rrpp: nuevo, via: 'usuario_existente' })
  }

  // Modo B: email → invitación con token
  if (body.email) {
    const email = body.email.trim().toLowerCase()
    const { data: inv, error } = await svc
      .from('invitacion_rrpp')
      .insert({
        invitado_por_admin_id: admin.id,
        invitado_por_local_id: body.local_id || null,
        email, nombre: body.nombre || null,
        comision_pct_sugerida: body.comision_pct ?? null,
        tope_por_venta_sugerido: body.tope_por_venta ?? null,
        mensaje: body.mensaje || null,
      })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const base = req.nextUrl.origin
    return NextResponse.json({
      invitacion: inv,
      link_invitacion: `${base}/r/invitacion/${inv.token}`,
      via: 'token',
    })
  }

  return NextResponse.json({ error: 'Falta usuario_id o email' }, { status: 400 })
}
