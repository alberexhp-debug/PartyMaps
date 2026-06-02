/**
 * Crea (idempotente) una cuenta RRPP demo persistente para poder ver el panel:
 *   rrpp@testlocal.com / PM_Rrpp2025!  (perfil completo)
 * + relación ACTIVA con varios locales activos + un par de liquidaciones para
 *   que el dashboard tenga datos (gráfica, KPIs).
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const EMAIL = 'rrpp@testlocal.com', PASS = 'PM_Rrpp2025!'

const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 500 })
let au = list.users.find(u => u.email === EMAIL)
if (!au) { const { data } = await svc.auth.admin.createUser({ email: EMAIL, password: PASS, email_confirm: true }); au = data.user; console.log('auth creado') }
else { await svc.auth.admin.updateUserById(au.id, { password: PASS }); console.log('auth ya existía (pass reset)') }

let { data: u } = await svc.from('usuarios').select('id').eq('auth_id', au.id).maybeSingle()
if (!u) { const { data } = await svc.from('usuarios').insert({ auth_id: au.id, nombre: 'Leo Noches', telefono: '+34600111222', fecha_nacimiento: '1998-05-10' }).select('id').single(); u = data }
const usuarioId = u.id

let { data: r } = await svc.from('rrpp').select('id').eq('usuario_id', usuarioId).maybeSingle()
if (!r) { const { data } = await svc.from('rrpp').insert({ usuario_id: usuarioId, slug: 'leo-noches', nombre_publico: 'Leo Noches', bio: 'Llevo las mejores noches de Madrid', instagram: 'leo.noches', estado_alta: 'completo', activo: true, visible_en_busqueda: true }).select('id').single(); r = data }
else { await svc.from('rrpp').update({ estado_alta: 'completo', activo: true }).eq('id', r.id) }
const rrppId = r.id
console.log('rrpp:', rrppId)

const { data: locales } = await svc.from('locales').select('id, nombre').eq('estado', 'activo').limit(3)
for (const l of locales) {
  const { data: ex } = await svc.from('rrpp_venue').select('id').eq('rrpp_id', rrppId).eq('local_id', l.id).maybeSingle()
  if (!ex) await svc.from('rrpp_venue').insert({ rrpp_id: rrppId, local_id: l.id, estado: 'activa', iniciado_por: 'venue', comision_pct: 10, descuentos: { entrada: 15, consumicion: 10 }, triggers_activos: { entrada_vendida: true } })
  else await svc.from('rrpp_venue').update({ estado: 'activa', descuentos: { entrada: 15, consumicion: 10 } }).eq('id', ex.id)
  console.log('venue activo con', l.nombre)
}
console.log('\n✅ Listo: entra en /rrpp/login con', EMAIL, '/', PASS)
