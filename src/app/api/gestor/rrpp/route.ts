import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getGestorAutenticado, gestorPoseeLocal } from '@/lib/gestor/auth'
import { crearRrppDirecto } from '@/lib/rrpp/crear'

const TRIGGERS_DEFECTO = { entrada_vendida: true, escaneada_en_puerta: false, consumo_bar: false }

/**
 * Gestión de RRPP por el RumboGestor, SIEMPRE acotada a un local de su
 * cartera (?local_id). La invitación se emite en nombre de ese local
 * (invitado_por_local_id), por lo que no requiere migración nueva.
 *
 * GET    ?local_id=  → relaciones rrpp_venue + invitaciones pendientes del local
 * POST   { local_id, rrpp_slug|rrpp_id|email, comision_pct, ... } → vincular/invitar
 * PATCH  { local_id, relacion_id, comision_pct?, tope_por_venta?, estado? } → editar
 */

export async function GET(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const localId = new URL(req.url).searchParams.get('local_id') || ''
  if (!(await gestorPoseeLocal(ctx.gestor.id, localId))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const { data: relaciones, error } = await admin
    .from('rrpp_venue')
    .select(`*, rrpp!inner(id, slug, nombre_publico, foto_url, instagram, estado_alta)`)
    .eq('local_id', localId)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: invitaciones } = await admin
    .from('invitacion_rrpp')
    .select('id, email, nombre, token, estado, expira_at, comision_pct_sugerida, created_at')
    .eq('invitado_por_local_id', localId)
    .eq('estado', 'pendiente')
    .order('created_at', { ascending: false })

  return NextResponse.json({ relaciones: relaciones ?? [], invitaciones: invitaciones ?? [] })
}

