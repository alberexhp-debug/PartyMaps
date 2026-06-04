import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { enviarPushARRPP } from '@/lib/push'

const ROLES_GESTION = ['dueno', 'gestor'] as const

/**
 * GET  /api/local-panel/rrpp — lista de RRPPs vinculados al local
 *
 * POST /api/local-panel/rrpp — invita o crea un RRPP para el local.
 * Tres modos según el body:
 *
 *   1) Por slug/id: invitar a un RRPP existente (visible o no en el buscador,
 *      el slug es información pública).
 *      Body: { rrpp_slug | rrpp_id, comision_pct, tope_por_venta?, triggers_activos? }
 *
 *   2) Por email: la persona puede o no ser usuaria Rumbo.
 *      Si existe usuario con ese email → creamos rrpp en estado 'invitado' +
 *      rrpp_venue 'pendiente'; el usuario verá la invitación en /rrpp.
 *      Si no existe → creamos invitacion_rrpp con token y devolvemos un link
 *      copiable que el venue manda por WhatsApp.
 *      Body: { email, nombre?, telefono?, comision_pct, tope_por_venta?,
 *              triggers_activos?, mensaje? }
 *
 *   3) Por invitación existente: confirma invitación admin previa (uso interno)
 *
 *   El response unificado:
 *      { relacion?, invitacion?, link_invitacion? }
 */
