/**
 * Crea (idempotente) un GRUPO demo para probar el panel /grupo:
 *   - Grupo "Grupo Pachá Demo"
 *   - Propietario: propietario@grupo.com / PM_Grupo2025!  (ve TODO el grupo)
 *   - Manager:     manager@grupo.com     / PM_Manager2025! (solo locales asignados)
 *   - 3 locales activos asignados al grupo; el manager solo ve 2 de ellos.
 */
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })

async function cuenta(email, pass) {
  const { data: list } = await svc.auth.admin.listUsers({ page: 1, perPage: 500 })
  const ex = list.users.find(u => u.email === email)
  if (ex) { await svc.auth.admin.updateUserById(ex.id, { password: pass }); return ex.id }
  const { data } = await svc.auth.admin.createUser({ email, password: pass, email_confirm: true })
  return data.user.id
}

// 1) Grupo
let { data: grupo } = await svc.from('grupos').select('id').eq('slug', 'grupo-pacha-demo').maybeSingle()
if (!grupo) { const { data } = await svc.from('grupos').insert({ nombre: 'Grupo Pachá Demo', slug: 'grupo-pacha-demo', activo: true }).select('id').single(); grupo = data }
const grupoId = grupo.id
console.log('grupo:', grupoId)

// 2) Asignar 3 locales activos al grupo
const { data: locales } = await svc.from('locales').select('id, nombre').eq('estado', 'activo').limit(3)
const ids = locales.map(l => l.id)
await svc.from('locales').update({ grupo_id: grupoId }).in('id', ids)
console.log('locales del grupo:', locales.map(l => l.nombre).join(', '))

// 3) Cuentas auth
await cuenta('propietario@grupo.com', 'PM_Grupo2025!')
await cuenta('manager@grupo.com', 'PM_Manager2025!')

// 4) Miembros del grupo
await svc.from('grupo_miembros').upsert({ grupo_id: grupoId, email: 'propietario@grupo.com', nombre: 'Dueño Pachá', rol: 'propietario', locales_asignados: null, activo: true }, { onConflict: 'grupo_id,email' })
// el manager solo ve los 2 primeros locales
await svc.from('grupo_miembros').upsert({ grupo_id: grupoId, email: 'manager@grupo.com', nombre: 'Marta Manager', rol: 'manager', locales_asignados: ids.slice(0, 2), activo: true }, { onConflict: 'grupo_id,email' })

console.log('\n✅ Listo. Entra en /grupo/login:')
console.log('   Propietario: propietario@grupo.com / PM_Grupo2025!  (ve 3 locales)')
console.log('   Manager:     manager@grupo.com     / PM_Manager2025! (ve 2 locales)')
