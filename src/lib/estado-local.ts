// Puente entre los datos de un local (horario + cerrado_hasta + eventos del join) y la
// función pura `estadoApertura`. Única fuente de verdad para mapa, Explorar y ficha:
// así la ventana de eventos "cercanos" se calcula igual en todas partes.
import { estadoApertura, type EventoFranja, type ResultadoEstado } from './horarios'
import type { HorarioLocal } from '@/types'

export interface LocalEstado {
  horario?: HorarioLocal | null
  cerrado_hasta?: string | null
  eventos?: { estado: string; fecha_inicio: string; fecha_fin?: string | null }[]
}

// Eventos publicados cuya franja podría cubrir "ahora" (de anoche a mañana), para aplicar
// la prioridad evento > horario sin arrastrar eventos lejanos como falsa "próxima apertura".
export function franjasEventoCercanas(l: LocalEstado, ahora: Date): EventoFranja[] {
  if (!l.eventos?.length) return []
  const desde = new Date(ahora); desde.setDate(desde.getDate() - 1); desde.setHours(0, 0, 0, 0)
  const hasta = new Date(ahora); hasta.setDate(hasta.getDate() + 1); hasta.setHours(23, 59, 59, 999)
  return l.eventos
    .filter(e => e.estado === 'publicado' && e.fecha_inicio)
    .filter(e => { const t = new Date(e.fecha_inicio).getTime(); return t >= desde.getTime() && t <= hasta.getTime() })
    .map(e => ({ inicio: e.fecha_inicio, fin: e.fecha_fin ?? null }))
}

export function estadoDeLocal(l: LocalEstado, ahora: Date): ResultadoEstado {
  return estadoApertura(
    { horario: l.horario ?? null, cerrado_hasta: l.cerrado_hasta ?? null },
    ahora,
    franjasEventoCercanas(l, ahora),
  )
}
