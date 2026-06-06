import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { registrarConsentimiento } from '@/lib/consentimiento'

/**
 * GET  /api/perfil/consentimientos — locales sobre los que el usuario ha
 *      decidido algo, con su estado vigente (para "Locales que me pueden
 *      contactar" del perfil).
 * POST { local_id, acepta } — el usuario activa/retira el consentimiento de un
 *      local (origen perfil_usuario). Append-only.
 */
export async function GET() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const svc = createServiceRoleClient()
  const { data: usuario } = await svc.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ locales: [] })

  const { data: rows } = await svc.from('consentimientos_marketing')
    .select('local_id, estado, created_at')
    .eq('usuario_id', usuario.id)
    .order('created_at', { ascending: false })

  // Dedup por local: la primera (más reciente) es la vigente.
  const vigentePorLocal = new Map<string, boolean>()
  for (const r of rows ?? []) if (!vigentePorLocal.has(r.local_id)) vigentePorLocal.set(r.local_id, r.estado === 'acepta')
  const ids = [...vigentePorLocal.keys()]
  if (!ids.length) return NextResponse.json({ locales: [] })

  const { data: locales } = await svc.from('locales').select('id, nombre').in('id', ids)
  const out = (locales ?? []).map(l => ({ id: l.id as string, nombre: l.nombre as string, acepta: vigentePorLocal.get(l.id) ?? false }))
  out.sort((a, b) => a.nombre.localeCompare(b.nombre))
  return NextResponse.json({ locales: out })
}

export async function POST(req: NextRequest) {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const { local_id, acepta } = await req.json().catch(() => ({})) as { local_id?: string; acepta?: boolean }
  if (!local_id || typeof acepta !== 'boolean') return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 })

  const svc = createServiceRoleClient()
  const { data: usuario } = await svc.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  await registrarConsentimiento(svc, { usuario_id: usuario.id, local_id, estado: acepta ? 'acepta' : 'retira', origen: 'perfil_usuario' })
  return NextResponse.json({ ok: true })
}
