import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

/**
 * Acciones sobre el premio del concurso:
 *  - action=confirmar_ganador: el USUARIO ganador confirma que recibirá/canjearpa el premio
 *  - action=marcar_entregado: el TRABAJADOR del local introduce el código y marca entregado
 *  - action=anotar: el TRABAJADOR añade una nota (problema, retraso, etc.)
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as {
    action?: 'confirmar_ganador' | 'marcar_entregado' | 'anotar'
    concurso_id?: string
    codigo?: string
    nota?: string
  } | null
  if (!body?.action || !body?.concurso_id) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }

  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = await createAdminSupabaseClient()
  const { data: concurso } = await admin
    .from('concursos')
    .select('id, local_id, ganador_participacion_id, premio_codigo, premio_entregado_at, premio_confirmado_at')
    .eq('id', body.concurso_id)
    .maybeSingle()
  if (!concurso) return NextResponse.json({ error: 'Concurso no encontrado' }, { status: 404 })

  if (body.action === 'confirmar_ganador') {
    if (!concurso.ganador_participacion_id) {
      return NextResponse.json({ error: 'Aún no hay ganador asignado' }, { status: 400 })
    }
    // Solo el ganador puede confirmar
    const { data: usuario } = await admin.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
    if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

    const { data: part } = await admin
      .from('participaciones_concurso')
      .select('usuario_id')
      .eq('id', concurso.ganador_participacion_id)
      .maybeSingle()
    if (!part || part.usuario_id !== usuario.id) {
      return NextResponse.json({ error: 'Solo el ganador puede confirmar' }, { status: 403 })
    }

    const { error } = await admin
      .from('concursos')
      .update({ premio_confirmado_at: new Date().toISOString() })
      .eq('id', body.concurso_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'marcar_entregado') {
    // Solo trabajador del local con rol dueno/gestor/operador puede
    const { data: trabajador } = await admin
      .from('usuario_local')
      .select('rol')
      .eq('email', user.email)
      .eq('local_id', concurso.local_id)
      .eq('activo', true)
      .maybeSingle()
    if (!trabajador || !['dueno', 'gestor', 'operador_noche'].includes(trabajador.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    if (!body.codigo || body.codigo.trim().toUpperCase() !== (concurso.premio_codigo || '')) {
      return NextResponse.json({ error: 'Código incorrecto' }, { status: 400 })
    }
    if (concurso.premio_entregado_at) {
      return NextResponse.json({ error: 'Premio ya marcado como entregado' }, { status: 409 })
    }

    const { error } = await admin
      .from('concursos')
      .update({ premio_entregado_at: new Date().toISOString() })
      .eq('id', body.concurso_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'anotar') {
    const { data: trabajador } = await admin
      .from('usuario_local')
      .select('rol')
      .eq('email', user.email)
      .eq('local_id', concurso.local_id)
      .eq('activo', true)
      .maybeSingle()
    if (!trabajador) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    const nota = (body.nota || '').trim().slice(0, 500)
    const { error } = await admin
      .from('concursos')
      .update({ premio_notas: nota || null })
      .eq('id', body.concurso_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
