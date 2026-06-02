/**
 * Test de integración del flujo RRPP nuevo, con DISTINTAS CUENTAS contra
 * Supabase real:
 *   - crea una cuenta RRPP de prueba (auth + usuarios + rrpp) y prueba su login
 *   - prueba el login de un local demo (dueno@testlocal.com)
 *   - ejercita: interés → aceptar → descuentos → generar código → checkout(uso)
 * Limpia todo lo creado al final. Idempotente (limpia restos previos por prefijo).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] })
)
const SUPA_URL = env.NEXT_PUBLIC_SUPABASE_URL
const svc = createClient(SUPA_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let ok = 0, bad = 0
const pass = m => { console.log('✅ ' + m); ok++ }
const fail = m => { console.log('❌ ' + m); bad++ }
const TEST_EMAIL = 'rrpp.test.flujo@partymaps.com'
const TEST_PASS = 'PM_RrppTest2025!'

// Mirror de src/lib/rrppCodigos.ts (no podemos importar TS aquí)
const sanear = (input) => {
  const out = {}
  for (const c of ['entrada', 'consumicion', 'reservado']) {
    const v = Number(input?.[c]); if (Number.isFinite(v) && v > 0) out[c] = Math.min(100, Math.round(v))
  }
  return out
}
const descuentoCategoria = (d, cat, base) => {
  const pct = Number(d?.[cat] ?? 0); if (!pct) return 0
  return Math.min(base, Math.round(base * (pct / 100) * 100) / 100)
}

let authUserId, usuarioId, rrppId, localId, venueId, codigoId

async function limpiar() {
  // borra restos del rrpp de prueba (por si una corrida anterior falló)
  const { data: u } = await svc.from('usuarios').select('id').eq('auth_id', authUserId ?? '00000000-0000-0000-0000-000000000000').maybeSingle()
  const uid = usuarioId ?? u?.id
  if (rrppId || uid) {
    const rid = rrppId ?? (await svc.from('rrpp').select('id').eq('usuario_id', uid).maybeSingle()).data?.id
    if (rid) {
      await svc.from('rrpp_codigo_uso').delete().in('codigo_id', (await svc.from('rrpp_codigo').select('id').eq('rrpp_id', rid)).data?.map(c => c.id) ?? ['x'])
      await svc.from('rrpp_codigo').delete().eq('rrpp_id', rid)
      await svc.from('rrpp_solicitud').delete().eq('rrpp_id', rid)
      await svc.from('rrpp_venue').delete().eq('rrpp_id', rid)
      await svc.from('rrpp').delete().eq('id', rid)
    }
    if (uid) await svc.from('usuarios').delete().eq('id', uid)
  }
  // borra auth user por email
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 200 })
  const au = list?.users?.find(x => x.email === TEST_EMAIL)
  if (au) await svc.auth.admin.deleteUser(au.id)
}

try {
  console.log('=== Preparación: limpiar restos + crear cuenta RRPP de prueba ===')
  await limpiar()

  const { data: created, error: eAuth } = await svc.auth.admin.createUser({ email: TEST_EMAIL, password: TEST_PASS, email_confirm: true })
  if (eAuth) throw new Error('createUser: ' + eAuth.message)
  authUserId = created.user.id
  pass('cuenta auth RRPP creada')

  const { data: uIns, error: eU } = await svc.from('usuarios').insert({ auth_id: authUserId, nombre: 'RRPP Test', telefono: '+34600000099', fecha_nacimiento: '2000-01-01' }).select('id').single()
  if (eU) throw new Error('usuarios insert: ' + eU.message)
  usuarioId = uIns.id
  const { data: rIns, error: eR } = await svc.from('rrpp').insert({ usuario_id: usuarioId, slug: 'rrpp-test-flujo', nombre_publico: 'RRPP Test Flujo', estado_alta: 'completo', activo: true, visible_en_busqueda: true }).select('id').single()
  if (eR) throw new Error('rrpp insert: ' + eR.message)
  rrppId = rIns.id
  pass('perfil RRPP (usuarios + rrpp) creado')

  const { data: loc } = await svc.from('locales').select('id, nombre').eq('estado', 'activo').limit(1).maybeSingle()
  if (!loc) throw new Error('no hay local activo para la prueba')
  localId = loc.id
  pass(`local demo elegido: ${loc.nombre}`)

  // 1) Login real del RRPP (cuenta distinta)
  console.log('\n=== Cuenta RRPP: login ===')
  const anonR = createClient(SUPA_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: sR, error: eLR } = await anonR.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASS })
  if (eLR || !sR.session) fail('login RRPP: ' + (eLR?.message || 'sin sesión')); else pass('login RRPP correcto (sesión emitida)')

  // ¿Está la migración 030 aplicada? (las tablas existen de verdad)
  const m030 = !(await svc.from('rrpp_codigo').select('*').limit(1)).error
  if (!m030) console.log('\n⚠️  Migración 030 NO aplicada: las tablas rrpp_codigo/rrpp_solicitud no existen todavía.\n    Se prueban logins + relación + cálculo de descuento (unitario). El flujo de\n    códigos/solicitudes se validará tras aplicar 030 (idempotente).')

  // 2) Interés (rrpp_solicitud) — lo que hace POST /api/rrpp/interes
  console.log('\n=== Flujo: interés → aceptar ===')
  if (m030) {
    const { error: eSol } = await svc.from('rrpp_solicitud').upsert({ rrpp_id: rrppId, local_id: localId, mensaje: 'Me interesa', estado: 'pendiente' }, { onConflict: 'rrpp_id,local_id' })
    if (eSol) fail('crear solicitud: ' + eSol.message); else pass('solicitud de interés creada')
    const { data: solList } = await svc.from('rrpp_solicitud').select('id, estado').eq('local_id', localId).eq('estado', 'pendiente')
    if ((solList ?? []).some(s => s.id)) pass('el local ve la solicitud pendiente'); else fail('el local no ve la solicitud')
  }

  // El local acepta → crea rrpp_venue activa (no depende de 030)
  const { data: venue, error: eV } = await svc.from('rrpp_venue').insert({ rrpp_id: rrppId, local_id: localId, estado: 'activa', iniciado_por: 'rrpp', comision_pct: 10, triggers_activos: { entrada_vendida: true } }).select('id').single()
  if (eV) throw new Error('rrpp_venue: ' + eV.message)
  venueId = venue.id
  pass('local acepta → relación activa creada')

  // 3) Cálculo de descuento — UNIT (lógica del checkout, sin BD)
  console.log('\n=== Cálculo de descuento (unit) ===')
  const dTest = sanear({ entrada: 15, consumicion: 10, reservado: 0, foo: 99 })
  if (JSON.stringify(dTest) === JSON.stringify({ entrada: 15, consumicion: 10 })) pass('saneo de descuentos correcto (ignora categorías raras y ceros)'); else fail('saneo mal: ' + JSON.stringify(dTest))
  const d20 = descuentoCategoria(dTest, 'entrada', 20)
  if (d20 === 3) pass('descuento entrada 15% sobre 20€ = 3€'); else fail('cálculo mal: ' + d20)
  const dCap = descuentoCategoria({ entrada: 150 }, 'entrada', 10)
  if (dCap === 10) pass('el descuento nunca supera el precio (tope = precio)'); else fail('tope mal: ' + dCap)

  // 4) Flujo de códigos/solicitudes — solo si 030 está aplicada
  if (m030) {
    console.log('\n=== Flujo códigos (030 aplicada) ===')
    await svc.from('rrpp_venue').update({ descuentos: { entrada: 15, consumicion: 10 } }).eq('id', venueId)
    const { data: v2 } = await svc.from('rrpp_venue').select('descuentos').eq('id', venueId).single()
    const descuentos = sanear(v2?.descuentos)
    if (descuentos.entrada === 15) pass('local fija descuentos en rrpp_venue'); else fail('descuentos no persistidos')
    const codigo = 'TESTFLUJO' + Math.floor(100 + Math.random() * 900)
    const { data: cod, error: eC } = await svc.from('rrpp_codigo').insert({ rrpp_id: rrppId, local_id: localId, codigo, usos_max: 5, usos_actuales: 0, descuentos, activo: true }).select('id').single()
    if (eC) { fail('generar código: ' + eC.message) } else {
      codigoId = cod.id; pass('RRPP genera código con snapshot de descuento')
      const { data: valid } = await svc.from('rrpp_codigo').select('id, rrpp_id, descuentos, activo').eq('local_id', localId).ilike('codigo', codigo).eq('activo', true).maybeSingle()
      if (valid?.rrpp_id === rrppId) pass('checkout valida el código y resuelve el RRPP'); else fail('validación del código falló')
      const { error: eUso } = await svc.from('rrpp_codigo_uso').insert({ codigo_id: codigoId, usuario_id: usuarioId, descuento_aplicado: descuentoCategoria(descuentos, 'entrada', 20) })
      if (eUso) fail('registrar uso: ' + eUso.message); else pass('uso del código registrado')
      const { error: eUso2 } = await svc.from('rrpp_codigo_uso').insert({ codigo_id: codigoId, usuario_id: usuarioId, descuento_aplicado: 0 })
      if (eUso2) pass('un usuario no reutiliza el mismo código (unicidad OK)'); else fail('¡se permitió reutilizar!')
    }
  }

  // 5) Login del local demo (otra cuenta distinta)
  console.log('\n=== Cuenta LOCAL demo: login ===')
  const anonL = createClient(SUPA_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  const { data: sL, error: eLL } = await anonL.auth.signInWithPassword({ email: 'dueno@testlocal.com', password: 'PM_Dueno2025!' })
  if (eLL || !sL.session) fail('login local demo: ' + (eLL?.message || 'sin sesión (¿re-seed?)')); else pass('login local demo (dueno@testlocal.com) correcto')
} catch (e) {
  fail('EXCEPCIÓN: ' + e.message)
} finally {
  console.log('\n=== Limpieza ===')
  try { await limpiar(); console.log('🧹 datos de prueba eliminados') } catch (e) { console.log('⚠️ limpieza parcial: ' + e.message) }
  console.log(`\n${bad === 0 ? '🟢 TODO VERDE' : '🔴 con fallos'} — ${ok} OK, ${bad} fallos`)
  process.exit(bad === 0 ? 0 : 1)
}
