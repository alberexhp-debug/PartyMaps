import type { TorneoSample } from '@/lib/torneos/sample'

// ── Política de cancelaciones (F7 · spec §8) ──
// Norma ÚNICA para toda la app: cancelar avisando con al menos esta antelación
// devuelve el 100% automáticamente; con menos, la inscripción se pierde.
// La ventana es fija (24 h, propuesta aceptada provisionalmente en el spec).
export const CANCELLATION_WINDOW_HOURS = 24

// ¿Cancelar AHORA da derecho a devolución?
// El modelo demo no tiene fechas absolutas (`fechaLabel` es un texto tipo
// «Sáb 28 jun · 17:00») y por tanto no se puede restar contra un reloj real.
// Proxy determinista acordado: un torneo que empieza hoy o que ya está en
// directo (`esHoy || enDirecto`) queda a MENOS de 24 h → cancelar ya no
// devuelve el dinero; cualquier torneo futuro (mañana o más allá) está dentro
// de plazo → devolución automática del 100%.
// Con backend real esto será: `fechaInicio - now >= CANCELLATION_WINDOW_HOURS`.
export function puedeCancelarConDevolucion(t: Pick<TorneoSample, 'esHoy' | 'enDirecto'>): boolean {
  return !(t.esHoy || t.enDirecto)
}
