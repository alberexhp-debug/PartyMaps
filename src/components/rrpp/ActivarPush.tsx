'use client'
import { Bell, BellOff, BellRing } from 'lucide-react'
import { usePushSubscription } from '@/lib/hooks/usePushSubscription'
import { SectionCard, SectionTitle } from '@/components/local-panel/ui'

/** Activar/desactivar notificaciones push del RRPP (invitaciones, mensajes, cobros). */
export function ActivarPushRRPP() {
  const { estado, trabajando, activar, desactivar } = usePushSubscription()
  if (estado === 'no-soportado') return null

  const activo = estado === 'activado'
  const Icono = activo ? BellRing : estado === 'denegado' ? BellOff : Bell

  return (
    <SectionCard>
      <SectionTitle icon={Icono} acento="gold">Notificaciones</SectionTitle>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-white">Avisos en el móvil</p>
          <p className="text-[#8B8BA8] text-xs mt-0.5">
            {estado === 'denegado'
              ? 'Bloqueadas en el navegador. Actívalas desde los ajustes del sitio.'
              : activo
                ? 'Te avisamos de invitaciones, mensajes y cobros marcados.'
                : 'Recibe invitaciones de locales, mensajes y avisos de cobro.'}
          </p>
        </div>
        {estado !== 'denegado' && (
          <button onClick={() => (activo ? desactivar() : activar())} disabled={trabajando}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activo ? 'bg-emerald-400/20 text-emerald-300' : 'bg-[#B6FF3A] text-[#0A0A0F]'
            }`}>
            {trabajando ? '…' : activo ? 'Activadas' : 'Activar'}
          </button>
        )}
      </div>
    </SectionCard>
  )
}
