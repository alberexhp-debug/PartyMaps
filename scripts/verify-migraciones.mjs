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

// helper: ¿existe tabla? Selecciona una columna real (id) para que el
// schema cache de PostgREST se sincere — con head+count daba falso positivo.
async function tabla(client, t, label) {
  const { error } = await client.from(t).select('id').limit(1);
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

console.log('\n=== 019 Módulo RRPP + CRM ===');
// Tablas core (12)
await tabla(svc, 'contactos', '019: tabla contactos existe');
await tabla(svc, 'rrpp', '019: tabla rrpp existe');
await tabla(svc, 'rrpp_venue', '019: tabla rrpp_venue existe');
await tabla(svc, 'link_rrpp', '019: tabla link_rrpp existe');
await tabla(svc, 'binding_rrpp', '019: tabla binding_rrpp existe');
await tabla(svc, 'lista_rrpp', '019: tabla lista_rrpp existe');
await tabla(svc, 'lista_rrpp_item', '019: tabla lista_rrpp_item existe');
await tabla(svc, 'perk_rrpp', '019: tabla perk_rrpp existe');
await tabla(svc, 'rrpp_seguidor', '019: tabla rrpp_seguidor existe');
await tabla(svc, 'liquidacion_rrpp', '019: tabla liquidacion_rrpp existe');
await tabla(svc, 'liquidacion_rrpp_item', '019: tabla liquidacion_rrpp_item existe');
await tabla(svc, 'audit_log_liquidacion', '019: tabla audit_log_liquidacion existe');
// Columnas añadidas a tablas existentes
await columna('entradas', 'contacto_id', '019: entradas.contacto_id existe');
await columna('entradas', 'rrpp_id', '019: entradas.rrpp_id existe');
await columna('entradas', 'link_rrpp_id', '019: entradas.link_rrpp_id existe');
await columna('pedidos_bar', 'contacto_id', '019: pedidos_bar.contacto_id existe');
await columna('pedidos_bar', 'rrpp_id', '019: pedidos_bar.rrpp_id existe');
// RLS: rrpp activos visibles para anon (página pública /r/[slug])
await tabla(anon, 'rrpp', '019 RLS: anon puede SELECT rrpp (página pública)');
// RLS: link_rrpp activos visibles para anon (necesario para resolver tokens)
await tabla(anon, 'link_rrpp', '019 RLS: anon puede SELECT link_rrpp (resolver tokens)');

console.log(out.join('\n'));
const fallos = out.filter(l => l.startsWith('❌')).length;
console.log(`\n${fallos === 0 ? '🟢 TODO OK' : '🔴 ' + fallos + ' fallo(s)'}`);
