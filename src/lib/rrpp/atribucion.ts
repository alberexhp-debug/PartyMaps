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
 * activo para (contacto, local), la compra se atribuye a ese RRPP aunque la
 * señal last-touch apunte a otro. La señal solo decide al crear el binding.
 *
 * Devenga la comisión sobre el precio que cobra el local (precio_local),
 * usando `rrpp_venue.comision_pct` con su `tope_por_venta`, y la acumula en
 * `liquidacion_rrpp` (+ una línea por entrada en `liquidacion_rrpp_item`).
 *
 * NUNCA debe romper el checkout: el llamador la envuelve y la ignora si falla.
 */

const VENTANA_MS = 24 * 60 * 60 * 1000

export type CookieRef = { r: string; t: number } | null

/** Parsea la cookie `rumbo_ref`. Devuelve null si ausente/ inválida/ caducada. */
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
async function resolverSeñal(
  db: SupabaseClient,
  usuarioId: string,
  cookieRef: CookieRef,
): Promise<Señal | null> {
  const ahora = Date.now()
  const candidatas: Señal[] = []

  if (cookieRef && ahora - cookieRef.t < VENTANA_MS) {
    candidatas.push({ rrpp_id: cookieRef.r, ts: cookieRef.t, mecanismo: 'link_compra' })
  }

  const { data: u } = await db
    .from('usuarios')
    .select('referido_codigo, referido_at')
    .eq('id', usuarioId)
    .maybeSingle()

  if (u?.referido_codigo && u.referido_at) {
    const t = new Date(u.referido_at).getTime()
    if (ahora - t < VENTANA_MS) {
      const { data: rrpp } = await db
        .from('rrpp')
        .select('id')
        .ilike('slug', u.referido_codigo.trim())
        .eq('activo', true)
        .maybeSingle()
      if (rrpp) candidatas.push({ rrpp_id: rrpp.id, ts: t, mecanismo: 'qr_rrpp' })
    }
  }

  if (candidatas.length === 0) return null
  // Last-touch: la señal más reciente gana.
  return candidatas.sort((a, b) => b.ts - a.ts)[0]
}

/** Encuentra o crea el contacto CRM del usuario registrado. */
async function resolverContacto(
  db: SupabaseClient,
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null },
): Promise<string | null> {
  const { data: existente } = await db
    .from('contactos').select('id').eq('user_id', usuario.id).maybeSingle()
  if (existente) return existente.id

  // contactos exige email o teléfono (trigger). Si no hay ninguno, no podemos.
  if (!usuario.email && !usuario.telefono) return null

  const { data: creado } = await db
    .from('contactos')
    .insert({
      user_id: usuario.id,
      email: usuario.email ?? null,
      telefono: usuario.telefono ?? null,
      nombre: usuario.nombre ?? null,
      fuente_origen: 'checkout_entrada',
    })
    .select('id').single()
  return creado?.id ?? null
}

/** rrpp_venue activa con trigger de entrada para (rrpp, local). */
async function relacionActiva(db: SupabaseClient, rrppId: string, localId: string) {
  const { data } = await db
    .from('rrpp_venue')
    .select('comision_pct, tope_por_venta, triggers_activos, estado')
    .eq('rrpp_id', rrppId)
    .eq('local_id', localId)
    .eq('estado', 'activa')
    .maybeSingle()
  if (!data) return null
  const triggers = (data.triggers_activos ?? {}) as { entrada_vendida?: boolean }
  if (triggers.entrada_vendida === false) return null // por defecto true si no está definido
  return { comision_pct: Number(data.comision_pct) || 0, tope: data.tope_por_venta != null ? Number(data.tope_por_venta) : null }
}

