#!/usr/bin/env node
// E2E de §8 (amigos/grupos) contra Supabase real: ejercita la MISMA lógica de
// los endpoints (filtros .or(and..), amistad mutua, validación de amigos en
// grupos, salida y borrado de grupo vacío). Crea 3 usuarios de prueba y los
// borra al final (cascade limpia amistades/grupos). Uso: node scripts/e2e-amigos.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'

const envText = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = Object.fromEntries(envText.split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

let passed = 0, failed = 0
const ok = (m) => { passed++; console.log('  ✅', m) }
const fail = (m, e) => { failed++; console.log('  ❌', m, e ?? '') }
const rnd = Math.random().toString(36).slice(2, 8)

// Réplica del filtro bidireccional que usan los endpoints.
const parOr = (a, b) => `and(solicitante_id.eq.${a},receptor_id.eq.${b}),and(solicitante_id.eq.${b},receptor_id.eq.${a})`

async function crearUsuario(nombre) {
  const { data, error } = await admin.from('usuarios')
    .insert({ nombre, fecha_nacimiento: '2000-01-01', telefono: `+34${rnd}${Math.floor(Math.random() * 1e6)}` })
    .select('id').single()
  if (error) throw new Error('No se pudo crear usuario de prueba: ' + error.message)
  return data.id
}

let A, B, C
try {
  A = await crearUsuario(`e2e-A-${rnd}`); B = await crearUsuario(`e2e-B-${rnd}`); C = await crearUsuario(`e2e-C-${rnd}`)
  ok('3 usuarios de prueba creados')

  // ── Amistades ──
  console.log('\n› Amistades')
  await admin.from('amistades').insert({ solicitante_id: A, receptor_id: B, estado: 'pendiente' })
  const { data: dup } = await admin.from('amistades').select('id, receptor_id, estado').or(parOr(A, B)).maybeSingle()
  dup && dup.estado === 'pendiente' ? ok('solicitud A→B creada y el filtro bidireccional la encuentra') : fail('no se encontró la solicitud con .or(and..)', JSON.stringify(dup))

  const { data: recibidasB } = await admin.from('amistades').select('id, solicitante_id').eq('estado', 'pendiente').eq('receptor_id', B)
  recibidasB?.some(r => r.solicitante_id === A) ? ok('B ve la solicitud en "recibidas"') : fail('B no ve la solicitud')

  // Mutua: B "envía" a A → la lógica encuentra la previa (receptor=B) y la acepta.
  if (dup && dup.receptor_id === B) await admin.from('amistades').update({ estado: 'aceptada' }).eq('id', dup.id)
  const { data: amigosA } = await admin.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada').or(`solicitante_id.eq.${A},receptor_id.eq.${A}`)
  const otros = (amigosA ?? []).map(a => a.solicitante_id === A ? a.receptor_id : a.solicitante_id)
  otros.includes(B) ? ok('amistad A–B aceptada (mutua) y A ve a B como amigo') : fail('A no ve a B tras aceptar')

  // A–C también amigos (para el grupo)
  await admin.from('amistades').insert({ solicitante_id: A, receptor_id: C, estado: 'aceptada' })

  // ── Grupos ──
  console.log('\n› Grupos')
  // Validación de amigos (igual que el endpoint): amigos aceptados de A.
  const { data: amA } = await admin.from('amistades').select('solicitante_id, receptor_id').eq('estado', 'aceptada').or(`solicitante_id.eq.${A},receptor_id.eq.${A}`)
  const amigosSet = new Set((amA ?? []).map(a => a.solicitante_id === A ? a.receptor_id : a.solicitante_id))
  const validos = [B, C].filter(id => amigosSet.has(id))
  validos.length === 2 ? ok('B y C validados como amigos de A') : fail('validación de amigos falló', JSON.stringify([...amigosSet]))

  const { data: grupo, error: gErr } = await admin.from('grupos_amigos').insert({ nombre: `e2e-grupo-${rnd}`, emoji: '🎉', creador_id: A }).select('id').single()
  if (gErr) throw new Error('crear grupo: ' + gErr.message)
  await admin.from('grupo_amigos_miembros').insert([{ grupo_id: grupo.id, usuario_id: A }, ...validos.map(id => ({ grupo_id: grupo.id, usuario_id: id }))])

  const { data: misGrupos } = await admin.from('grupo_amigos_miembros').select('grupo_id').eq('usuario_id', A)
  misGrupos?.some(g => g.grupo_id === grupo.id) ? ok('A ve el grupo en su lista') : fail('A no ve el grupo')
  const { count: nMiembros } = await admin.from('grupo_amigos_miembros').select('*', { count: 'exact', head: true }).eq('grupo_id', grupo.id)
  nMiembros === 3 ? ok('grupo con 3 miembros (A, B, C)') : fail('miembros del grupo != 3', nMiembros)

  // A sale → quedan 2; el grupo sigue
  await admin.from('grupo_amigos_miembros').delete().eq('grupo_id', grupo.id).eq('usuario_id', A)
  const { count: n2 } = await admin.from('grupo_amigos_miembros').select('*', { count: 'exact', head: true }).eq('grupo_id', grupo.id)
  n2 === 2 ? ok('A sale del grupo y quedan 2') : fail('al salir A, miembros != 2', n2)

  // B y C salen → grupo vacío → se elimina (lógica del endpoint DELETE)
  await admin.from('grupo_amigos_miembros').delete().eq('grupo_id', grupo.id)
  const { count: n3 } = await admin.from('grupo_amigos_miembros').select('*', { count: 'exact', head: true }).eq('grupo_id', grupo.id)
  if (n3 === 0) await admin.from('grupos_amigos').delete().eq('id', grupo.id)
  const { data: grupoTrasBorrar } = await admin.from('grupos_amigos').select('id').eq('id', grupo.id).maybeSingle()
  !grupoTrasBorrar ? ok('grupo vacío se elimina') : fail('el grupo vacío no se eliminó')

} catch (e) {
  fail('excepción', e.message)
} finally {
  // Limpieza: borrar los usuarios de prueba (cascade limpia amistades/grupos).
  for (const id of [A, B, C].filter(Boolean)) await admin.from('usuarios').delete().eq('id', id)
  console.log('\n🧹 usuarios de prueba borrados')
}

console.log(`\n${failed === 0 ? '✅ E2E amigos/grupos OK' : '❌ Revisar'} — ${passed} OK, ${failed} fallos`)
process.exit(failed === 0 ? 0 : 1)
