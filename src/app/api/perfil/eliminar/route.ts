import { NextResponse } from 'next/server'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'

/**
 * POST /api/perfil/eliminar
 * Derecho de supresión (RGPD): anonimiza los datos personales del usuario y
 * marca la cuenta como eliminada. Conservamos los registros históricos (ya sin
 * PII) para no romper integridad referencial ni la analítica agregada.
 */
export async function POST() {
  const supa = await createServerSupabaseClient()
  const { data: { user } } = await supa.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const db = createServiceRoleClient()
  const { data: usuario } = await db.from('usuarios').select('id').eq('auth_id', user.id).maybeSingle()
  if (!usuario) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 404 })

  const uid = usuario.id

  // 1. Anonimizar el perfil y marcarlo como eliminado.
  await db.from('usuarios').update({
    nombre: 'Usuario eliminado',
    foto_perfil_url: null,
    telefono: null,
    estado_cuenta: 'eliminada',
    prefs_notificaciones: {},
  }).eq('id', uid)

  // 2. Borrar datos personales asociados que no aportan valor histórico.
  await db.from('push_subscriptions').delete().eq('usuario_id', uid).then(() => {}, () => {})
  // CRM: quitar email/teléfono del contacto vinculado (si existe).
  await db.from('contactos').update({ email: null, telefono: null, nombre: null }).eq('user_id', uid).then(() => {}, () => {})

  // 3. Cortar la sesión del lado servidor (el cliente también hará signOut).
  await supa.auth.signOut().catch(() => {})

  return NextResponse.json({ ok: true })
}
