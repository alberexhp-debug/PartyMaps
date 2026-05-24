import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Devuelve los planes en los que el usuario participó cuya hora de llegada
 * está al menos 12h en el pasado y para los que aún no ha enviado todas las
 * valoraciones a sus compañeros.
 */
export async function GET(_req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const corte = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()
  const limite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() // máx 7 días atrás

  // Planes con participación aceptada del usuario
  const { data: participaciones } = await admin
    .from('participantes_plan')
    .select('plan_id, planes_publicos!inner(id, hora_llegada, descripcion, locales(nombre, imagenes))')
    .eq('usuario_id', usuario.id)
    .eq('estado', 'aceptada')
    .lte('planes_publicos.hora_llegada', corte)
    .gte('planes_publicos.hora_llegada', limite)

  if (!participaciones || participaciones.length === 0) {
    return NextResponse.json({ pendientes: [] })
  }

  const planIds = participaciones.map(p => p.plan_id)

  // Por cada plan, recuperar los otros participantes y filtrar los que ya valoré
  const { data: companeros } = await admin
    .from('participantes_plan')
    .select('plan_id, usuario_id, usuarios(id, nombre, foto_perfil_url)')
    .in('plan_id', planIds)
    .eq('estado', 'aceptada')
    .neq('usuario_id', usuario.id)

  const { data: yaValoradas } = await admin
    .from('valoraciones_plan')
    .select('plan_id, valorado_id')
    .eq('valorador_id', usuario.id)
    .in('plan_id', planIds)

  const valoradoSet = new Set((yaValoradas ?? []).map(v => `${v.plan_id}:${v.valorado_id}`))

  const pendientes = participaciones.map(p => {
    const plan = p.planes_publicos as unknown as {
      id: string; hora_llegada: string; descripcion: string | null;
      locales: { nombre: string; imagenes: string[] } | null
    }
    const otros = (companeros ?? [])
      .filter(c => c.plan_id === p.plan_id && !valoradoSet.has(`${p.plan_id}:${c.usuario_id}`))
      .map(c => c.usuarios) as unknown as { id: string; nombre: string; foto_perfil_url: string | null }[]
    return { plan, companeros: otros }
  }).filter(x => x.companeros.length > 0)

  return NextResponse.json({ pendientes })
}
