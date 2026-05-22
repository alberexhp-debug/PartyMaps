#!/usr/bin/env node
// Tests funcionales por perfil — corre contra http://localhost:3006
// Usa la anon key (como cualquier cliente) y service_role solo si se necesita verificación admin.
import { createClient } from '@supabase/supabase-js'
import { generateSync as generateOtp } from 'otplib'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('=')
    return [l.slice(0, i), l.slice(i + 1)]
  })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const TOTP_SECRET = env.ADMIN_TOTP_SECRET
const APP_BASE = process.env.APP_BASE || 'http://localhost:3006'

let passed = 0, failed = 0
const fail = (...a) => { failed++; console.log('  ❌', ...a) }
const ok   = (...a) => { passed++; console.log('  ✅', ...a) }

const newClient = () => createClient(URL_SB, ANON, { auth: { autoRefreshToken: false, persistSession: false } })

async function probarAdmin({ email, password, rolEsperado }) {
  console.log(`\n--- ADMIN ${email} (${rolEsperado}) ---`)
  const cli = newClient()
  const { error: err } = await cli.auth.signInWithPassword({ email, password })
  if (err) return fail(`signIn: ${err.message}`)
  ok('Login email/password OK')

  const { data: a } = await cli.from('administradores').select('*').eq('email', email).single()
  if (!a) return fail('No aparece en administradores')
  if (a.rol !== rolEsperado) fail(`Rol esperado ${rolEsperado}, real ${a.rol}`)
  else ok(`Rol correcto: ${a.rol}`)
  if (!a.activo) fail('Cuenta marcada como no activa')
  else ok('Cuenta activa')
  if (!a.totp_activado) fail('TOTP no activado')
  else ok('TOTP activado')

  const totp = generateOtp({ secret: TOTP_SECRET, strategy: 'totp' })
  const res = await fetch(`${APP_BASE}/api/admin/verificar-totp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ totp, adminId: a.id }),
  })
  const j = await res.json().catch(() => null)
  if (!res.ok || !j?.valid) fail(`TOTP rechazado (${res.status}): ${JSON.stringify(j)}`)
  else ok('TOTP válido (endpoint /api/admin/verificar-totp)')

  // El endpoint /api/admin/auditoria requiere sesión SSR por cookie:
  // no se prueba desde este script (lo hace el navegador real).

  await cli.auth.signOut()
}

async function probarTrabajador({ email, password, localEsperado, rolEsperado }) {
  console.log(`\n--- LOCAL ${email} (${rolEsperado} en ${localEsperado}) ---`)
  const cli = newClient()
  const { error: err } = await cli.auth.signInWithPassword({ email, password })
  if (err) return fail(`signIn: ${err.message}`)
  ok('Login email/password OK')

  const { data: trab, error: tErr } = await cli
    .from('usuario_local')
    .select('*, locales!inner(*)')
    .eq('email', email)
    .eq('activo', true)
    .single()
  if (tErr || !trab) return fail(`No accede a usuario_local: ${tErr?.message}`)
  ok('Lookup usuario_local OK')
  if (trab.rol !== rolEsperado) fail(`Rol esperado ${rolEsperado}, real ${trab.rol}`)
  else ok(`Rol correcto: ${trab.rol}`)
  if (trab.locales.nombre !== localEsperado) fail(`Local esperado ${localEsperado}, real ${trab.locales.nombre}`)
  else ok(`Local correcto: ${trab.locales.nombre}`)

  const { data: eventos, error: eErr } = await cli
    .from('eventos')
    .select('id, nombre, estado')
    .eq('local_id', trab.local_id)
  if (eErr) fail(`eventos read: ${eErr.message}`)
  else ok(`Lee ${eventos.length} evento(s) del local`)

  const intento = await cli.from('locales')
    .update({ descripcion: trab.locales.descripcion })
    .eq('id', trab.local_id)
    .select('id')
  const puedeEditar = ['dueno', 'gestor'].includes(trab.rol)
  if (puedeEditar && intento.error) fail(`${trab.rol} debería poder editar local: ${intento.error.message}`)
  else if (puedeEditar && intento.data?.length) ok(`${trab.rol} puede editar local (esperado)`)
  else if (!puedeEditar && (!intento.data || intento.data.length === 0)) ok(`${trab.rol} no puede editar local (esperado)`)
  else if (!puedeEditar && intento.data?.length) fail(`${trab.rol} NO debería poder editar local pero lo hizo`)

  await cli.auth.signOut()
}

async function probarUsuarioPWA({ telefono, password, nombreEsperado }) {
  console.log(`\n--- PWA ${telefono} (${nombreEsperado}) ---`)
  const cli = newClient()
  const { data: auth, error: err } = await cli.auth.signInWithPassword({ phone: telefono, password })
  if (err) return fail(`signIn: ${err.message}`)
  ok('Login phone/password OK')

  const authId = auth.user?.id
  if (!authId) return fail('Sin auth.user tras login')

  const { data: u, error: uErr } = await cli.from('usuarios').select('*').eq('auth_id', authId).single()
  if (uErr || !u) return fail(`Sin perfil en usuarios: ${uErr?.message}`)
  ok(`Perfil cargado: ${u.nombre}`)
  if (u.nombre !== nombreEsperado) fail(`Nombre esperado ${nombreEsperado}, real ${u.nombre}`)

  const { data: locales, error: lErr } = await cli
    .from('locales').select('id, nombre, estado').eq('estado', 'activo')
  if (lErr) fail(`locales read: ${lErr.message}`)
  else if (!locales?.length) fail('No ve ningún local activo')
  else ok(`Ve ${locales.length} locales activos en mapa`)

  const { data: eventos } = await cli.from('eventos').select('id').eq('estado', 'publicado')
  if (eventos?.length > 0) ok(`Ve ${eventos.length} eventos publicados`)
  else fail('No ve eventos publicados')

  if (locales?.length) {
    const localId = locales[0].id
    const { error: sErr } = await cli.from('suscripciones').upsert({
      usuario_id: u.id, local_id: localId,
    }, { onConflict: 'usuario_id,local_id' })
    if (sErr) fail(`suscribirse: ${sErr.message}`)
    else ok('Suscripción a local OK')
    await cli.from('suscripciones').delete().eq('usuario_id', u.id).eq('local_id', localId)
  }

  const { data: otros } = await cli.from('usuarios').select('id').neq('id', u.id)
  if (!otros || otros.length === 0) ok('RLS bloquea ver otros usuarios')
  else fail(`Ve ${otros.length} usuarios ajenos (RLS rota)`)

  await cli.auth.signOut()
}

console.log('\n════════════ TESTS PERFILES PARTYMAPS ════════════')

for (const a of [
  { email: 'superadmin@partymaps.com', password: 'PM_SuperAdmin2025!', rolEsperado: 'super_admin' },
  { email: 'admin@partymaps.com',      password: 'PM_Admin2025!',      rolEsperado: 'admin' },
  { email: 'soporte@partymaps.com',    password: 'PM_Soporte2025!',    rolEsperado: 'soporte' },
]) await probarAdmin(a)

const trabajadores = [
  { email: 'dueno@testlocal.com',     password: 'PM_Dueno2025!',    rolEsperado: 'dueno',          localEsperado: 'Club Test PartyMaps' },
  { email: 'gestor@testlocal.com',    password: 'PM_Gestor2025!',   rolEsperado: 'gestor',         localEsperado: 'Club Test PartyMaps' },
  { email: 'operador@testlocal.com',  password: 'PM_Operador2025!', rolEsperado: 'operador_noche',localEsperado: 'Club Test PartyMaps' },
  { email: 'puerta@testlocal.com',    password: 'PM_Puerta2025!',   rolEsperado: 'puerta',         localEsperado: 'Club Test PartyMaps' },
  { email: 'dueno.kapital@partymaps.com',    password: 'PM_Dueno_kapital_2025!',    rolEsperado: 'dueno',          localEsperado: 'Kapital' },
  { email: 'gestor.kapital@partymaps.com',   password: 'PM_Gestor_kapital_2025!',   rolEsperado: 'gestor',         localEsperado: 'Kapital' },
  { email: 'operador.kapital@partymaps.com', password: 'PM_Operador_kapital_2025!', rolEsperado: 'operador_noche',localEsperado: 'Kapital' },
  { email: 'puerta.kapital@partymaps.com',   password: 'PM_Puerta_kapital_2025!',   rolEsperado: 'puerta',         localEsperado: 'Kapital' },
  { email: 'dueno.teatro-barcelo@partymaps.com',    password: 'PM_Dueno_teatrobarcelo_2025!',    rolEsperado: 'dueno',          localEsperado: 'Teatro Barceló' },
  { email: 'gestor.teatro-barcelo@partymaps.com',   password: 'PM_Gestor_teatrobarcelo_2025!',   rolEsperado: 'gestor',         localEsperado: 'Teatro Barceló' },
  { email: 'operador.teatro-barcelo@partymaps.com', password: 'PM_Operador_teatrobarcelo_2025!', rolEsperado: 'operador_noche',localEsperado: 'Teatro Barceló' },
  { email: 'puerta.teatro-barcelo@partymaps.com',   password: 'PM_Puerta_teatrobarcelo_2025!',   rolEsperado: 'puerta',         localEsperado: 'Teatro Barceló' },
  { email: 'dueno.mondo-disko@partymaps.com',    password: 'PM_Dueno_mondodisko_2025!',    rolEsperado: 'dueno',          localEsperado: 'Mondo Disko' },
  { email: 'gestor.mondo-disko@partymaps.com',   password: 'PM_Gestor_mondodisko_2025!',   rolEsperado: 'gestor',         localEsperado: 'Mondo Disko' },
  { email: 'operador.mondo-disko@partymaps.com', password: 'PM_Operador_mondodisko_2025!', rolEsperado: 'operador_noche',localEsperado: 'Mondo Disko' },
  { email: 'puerta.mondo-disko@partymaps.com',   password: 'PM_Puerta_mondodisko_2025!',   rolEsperado: 'puerta',         localEsperado: 'Mondo Disko' },
]
for (const t of trabajadores) await probarTrabajador(t)

for (const u of [
  { telefono: '+34666000001', password: 'PM_User1_2025!', nombreEsperado: 'María García' },
  { telefono: '+34666000002', password: 'PM_User2_2025!', nombreEsperado: 'Carlos López' },
  { telefono: '+34666000003', password: 'PM_User3_2025!', nombreEsperado: 'Laura Sánchez' },
]) await probarUsuarioPWA(u)

console.log(`\n════════════ RESUMEN: ${passed} ✅  /  ${failed} ❌ ════════════`)
process.exit(failed ? 1 : 0)
