import { NextRequest, NextResponse } from 'next/server'
import { createAdminSupabaseClient, createServerSupabaseClient } from '@/lib/supabase/server'

/**
 * GET  /api/rrpp/invitacion/[token]
 *   Lee una invitación por su token. Público (es magic link).
 *   Devuelve los datos para que la página de invitación los muestre.
 *
 * POST /api/rrpp/invitacion/[token]
 *   Acepta la invitación. El cliente debe haber iniciado sesión antes
 *   con la misma cuenta que el email de la invitación.
 *   Crea/encuentra el usuario, crea el rrpp en estado 'invitado',
 *   crea rrpp_venue 'pendiente' con la comisión sugerida, y marca la
 *   invitación como aceptada.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = await createAdminSupabaseClient()

  const { data: inv } = await admin
    .from('invitacion_rrpp')
    .select(`
      id, email, nombre, telefono, estado, expira_at,
      comision_pct_sugerida, tope_por_venta_sugerido, mensaje,
      invitado_por_local_id,
      locales!invitacion_rrpp_invitado_por_local_id_fkey(id, nombre, imagenes)
    `)
    .eq('token', token)
    .maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })

  // locales usa `imagenes`; el consumidor espera `foto_url`.
  const locInv = inv.locales as unknown as { id: string; nombre: string; imagenes?: string[] } | null
  if (locInv) (inv as { locales: unknown }).locales = { id: locInv.id, nombre: locInv.nombre, foto_url: locInv.imagenes?.[0] ?? null }

  if (inv.estado !== 'pendiente') {
    return NextResponse.json({
      error: 'Esta invitación ya no es válida',
      estado: inv.estado,
    }, { status: 410 })
  }
  if (new Date(inv.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 })
  }

  return NextResponse.json({ invitacion: inv })
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Debes iniciar sesión primero', code: 'NEED_LOGIN' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: inv } = await admin
    .from('invitacion_rrpp')
    .select('*').eq('token', token).maybeSingle()
  if (!inv) return NextResponse.json({ error: 'Invitación no encontrada' }, { status: 404 })
  if (inv.estado !== 'pendiente') {
    return NextResponse.json({ error: 'Esta invitación ya no es válida' }, { status: 410 })
  }
  if (new Date(inv.expira_at) < new Date()) {
    return NextResponse.json({ error: 'Invitación expirada' }, { status: 410 })
  }
  if (user.email?.toLowerCase() !== (inv.email as string).toLowerCase()) {
    return NextResponse.json({
      error: `Esta invitación es para ${inv.email}. Tu cuenta es otra — inicia sesión con la correcta.`,
      code: 'EMAIL_MISMATCH',
    }, { status: 403 })
  }

  // Encontrar/crear perfil usuarios
  const { data: usuario } = await admin
    .from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) {
    return NextResponse.json({
      error: 'Aún no tienes perfil Rumbo. Completa primero el registro.',
      code: 'NO_USER_PROFILE',
    }, { status: 409 })
  }

  // ¿Ya tiene rrpp row?
  const { data: existenteRrpp } = await admin
    .from('rrpp').select('id, estado_alta, activo')
    .eq('usuario_id', usuario.id).maybeSingle()

  let rrppId: string
  if (existenteRrpp) {
    rrppId = existenteRrpp.id
    if (!existenteRrpp.activo) {
      await admin.from('rrpp').update({ activo: true }).eq('id', rrppId)
    }
  } else {
    const slugPlaceholder = `pendiente-${user.id.slice(0, 8)}`
    const { data: nuevo, error: errIns } = await admin
      .from('rrpp')
      .insert({
        usuario_id: usuario.id,
        slug: slugPlaceholder,
        nombre_publico: inv.nombre || 'Pendiente',
        estado_alta: 'invitado',
        invitado_por_local_id: inv.invitado_por_local_id,
        invitado_at: new Date().toISOString(),
      })
      .select('id').single()
    if (errIns) return NextResponse.json({ error: errIns.message }, { status: 500 })
    rrppId = nuevo.id
  }

  // Crear rrpp_venue si la invitación tenía local
  if (inv.invitado_por_local_id) {
    const { data: existenteRel } = await admin
      .from('rrpp_venue').select('id')
      .eq('rrpp_id', rrppId).eq('local_id', inv.invitado_por_local_id).maybeSingle()
    if (!existenteRel) {
      await admin.from('rrpp_venue').insert({
        rrpp_id: rrppId,
        local_id: inv.invitado_por_local_id,
        estado: 'pendiente',
        iniciado_por: 'venue',
        comision_pct: inv.comision_pct_sugerida ?? 0,
        tope_por_venta: inv.tope_por_venta_sugerido ?? null,
        triggers_activos: { entrada_vendida: true, escaneada_en_puerta: false, consumo_bar: false },
      })
    }
  }

  // Marcar invitación aceptada
  await admin
    .from('invitacion_rrpp')
    .update({ estado: 'aceptada', aceptada_at: new Date().toISOString(), rrpp_id: rrppId, usuario_id_si_existia: usuario.id })
    .eq('id', inv.id)

  return NextResponse.json({ ok: true, rrpp_id: rrppId, redirect: '/rrpp' })
}
