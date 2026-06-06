// Verifica la lógica de reset de RRPP (contraseña + authenticator) contra
// Supabase real, replicando lo que hacen resetPasswordRrpp/resetTotpRrpp.
// Crea un RRPP de prueba y lo limpia al final.
import { createClient } from '@supabase/supabase-js'
import { generateSecret } from 'otplib'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
const ok = m => console.log('  ✅', m), bad = m => console.log('  ❌', m)

const rnd = Date.now().toString().slice(-6)
const username = `rstchk${rnd}`
const email = `${username}@rrpp.rumbomap.com`
const oldPass = `Old${rnd}!aa`, newPass = `New${rnd}!bb`
let authId = null, usuarioId = null, rrppId = null

try {
  // Setup: RRPP con cuenta + TOTP activo
  const { data: created, error: e0 } = await svc.auth.admin.createUser({ email, password: oldPass, email_confirm: true })
  if (e0) { bad('createUser ' + e0.message); throw new Error('setup') }
  authId = created.user.id
  const { data: u } = await svc.from('usuarios').insert({ auth_id: authId, nombre: 'Reset Check', fecha_nacimiento: '2000-01-01', telefono_verificado: false, estado_cuenta: 'activa', reputacion_num_valoraciones: 0, prefs_notificaciones: {}, auth_provider: 'ninguno' }).select('id').single()
  usuarioId = u.id
  const { data: rr, error: er } = await svc.from('rrpp').insert({ usuario_id: usuarioId, slug: `reset-${rnd}`, nombre_publico: 'Reset Check', username, activo: true, estado_alta: 'completo', visible_en_busqueda: true, totp_activado: true, debe_cambiar_password: false, terminos_aceptados_en: new Date().toISOString(), edad_declarada_18: true }).select('id').single()
  if (er) { bad('insert rrpp ' + er.message); throw new Error('setup') }
  rrppId = rr.id
  await svc.from('rrpp_totp').insert({ rrpp_id: rrppId, secret: generateSecret() })
  ok('RRPP de prueba creado (con TOTP activo)')

  // 1) Reset de contraseña
  console.log('\n1) Reset de contraseña')
  await svc.auth.admin.updateUserById(authId, { password: newPass })
  await svc.from('rrpp').update({ debe_cambiar_password: true }).eq('id', rrppId)
  const { error: eNew } = await anon.auth.signInWithPassword({ email, password: newPass })
  eNew ? bad('la nueva contraseña NO entra: ' + eNew.message) : ok('la nueva contraseña entra')
  await anon.auth.signOut()
  const { error: eOld } = await anon.auth.signInWithPassword({ email, password: oldPass })
  eOld ? ok('la contraseña antigua ya no entra') : bad('la contraseña antigua TODAVÍA entra')
  await anon.auth.signOut()
  const { data: flag } = await svc.from('rrpp').select('debe_cambiar_password').eq('id', rrppId).single()
  flag?.debe_cambiar_password ? ok('debe_cambiar_password = true (pedirá nueva al entrar)') : bad('debe_cambiar_password no se marcó')

  // 2) Reset de authenticator
  console.log('\n2) Reset de authenticator')
  await svc.from('rrpp_totp').delete().eq('rrpp_id', rrppId)
  await svc.from('rrpp').update({ totp_activado: false }).eq('id', rrppId)
  const { data: secretoRows } = await svc.from('rrpp_totp').select('rrpp_id').eq('rrpp_id', rrppId)
  ;(secretoRows?.length ?? 0) === 0 ? ok('secreto del authenticator borrado') : bad('el secreto sigue ahí')
  const { data: tflag } = await svc.from('rrpp').select('totp_activado').eq('id', rrppId).single()
  tflag?.totp_activado === false ? ok('totp_activado = false (reconfigurará en el próximo acceso)') : bad('totp_activado no se bajó')
} catch (e) { console.log('ERROR:', e.message) }
finally {
  console.log('\n3) Limpieza')
  if (rrppId) await svc.from('rrpp').delete().eq('id', rrppId)
  if (usuarioId) await svc.from('usuarios').delete().eq('id', usuarioId)
  if (authId) await svc.auth.admin.deleteUser(authId)
  console.log('  ok')
}
