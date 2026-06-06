// Bloqueo suave al publicar (doc 01 §7): los 4 obligatorios salen del propio row del
// local (no necesitan counts), así el gate de "publicar evento / activar venta" es una
// función pura sobre el local. Mantener en sync con los pasos 'datos/horarios/fotos/aforo'
// de src/lib/onboarding/pasos.ts.
import type { Local } from '@/types'

type LocalGate = Partial<Pick<Local,
  'nombre' | 'direccion' | 'latitud' | 'longitud' | 'tipo_local' | 'musica' | 'horario' | 'imagenes' | 'aforo_por_dia' | 'aforo_maximo'
>>

export interface FaltanteObligatorio { id: string; titulo: string; ruta: string; tiempo: string }

const OBLIGATORIOS: (FaltanteObligatorio & { ok: (l: LocalGate) => boolean })[] = [
  {
    id: 'datos', titulo: 'Datos básicos', ruta: '/local-panel/configuracion?tab=info', tiempo: '2 min',
    ok: l => !!l.nombre?.trim() && !!l.direccion?.trim() && l.latitud != null && l.longitud != null && !!l.tipo_local && (l.musica?.length ?? 0) > 0,
  },
  {
    id: 'horarios', titulo: 'Horarios', ruta: '/local-panel/configuracion?tab=horario', tiempo: '1 min',
    ok: l => !!l.horario && Object.values(l.horario).some(v => v != null),
  },
  {
    id: 'fotos', titulo: '1 foto', ruta: '/local-panel/configuracion?tab=galeria', tiempo: '1 min',
    ok: l => (l.imagenes?.length ?? 0) >= 1,
  },
  {
    id: 'aforo', titulo: 'Aforo', ruta: '/local-panel/configuracion?tab=aforo', tiempo: '1 min',
    ok: l => (!!l.aforo_por_dia && Object.keys(l.aforo_por_dia).length > 0) || (l.aforo_maximo ?? 0) > 0,
  },
]

export function faltantesObligatorios(local: LocalGate): FaltanteObligatorio[] {
  return OBLIGATORIOS.filter(o => !o.ok(local)).map(({ id, titulo, ruta, tiempo }) => ({ id, titulo, ruta, tiempo }))
}

export function obligatoriosCompletos(local: LocalGate): boolean {
  return faltantesObligatorios(local).length === 0
}
