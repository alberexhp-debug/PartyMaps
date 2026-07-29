import { TORNEOS_SAMPLE, type TorneoSample } from '@/lib/torneos/sample'

// Vista EFECTIVA de los torneos para cualquier pantalla: creados por el TO +
// muestra, con las ediciones del TO aplicadas (nombre, plazas, fecha…) y sin
// los cancelados. Antes cada vista leía la muestra en crudo y las ediciones o
// cancelaciones del TO no se reflejaban fuera de la ficha y /gestionar.
// Las vistas pasan sus slices del store para controlar su propia memoización.
export function torneosEfectivos(
  creados: TorneoSample[],
  editados: Record<string, Partial<TorneoSample>>,
  cancelados: string[],
  opts?: { conCancelados?: boolean },
): TorneoSample[] {
  return [...creados, ...TORNEOS_SAMPLE]
    .filter(t => opts?.conCancelados || !cancelados.includes(t.id))
    .map(t => (editados[t.id] ? { ...t, ...editados[t.id] } : t))
}

// Aplica ediciones a un torneo suelto (para fichas/tickets por id).
export function conEdiciones(
  t: TorneoSample,
  editados: Record<string, Partial<TorneoSample>>,
): TorneoSample {
  return editados[t.id] ? { ...t, ...editados[t.id] } : t
}
