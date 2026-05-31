import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Motor de atribución de comisiones RRPP.
 *
 * Señal de "quién captó" = LAST-TOUCH en las últimas 24h, combinando:
 *   - cookie `rumbo_ref` (clic en el link/QR del RRPP), renovable en cada clic
 *   - `usuarios.referido_codigo` + `referido_at` (código usado al registrarse)
 * Gana el más reciente dentro de la ventana de 24h.
 *
 * Dentro de una misma noche manda FIRST-BINDING-WINS: si ya hay un binding
 * activo para (contacto, local), la compra/consumo se atribuye a ese RRPP
 * aunque la señal last-touch apunte a otro. La señal solo decide al crear el
 * binding.
 *
 * Disparadores (configurables por relación en `rrpp_venue.triggers_activos`):
 *   - entrada_vendida   → ON por defecto. Base = precio_local de cada entrada.
 *   - consumo_bar       → OFF por defecto. Base = subtotal del pedido de bar.
 *
 * Acumula en `liquidacion_rrpp` (+ línea en `liquidacion_rrpp_item`).
 * NUNCA debe romper el checkout/pedido: el llamador la envuelve e ignora fallos.
 */

const VENTANA_MS = 24 * 60 * 60 * 1000
const round2 = (n: number) => Math.round(n * 100) / 100

export type CookieRef = { r: string; t: number } | null

/** Parsea la cookie `rumbo_ref`. Devuelve null si ausente/ inválida. */
export function parseCookieRef(raw: string | undefined): CookieRef {
  if (!raw) return null
  try {
    const v = JSON.parse(raw)
    if (typeof v?.r === 'string' && typeof v?.t === 'number') return v
  } catch { /* ignora */ }
  return null
}

type Señal = { rrpp_id: string; ts: number; mecanismo: 'link_compra' | 'qr_rrpp' }

/** Resuelve la señal last-touch (cookie vs código de registro) dentro de 24h. */
async function resolverSeñal(db: SupabaseClient, usuarioId: string, cookieRef: CookieRef): Promise<Señal | null> {
  const ahora = Date.now()
  const candidatas: Señal[] = []

  if (cookieRef && ahora - cookieRef.t < VENTANA_MS) {
    candidatas.push({ rrpp_id: cookieRef.r, ts: cookieRef.t, mecanismo: 'link_compra' })
  }

  const { data: u } = await db
    .from('usuarios').select('referido_codigo, referido_at').eq('id', usuarioId).maybeSingle()
  if (u?.referido_codigo && u.referido_at) {
    const t = new Date(u.referido_at).getTime()
    if (ahora - t < VENTANA_MS) {
      const { data: rrpp } = await db
        .from('rrpp').select('id').ilike('slug', u.referido_codigo.trim()).eq('activo', true).maybeSingle()
      if (rrpp) candidatas.push({ rrpp_id: rrpp.id, ts: t, mecanismo: 'qr_rrpp' })
    }
  }

  if (candidatas.length === 0) return null
  return candidatas.sort((a, b) => b.ts - a.ts)[0] // last-touch
}

/** Encuentra o crea el contacto CRM del usuario registrado. */
async function resolverContacto(
  db: SupabaseClient,
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null },
): Promise<string | null> {
  const { data: existente } = await db.from('contactos').select('id').eq('user_id', usuario.id).maybeSingle()
  if (existente) return existente.id
  if (!usuario.email && !usuario.telefono) return null // contactos exige email o teléfono (trigger)

  const { data: creado } = await db
    .from('contactos')
    .insert({
      user_id: usuario.id, email: usuario.email ?? null, telefono: usuario.telefono ?? null,
      nombre: usuario.nombre ?? null, fuente_origen: 'checkout_entrada',
    })
    .select('id').single()
  return creado?.id ?? null
}

type TriggerKey = 'entrada_vendida' | 'consumo_bar'

/** rrpp_venue activa con el disparador pedido habilitado (con su valor por defecto). */
async function relacionActiva(db: SupabaseClient, rrppId: string, localId: string, trigger: TriggerKey, porDefecto: boolean) {
  const { data } = await db
    .from('rrpp_venue')
    .select('comision_pct, tope_por_venta, triggers_activos')
    .eq('rrpp_id', rrppId).eq('local_id', localId).eq('estado', 'activa').maybeSingle()
  if (!data) return null
  const triggers = (data.triggers_activos ?? {}) as Record<string, boolean | undefined>
  const on = triggers[trigger] === undefined ? porDefecto : !!triggers[trigger]
  if (!on) return null
  return { comision_pct: Number(data.comision_pct) || 0, tope: data.tope_por_venta != null ? Number(data.tope_por_venta) : null }
}

