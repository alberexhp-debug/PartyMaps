// Agregador del CRM: una sola fuente de verdad para la lista de clientes enriquecida
// (visitas, gasto total y de barra, primera/última visita, VIP, etiquetas, contactabilidad).
// Lo usan el endpoint de clientes, los segmentos y el export. Server-only (recibe el cliente
// service-role). El email de los usuarios vive en auth, no en `usuarios` → email = null.
import type { SupabaseClient } from '@supabase/supabase-js'
import { calcularEdad } from '@/lib/utils'

export interface ClienteCRM {
  usuario_id: string
  nombre: string
  edad: number | null
  cumple_mes: boolean
  foto: string | null
  telefono: string | null
  email: string | null
  visitas: number
  entradas: number
  consumiciones: number
  gasto: number
  gasto_bar: number
  primera: string | null
  ultima: string | null
  vip: boolean
  notas: string | null
  etiquetas: string[]
  contactable: boolean
}

type Agg = { entradas_n: number; bar_n: number; gasto: number; gasto_bar: number; primera: string | null; ultima: string | null }

export async function obtenerClientesCRM(db: SupabaseClient, localId: string): Promise<ClienteCRM[]> {
  const agg = new Map<string, Agg>()
  const [{ data: ents }, { data: bar }] = await Promise.all([
    db.from('entradas').select('usuario_id, precio_total, created_at').eq('local_id', localId).not('usuario_id', 'is', null).neq('estado', 'cancelada').limit(20000),
    db.from('pedidos_bar').select('usuario_id, precio_total, created_at').eq('local_id', localId).not('usuario_id', 'is', null).in('estado', ['pagado', 'entregado']).limit(20000),
  ])
  const add = (uid: string, precio: unknown, fecha: string, tipo: 'e' | 'b') => {
    const a = agg.get(uid) ?? { entradas_n: 0, bar_n: 0, gasto: 0, gasto_bar: 0, primera: null, ultima: null }
    const p = Number(precio) || 0
    if (tipo === 'e') a.entradas_n++
    else { a.bar_n++; a.gasto_bar += p }
    a.gasto += p
    if (!a.primera || fecha < a.primera) a.primera = fecha
    if (!a.ultima || fecha > a.ultima) a.ultima = fecha
    agg.set(uid, a)
  }
  for (const e of (ents ?? []) as { usuario_id: string; precio_total: number; created_at: string }[]) if (e.usuario_id) add(e.usuario_id, e.precio_total, e.created_at, 'e')
  for (const p of (bar ?? []) as { usuario_id: string; precio_total: number; created_at: string }[]) if (p.usuario_id) add(p.usuario_id, p.precio_total, p.created_at, 'b')

  const ids = [...agg.keys()]
  if (ids.length === 0) return []

  const mesActual = new Date().getMonth()
  const [{ data: usuarios }, anotaciones, consentRes] = await Promise.all([
    db.from('usuarios').select('id, nombre, apellidos, fecha_nacimiento, foto_perfil_url, telefono').in('id', ids),
    db.from('cliente_local').select('usuario_id, vip, notas, etiquetas').eq('local_id', localId).in('usuario_id', ids).then(r => (r.error ? { data: [] } : r)),
    db.from('consentimientos_marketing').select('usuario_id, estado, created_at').eq('local_id', localId).in('usuario_id', ids).order('created_at', { ascending: false }).then(r => (r.error ? { data: [] } : r)),
  ])
  const anota = new Map((((anotaciones.data ?? []) as { usuario_id: string; vip: boolean; notas: string | null; etiquetas: string[] }[])).map(a => [a.usuario_id, a]))
  const consent = new Map<string, string>()
  for (const c of (consentRes.data ?? []) as { usuario_id: string; estado: string }[]) if (!consent.has(c.usuario_id)) consent.set(c.usuario_id, c.estado)

  return ((usuarios ?? []) as { id: string; nombre: string; apellidos: string | null; fecha_nacimiento: string | null; foto_perfil_url: string | null; telefono: string | null }[]).map(u => {
    const a = agg.get(u.id)!
    const an = anota.get(u.id)
    return {
      usuario_id: u.id,
      nombre: [u.nombre, u.apellidos].filter(Boolean).join(' ') || 'Cliente',
      edad: u.fecha_nacimiento ? calcularEdad(u.fecha_nacimiento) : null,
      cumple_mes: u.fecha_nacimiento ? new Date(u.fecha_nacimiento).getMonth() === mesActual : false,
      foto: u.foto_perfil_url ?? null,
      telefono: u.telefono ?? null,
      email: null,
      visitas: a.entradas_n + a.bar_n,
      entradas: a.entradas_n,
      consumiciones: a.bar_n,
      gasto: Math.round(a.gasto * 100) / 100,
      gasto_bar: Math.round(a.gasto_bar * 100) / 100,
      primera: a.primera,
      ultima: a.ultima,
      vip: an?.vip ?? false,
      notas: an?.notas ?? null,
      etiquetas: an?.etiquetas ?? [],
      contactable: consent.get(u.id) === 'acepta',
    }
  })
}
