#!/usr/bin/env node
// Verifica la migración 035 y el flujo de "alta real de equipo" contra Supabase
// real: schema, alta (auth + ficha), login del trabajador, unicidad de usuario,
// protección del secreto TOTP (solo service_role), TOTP round-trip y chat.
// Crea un trabajador de prueba y lo borra al final (try/finally).
import { createClient } from '@supabase/supabase-js'
import { generateSecret, generateSync, verifySync } from 'otplib'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]
  })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY
if (!URL_SB || !ANON || !SERVICE) { console.error('Faltan vars en .env.local'); process.exit(1) }

let passed = 0, failed = 0
const fail = (msg, extra) => { failed++; console.log('  ❌', msg, extra ?? '') }
const ok = (msg) => { passed++; console.log('  ✅', msg) }

const admin = createClient(URL_SB, SERVICE, { auth: { persistSession: false } })
const worker = createClient(URL_SB, ANON, { auth: { persistSession: false } }) // hará signIn

const rnd = Math.random().toString(36).slice(2, 8)
const username = `vtest${rnd}`
const email = `${username}@trabajadores.rumbomap.com`
const emailDup = `${username}dup@trabajadores.rumbomap.com`
const password = `Rumbo${Math.floor(1000 + Math.random() * 9000)}!`

let authUserId = null, filaId = null, localId = null

