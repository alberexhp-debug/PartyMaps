import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminSupabaseClient } from '@/lib/supabase/server'

const ESTILOS_VALIDOS = ['holo', 'aurora', 'oro', 'noche', 'rosa'] as const
type Estilo = typeof ESTILOS_VALIDOS[number]

export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  let body: { frase?: string; estilo?: string; publica?: boolean; apodo?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON inválido' }, { status: 400 }) }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.frase !== undefined) {
    const f = body.frase.trim()
    if (f.length > 140) return NextResponse.json({ error: 'La frase no puede superar 140 caracteres' }, { status: 400 })
    update.carta_frase = f || null
  }
  if (body.estilo !== undefined) {
    if (!ESTILOS_VALIDOS.includes(body.estilo as Estilo)) {
      return NextResponse.json({ error: 'Estilo no válido' }, { status: 400 })
    }
    update.carta_estilo = body.estilo
  }
  if (body.publica !== undefined) update.carta_publica = !!body.publica
  if (body.apodo !== undefined) {
    const a = body.apodo.trim()
    if (a.length > 30) return NextResponse.json({ error: 'El apodo no puede superar 30 caracteres' }, { status: 400 })
    update.carta_apodo = a || null
  }

  const admin = await createAdminSupabaseClient()
  const { data: usuario, error } = await admin
    .from('usuarios')
    .update(update)
    .eq('auth_id', user.id)
    .select('carta_frase, carta_estilo, carta_publica, carta_slug, carta_apodo')
    .single()

  if (error) {
    console.error('[carta] update', error)
    return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  }

  return NextResponse.json({ carta: usuario })
}
