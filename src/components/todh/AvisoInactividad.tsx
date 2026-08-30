'use client'
import { useEffect } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { JUEGOS, juegosInactivos } from '@/lib/torneos/sample'
import { useT } from '@/lib/i18n'

// Vigía de inactividad (sección 6.1 del rediseño): si el jugador supera los 45
// días sin jugar un juego de su historial, deja en el buzón UN aviso de que su
// rango está perdiendo puntos (id fijo: ni se duplica ni reaparece tras
// descartarlo). No pinta nada — vive en el layout de la app de jugador.
export function AvisoInactividad() {
  const { t: tr } = useT()
  const avisar = useDemoStore(s => s.avisarInactividad)
  const rol = useSesionStore(s => s.sesion?.rol)
  // Cuenta nueva (fresca): sin historial no hay inactividad que avisar.
  const fresca = useSesionStore(s => !!s.sesion?.fresca)

  useEffect(() => {
    if (rol !== 'jugador' || fresca) return
    const inactivos = juegosInactivos()
    if (inactivos.length === 0) return
    const nombres = inactivos.map(x => JUEGOS[x.id]?.corto ?? x.id).join(', ')
    // F9: además del texto legacy, guarda la clave — la bandeja lo traduce en vivo.
    avisar(tr('inact.notiTitulo'), `${tr('inact.notiCuerpoA')} ${nombres}: ${tr('inact.notiCuerpoB')}`,
      { tituloKey: 'inact.notiTitulo', cuerpoKey: 'ntf.inactC', params: { juegos: nombres } })
  }, [rol, fresca, avisar, tr])

  return null
}
