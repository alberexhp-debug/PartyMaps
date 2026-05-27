import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// cargar .env.local
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0,i).trim(), l.slice(i+1).trim().replace(/^["']|["']$/g,'')]; })
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const svc = createClient(url, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false }});
const anon = createClient(url, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false }});

const out = [];
const ok = (m) => out.push('✅ ' + m);
const bad = (m) => out.push('❌ ' + m);

// helper: ¿existe tabla? (select head)
async function tabla(client, t, label) {
  const { error } = await client.from(t).select('*', { head: true, count: 'exact' }).limit(1);
  if (error) { bad(`${label}: ${error.message}`); return false; }
  ok(`${label}`); return true;
}
// helper: ¿existe columna? select esa col
async function columna(t, c, label) {
  const { error } = await svc.from(t).select(c, { head: true }).limit(1);
  if (error) { bad(`${label}: ${error.message}`); return false; }
  ok(`${label}`);
}

console.log('=== 015 Aforo por día ===');
await columna('locales', 'aforo_por_dia', '015: locales.aforo_por_dia existe');

console.log('\n=== 016 Coste producto ===');
await columna('productos_local', 'coste', '016: productos_local.coste existe');

console.log('\n=== 017 Mesas y reservas ===');
await tabla(svc, 'mesas', '017: tabla mesas existe');
await tabla(svc, 'reservas', '017: tabla reservas existe');

console.log('\n=== 012 RLS productos_local (anon puede ver carta) ===');
await tabla(anon, 'productos_local', '012: anon puede SELECT productos_local');

console.log('\n=== 013 Tiers mixto ===');
await columna('locales', 'comision_porcentaje_override', '013: locales.comision_porcentaje_override existe');
await columna('locales', 'tier', '013: locales.tier existe');

console.log(out.join('\n'));
const fallos = out.filter(l => l.startsWith('❌')).length;
console.log(`\n${fallos === 0 ? '🟢 TODO OK' : '🔴 ' + fallos + ' fallo(s)'}`);
