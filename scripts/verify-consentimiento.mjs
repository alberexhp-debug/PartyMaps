// Verifica el consentimiento de marketing (PR-1) contra Supabase real:
// append-only, vigente = última fila, resolución por teléfono. Limpia al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = m => console.log('  ✅', m), bad = m => console.log('  ❌', m)

const rnd = Date.now().toString().slice(-6)
const email = `conschk${rnd}@example.com`, tel = '+34699' + rnd, telNuevo = '+34688' + rnd
let authId = null, usuarioId = null, localId = null, contactoId = null
const vigente = async (col, id) => (await svc.from('consentimientos_marketing').select('estado').eq(col, id).eq('local_id', localId).order('created_at', { ascending: false }).limit(1).maybeSingle()).data?.estado

try {
  const { data: created, error: e0 } = await svc.auth.admin.createUser({ email, password: 'Cons1234!', email_confirm: true })
  if (e0) { bad('createUser ' + e0.message); throw new Error('setup') }
  authId = created.user.id
  const { data: u } = await svc.from('usuarios').insert({ auth_id: authId, nombre: 'Cons Check', fecha_nacimiento: '2000-01-01', telefono: tel, telefono_verificado: false, estado_cuenta: 'activa', reputacion_num_valoraciones: 0, prefs_notificaciones: {}, auth_provider: 'ninguno' }).select('id').single()
  usuarioId = u.id
  const { data: loc, error: el } = await svc.from('locales').insert({ nombre: `Cons Local ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 3', latitud: 40.42, longitud: -3.70, aforo_maximo: 100, musica: [], imagenes: [], modulos_activos: [], consumiciones_bienvenida: [], estado: 'pendiente_verificacion', tier: 'basico', radio_verificacion_metros: 150, horario: {}, num_suscriptores: 0, notificaciones_semana_count: 0 }).select('id').single()
  if (el) { bad('insert local ' + el.message); throw new Error('setup') }
  localId = loc.id
  ok('setup: usuario + local')

  // 1) Aceptar (checkout) → vigente acepta
  console.log('\n1) Histórico append-only + vigente')
  await svc.from('consentimientos_marketing').insert({ usuario_id: usuarioId, local_id: localId, estado: 'acepta', origen: 'checkout_entrada' })
  ;(await vigente('usuario_id', usuarioId)) === 'acepta' ? ok('tras aceptar en checkout → vigente = acepta') : bad('vigente != acepta')

  // 2) Retirar (perfil) → vigente retira, pero la fila de aceptación NO se borra
  await svc.from('consentimientos_marketing').insert({ usuario_id: usuarioId, local_id: localId, estado: 'retira', origen: 'perfil_usuario' })
  ;(await vigente('usuario_id', usuarioId)) === 'retira' ? ok('tras retirar en perfil → vigente = retira') : bad('vigente != retira')
  const { count } = await svc.from('consentimientos_marketing').select('id', { count: 'exact', head: true }).eq('usuario_id', usuarioId).eq('local_id', localId)
  count === 2 ? ok('append-only: 2 filas (nada se borra — prueba AEPD)') : bad('esperaba 2 filas, hay ' + count)

  // 3) Resolución por teléfono (taquilla): usuario existente
  console.log('\n2) Resolución por teléfono (taquilla)')
  const { data: byTel } = await svc.from('usuarios').select('id').eq('telefono', tel).maybeSingle()
  byTel?.id === usuarioId ? ok('teléfono de usuario registrado → se ata a su usuario') : bad('no resolvió el usuario por teléfono')

  // 4) Teléfono nuevo → contacto (lead) + consentimiento por contacto
  const { data: c, error: ec } = await svc.from('contactos').insert({ telefono: telNuevo, nombre: 'Lead Taquilla', primer_local_id: localId, fuente_origen: 'desconocido', primer_contacto_en: new Date().toISOString(), ultimo_contacto_en: new Date().toISOString() }).select('id').single()
  if (ec) { bad('crear contacto ' + ec.message) } else {
    contactoId = c.id; ok('teléfono nuevo → crea contacto (lead)')
    await svc.from('consentimientos_marketing').insert({ contacto_id: contactoId, local_id: localId, estado: 'acepta', origen: 'taquilla' })
    ;(await vigente('contacto_id', contactoId)) === 'acepta' ? ok('consentimiento de taquilla guardado por contacto') : bad('no guardó consentimiento por contacto')
  }
} catch (e) { console.log('ERROR:', e.message) }
finally {
  console.log('\n3) Limpieza')
  if (localId) await svc.from('locales').delete().eq('id', localId) // cascada: consentimientos por local
  if (contactoId) await svc.from('contactos').delete().eq('id', contactoId)
  if (usuarioId) await svc.from('usuarios').delete().eq('id', usuarioId)
  if (authId) await svc.auth.admin.deleteUser(authId)
  console.log('  ok')
}