export async function POST(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as Partial<{
    local_id: string
    crear_cuenta: boolean
    username: string
    rrpp_slug: string; rrpp_id: string
    email: string; nombre: string; telefono: string; mensaje: string
    comision_pct: number; tope_por_venta: number
  }> | null
  if (!body?.local_id) return NextResponse.json({ error: 'Falta local_id' }, { status: 400 })
  if (!(await gestorPoseeLocal(ctx.gestor.id, body.local_id))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const localId = body.local_id
  const comision = body.comision_pct ?? 0
  const tope = body.tope_por_venta ?? null

  // ── Modo 0: dar de alta un RRPP nuevo (cuenta + credenciales) ─────────
  if (body.crear_cuenta) {
    const res = await crearRrppDirecto(admin, {
      nombre: body.nombre || '', username: body.username || '', email_contacto: body.email || null,
      invitadoPorLocalId: localId, localId, comisionPct: comision, topePorVenta: tope,
    })
    if (!res.ok) return NextResponse.json({ error: res.error }, { status: res.status })
    return NextResponse.json({ ok: true, credenciales: res.credenciales, rrpp: res.rrpp, creada: true })
  }

  // ── Modo 1: vincular RRPP existente por slug/id ──────────────────────
  if (body.rrpp_slug || body.rrpp_id) {
    let rrpp: { id: string } | null = null
    if (body.rrpp_id) {
      const { data } = await admin.from('rrpp').select('id').eq('id', body.rrpp_id).maybeSingle()
      rrpp = data
    } else {
      const { data } = await admin.from('rrpp').select('id').eq('slug', body.rrpp_slug!).maybeSingle()
      rrpp = data
    }
    if (!rrpp) return NextResponse.json({ error: 'RRPP no encontrado' }, { status: 404 })

    const { data: existente } = await admin
      .from('rrpp_venue').select('*').eq('rrpp_id', rrpp.id).eq('local_id', localId).maybeSingle()
    if (existente) return NextResponse.json({ relacion: existente, ya_existia: true })

    const { data, error } = await admin.from('rrpp_venue').insert({
      rrpp_id: rrpp.id, local_id: localId, estado: 'pendiente', iniciado_por: 'venue',
      comision_pct: comision, tope_por_venta: tope, triggers_activos: TRIGGERS_DEFECTO,
    }).select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ relacion: data, creada: true })
  }

  // ── Modo 2: invitar por email ────────────────────────────────────────
  if (body.email) {
    const email = body.email.trim().toLowerCase()
    const { data: authUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const authUser = authUsers?.users?.find(u => u.email?.toLowerCase() === email)

    let usuarioId: string | null = null
    if (authUser) {
      const { data: u } = await admin.from('usuarios').select('id').eq('auth_id', authUser.id).maybeSingle()
      usuarioId = u?.id ?? null
    }

    if (usuarioId) {
      const { data: existenteRrpp } = await admin
        .from('rrpp').select('id, activo').eq('usuario_id', usuarioId).maybeSingle()
      let rrppId: string
      if (existenteRrpp) {
        rrppId = existenteRrpp.id
        if (!existenteRrpp.activo) await admin.from('rrpp').update({ activo: true }).eq('id', rrppId)
      } else {
        const slugPlaceholder = `pendiente-${authUser?.id?.slice(0, 8) ?? 'x'}`
        const { data: nuevo, error: errIns } = await admin.from('rrpp').insert({
          usuario_id: usuarioId, slug: slugPlaceholder, nombre_publico: body.nombre || 'Pendiente',
          estado_alta: 'invitado', invitado_por_local_id: localId, invitado_at: new Date().toISOString(),
        }).select('id').single()
        if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })
        rrppId = nuevo.id
      }

      const { data: relacion, error: errRel } = await admin.from('rrpp_venue').insert({
        rrpp_id: rrppId, local_id: localId, estado: 'pendiente', iniciado_por: 'venue',
        comision_pct: comision, tope_por_venta: tope, triggers_activos: TRIGGERS_DEFECTO,
      }).select().single()
      if (errRel) {
        if (errRel.code === '23505') return NextResponse.json({ error: 'Ya tienes relación con este RRPP' }, { status: 409 })
        return NextResponse.json({ error: errRel.message }, { status: 500 })
      }
      return NextResponse.json({ relacion, creada: true, via: 'usuario_existente' })
    }

    // No existe → invitación con token (en nombre del local de la cartera)
    const { data: invitacion, error: errInv } = await admin.from('invitacion_rrpp').insert({
      invitado_por_local_id: localId,
      email, telefono: body.telefono || null, nombre: body.nombre || null,
      comision_pct_sugerida: comision, tope_por_venta_sugerido: tope, mensaje: body.mensaje || null,
    }).select('token').single()
    if (errInv) return NextResponse.json({ error: errInv.message }, { status: 500 })

    return NextResponse.json({
      invitacion: { token: invitacion.token },
      link_invitacion: `${req.nextUrl.origin}/r/invitacion/${invitacion.token}`,
      via: 'nuevo_lead',
    })
  }

  return NextResponse.json({ error: 'Falta rrpp_slug, rrpp_id o email' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const ctx = await getGestorAutenticado(req)
  if (!ctx) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as Partial<{
    local_id: string; relacion_id: string
    comision_pct: number; tope_por_venta: number | null; estado: string
  }> | null
  if (!body?.local_id || !body.relacion_id) {
    return NextResponse.json({ error: 'Falta local_id o relacion_id' }, { status: 400 })
  }
  if (!(await gestorPoseeLocal(ctx.gestor.id, body.local_id))) {
    return NextResponse.json({ error: 'Ese local no está en tu cartera' }, { status: 403 })
  }

  const admin = createServiceRoleClient()
  const patch: Record<string, unknown> = {}
  if (typeof body.comision_pct === 'number') patch.comision_pct = body.comision_pct
  if (body.tope_por_venta !== undefined) patch.tope_por_venta = body.tope_por_venta
  if (body.estado && ['activa', 'pausada', 'archivada'].includes(body.estado)) patch.estado = body.estado
  if (Object.keys(patch).length === 0) return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })

  // El .eq sobre local_id garantiza que solo edita relaciones de su local.
  const { data, error } = await admin
    .from('rrpp_venue')
    .update(patch)
    .eq('id', body.relacion_id)
    .eq('local_id', body.local_id)
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ relacion: data })
}
