import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

// POST /api/sugerencias
// Body: { local_id: UUID, contenido: string }
// Crea una sugerencia anónima al local. Requiere sesión.
// Rate limit: máximo 3 sugerencias al mismo local por usuario en 24h.
export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const localId = body.local_id?.toString()
  const contenido = body.contenido?.toString().trim()

  if (!localId || !contenido) {
    return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })
  }
  if (contenido.length < 5 || contenido.length > 500) {
    return NextResponse.json({ error: 'La sugerencia debe tener entre 5 y 500 caracteres' }, { status: 400 })
  }

  // Resolver usuarios.id a partir de auth.uid
  const admin = await createAdminSupabaseClient()
  const { data: usuario } = await admin
    .from('usuarios')
    .select('id, estado_cuenta')
    .eq('auth_id', user.id)
    .maybeSingle()

  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })
  if (usuario.estado_cuenta !== 'activa') {
    return NextResponse.json({ error: 'Cuenta no activa' }, { status: 403 })
  }

  // Rate limit: max 3 sugerencias al mismo local en 24h
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count } = await admin
    .from('sugerencias')
    .select('id', { count: 'exact', head: true })
    .match({ usuario_id: usuario.id, local_id: localId })
    .gte('created_at', hace24h)

  if ((count || 0) >= 3) {
    return NextResponse.json({
      error: 'Has enviado demasiadas sugerencias a este local. Inténtalo más tarde.',
    }, { status: 429 })
  }

  const { data: sugerencia, error } = await admin
    .from('sugerencias')
    .insert({
      usuario_id: usuario.id,
      local_id: localId,
      contenido,
      estado: 'nueva',
    })
    .select('id, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: 'Error al guardar la sugerencia' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, sugerencia })
}
