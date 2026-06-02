import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Verifica la migración 029 (grupos/promotoras) contra Supabase real.
const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, '')]; })
);
const svc = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let ok = 0, bad = 0;
const pass = m => { console.log('✅ ' + m); ok++; };
const fail = m => { console.log('❌ ' + m); bad++; };
async function col(t, c, label) {
  const { error } = await svc.from(t).select(c, { head: true }).limit(1);
  if (error) { fail(`${label}: ${error.message}`); return false; }
  pass(label); return true;
}

console.log('=== 029 Grupos / Promotoras ===');
const g = await col('grupos', 'id', 'grupos existe');
await col('grupos', 'nombre', 'grupos.nombre');
const gm = await col('grupo_miembros', 'id', 'grupo_miembros existe');
await col('grupo_miembros', 'rol', 'grupo_miembros.rol');
await col('grupo_miembros', 'locales_asignados', 'grupo_miembros.locales_asignados');
await col('locales', 'grupo_id', 'locales.grupo_id');

console.log(`\n${bad === 0 ? '🟢' : '🔴'} ${ok} OK, ${bad} fallos`);
if (!g || !gm) {
  console.log('\n⚠️  La migración 029 aún NO está aplicada. Aplícala en el SQL editor de Supabase:');
  console.log('   src/lib/supabase/migrations/029_grupos_promotora.sql');
}
process.exit(bad === 0 ? 0 : 1);
