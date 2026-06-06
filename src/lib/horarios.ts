// =============================================================================
// estadoApertura — función PURA del estado de apertura de un local (PR-2)
//
// Tres estados visibles en el mapa, más "sin datos":
//   abierto      — ahora cae dentro de un tramo (o de un evento publicado)
//   abre_pronto  — abre en <= 2h (UMBRAL_ABRE_PRONTO_MIN); badge con la hora
//   cerrado      — ni abierto ni a punto; lleva la PRÓXIMA apertura calculada
//   sin_datos    — no hay horario ni eventos → se pinta normal, no se penaliza
//
// Es PURA: recibe `ahora` (no usa Date.now) → 100% testeable con la tabla §9 del
// doc 03. Se ejecuta EN EL CLIENTE, donde la zona del navegador ya es Europe/
// Madrid; por eso opera sobre la hora de pared local (getHours/getDay/...). Los
// tests se corren con TZ=Europe/Madrid para reproducir ese entorno.
//
// El horario es "por noches": cada noche guarda un tramo {apertura, cierre}. Si
// `cierre <= apertura` el tramo cruza la medianoche (cierra al día siguiente);
// `apertura === cierre` ("00:00"–"00:00") = 24h. Para saber si AHORA está dentro
// hay que mirar la noche de HOY y también la de AYER (su madrugada puede seguir
// abierta) — esa es la línea que evita el bug clásico (sábado 03:00 sigue siendo
// "la noche del viernes").
//
// Prioridades (doc 03 §6): toggle "cerrar esta noche" > evento publicado >
// horario semanal > sin datos.
// =============================================================================

import type { HorarioLocal } from '@/types'

export type EstadoApertura = 'abierto' | 'abre_pronto' | 'cerrado' | 'sin_datos'

/** Umbral del estado "abre pronto", en minutos. 2h: a las 22:00 ya ves vivo al que abre a las 00:00. */
export const UMBRAL_ABRE_PRONTO_MIN = 120

/** Evento publicado que puede cubrir "ahora" (su franja manda sobre el horario semanal). */
export interface EventoFranja {
  inicio: string // ISO
  fin: string | null // ISO; si null, la franja dura 8h desde inicio
}

export interface ResultadoEstado {
  estado: EstadoApertura
  /** abierto → hora de cierre "HH:MM"; abre_pronto → hora de apertura "HH:MM"; si no, null. */
  horaRelevante: string | null
  /** cerrado → ISO de la próxima apertura (para formatear "abre viernes a las 23:30"); si no, null. */
  proximaApertura: string | null
}

// getDay(): 0=domingo … 6=sábado. Claves SIN acento (coinciden con HorarioLocal).
const CLAVE_DIA: (keyof HorarioLocal)[] = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
// Nombres para mostrar (CON acento).
const NOMBRE_DIA = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

const MIN_DIA = 24 * 60
const MS_MIN = 60 * 1000
const MS_8H = 8 * 60 * MS_MIN

/** Date con la fecha de `base` (año/mes/día locales) y la hora "HH:MM". */
function conHora(base: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d
}

/** Date desplazado `dias` respecto a `base` (conserva la hora). */
function masDias(base: Date, dias: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + dias)
  return d
}

interface Tramo { inicio: Date; fin: Date }

/** El tramo de la noche cuya FECHA es la de `fechaNoche`, ya resuelto el cruce de medianoche. null si esa noche está cerrada. */
function tramoDeNoche(horario: HorarioLocal, fechaNoche: Date): Tramo | null {
  const dia = horario[CLAVE_DIA[fechaNoche.getDay()]]
  if (!dia) return null
  const inicio = conHora(fechaNoche, dia.apertura)
  let fin = conHora(fechaNoche, dia.cierre)
  // cierre <= apertura → cruza medianoche (incluye "00:00"–"00:00" = 24h: fin = inicio + 1 día).
  if (dia.cierre <= dia.apertura) fin = masDias(fin, 1)
  return { inicio, fin }
}

/** Tramos del horario que podrían cubrir "ahora": la noche de hoy y la de ayer (su madrugada). */
function tramosCandidatos(horario: HorarioLocal, ahora: Date): Tramo[] {
  return [tramoDeNoche(horario, masDias(ahora, -1)), tramoDeNoche(horario, ahora)].filter((t): t is Tramo => t !== null)
}

/** Franjas de evento como Date (fin = inicio + 8h si no viene). */
function franjasEvento(eventos: EventoFranja[]): Tramo[] {
  return eventos.map(e => {
    const inicio = new Date(e.inicio)
    return { inicio, fin: e.fin ? new Date(e.fin) : new Date(inicio.getTime() + MS_8H) }
  })
}