/** Acumula la comisión en la liquidación mensual (rrpp, local, periodo). */
async function acumularLiquidacion(
  db: SupabaseClient,
  rrppId: string, localId: string, montoComision: number, numVentas: number,
): Promise<string | null> {
  const periodo = new Date().toISOString().slice(0, 7) // YYYY-MM
  const { data: existente } = await db
    .from('liquidacion_rrpp')
    .select('id, monto_total, num_ventas')
    .eq('rrpp_id', rrppId).eq('local_id', localId).eq('periodo', periodo)
    .maybeSingle()

  if (existente) {
    await db.from('liquidacion_rrpp').update({
      monto_total: Number(existente.monto_total) + montoComision,
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

interface DevengoParams {
  db: SupabaseClient
  usuario: { id: string; nombre?: string | null; telefono?: string | null; email?: string | null }
  localId: string
  eventoId: string | null
  entradaIds: string[]
  precioLocalPorEntrada: number
  cookieRef: CookieRef
}

/**
 * Atribuye y devenga la comisión de una compra de entradas.
 * Idempotencia básica: no re-devenga si las entradas ya tienen línea.
 * Devuelve un resumen o null si no hubo atribución.
 */
export async function devengarComisionEntrada(p: DevengoParams): Promise<{ rrpp_id: string; monto_comision: number } | null> {
  const { db, usuario, localId, eventoId, entradaIds, precioLocalPorEntrada, cookieRef } = p
  if (entradaIds.length === 0) return null

  const contactoId = await resolverContacto(db, usuario)
  if (!contactoId) return null

  // ── First-binding-wins: ¿hay ya un binding activo de esta noche? ──
  const ahoraIso = new Date().toISOString()
  const { data: bindingExistente } = await db
    .from('binding_rrpp')
    .select('id, rrpp_id, estado')
    .eq('contacto_id', contactoId)
    .eq('local_id', localId)
    .in('estado', ['pendiente', 'activo'])
    .gt('expira_at', ahoraIso)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  let rrppId: string
  let bindingId: string

  if (bindingExistente) {
    rrppId = bindingExistente.rrpp_id
    bindingId = bindingExistente.id
    if (bindingExistente.estado === 'pendiente') {
      await db.from('binding_rrpp').update({ estado: 'activo', activado_at: ahoraIso, mecanismo_activacion: 'compra_entrada' }).eq('id', bindingId)
    }
  } else {
    const señal = await resolverSeñal(db, usuario.id, cookieRef)
    if (!señal) return null
    rrppId = señal.rrpp_id
    // Verificar relación activa ANTES de crear el binding.
    const rel0 = await relacionActiva(db, rrppId, localId)
    if (!rel0) return null
    const expira = new Date(Date.now() + VENTANA_MS).toISOString()
    const { data: nuevo } = await db
      .from('binding_rrpp')
      .insert({
        contacto_id: contactoId, rrpp_id: rrppId, local_id: localId, evento_id: eventoId,
        estado: 'activo', mecanismo_creacion: señal.mecanismo, mecanismo_activacion: 'compra_entrada',
        activado_at: ahoraIso, expira_at: expira,
      })
      .select('id').single()
    if (!nuevo) return null
    bindingId = nuevo.id
  }

  // Relación activa del RRPP atribuido en este local (puede diferir del de la señal si ganó un binding previo).
  const rel = await relacionActiva(db, rrppId, localId)
  if (!rel) return null

  // Idempotencia: si alguna de estas entradas ya tiene línea, no re-devengamos.
  const { data: yaDevengadas } = await db
    .from('liquidacion_rrpp_item').select('id').in('entrada_id', entradaIds).limit(1)
  if (yaDevengadas && yaDevengadas.length > 0) return null

  // Comisión por entrada (con tope por venta aplicado a la suma de la compra).
  const round2 = (n: number) => Math.round(n * 100) / 100
  let comisionPorEntrada = round2(precioLocalPorEntrada * (rel.comision_pct / 100))
  let comisionTotal = round2(comisionPorEntrada * entradaIds.length)
  if (rel.tope != null && comisionTotal > rel.tope) {
    comisionTotal = rel.tope
    comisionPorEntrada = round2(comisionTotal / entradaIds.length)
  }

  const liqId = await acumularLiquidacion(db, rrppId, localId, comisionTotal, entradaIds.length)
  if (!liqId) return null

  await db.from('liquidacion_rrpp_item').insert(
    entradaIds.map(eid => ({
      liquidacion_id: liqId,
      trigger_tipo: 'entrada_vendida',
      entrada_id: eid,
      monto_base: precioLocalPorEntrada,
      comision_pct: rel.comision_pct,
      monto_comision: comisionPorEntrada,
    }))
  )

  return { rrpp_id: rrppId, monto_comision: comisionTotal }
}
