'use client'
import { useEffect } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'

// (Backlog B, 31-08) Entrega del buzón cruzado: al entrar con una cuenta, las
// notis que otras cuentas dejaron a su nombre en el mundo ('todh-mundo') pasan
// a su buzón personal, y las inscripciones hechas en su nombre por el TO
// (promoción desde la cola de espera) entran a su cartera. Montado en los
// layouts (user) y (to); no pinta nada.
export function BuzonCuenta() {
  const email = useSesionStore(s => s.sesion?.email)
  const drenar = useDemoStore(s => s.drenarBuzon)
  useEffect(() => { if (email) drenar() }, [email, drenar])
  return null
}