/** Acumula la comisión en la liquidación mensual (rrpp, local, periodo). */
async function acumularLiquidacion(db: SupabaseClient, rrppId: string, localId: string, montoComision: number, numVentas: number): Promise<string | null> {
  const periodo = new Date().toISOString().slice(0, 7) // YYYY-MM
  const { data: existente } = await db
    .from('liquidacion_rrpp').select('id, monto_total, num_ventas')
    .eq('rrpp_id', rrppId).eq('local_id', localId).eq('periodo', periodo).maybeSingle()

  if (existente) {
    await db.from('liquidacion_rrpp').update({
      monto_total: round2(Number(existente.monto_total) + montoComision),
      num_ventas: Number(existente.num_ventas) + numVentas,
      updated_at: new Date().toISOString(),
    }).eq('id', existente.id)
    return existente.id
  }
  const { data: nueva } = await db
    .from('liquidacion_rrpp')
    .insert({ rrpp_id: rrppId, local_id: localId, periodo, monto_total: montoComision, num_ventas: numVentas, estado: 'pendiente' })
    .select('id').single()
  return nueva?.id ?? null
}

/**
 * Núcleo: resuelve el RRPP atribuido (first-binding-wins o señal last-touch),
 * crea/activa el binding y devuelve la comisión vigente para el disparador.
 * Devuelve null si no hay atribución o el disparador está apagado.
 */
async function resolverAtribucion(
  db: SupabaseClient,
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null },
  localId: string, eventoId: string | null, cookieRef: CookieRef,
  trigger: TriggerKey, porDefecto: boolean, mecanismoActivacion: 'compra_entrada' | 'barra_pedido',
): Promise<{ rrppId: string; comisionPct: number; tope: number | null } | null> {
  const contactoId = await resolverContacto(db, usuario)
  if (!contactoId) return null

  const ahoraIso = new Date().toISOString()
  const { data: bindingExistente } = await db
    .from('binding_rrpp').select('id, rrpp_id, estado')
    .eq('contacto_id', contactoId).eq('local_id', localId)
    .in('estado', ['pendiente', 'activo']).gt('expira_at', ahoraIso)
    .order('created_at', { ascending: true }).limit(1).maybeSingle()

  let rrppId: string
  if (bindingExistente) {
    rrppId = bindingExistente.rrpp_id
    if (bindingExistente.estado === 'pendiente') {
      await db.from('binding_rrpp').update({ estado: 'activo', activado_at: ahoraIso, mecanismo_activacion: mecanismoActivacion }).eq('id', bindingExistente.id)
    }
  } else {
    const señal = await resolverSeñal(db, usuario.id, cookieRef)
    if (!señal) return null
    rrppId = señal.rrpp_id
    const rel0 = await relacionActiva(db, rrppId, localId, trigger, porDefecto)
    if (!rel0) return null // sin relación activa o disparador apagado: no creamos binding
    await db.from('binding_rrpp').insert({
      contacto_id: contactoId, rrpp_id: rrppId, local_id: localId, evento_id: eventoId,
      estado: 'activo', mecanismo_creacion: señal.mecanismo, mecanismo_activacion: mecanismoActivacion,
      activado_at: ahoraIso, expira_at: new Date(Date.now() + VENTANA_MS).toISOString(),
    })
  }

  const rel = await relacionActiva(db, rrppId, localId, trigger, porDefecto)
  if (!rel) return null
  return { rrppId, comisionPct: rel.comision_pct, tope: rel.tope }
}

/**
 * Sólo lectura: ¿a qué RRPP se atribuiría una compra de entrada ahora mismo?
 * No crea contacto ni binding. Para mostrar "estás comprando con X" en el
 * checkout. Respeta first-binding-wins y la relación activa del disparador.
 */