try {
  // 1. Schema 035 ----------------------------------------------------------
  console.log('\n1. Schema migración 035')
  {
    const cols = 'username,email_contacto,telefono,dni,fecha_nacimiento,fecha_alta,auth_id,totp_activado,debe_cambiar_password'
    const { error } = await admin.from('usuario_local').select(cols).limit(1)
    error ? fail('columnas nuevas en usuario_local', error.message) : ok('usuario_local tiene las columnas nuevas')
    for (const t of ['trabajador_totp', 'mensajes_trabajador']) {
      const { error: e } = await admin.from(t).select('*').limit(1) // select real (head:true da falsos positivos)
      e ? fail(`tabla "${t}"`, e.message) : ok(`tabla "${t}" existe`)
    }
  }

  // 2. Local de pruebas ----------------------------------------------------
  console.log('\n2. Local de pruebas')
  {
    let { data: l } = await admin.from('locales').select('id, nombre').ilike('nombre', '%Club Test%').limit(1).maybeSingle()
    if (!l) { const r = await admin.from('locales').select('id, nombre').limit(1).maybeSingle(); l = r.data }
    if (!l) { fail('no hay ningún local en la BD'); throw new Error('sin local') }
    localId = l.id; ok(`usando local "${l.nombre}"`)
  }

  // 3. Alta del trabajador (como el endpoint) ------------------------------
  console.log('\n3. Alta: cuenta Auth + ficha')
  {
    const { data: created, error: e1 } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (e1 || !created?.user) { fail('createUser', e1?.message); throw new Error('createUser') }
    authUserId = created.user.id; ok('cuenta Auth creada (email sintético)')

    const { data: fila, error: e2 } = await admin.from('usuario_local').insert({
      usuario_id: null, local_id: localId, rol: 'puerta', email, nombre: 'Trabajador Verify',
      username, email_contacto: 'contacto@example.com', telefono: '600000000', dni: '00000000A',
      fecha_nacimiento: '2000-01-01', fecha_alta: new Date().toISOString().slice(0, 10),
      auth_id: authUserId, activo: true, totp_activado: false, debe_cambiar_password: true,
    }).select('*').single()
    if (e2) { fail('insert usuario_local', e2.message); throw new Error('insert') }
    filaId = fila.id
    ok('ficha creada con username + auth_id + debe_cambiar_password')
  }

  // 4. Unicidad global de username ----------------------------------------
  console.log('\n4. Username único global')
  {
    const { data: dup, error } = await admin.from('usuario_local').insert({
      usuario_id: null, local_id: localId, rol: 'puerta', email: emailDup, nombre: 'Dup', username,
    }).select('id').maybeSingle()
    if (error && error.code === '23505') ok('rechaza username duplicado (23505)')
    else { fail('NO rechazó username duplicado', error?.message); if (dup?.id) await admin.from('usuario_local').delete().eq('id', dup.id) }
  }

  // 5. Login del trabajador (lo que antes no podía) ------------------------
  console.log('\n5. Login con email sintético + contraseña')
  {
    const { data, error } = await worker.auth.signInWithPassword({ email, password })
    if (error || !data?.user) fail('signInWithPassword', error?.message)
    else if (data.user.email === email) ok('el trabajador inicia sesión correctamente')
    else fail('email de sesión inesperado', data.user.email)
  }

  // 6. Secreto TOTP protegido (solo service_role) --------------------------
  console.log('\n6. Protección del secreto del authenticator')
  {
    const secret = generateSecret()
    const { error: eIns } = await admin.from('trabajador_totp').insert({ usuario_local_id: filaId, secret })
    eIns ? fail('insert secreto (service_role)', eIns.message) : ok('service_role guarda el secreto')

    // El propio trabajador (autenticado) NO debe poder leer el secreto.
    const { data: leido } = await worker.from('trabajador_totp').select('secret').eq('usuario_local_id', filaId)
    if (!leido || leido.length === 0) ok('el trabajador NO puede leer su secreto vía PostgREST (RLS)')
    else fail('FUGA: el trabajador leyó el secreto', JSON.stringify(leido))

    // TOTP round-trip con el secreto.
    const token = generateSync({ secret })
    const res = verifySync({ secret, token, strategy: 'totp', epochTolerance: 30 })
    res?.valid ? ok('TOTP round-trip válido (generate→verify)') : fail('TOTP round-trip inválido')
  }

  // 7. Chat dueño↔trabajador (RLS de lectura del trabajador) ---------------
  console.log('\n7. Chat: el trabajador ve su hilo')
  {
    const { error: eMsg } = await admin.from('mensajes_trabajador')
      .insert({ local_id: localId, trabajador_id: filaId, emisor: 'local', mensaje: 'Hola desde verify' })
    eMsg ? fail('insert mensaje (service_role)', eMsg.message) : ok('service_role inserta mensaje del local')

    const { data: hilo } = await worker.from('mensajes_trabajador').select('id, emisor, mensaje').eq('trabajador_id', filaId)
    if (hilo && hilo.length >= 1) ok(`el trabajador lee su hilo (${hilo.length} msg)`)
    else fail('el trabajador NO pudo leer su hilo', JSON.stringify(hilo))
  }

  // 8. Activar 2FA ---------------------------------------------------------
  console.log('\n8. Activación de 2FA')
  {
    const { error } = await admin.from('usuario_local').update({ totp_activado: true }).eq('id', filaId)
    error ? fail('update totp_activado', error.message) : ok('totp_activado se marca true')
  }
} catch (e) {
  console.log('\n⚠️  Abortado:', e.message)
} finally {
  // Limpieza -------------------------------------------------------------
  console.log('\n9. Limpieza')
  await worker.auth.signOut().catch(() => {})
  if (filaId) { const { error } = await admin.from('usuario_local').delete().eq('id', filaId); error ? fail('borrar ficha', error.message) : ok('ficha borrada (cascada: totp + mensajes)') }
  if (authUserId) { const { error } = await admin.auth.admin.deleteUser(authUserId); error ? fail('borrar cuenta Auth', error.message) : ok('cuenta Auth borrada') }
  // Por si quedó algún row de pruebas de ejecuciones previas
  try { await admin.from('usuario_local').delete().like('username', 'vtest%') } catch {}

  console.log(`\n${failed === 0 ? '🟢' : '🔴'} Resultado: ${passed} OK · ${failed} fallos`)
  process.exit(failed === 0 ? 0 : 1)
}
