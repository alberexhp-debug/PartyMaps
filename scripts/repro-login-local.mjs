// Reproduce el camino EXACTO del login del panel de local contra la BD real.
// 1) service_role: inventario de cuentas demo en usuario_local.
// 2) anon (como el navegador): signInWithPassword + la query con locales!inner → ejerce RLS.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))

const SB_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SVC = env.SUPABASE_SERVICE_ROLE_KEY
const svc = createClient(SB_URL, SVC, { auth: { persistSession: false } })

console.log('── 1) Inventario de cuentas de local (service_role, bypassa RLS) ──')
const { data: cuentas, error: eInv } = await svc
  .from('usuario_local')
  .select('id, email, username, rol, activo, totp_activado, debe_cambiar_password, local_id, locales(nombre)')
  .order('rol')
if (eInv) { console.log('❌ inventario:', eInv.message) }
else {
  console.log(`Total filas usuario_local: ${cuentas.length}`)
  for (const c of cuentas.slice(0, 30)) {
    console.log(`  [${c.rol}] ${c.email}  user=${c.username ?? '—'}  activo=${c.activo}  totp=${c.totp_activado}  cambiarPass=${c.debe_cambiar_password}  local=${c.locales?.nombre ?? '∅(' + c.local_id + ')'}`)
  }
  if (cuentas.length > 30) console.log(`  … (+${cuentas.length - 30} más)`)
  const huerfanos = cuentas.filter(c => !c.locales)
  if (huerfanos.length) console.log(`⚠️  ${huerfanos.length} cuentas con local_id que NO resuelve a una fila de locales (rompería locales!inner)`)
}

// 2) Login real como el navegador (anon key, con sesión)
const CANDIDATOS = [
  ['dueno@testlocal.com', 'PM_Dueno2025!'],
  ['gestor@testlocal.com', 'PM_Gestor2025!'],
]
for (const [email, password] of CANDIDATOS) {
  console.log(`\n── 2) Login anon EXACTO como navegador: ${email} ──`)
  const cli = createClient(SB_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } })
  const { data: authData, error: authError } = await cli.auth.signInWithPassword({ email, password })
  if (authError) { console.log('❌ signInWithPassword →', authError.message, '(¿password cambiada?)'); continue }
  console.log('✅ auth OK, session.email =', authData.user?.email)

  const emailLookup = (authData.user?.email ?? email).trim()
  const { data: trabajador, error: trabajadorError } = await cli
    .from('usuario_local')
    .select('*, locales!local_id!inner(*)')
    .ilike('email', emailLookup)
    .eq('activo', true)
    .maybeSingle()
  if (trabajadorError) { console.log('❌ query usuario_local+locales!inner →', trabajadorError.message, '| code:', trabajadorError.code) }
  else if (!trabajador) { console.log('❌ query devolvió NULL → la app muestra "No tienes acceso a ningún local" (RLS o datos)') }
  else { console.log('✅ trabajador resuelto:', trabajador.rol, '| local:', trabajador.locales?.nombre) }
  await cli.auth.signOut()
}