export async function previsualizarRrppEntrada(db: SupabaseClient, usuarioId: string, localId: string, cookieRef: CookieRef): Promise<string | null> {
  const { data: contacto } = await db.from('contactos').select('id').eq('user_id', usuarioId).maybeSingle()
  if (contacto) {
    const { data: bind } = await db
      .from('binding_rrpp').select('rrpp_id')
      .eq('contacto_id', contacto.id).eq('local_id', localId)
      .in('estado', ['pendiente', 'activo']).gt('expira_at', new Date().toISOString())
      .order('created_at', { ascending: true }).limit(1).maybeSingle()
    if (bind) {
      const rel = await relacionActiva(db, bind.rrpp_id, localId, 'entrada_vendida', true)
      if (rel) return bind.rrpp_id
    }
  }
  const señal = await resolverSeñal(db, usuarioId, cookieRef)
  if (!señal) return null
  const rel = await relacionActiva(db, señal.rrpp_id, localId, 'entrada_vendida', true)
  return rel ? señal.rrpp_id : null
}

/** ¿Alguna de estas referencias ya tiene línea de liquidación? (idempotencia) */
async function yaDevengado(db: SupabaseClient, columna: 'entrada_id' | 'pedido_bar_id', ids: string[]): Promise<boolean> {
  const { data } = await db.from('liquidacion_rrpp_item').select('id').in(columna, ids).limit(1)
  return !!(data && data.length > 0)
}

/* ── Disparador: ENTRADA VENDIDA ─────────────────────────────────────── */
interface DevengoEntrada {
  db: SupabaseClient
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null }
  localId: string; eventoId: string | null
  entradaIds: string[]; precioLocalPorEntrada: number; cookieRef: CookieRef
}
export async function devengarComisionEntrada(p: DevengoEntrada): Promise<{ rrpp_id: string; monto_comision: number } | null> {
  if (p.entradaIds.length === 0) return null
  const at = await resolverAtribucion(p.db, p.usuario, p.localId, p.eventoId, p.cookieRef, 'entrada_vendida', true, 'compra_entrada')
  if (!at) return null
  if (await yaDevengado(p.db, 'entrada_id', p.entradaIds)) return null

  let comisionPorEntrada = round2(p.precioLocalPorEntrada * (at.comisionPct / 100))
  let comisionTotal = round2(comisionPorEntrada * p.entradaIds.length)
  if (at.tope != null && comisionTotal > at.tope) { comisionTotal = at.tope; comisionPorEntrada = round2(comisionTotal / p.entradaIds.length) }

  const liqId = await acumularLiquidacion(p.db, at.rrppId, p.localId, comisionTotal, p.entradaIds.length)
  if (!liqId) return null
  await p.db.from('liquidacion_rrpp_item').insert(p.entradaIds.map(eid => ({
    liquidacion_id: liqId, trigger_tipo: 'entrada_vendida', entrada_id: eid,
    monto_base: p.precioLocalPorEntrada, comision_pct: at.comisionPct, monto_comision: comisionPorEntrada,
  })))
  return { rrpp_id: at.rrppId, monto_comision: comisionTotal }
}

/* ── Disparador: CONSUMO DE BARRA ────────────────────────────────────── */
interface DevengoBar {
  db: SupabaseClient
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null }
  localId: string; pedidoBarId: string; subtotal: number; cookieRef: CookieRef
}
export async function devengarComisionBar(p: DevengoBar): Promise<{ rrpp_id: string; monto_comision: number } | null> {
  if (!p.pedidoBarId || p.subtotal <= 0) return null
  const at = await resolverAtribucion(p.db, p.usuario, p.localId, null, p.cookieRef, 'consumo_bar', false, 'barra_pedido')
  if (!at) return null
  if (await yaDevengado(p.db, 'pedido_bar_id', [p.pedidoBarId])) return null

  let comision = round2(p.subtotal * (at.comisionPct / 100))
  if (at.tope != null && comision > at.tope) comision = at.tope

  const liqId = await acumularLiquidacion(p.db, at.rrppId, p.localId, comision, 1)
  if (!liqId) return null
  await p.db.from('liquidacion_rrpp_item').insert({
    liquidacion_id: liqId, trigger_tipo: 'consumo_bar', pedido_bar_id: p.pedidoBarId,
    monto_base: p.subtotal, comision_pct: at.comisionPct, monto_comision: comision,
  })
  return { rrpp_id: at.rrppId, monto_comision: comision }
}
