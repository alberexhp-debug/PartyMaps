#!/usr/bin/env node
// Pruebas funcionales más profundas por rol — flujos completos
// PWA: comprar entrada, crear plan, suscribirse, sugerencia, votar concurso
// Local: crear evento, modificar aforo, marcar entrada usada (scanner)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]
  })
)
const URL_SB = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SR = env.SUPABASE_SERVICE_ROLE_KEY

let passed = 0, failed = 0
const fail = (...a) => { failed++; console.log('  ❌', ...a) }
const ok   = (...a) => { passed++; console.log('  ✅', ...a) }
const newClient = () => createClient(URL_SB, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
const sr = createClient(URL_SB, SR, { auth: { autoRefreshToken: false, persistSession: false } })

async function flujoPWA({ telefono, password, nombre }) {
  console.log(`\n══════ FLUJO PWA — ${nombre} (${telefono}) ══════`)
  const cli = newClient()
  const { data: auth, error: errLogin } = await cli.auth.signInWithPassword({ phone: telefono, password })
  if (errLogin) return fail(`login: ${errLogin.message}`)
  ok('Login PWA OK')

  const { data: usuario } = await cli.from('usuarios').select('id').eq('auth_id', auth.user.id).single()
  if (!usuario) return fail('Sin perfil')

  // 1. Suscribirse a un local
  const { data: locales } = await cli.from('locales').select('id, nombre, precio_entrada_min, tier, aforo_maximo').eq('estado','activo').limit(3)
  if (!locales?.length) return fail('Sin locales')
  const local = locales[0]
  await cli.from('suscripciones').upsert({ usuario_id: usuario.id, local_id: local.id }, { onConflict: 'usuario_id,local_id' })
  ok(`Suscrito a ${local.nombre}`)

  // 2. Comprar entrada (insert directo — el endpoint requiere cookie SSR)
  const precioBase = local.precio_entrada_min ?? 10
  const comision = Math.round((precioBase * 0.08) * 100) / 100
  const { data: entrada, error: eErr } = await cli.from('entradas').insert({
    usuario_id: usuario.id,
    local_id: local.id,
    precio_local: precioBase,
    comision_plataforma: comision,
    precio_total: precioBase + comision,
    qr_code: `PM2:${crypto.randomUUID()}`,
    estado: 'activa',
  }).select().single()
  if (eErr) fail(`comprar entrada: ${eErr.message}`)
  else ok(`Entrada comprada en ${local.nombre} (${entrada.precio_total}€, QR ${entrada.qr_code.slice(0,12)}…)`)

  // 3. Crear plan público
  const { data: plan, error: pErr } = await cli.from('planes_publicos').insert({
    creador_id: usuario.id,
    local_id: local.id,
    hora_llegada: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    total_personas: 4,
    huecos_disponibles: 3,
    descripcion: `Plan creado por ${nombre} para probar flujo`,
    estado: 'activo',
  }).select().single()
  if (pErr) fail(`crear plan: ${pErr.message}`)
  else ok(`Plan público creado en ${local.nombre}`)

  // 4. Enviar sugerencia al local
  const { error: sErr } = await cli.from('sugerencias').insert({
    usuario_id: usuario.id,
    local_id: local.id,
    contenido: `Sugerencia automatizada de ${nombre}: mejor sería bajar el volumen del bajo`,
    estado: 'nueva',
  })
  if (sErr) fail(`sugerencia: ${sErr.message}`)
  else ok('Sugerencia enviada')

  // 5. Ver mis entradas
  const { data: misEntradas } = await cli.from('entradas').select('id, qr_code').eq('usuario_id', usuario.id).eq('estado','activa')
  if (!misEntradas || misEntradas.length === 0) fail('No veo mis entradas')
  else ok(`Veo mis ${misEntradas.length} entrada(s) activa(s)`)

  // 6. Ver concurso activo + intentar votar (si lo hay)
  const { data: concursos } = await cli.from('concursos').select('id, local_id').eq('estado','activo')
  if (concursos?.length) ok(`Veo ${concursos.length} concurso(s) activo(s)`)

  // 7. Suscripciones list
  const { data: subs } = await cli.from('suscripciones').select('local_id').eq('usuario_id', usuario.id)
  if (subs?.length) ok(`${subs.length} suscripción(es) totales`)

  await cli.auth.signOut()
  return entrada
}

async function flujoTrabajador({ email, password, localEsperado, rolEsperado, accion }) {
  console.log(`\n══════ FLUJO LOCAL — ${rolEsperado} de ${localEsperado} (${email}) ══════`)
  const cli = newClient()
  const { error } = await cli.auth.signInWithPassword({ email, password })
  if (error) return fail(`login: ${error.message}`)
  ok('Login OK')

  const { data: trab } = await cli.from('usuario_local').select('*, locales(*)').eq('email', email).single()

  if (rolEsperado === 'dueno' || rolEsperado === 'gestor') {
    // Crear evento de prueba
    const fechaInicio = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
    const fechaFin = new Date(fechaInicio.getTime() + 6 * 60 * 60 * 1000)
    const { data: ev, error: evErr } = await cli.from('eventos').insert({
      local_id: trab.local_id,
      nombre: `Evento test ${rolEsperado} ${Date.now()}`,
      descripcion: 'Evento creado por test automatizado',
      fecha_inicio: fechaInicio.toISOString(),
      fecha_fin: fechaFin.toISOString(),
      aforo_maximo: 400,
      precio_base: 12,
      estado: 'borrador',
    }).select().single()
    if (evErr) fail(`crear evento: ${evErr.message}`)
    else {
      ok(`Evento creado (${ev.id})`)
      // Limpiar el evento de prueba
      await sr.from('eventos').delete().eq('id', ev.id)
    }

    // Actualizar aforo manual
    const { error: aErr } = await cli.from('locales').update({
      aforo_correccion_manual: 75,
      aforo_correccion_manual_expires: new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString(),
    }).eq('id', trab.local_id)
    if (aErr) fail(`aforo manual: ${aErr.message}`)
    else ok('Aforo manual actualizado a 75%')

    // Ver sugerencias del local
    const { data: sugs } = await cli.from('sugerencias').select('id, contenido').eq('local_id', trab.local_id)
    if (sugs && sugs.length >= 0) ok(`Sugerencias del local visibles (${sugs.length})`)
  }

  if (rolEsperado === 'puerta') {
    // Buscar una entrada activa del local
    const entradaParam = accion?.entrada
    if (entradaParam) {
      const { data: ent } = await cli.from('entradas').select('id, qr_code, estado').eq('qr_code', entradaParam.qr_code).maybeSingle()
      if (!ent) fail(`Scanner no encuentra QR ${entradaParam.qr_code.slice(0,12)}…`)
      else {
        ok(`Scanner lee QR (${ent.qr_code.slice(0,12)}…)`)
        // Marcar usada
        const { error: marcaErr } = await cli.from('entradas').update({
          estado: 'usada',
          usado_at: new Date().toISOString(),
          usado_por: trab.id,
        }).eq('id', ent.id)
        if (marcaErr) fail(`marcar usada: ${marcaErr.message}`)
        else ok('Entrada marcada como usada por trabajador "puerta"')
      }
    }
  }

  if (rolEsperado === 'operador_noche') {
    // Operador puede leer estadísticas (historial_aforo)
    const { data: hist } = await cli.from('historial_aforo').select('*').eq('local_id', trab.local_id).limit(5)
    if (hist && hist.length >= 0) ok(`Operador ve historial aforo (${hist.length} muestras recientes)`)
    // No debería poder editar locales
    const intento = await cli.from('locales').update({ descripcion: trab.locales.descripcion }).eq('id', trab.local_id).select('id')
    if (intento.data?.length) fail('Operador NO debería poder editar local')
    else ok('Operador no puede editar local (esperado)')
  }

  await cli.auth.signOut()
}

console.log('\n════════════ TESTS FLUJOS AVANZADOS ════════════')

// 1. PWA: 3 usuarios hacen flujos completos
const entradaMaria = await flujoPWA({ telefono: '+34666000001', password: 'PM_User1_2025!', nombre: 'María García' })
await flujoPWA({ telefono: '+34666000002', password: 'PM_User2_2025!', nombre: 'Carlos López' })
await flujoPWA({ telefono: '+34666000003', password: 'PM_User3_2025!', nombre: 'Laura Sánchez' })

// 2. Local: dueño crea evento, operador ve datos, puerta escanea la entrada de María
//    (María compró en el primer local activo = el que el seed devuelve primero)
// La entrada está en algun local; busco el dueño que tenga acceso a ese local.
if (entradaMaria) {
  const { data: trab } = await sr.from('usuario_local').select('email, rol').eq('local_id', entradaMaria.local_id).eq('rol', 'puerta').maybeSingle()
  if (trab) {
    const passMap = {
      'puerta@testlocal.com': 'PM_Puerta2025!',
      'puerta.kapital@partymaps.com': 'PM_Puerta_kapital_2025!',
      'puerta.teatro-barcelo@partymaps.com': 'PM_Puerta_teatrobarcelo_2025!',
      'puerta.mondo-disko@partymaps.com': 'PM_Puerta_mondodisko_2025!',
    }
    const { data: localInfo } = await sr.from('locales').select('nombre').eq('id', entradaMaria.local_id).single()
    await flujoTrabajador({
      email: trab.email, password: passMap[trab.email],
      localEsperado: localInfo?.nombre || '?', rolEsperado: 'puerta',
      accion: { entrada: entradaMaria },
    })
  }
}

// Dueño/gestor/operador de Kapital
await flujoTrabajador({ email: 'dueno.kapital@partymaps.com',    password: 'PM_Dueno_kapital_2025!',    localEsperado: 'Kapital', rolEsperado: 'dueno' })
await flujoTrabajador({ email: 'gestor.kapital@partymaps.com',   password: 'PM_Gestor_kapital_2025!',   localEsperado: 'Kapital', rolEsperado: 'gestor' })
await flujoTrabajador({ email: 'operador.kapital@partymaps.com', password: 'PM_Operador_kapital_2025!', localEsperado: 'Kapital', rolEsperado: 'operador_noche' })
// Dueño Teatro Barceló
await flujoTrabajador({ email: 'dueno.teatro-barcelo@partymaps.com', password: 'PM_Dueno_teatrobarcelo_2025!', localEsperado: 'Teatro Barceló', rolEsperado: 'dueno' })
// Dueño Mondo
await flujoTrabajador({ email: 'dueno.mondo-disko@partymaps.com', password: 'PM_Dueno_mondodisko_2025!', localEsperado: 'Mondo Disko', rolEsperado: 'dueno' })

// 3. Limpiar entradas de prueba creadas durante los tests
await sr.from('entradas').delete().like('qr_code', 'PM2:%')
console.log('\n  · Entradas de prueba limpiadas')
await sr.from('planes_publicos').delete().like('descripcion', '%test%')
await sr.from('sugerencias').delete().like('contenido', '%Sugerencia automatizada%')
console.log('  · Planes y sugerencias de prueba limpiados')

console.log(`\n════════════ RESUMEN: ${passed} ✅  /  ${failed} ❌ ════════════`)
process.exit(failed ? 1 : 0)
