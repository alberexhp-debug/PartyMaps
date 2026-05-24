import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

async function verificarAdmin() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const admin = await createAdminSupabaseClient()
  const { data } = await admin.from('administradores').select('id, rol').eq('email', user.email).eq('activo', true).maybeSingle()
  return data
}

/**
 * GET /api/admin/votos-sospechosos
 * Lista concursos activos con sus participaciones bandereadas por la función
 * detectar_votos_sospechosos. Solo accesible por admins.
 */
export async function GET(_req: NextRequest) {
  const ad = await verificarAdmin()
  if (!ad) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()

  // Concursos con votos en las últimas 72h
  const { data: concursos } = await admin
    .from('concursos')
    .select('id, descripcion, premio, estado, locales(id, nombre)')
    .eq('estado', 'activo')
    .gte('created_at', new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString())
    .limit(50)

  if (!concursos || concursos.length === 0) {
    return NextResponse.json({ concursos: [] })
  }

  const resultado = []
  for (const c of concursos) {
    const { data: flags } = await admin.rpc('detectar_votos_sospechosos', { p_concurso_id: c.id })
    const sospechosas = (flags ?? []).filter((f: { flag_sospechoso: boolean }) => f.flag_sospechoso)
    if (sospechosas.length === 0) continue

    // Enriquecer con datos de la participación + nombre del usuario
    const partIds = sospechosas.map((s: { participacion_id: string }) => s.participacion_id)
    const { data: parts } = await admin
      .from('participaciones_concurso')
      .select('id, contenido_url, votos, usuarios(nombre, foto_perfil_url)')
      .in('id', partIds)

    resultado.push({
      concurso: c,
      flags: sospechosas.map((s: { participacion_id: string; total_votos: number; ips_unicas: number; porcentaje_ips_unicas: number; porcentaje_cuentas_nuevas: number; max_votos_por_ip: number; motivos: string[] }) => ({
        ...s,
        participacion: parts?.find(p => p.id === s.participacion_id),
      })),
    })
  }

  return NextResponse.json({ concursos: resultado })
}
