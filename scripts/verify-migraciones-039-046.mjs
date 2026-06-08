// Verifica contra Supabase real que las migraciones 039–046 están aplicadas y el esquema
// coincide con lo que espera el código. Crea datos de prueba mínimos y los limpia al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const ok = m => console.log('  ✅', m), bad = m => { console.log('  ❌', m); process.exitCode = 1 }

const rnd = Date.now().toString().slice(-6)
let localId = null, contactoId = null, onbId = null

const colExiste = async (tabla, cols) => {
  const { error } = await svc.from(tabla).select(cols).limit(1)
  return !error ? true : (console.log('     →', error.message), false)
}

try {
  // Local temporal para las pruebas con FK.
  const { data: loc, error: el } = await svc.from('locales').insert({
    nombre: `Verify ${rnd}`, tipo_local: 'discoteca', ciudad: 'Madrid', direccion: 'Gran Vía 1',
    latitud: 40.42, longitud: -3.70, aforo_maximo: 100, musica: [], imagenes: [], modulos_activos: [],
    consumiciones_bienvenida: [], estado: 'pendiente_verificacion', tier: 'pro', radio_verificacion_metros: 150,
    horario: {}, num_suscriptores: 0, notificaciones_semana_count: 0,
  }).select('id').single()
  if (el) { bad('setup local: ' + el.message); throw new Error('setup') }
  localId = loc.id
  ok('setup: local de prueba')

  console.log('\n039/040 — cerrado_hasta + auditoría de cierre')
  ;(await colExiste('locales', 'cerrado_hasta, cerrado_por, cerrado_en')) ? ok('columnas cerrado_hasta/cerrado_por/cerrado_en') : bad('faltan columnas de cierre')

  console.log('\n041 — onboarding_estado')
  {
    const { data, error } = await svc.from('onboarding_estado').insert({ perfil_tipo: 'dueno', perfil_id: randomUUID(), local_id: localId, pasos_visitados: ['verify'], tour_visto_at: new Date().toISOString() }).select('id').single()
    if (error) bad('insert onboarding_estado: ' + error.message)
    else { onbId = data.id; ok('tabla onboarding_estado (insert + pasos_visitados + tour_visto_at)') }
  }

  console.log('\n042 — cliente_local.etiquetas')
  ;(await colExiste('cliente_local', 'etiquetas')) ? ok('columna etiquetas') : bad('falta etiquetas')

  console.log('\n043 — crm_segmentos / crm_exports / crm_campanas')
  {
    const s = await svc.from('crm_segmentos').insert({ local_id: localId, nombre: 'Verify seg', emoji: '⭐', filtros: [{ campo: 'visitas', op: '>=', valor: 1 }] }).select('id').single()
    s.error ? bad('crm_segmentos: ' + s.error.message) : ok('crm_segmentos (insert con filtros jsonb)')
    const e = await svc.from('crm_exports').insert({ local_id: localId, modo: 'marketing', filtros: [], num_registros: 0 }).select('id').single()
    e.error ? bad('crm_exports: ' + e.error.message) : ok('crm_exports (modo marketing)')
    const c = await svc.from('crm_campanas').insert({ local_id: localId, tipo: 'push', filtros: [], titulo: 'Verify', enviados: 0, resultado: {} }).select('id').single()
    c.error ? bad('crm_campanas: ' + c.error.message) : ok('crm_campanas (tipo push)')
  }

  console.log('\n044 — contrato de encargo')
  ;(await colExiste('locales', 'crm_contrato_aceptado_at, crm_contrato_aceptado_por')) ? ok('columnas crm_contrato_aceptado_at/_por') : bad('faltan columnas de contrato')

  console.log('\n045 — local_integraciones (Brevo)')
  {
    const { error } = await svc.from('local_integraciones').insert({ local_id: localId, proveedor: 'brevo', estado: 'desconectada' }).select('id').single()
    error ? bad('local_integraciones: ' + error.message) : ok('local_integraciones (proveedor brevo)')
  }

  console.log('\n046 — contactos.fuente_origen = "importado"')
  {
    const { data, error } = await svc.from('contactos').insert({ telefono: '+34699' + rnd, nombre: 'Verify Importado', fuente_origen: 'importado', primer_local_id: localId, primer_contacto_en: new Date().toISOString(), ultimo_contacto_en: new Date().toISOString() }).select('id').single()
    if (error) bad('contactos importado: ' + error.message)
    else { contactoId = data.id; ok('fuente_origen "importado" aceptado por el CHECK') }
  }
} catch (e) { console.log('ERROR:', e.message) }
finally {
  console.log('\nLimpieza')
  if (onbId) await svc.from('onboarding_estado').delete().eq('id', onbId)
  if (contactoId) await svc.from('contactos').delete().eq('id', contactoId)
  if (localId) await svc.from('locales').delete().eq('id', localId) // cascada: crm_*, local_integraciones
  console.log('  ok')
  console.log(process.exitCode ? '\n  ❌ Hay fallos' : '\n  ✅ 039–046 verificadas')
}
