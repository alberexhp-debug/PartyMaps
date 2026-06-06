import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getTrabajadorLocal } from '@/lib/rrpp/auth'
import { calcularEdad } from '@/lib/utils'

const GESTION = ['dueno', 'gestor']
type Agg = { entradas_n: number; bar_n: number; gasto: number; ultima: string | null }

/**
 * GET   /api/local-panel/clientes[?q=&filtro=vip] — clientes del local con
 *        visitas, gasto, última visita, edad y VIP/notas.
 * PATCH /api/local-panel/clientes { usuario_id, vip?, notas? } — anota un cliente.
 * Funciona sin la migración 033 (agrega en JS); con la 033 usa el RPC (exacto/rápido).
 */
export async function GET(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const db = createServiceRoleClient()
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim().toLowerCase()
  const soloVip = url.searchParams.get('filtro') === 'vip'

  // 1) Agregar actividad por cliente: RPC si existe, si no en JS.
  const agg = new Map<string, Agg>()
  const rpc = await db.rpc('clientes_del_local', { p_local_id: t.local_id })
  if (!rpc.error && Array.isArray(rpc.data)) {
    for (const r of rpc.data as { usuario_id: string; entradas_n: number; bar_n: number; gasto: number; ultima: string }[]) {
      agg.set(r.usuario_id, { entradas_n: Number(r.entradas_n) || 0, bar_n: Number(r.bar_n) || 0, gasto: Number(r.gasto) || 0, ultima: r.ultima })
    }
  } else {
    const [{ data: ents }, { data: bar }] = await Promise.all([
      db.from('entradas').select('usuario_id, precio_total, created_at')
        .eq('local_id', t.local_id).not('usuario_id', 'is', null).neq('estado', 'cancelada').limit(10000),
      db.from('pedidos_bar').select('usuario_id, precio_total, created_at')
        .eq('local_id', t.local_id).not('usuario_id', 'is', null).in('estado', ['pagado', 'entregado']).limit(10000),
    ])
    const add = (uid: string, precio: number, fecha: string, tipo: 'e' | 'b') => {
      const a = agg.get(uid) ?? { entradas_n: 0, bar_n: 0, gasto: 0, ultima: null }
      if (tipo === 'e') a.entradas_n++; else a.bar_n++
      a.gasto += Number(precio) || 0
      if (!a.ultima || fecha > a.ultima) a.ultima = fecha
      agg.set(uid, a)
    }
    for (const e of ents ?? []) if (e.usuario_id) add(e.usuario_id, e.precio_total, e.created_at, 'e')
    for (const p of bar ?? []) if (p.usuario_id) add(p.usuario_id, p.precio_total, p.created_at, 'b')
  }

  const ids = [...agg.keys()]
  if (ids.length === 0) return NextResponse.json({ clientes: [] })

  // 2) Datos de los usuarios + anotaciones del local + consentimiento vigente.
  const mesActual = new Date().getMonth()
  const [{ data: usuarios }, anotaciones, consentRes] = await Promise.all([
    db.from('usuarios').select('id, nombre, apellidos, fecha_nacimiento, foto_perfil_url, telefono').in('id', ids),
    db.from('cliente_local').select('usuario_id, vip, notas, etiquetas').eq('local_id', t.local_id).in('usuario_id', ids)
      .then(r => r.error ? { data: [] as { usuario_id: string; vip: boolean; notas: string | null; etiquetas: string[] }[] } : r),
    // Consentimiento vigente = última fila por usuario (histórico append-only). Tolera ausencia de la 038.
    db.from('consentimientos_marketing').select('usuario_id, estado, created_at')
      .eq('local_id', t.local_id).in('usuario_id', ids).order('created_at', { ascending: false })
      .then(r => r.error ? { data: [] as { usuario_id: string; estado: string; created_at: string }[] } : r),
  ])
  const anota = new Map((anotaciones.data ?? []).map(a => [a.usuario_id, a]))
  const consentVigente = new Map<string, string>()
  for (const c of consentRes.data ?? []) if (!consentVigente.has(c.usuario_id)) consentVigente.set(c.usuario_id, c.estado)

  let clientes = (usuarios ?? []).map(u => {
    const a = agg.get(u.id)!
    const an = anota.get(u.id)
    return {
      usuario_id: u.id,
      nombre: [u.nombre, u.apellidos].filter(Boolean).join(' ') || 'Cliente',
      edad: u.fecha_nacimiento ? calcularEdad(u.fecha_nacimiento) : null,
      cumple_mes: u.fecha_nacimiento ? new Date(u.fecha_nacimiento).getMonth() === mesActual : false,
      foto: u.foto_perfil_url ?? null,
      telefono: u.telefono ?? null,
      visitas: a.entradas_n + a.bar_n,
      entradas: a.entradas_n,
      consumiciones: a.bar_n,
      gasto: Math.round(a.gasto * 100) / 100,
      ultima: a.ultima,
      vip: an?.vip ?? false,
      notas: an?.notas ?? null,
      etiquetas: an?.etiquetas ?? [],
      contactable: consentVigente.get(u.id) === 'acepta',
    }
  })

  if (q) clientes = clientes.filter(c => c.nombre.toLowerCase().includes(q) || (c.telefono ?? '').includes(q))
  if (soloVip) clientes = clientes.filter(c => c.vip)
  clientes.sort((a, b) => (b.ultima ?? '').localeCompare(a.ultima ?? ''))

  return NextResponse.json({ clientes, total: clientes.length })
}

export async function PATCH(req: NextRequest) {
  const t = await getTrabajadorLocal()
  if (!t || !GESTION.includes(t.rol)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json().catch(() => null) as { usuario_id?: string; vip?: boolean; notas?: string; etiquetas?: string[] } | null
  if (!body?.usuario_id) return NextResponse.json({ error: 'Falta usuario_id' }, { status: 400 })

  const db = createServiceRoleClient()
  const fila: Record<string, unknown> = { local_id: t.local_id, usuario_id: body.usuario_id, updated_at: new Date().toISOString() }
  if (typeof body.vip === 'boolean') fila.vip = body.vip
  if (body.notas !== undefined) fila.notas = String(body.notas).slice(0, 500) || null
  if (Array.isArray(body.etiquetas)) fila.etiquetas = body.etiquetas.map(e => String(e).trim()).filter(Boolean).slice(0, 30)

  const { error } = await db.from('cliente_local').upsert(fila, { onConflict: 'local_id,usuario_id' })
  if (error) {
    const faltaMigracion = /cliente_local|relation .* does not exist/i.test(error.message)
    return NextResponse.json({ error: faltaMigracion ? 'Anotar clientes necesita la migración 033.' : error.message }, { status: faltaMigracion ? 409 : 500 })
  }
  return NextResponse.json({ ok: true })
}
