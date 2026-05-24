import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

const SIGNOS = [
  'Aries', 'Tauro', 'Géminis', 'Cáncer', 'Leo', 'Virgo',
  'Libra', 'Escorpio', 'Sagitario', 'Capricornio', 'Acuario', 'Piscis',
] as const

async function verificarAdmin() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return null
  const admin = await createAdminSupabaseClient()
  const { data: row } = await admin
    .from('administradores')
    .select('id, rol, activo')
    .eq('email', user.email)
    .eq('activo', true)
    .maybeSingle()
  return row
}

export async function GET(req: NextRequest) {
  const ad = await verificarAdmin()
  if (!ad) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const signo = url.searchParams.get('signo')

  const admin = await createAdminSupabaseClient()
  let query = admin.from('frases_zodiaco').select('*').order('created_at', { ascending: false })
  if (signo) query = query.eq('signo', signo)
  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ frases: data ?? [] })
}

export async function POST(req: NextRequest) {
  const ad = await verificarAdmin()
  if (!ad) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { signo?: string; frase?: string } | null
  if (!body?.signo || !body?.frase) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  if (!SIGNOS.includes(body.signo as typeof SIGNOS[number])) {
    return NextResponse.json({ error: 'Signo no válido' }, { status: 400 })
  }
  const frase = body.frase.trim()
  if (frase.length < 5 || frase.length > 200) {
    return NextResponse.json({ error: 'La frase debe tener entre 5 y 200 caracteres' }, { status: 400 })
  }

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('frases_zodiaco')
    .insert({ signo: body.signo, frase, activa: true })
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await admin.from('log_auditoria').insert({
    admin_id: ad.id,
    accion: 'crear_frase_zodiaco',
    entidad_tipo: 'frase_zodiaco',
    entidad_id: data.id,
    detalles: { signo: body.signo, frase },
  }).then(() => {}, () => {})

  return NextResponse.json({ frase: data })
}

export async function PATCH(req: NextRequest) {
  const ad = await verificarAdmin()
  if (!ad) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => null) as { id?: string; activa?: boolean; frase?: string } | null
  if (!body?.id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.activa !== undefined) update.activa = !!body.activa
  if (body.frase !== undefined) {
    const f = body.frase.trim()
    if (f.length < 5 || f.length > 200) return NextResponse.json({ error: 'Longitud inválida' }, { status: 400 })
    update.frase = f
  }

  const admin = await createAdminSupabaseClient()
  const { data, error } = await admin
    .from('frases_zodiaco')
    .update(update)
    .eq('id', body.id)
    .select()
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ frase: data })
}

export async function DELETE(req: NextRequest) {
  const ad = await verificarAdmin()
  if (!ad) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const url = new URL(req.url)
  const id = url.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const admin = await createAdminSupabaseClient()
  const { error } = await admin.from('frases_zodiaco').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
