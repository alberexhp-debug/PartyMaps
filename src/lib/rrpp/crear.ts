import type { SupabaseClient } from '@supabase/supabase-js'
import { passwordPorDefecto, normalizarUsername, esUsernameValido, emailSinteticoRrpp } from '@/lib/equipo'
import { slugify } from '@/lib/rrpp/auth'

const TRIGGERS_DEFECTO = { entrada_vendida: true, escaneada_en_puerta: false, consumo_bar: false }

export type AltaRrppInput = {
  nombre: string
  username: string
  email_contacto?: string | null
  invitadoPorLocalId?: string | null
  invitadoPorAdminId?: string | null
  // Vínculo opcional con un local: crea rrpp_venue ACTIVA con esa comisión.
  localId?: string | null
  comisionPct?: number
  topePorVenta?: number | null
}
export type AltaRrppResult =
  | { ok: true; credenciales: { username: string; password: string }; rrpp: { id: string; slug: string } }
  | { ok: false; status: number; error: string }

/**
 * Da de alta un RRPP con cuenta REAL (igual que un empleado de local): nombre de
 * usuario + email sintético + contraseña por defecto. En el primer acceso
 * cambiará la contraseña y configurará el authenticator. Usar SIEMPRE con un
 * cliente service_role (la identidad/permiso se verifica en el endpoint).
 */
export async function crearRrppDirecto(svc: SupabaseClient, input: AltaRrppInput): Promise<AltaRrppResult> {
  const nombre = (input.nombre || '').trim()
  const username = normalizarUsername(input.username || '')
  if (!nombre) return { ok: false, status: 400, error: 'Pon el nombre del RRPP' }
  if (!esUsernameValido(username)) return { ok: false, status: 400, error: 'Usuario no válido: 3-30 caracteres (letras, números, . _ -)' }

  // ¿Usuario libre? (hay índice único global; comprobamos antes para buen mensaje)
  const { data: existe } = await svc.from('rrpp').select('id').eq('username', username).maybeSingle()
  if (existe) return { ok: false, status: 409, error: 'Ese nombre de usuario ya está cogido' }

  const email = emailSinteticoRrpp(username)
  const password = passwordPorDefecto()
  const { data: created, error: authErr } = await svc.auth.admin.createUser({ email, password, email_confirm: true })
  if (authErr || !created?.user) return { ok: false, status: 409, error: 'Ese nombre de usuario ya está cogido' }
  const authId = created.user.id

  // Perfil de usuario (el RRPP es un usuario de la plataforma).
  const { data: usuario, error: uErr } = await svc.from('usuarios').insert({
    auth_id: authId, nombre, fecha_nacimiento: '2000-01-01',
    telefono_verificado: false, estado_cuenta: 'activa', reputacion_num_valoraciones: 0,
    prefs_notificaciones: {}, auth_provider: 'ninguno',
  }).select('id').single()
  if (uErr || !usuario) {
    await svc.auth.admin.deleteUser(authId)
    return { ok: false, status: 500, error: 'No se pudo crear el perfil' }
  }

  let slug = slugify(nombre) || 'rrpp'
  const { data: slugExiste } = await svc.from('rrpp').select('id').eq('slug', slug).maybeSingle()
  if (slugExiste) slug = `${slug}-${authId.slice(0, 4)}`

  const { data: rrpp, error: rErr } = await svc.from('rrpp').insert({
    usuario_id: usuario.id, slug, nombre_publico: nombre, username,
    email_contacto: (input.email_contacto || '').trim() || null,
    activo: true, estado_alta: 'completo', visible_en_busqueda: true,
    totp_activado: false, debe_cambiar_password: true,
    terminos_aceptados_en: new Date().toISOString(), edad_declarada_18: true,
    invitado_por_local_id: input.invitadoPorLocalId ?? null,
    invitado_por_admin_id: input.invitadoPorAdminId ?? null,
  }).select('id, slug').single()
  if (rErr || !rrpp) {
    // Rollback para no dejar cuenta/usuario huérfanos ni el username cogido.
    await svc.from('usuarios').delete().eq('id', usuario.id)
    await svc.auth.admin.deleteUser(authId)
    if ((rErr as { code?: string } | null)?.code === '23505') return { ok: false, status: 409, error: 'Ese nombre de usuario ya está cogido' }
    return { ok: false, status: 500, error: '¿Está aplicada la migración 037? ' + (rErr?.message ?? '') }
  }

  // Vínculo con el local (alta de confianza del venue/gestor): activa directa.
  if (input.localId) {
    await svc.from('rrpp_venue').insert({
      rrpp_id: rrpp.id, local_id: input.localId, estado: 'activa', iniciado_por: 'venue',
      comision_pct: input.comisionPct ?? 0, tope_por_venta: input.topePorVenta ?? null, triggers_activos: TRIGGERS_DEFECTO,
    })
  }

  return { ok: true, credenciales: { username, password }, rrpp }
}