/** La próxima apertura (horario o evento) estrictamente posterior a `desde`, dentro de 7 días. null si no hay. */
function proximaAperturaDesde(horario: HorarioLocal | null, eventos: Tramo[], desde: Date): Date | null {
  let mejor: Date | null = null
  if (horario) {
    for (let off = 0; off <= 7; off++) {
      const t = tramoDeNoche(horario, masDias(desde, off))
      if (t && t.inicio > desde) { mejor = t.inicio; break } // se escanea hacia delante: el primero es el más cercano
    }
  }
  for (const ev of eventos) {
    if (ev.inicio > desde && (!mejor || ev.inicio < mejor)) mejor = ev.inicio
  }
  return mejor
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function tieneAlgunaNoche(horario: HorarioLocal | null): boolean {
  return !!horario && Object.values(horario).some(v => v != null)
}

/**
 * Estado de apertura del local en el instante `ahora`. Pura y testeable.
 * @param local   horario por noches (jsonb existente) + cerrado_hasta (toggle puntual)
 * @param ahora   instante a evaluar (hora local = Madrid en el cliente)
 * @param eventosHoy eventos publicados cuya franja podría cubrir ahora (de hoy y de ayer)
 */
export function estadoApertura(
  local: { horario: HorarioLocal | null; cerrado_hasta: string | null },
  ahora: Date,
  eventosHoy: EventoFranja[] = [],
): ResultadoEstado {
  const horario = local.horario
  const eventos = franjasEvento(eventosHoy)

  // Prioridad 1 — toggle "cerrar esta noche": manda sobre todo.
  if (local.cerrado_hasta) {
    const hasta = new Date(local.cerrado_hasta)
    if (hasta > ahora) {
      // La próxima apertura se busca DESPUÉS del cierre puntual (lo de esta noche está bloqueado).
      const prox = proximaAperturaDesde(horario, eventos, hasta)
      return { estado: 'cerrado', horaRelevante: null, proximaApertura: prox ? prox.toISOString() : null }
    }
  }

  // Sin horario ni eventos → sin datos (no se penaliza).
  if (!tieneAlgunaNoche(horario) && eventos.length === 0) {
    return { estado: 'sin_datos', horaRelevante: null, proximaApertura: null }
  }

  // Prioridad 2+3 — ¿ahora cae dentro de algún tramo (horario o evento)?
  const intervalos = [...(horario ? tramosCandidatos(horario, ahora) : []), ...eventos]
  const abiertos = intervalos.filter(t => t.inicio <= ahora && ahora < t.fin)
  if (abiertos.length > 0) {
    // "abierto" dura hasta el fin más tardío (máximo entre horario y evento, doc §8).
    const finMasTardio = abiertos.reduce((a, b) => (a.fin >= b.fin ? a : b)).fin
    return { estado: 'abierto', horaRelevante: hhmm(finMasTardio), proximaApertura: null }
  }

  // ¿Abre pronto? La próxima apertura a <= umbral.
  const prox = proximaAperturaDesde(horario, eventos, ahora)
  if (prox) {
    const minutos = (prox.getTime() - ahora.getTime()) / MS_MIN
    if (minutos <= UMBRAL_ABRE_PRONTO_MIN) {
      return { estado: 'abre_pronto', horaRelevante: hhmm(prox), proximaApertura: null }
    }
    return { estado: 'cerrado', horaRelevante: null, proximaApertura: prox.toISOString() }
  }

  // Cerrado sin próxima apertura conocida (p.ej. solo un evento ya pasado).
  return { estado: 'cerrado', horaRelevante: null, proximaApertura: null }
}

// ----- Formateadores de texto (para la ficha, el chip y la vista previa) -----

/** "23:30" tanto si recibe "HH:MM" como un ISO. */
export function formatHora(valor: string): string {
  return /^\d{1,2}:\d{2}$/.test(valor) ? valor : hhmm(new Date(valor))
}

/** "abre hoy a las 23:30" / "abre viernes a las 23:30" (según coincida o no la fecha con `ahora`). */
export function formatProximaApertura(iso: string, ahora: Date): string {
  const d = new Date(iso)
  const mismaFecha = d.getFullYear() === ahora.getFullYear() && d.getMonth() === ahora.getMonth() && d.getDate() === ahora.getDate()
  const cuando = mismaFecha ? 'hoy' : NOMBRE_DIA[d.getDay()]
  return `abre ${cuando} a las ${hhmm(d)}`
}

/** Etiqueta corta para el chip de la tarjeta de Explorar. null si sin datos (sin chip). */
export function etiquetaChipEstado(res: ResultadoEstado): string | null {
  switch (res.estado) {
    case 'abierto': return 'Abierto'
    case 'abre_pronto': return `Abre a las ${res.horaRelevante}`
    case 'cerrado': return 'Cerrado'
    case 'sin_datos': return null
  }
}

/** Línea de estado de la ficha del local. null si sin datos (la línea no aparece). */
export function textoEstadoFicha(res: ResultadoEstado, ahora: Date): string | null {
  switch (res.estado) {
    case 'abierto': return `Abierto · cierra a las ${res.horaRelevante}`
    case 'abre_pronto': return `Abre hoy a las ${res.horaRelevante}`
    case 'cerrado': return res.proximaApertura ? `Cerrado · ${formatProximaApertura(res.proximaApertura, ahora)}` : 'Cerrado'
    case 'sin_datos': return null
  }
}
