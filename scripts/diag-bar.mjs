// Confirma por qué falla crear un pedido de barra: ¿RLS bloquea el INSERT como
// usuario autenticado? (el endpoint usa createAdminSupabaseClient = corre como
// el usuario). Compara authenticated vs service_role. Limpia al final.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
const env = Object.fromEntries(readFileSync(new URL('../.env.local', import.meta.url), 'utf8').split('\n').filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)] }))
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

const email = `bartest${Date.now()}@example.com`
let createdId = null, aId = null, sId = null
try {
  const { data: created } = await svc.auth.admin.createUser({ email, password: 'BarTest1234!', email_confirm: true })
  createdId = created?.user?.id
  await anon.auth.signInWithPassword({ email, password: 'BarTest1234!' })

  const { data: local } = await svc.from('locales').select('id, nombre').ilike('nombre', '%Club Test%').maybeSingle()
  const { data: anyUser } = await svc.from('usuarios').select('id').limit(1).maybeSingle()
  if (!local || !anyUser) { console.log('faltan local/usuario de prueba'); }
  const base = { usuario_id: anyUser.id, local_id: local.id, estado: 'pagado', precio_total: 5, comision_plataforma: 0, metodo_pago: 'app' }

  const { data: a, error: ea } = await anon.from('pedidos_bar').insert({ ...base, qr_code: 'PMB:diag-' + Date.now() }).select('id').maybeSingle()
  aId = a?.id
  console.log('INSERT como AUTHENTICATED →', ea ? `❌ BLOQUEADO  code=${ea.code}  ${ea.message}` : '✅ OK (inesperado)')

  const { data: s, error: es } = await svc.from('pedidos_bar').insert({ ...base, qr_code: 'PMB:diag2-' + Date.now() }).select('id').maybeSingle()
  sId = s?.id
  console.log('INSERT como SERVICE_ROLE →', es ? `❌ FALLA  ${es.message}` : '✅ OK')
} catch (e) { console.log('error diag:', e.message) }
finally {
  if (aId) await svc.from('pedidos_bar').delete().eq('id', aId)
  if (sId) await svc.from('pedidos_bar').delete().eq('id', sId)
  await anon.auth.signOut().catch(() => {})
  if (createdId) await svc.auth.admin.deleteUser(createdId).catch(() => {})
  console.log('limpieza ok')
}
