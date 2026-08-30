'use client'
import { useEffect, useState } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Clock, ShieldAlert } from 'lucide-react'
import type { EstadoLocal } from '@/types'

/**
 * Aviso del estado del local dentro del panel. Lee el estado FRESCO del
 * servidor (no el del store persistido) para que, en cuanto el admin apruebe o
 * suspenda el local, el dueño lo vea sin re-login. Reusa locales.estado (§2.3).
 *  - pendiente_verificacion → "en revisión" (ámbar)
 *  - suspendido            → "suspendida" (rojo)
 *  - activo / eliminado / desconocido → no muestra nada
 */
export function AvisoEstadoLocal() {
  const { local, setLocal } = useLocalPanelStore()
  const [estado, setEstado] = useState<EstadoLocal | null>(local?.estado ?? null)

  useEffect(() => {
    let vivo = true
    const cargar = () => fetch('/api/local-panel/estado')
      .then(r => (r.ok ? r.json() : null))
      .then((d: { estado?: EstadoLocal | null } | null) => {
        if (!vivo || !d || d.estado == null) return
        setEstado(d.estado)
        // Sincroniza el store si cambió (p. ej. recién aprobado).
        const actual = useLocalPanelStore.getState().local
        if (actual && actual.estado !== d.estado) setLocal({ ...actual, estado: d.estado })
      })
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 60000) // por si lo aprueban con la sesión abierta
    return () => { vivo = false; clearInterval(t) }
  }, [setLocal])

  if (estado === 'pendiente_verificacion') {
    return (
      <div className="sticky top-0 z-30 flex items-start gap-3 border-b border-[#F39C12]/25 bg-[#F39C12]/[0.09] px-4 py-2.5 backdrop-blur-md">
        <Clock size={17} className="mt-0.5 shrink-0 text-[#F39C12]" />
        <p className="text-xs leading-relaxed text-[#E7CB86] sm:text-sm">
          <span className="font-semibold text-white">Tu local está en revisión.</span>{' '}
          Aún no es visible en el mapa. El equipo de Torneum lo revisa y lo activa en 24-48&nbsp;h; te avisaremos al aprobarlo. Mientras tanto, puedes ir dejando tu perfil a punto.
        </p>
      </div>
    )
  }
  if (estado === 'suspendido') {
    return (
      <div className="sticky top-0 z-30 flex items-start gap-3 border-b border-[#B6FF3A]/30 bg-[#B6FF3A]/[0.09] px-4 py-2.5 backdrop-blur-md">
        <ShieldAlert size={17} className="mt-0.5 shrink-0 text-[#B6FF3A]" />
        <p className="text-xs leading-relaxed text-[#D9FF9E] sm:text-sm">
          <span className="font-semibold text-white">Tu cuenta está suspendida.</span>{' '}
          Tu local no es visible ahora mismo. Escríbenos desde Soporte para reactivarla.
        </p>
      </div>
    )
  }
  return null
}
