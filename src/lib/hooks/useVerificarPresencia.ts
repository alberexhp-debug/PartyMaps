'use client'
import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'

// Doc6 §1.2: la presencia se re-verifica cada 20 minutos.
// Si el usuario sale del radio, registramos salida_at en su checkin activo y
// disparamos onSalida() para que la UI bloquee la participación en módulos.

const INTERVALO_MS = 20 * 60 * 1000          // 20 min
const TOLERANCIA_PCT = 0.2                   // +20% en zonas con GPS débil (sótanos, locales con mucho metal)

function distanciaMetros(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

interface Params {
  checkinId: string | null
  localLat: number
  localLng: number
  radioMetros: number
  onSalida?: () => void
}

export function useVerificarPresencia({ checkinId, localLat, localLng, radioMetros, onSalida }: Params) {
  const onSalidaRef = useRef(onSalida)
  useEffect(() => { onSalidaRef.current = onSalida }, [onSalida])

  useEffect(() => {
    if (!checkinId || typeof window === 'undefined' || !navigator.geolocation) return

    const radioConTolerancia = radioMetros * (1 + TOLERANCIA_PCT)

    let abortado = false

    async function verificar() {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, maximumAge: 60000 })
        )
        if (abortado) return
        const distancia = distanciaMetros(pos.coords.latitude, pos.coords.longitude, localLat, localLng)
        if (distancia > radioConTolerancia) {
          await supabase.from('checkins')
            .update({ salida_at: new Date().toISOString() })
            .eq('id', checkinId)
            .is('salida_at', null)
          onSalidaRef.current?.()
        }
      } catch {
        // GPS no disponible o permiso denegado: no marcamos salida, solo no actualizamos
      }
    }

    const id = window.setInterval(verificar, INTERVALO_MS)
    return () => { abortado = true; window.clearInterval(id) }
  }, [checkinId, localLat, localLng, radioMetros])
}
