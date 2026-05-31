import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import { previsualizarRrppEntrada, parseCookieRef } from '@/lib/rrpp/atribucion'

/**
 * GET /api/rrpp/atribucion-activa?local_id=
 * Sólo lectura. Devuelve el RRPP al que se atribuiría la compra en ese local
 * (cookie de referido o código de registro, last-touch 24h), para mostrar
 * "estás comprando con X" en el checkout. { rrpp: null } si no hay.
 */
export async function GET(req: NextRequest) {
  const localId = new URL(req.url).searchParams.get('local_id') || ''
  if (!localId) return NextResponse.json({ rrpp: null })

  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ rrpp: null })

  const admin = createServiceRoleClient()
  const { data: usuario } = await admin.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ rrpp: null })

  const cookieRef = parseCookieRef(req.cookies.get('rumbo_ref')?.value)
  const rrppId = await previsualizarRrppEntrada(admin, usuario.id, localId, cookieRef)
  if (!rrppId) return NextResponse.json({ rrpp: null })

  const { data: rrpp } = await admin
    .from('rrpp').select('slug, nombre_publico, foto_url').eq('id', rrppId).maybeSingle()
  return NextResponse.json({ rrpp: rrpp ?? null })
}
