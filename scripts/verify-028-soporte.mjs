import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Verifica la migración 028 (soporte/tickets) contra Supabase real.
// Lee .env.local. Si la migración no está aplicada, lo dice claramente.
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

console.log('=== 028 Soporte / tickets ===');
const tieneTickets = await col('tickets_soporte', 'id', 'tickets_soporte existe');
await col('tickets_soporte', 'estado', 'tickets_soporte.estado');
await col('tickets_soporte', 'no_leido_admin', 'tickets_soporte.no_leido_admin');
await col('tickets_soporte', 'no_leido_local', 'tickets_soporte.no_leido_local');
await col('tickets_soporte', 'ultimo_mensaje_at', 'tickets_soporte.ultimo_mensaje_at');
await col('ticket_mensajes', 'id', 'ticket_mensajes existe');
await col('ticket_mensajes', 'autor', 'ticket_mensajes.autor');

console.log(`\n${bad === 0 ? '🟢' : '🔴'} ${ok} OK, ${bad} fallos`);
if (!tieneTickets) {
  console.log('\n⚠️  La migración 028 aún NO está aplicada. Aplícala en el SQL editor de Supabase:');
  console.log('   src/lib/supabase/migrations/028_soporte_tickets.sql');
}
process.exit(bad === 0 ? 0 : 1);
