import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

const LIMITES_TIER: Record<string, number> = {
  basico: 10,
  pro: 50,
  destacado: 9999,
}

const ROLES_GESTION = ['dueno', 'gestor'] as const

async function getTrabajador(req: NextRequest) {
  void req
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const admin = await createAdminSupabaseClient()
  const { data } = await admin
    .from('usuario_local')
    .select('id, local_id, rol, activo')
    .eq('email', user.email)
    .eq('activo', true)
    .maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const t = await getTrabajador(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const admin = await createAdminSupabaseClient()
  const { data } = await admin
    .from('productos_local')
    .select('*')
    .eq('local_id', t.local_id)
    .order('orden', { ascending: true })
    .order('created_at', { ascending: true })
  return NextResponse.json({ productos: data ?? [] })
}

export async function POST(req: NextRequest) {
  const t = await getTrabajador(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor pueden gestionar productos' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as Partial<{
    nombre: string; descripcion: string; categoria: string;
    precio: number; imagen_url: string; disponible: boolean; orden: number;
    es_pack: boolean; unidades_pack: number;
  }> | null
  if (!body?.nombre || body.precio == null) {
    return NextResponse.json({ error: 'Faltan campos (nombre, precio)' }, { status: 400 })
  }
  if (body.precio < 0 || body.precio > 1000) {
    return NextResponse.json({ error: 'Precio fuera de rango' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()

  // Comprobar tier y límite
  const { data: local } = await admin.from('locales').select('tier').eq('id', t.local_id).maybeSingle()
  const tier = local?.tier ?? 'basico'
  const limite = LIMITES_TIER[tier] ?? 10
  const { count } = await admin
    .from('productos_local')
    .select('id', { count: 'exact', head: true })
    .eq('local_id', t.local_id)
  if ((count ?? 0) >= limite) {
    return NextResponse.json({
      error: `Has alcanzado el límite de ${limite} productos del tier ${tier}. Sube de tier para ampliarlo.`,
    }, { status: 402 })
  }

  const { data, error } = await admin
    .from('productos_local')
    .insert({
      local_id: t.local_id,
      nombre: body.nombre.trim().slice(0, 80),
      descripcion: body.descripcion?.trim().slice(0, 240) || null,
      categoria: body.categoria || 'bebida',
      precio: body.precio,
      imagen_url: body.imagen_url || null,
      disponible: body.disponible ?? true,
      orden: body.orden ?? 0,
      es_pack: body.es_pack ?? false,
      unidades_pack: body.es_pack && body.unidades_pack ? body.unidades_pack : null,
    })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ producto: data })
}

export async function PATCH(req: NextRequest) {
  const t = await getTrabajador(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }

  const body = await req.json().catch(() => null) as { id?: string } & Record<string, unknown> | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  // Verificar que pertenece al local
  const { data: existente } = await admin.from('productos_local').select('local_id').eq('id', body.id).maybeSingle()
  if (!existente || existente.local_id !== t.local_id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }

  const update: Record<string, unknown> = {}
  for (const k of ['nombre', 'descripcion', 'categoria', 'precio', 'imagen_url', 'disponible', 'orden', 'es_pack', 'unidades_pack']) {
    if (k in body) update[k] = body[k]
  }
  if (Object.keys(update).length === 0) return NextResponse.json({ error: 'Sin cambios' }, { status: 400 })

  const { data, error } = await admin
    .from('productos_local')
    .update(update)
    .eq('id', body.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ producto: data })
}

export async function DELETE(req: NextRequest) {
  const t = await getTrabajador(req)
  if (!t) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (!ROLES_GESTION.includes(t.rol as typeof ROLES_GESTION[number])) {
    return NextResponse.json({ error: 'Solo dueño/gestor' }, { status: 403 })
  }
  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const { data: existente } = await admin.from('productos_local').select('local_id').eq('id', id).maybeSingle()
  if (!existente || existente.local_id !== t.local_id) {
    return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
  }
  const { error } = await admin.from('productos_local').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
