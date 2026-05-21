import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// Log de auditoría inmutable del panel admin (Doc5 §3.2).
// POST registra una acción. GET lista con filtros.
//
// Verifica que el caller es un administrador activo antes de cualquier operación.

async function getAdminId(req: NextRequest): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return null
  const { data } = await supabase
    .from('administradores')
    .select('id')
    .eq('email', user.email)
    .eq('activo', true)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const adminId = await getAdminId(req)
  if (!adminId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const body = await req.json()
  const {
    tipo_accion, entidad_tipo, entidad_id,
    datos_anteriores, datos_nuevos, motivo,
  } = body
  if (!tipo_accion) return NextResponse.json({ error: 'Falta tipo_accion' }, { status: 400 })

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    ?? req.headers.get('x-real-ip')
    ?? null

  const admin = await createAdminSupabaseClient()
  const { error } = await admin.from('log_auditoria').insert({
    admin_id: adminId,
    tipo_accion,
    entidad_tipo: entidad_tipo ?? null,
    entidad_id: entidad_id ?? null,
    datos_anteriores: datos_anteriores ?? null,
    datos_nuevos: datos_nuevos ?? null,
    motivo: motivo ?? null,
    ip,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET(req: NextRequest) {
  const adminId = await getAdminId(req)
  if (!adminId) return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const tipo = sp.get('tipo')
  const entidadTipo = sp.get('entidad_tipo')
  const adminFiltro = sp.get('admin_id')
  const desde = sp.get('desde')
  const hasta = sp.get('hasta')
  const limit = Math.min(parseInt(sp.get('limit') ?? '100', 10), 500)

  const admin = await createAdminSupabaseClient()
  let q = admin.from('log_auditoria')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (tipo) q = q.eq('tipo_accion', tipo)
  if (entidadTipo) q = q.eq('entidad_tipo', entidadTipo)
  if (adminFiltro) q = q.eq('admin_id', adminFiltro)
  if (desde) q = q.gte('created_at', desde)
  if (hasta) q = q.lte('created_at', hasta)

  const { data: entries, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Resolver nombre de admin para mostrar
  const adminIds = Array.from(new Set((entries ?? []).map(e => e.admin_id).filter(Boolean)))
  let admins: Record<string, { nombre: string; email: string }> = {}
  if (adminIds.length > 0) {
    const { data: rows } = await admin.from('administradores').select('id, nombre, email').in('id', adminIds)
    admins = Object.fromEntries((rows ?? []).map(r => [r.id, { nombre: r.nombre, email: r.email }]))
  }

  return NextResponse.json({ entries, admins })
}
