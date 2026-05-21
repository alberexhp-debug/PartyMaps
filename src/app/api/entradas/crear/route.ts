import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { calcularComision } from '@/lib/utils'

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    // Resolve auth user → usuarios.id (the FK target in entradas)
    const { data: usuarioRow } = await supabase
      .from('usuarios')
      .select('id')
      .eq('auth_id', user.id)
      .single()
    if (!usuarioRow) return NextResponse.json({ error: 'Perfil de usuario no encontrado' }, { status: 404 })

    const body = await req.json()
    const { local_id, evento_id, consumicion_id, cantidad = 1 } = body

    // Fetch local to get tier and price
    const { data: local, error: localError } = await supabase
      .from('locales')
      .select('id, tier, precio_entrada_min, nombre')
      .eq('id', local_id)
      .single()
    if (localError || !local) return NextResponse.json({ error: 'Local no encontrado' }, { status: 404 })

    // Fetch event if provided
    let precioBase = local.precio_entrada_min || 0
    if (evento_id) {
      const { data: evento } = await supabase
        .from('eventos')
        .select('precio_base, precio_early_bird, early_bird_hasta, early_bird_cupo, entradas_vendidas, estado')
        .eq('id', evento_id)
        .single()
      if (evento && evento.estado === 'publicado') {
        const ahora = new Date()
        const earlyBirdActivo = evento.precio_early_bird && evento.early_bird_hasta && new Date(evento.early_bird_hasta) > ahora
          && (evento.early_bird_cupo == null || evento.entradas_vendidas < evento.early_bird_cupo)
        precioBase = earlyBirdActivo ? evento.precio_early_bird! : evento.precio_base
      }
    }

    const comision = calcularComision(precioBase, local.tier)
    const precioTotal = precioBase + comision

    // Create tickets
    const entradas = Array.from({ length: cantidad }, () => ({
      usuario_id: usuarioRow.id,
      local_id,
      evento_id: evento_id || null,
      consumicion_id: consumicion_id || null,
      consumicion_canjeada: false,
      precio_local: precioBase,
      comision_plataforma: comision,
      precio_total: precioTotal,
      qr_code: `PM2:${crypto.randomUUID()}`,
      estado: 'activa',
    }))

    const { data: created, error } = await supabase
      .from('entradas')
      .insert(entradas)
      .select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Update event entradas_vendidas if applicable
    if (evento_id) {
      await supabase.rpc('incrementar_entradas_vendidas', { p_evento_id: evento_id, p_cantidad: cantidad })
    }

    return NextResponse.json({ entradas: created })
  } catch (e) {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