export async function GET() {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const admin = await createAdminSupabaseClient()
  const { data: relaciones, error } = await admin
    .from('rrpp_venue')
    .select(`
      *,
      rrpp!inner(id, slug, nombre_publico, foto_url, bio, instagram, tiktok, estado_alta)
    `)
    .eq('local_id', t.local_id)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Invitaciones por email pendientes (a usuarios que aún no se han registrado)
  const { data: invitaciones } = await admin
    .from('invitacion_rrpp')
    .select('id, email, nombre, telefono, token, estado, expira_at, created_at')
    .eq('invitado_por_local_id', t.local_id)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  return NextResponse.json({ relaciones: relaciones ?? [], invitaciones: invitaciones ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Partial<{
    rrpp_slug: string; rrpp_id: string;
    email: string; nombre: string; telefono: string; mensaje: string;
    comision_pct: number; tope_por_venta: number;
    triggers_activos: { entrada_vendida: boolean; escaneada_en_puerta: boolean; consumo_bar: boolean };
  }> | null

  if (!body) return NextResponse.json({ error: 'body vacío' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const triggers = body.triggers_activos ?? {
    entrada_vendida: true,
    escaneada_en_puerta: false,
    consumo_bar: false,
  }

  // ── Modo 1: invitar por slug/id ────────────────────────────────────
  if (body.rrpp_slug || body.rrpp_id) {
    let rrpp: { id: string } | null = null
    if (body.rrpp_id) {
      const { data } = await admin.from('rrpp').select('id').eq('id', body.rrpp_id).maybeSingle()
      rrpp = data
    } else if (body.rrpp_slug) {
      const { data } = await admin.from('rrpp').select('id').eq('slug', body.rrpp_slug).maybeSingle()
      rrpp = data
    }
    if (!rrpp) return NextResponse.json({ error: 'RRPP no encontrado' }, { status: 404 })

    const { data: existente } = await admin
      .from('rrpp_venue').select('*').eq('rrpp_id', rrpp.id).eq('local_id', t.local_id).maybeSingle()
    if (existente) {
      return NextResponse.json({ relacion: existente, ya_existia: true })
    }

    const { data, error } = await admin
      .from('rrpp_venue')
      .insert({
        rrpp_id: rrpp.id, local_id: t.local_id, estado: 'pendiente',
        iniciado_por: 'venue',
        comision_pct: body.comision_pct ?? 0,
        tope_por_venta: body.tope_por_venta ?? null,
        triggers_activos: triggers,
      })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Avisar al RRPP de la invitación.
    const { data: local } = await admin.from('locales').select('nombre').eq('id', t.local_id).maybeSingle()
    await enviarPushARRPP(rrpp.id, {
      title: '¡Te han invitado a trabajar!',
      body: local?.nombre ? `${local.nombre} quiere trabajar contigo. Acéptalo en tu panel.` : 'Un local quiere trabajar contigo.',
      url: '/rrpp',
    })
    return NextResponse.json({ relacion: data, creada: true })
  }

  // ── Modo 2: invitar por email ──────────────────────────────────────
  if (body.email) {
    const email = body.email.trim().toLowerCase()
    // ¿Ya existe usuario con ese email? Lo encontramos vía auth.users → usuarios.auth_id
    // Como no tenemos email en usuarios, lo resolvemos por auth.admin
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email)

    let usuarioId: string | null = null
    if (authUser) {
      const { data: u } = await admin
        .from('usuarios').select('id').eq('auth_id', authUser.id).maybeSingle()
      usuarioId = u?.id ?? null
    }

    if (usuarioId) {
      // Usuario existe → crear directamente rrpp invitado + rrpp_venue pendiente
      const { data: existenteRrpp } = await admin
        .from('rrpp').select('id, estado_alta, activo')
        .eq('usuario_id', usuarioId).maybeSingle()

      let rrppId: string
      if (existenteRrpp) {
        rrppId = existenteRrpp.id
        // Si está inactivo, reactivar como invitado
        if (!existenteRrpp.activo) {
          await admin.from('rrpp').update({ activo: true }).eq('id', rrppId)
        }
      } else {
        // Crear rrpp en estado invitado; el usuario completará slug/bio
        const slugPlaceholder = `pendiente-${authUser?.id?.slice(0, 8) ?? Date.now().toString(36)}`
        const { data: nuevo, error: errIns } = await admin
          .from('rrpp')
          .insert({
            usuario_id: usuarioId,
            slug: slugPlaceholder,
            nombre_publico: body.nombre || 'Pendiente',
            estado_alta: 'invitado',
            invitado_por_local_id: t.local_id,
            invitado_at: new Date().toISOString(),
          })
          .select('id').single()
        if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })
        rrppId = nuevo.id
      }

      const { data: relacion, error: errRel } = await admin
        .from('rrpp_venue')
        .insert({
          rrpp_id: rrppId, local_id: t.local_id, estado: 'pendiente',
          iniciado_por: 'venue',
          comision_pct: body.comision_pct ?? 0,
          tope_por_venta: body.tope_por_venta ?? null,
          triggers_activos: triggers,
        })
        .select().single()
      if (errRel) {
        if (errRel.code === '23505') {
          return NextResponse.json({ error: 'Ya tienes relación con este RRPP' }, { status: 409 })
        }
        return NextResponse.json({ error: errRel.message }, { status: 500 })
      }
      return NextResponse.json({ relacion, creada: true, via: 'usuario_existente' })
    }

    // Usuario NO existe → crear invitación con token
    const { data: invitacion, error: errInv } = await admin
      .from('invitacion_rrpp')
      .insert({
        invitado_por_local_id: t.local_id,
        email, telefono: body.telefono || null, nombre: body.nombre || null,
        comision_pct_sugerida: body.comision_pct ?? null,
        tope_por_venta_sugerido: body.tope_por_venta ?? null,
        mensaje: body.mensaje || null,
      })
      .select().single()
    if (errInv) return NextResponse.json({ error: errInv.message }, { status: 500 })

    const linkInvitacion = buildLinkInvitacion(req, invitacion.token)
    return NextResponse.json({
      invitacion,
      link_invitacion: linkInvitacion,
      via: 'nuevo_lead',
    })
  }

  return NextResponse.json({ error: 'Falta rrpp_slug, rrpp_id o email' }, { status: 400 })
}

function buildLinkInvitacion(req: NextRequest, token: string): string {
  const base = req.nextUrl.origin
  return `${base}/r/invitacion/${token}`
}
