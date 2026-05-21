import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

// POST: registra una suscripción Web Push del usuario actual.
// DELETE: elimina una suscripción por endpoint del usuario actual.

async function getUsuarioId(req: NextRequest): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('usuarios')
    .select('id')
    .eq('auth_id', user.id)
    .maybeSingle()
  return data?.id ?? null
}

export async function POST(req: NextRequest) {
  const usuarioId = await getUsuarioId(req)
  if (!usuarioId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const endpoint: string | undefined = body?.subscription?.endpoint
  const p256dh: string | undefined = body?.subscription?.keys?.p256dh
  const auth: string | undefined = body?.subscription?.keys?.auth
  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Suscripción inválida' }, { status: 400 })
  }

  const userAgent = req.headers.get('user-agent') ?? null

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .upsert({
      usuario_id: usuarioId,
      endpoint, p256dh, auth,
      user_agent: userAgent,
      last_used_at: new Date().toISOString(),
    }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const usuarioId = await getUsuarioId(req)
  if (!usuarioId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'Falta endpoint' }, { status: 400 })

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('usuario_id', usuarioId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
