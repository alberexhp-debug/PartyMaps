'use client'
import { AlertCircle, RotateCcw, WifiOff } from 'lucide-react'
import { Button } from './Button'

interface ErrorStateProps {
  /** Título principal — qué pasó */
  titulo?: string
  /** Mensaje secundario — qué puede hacer el usuario */
  mensaje?: string
  /** Si se aporta, muestra botón "Reintentar" */
  onReintentar?: () => void
  /** Variante: error genérico o sin conexión */
  variante?: 'error' | 'offline'
}

/**
 * Estado de error reutilizable. Se muestra cuando un fetch falla o cuando
 * el navegador detecta que está offline. SIEMPRE ofrece acción al usuario.
 */
export function ErrorState({
  titulo,
  mensaje,
  onReintentar,
  variante = 'error',
}: ErrorStateProps) {
  const Icon = variante === 'offline' ? WifiOff : AlertCircle
  const color = variante === 'offline' ? '#F39C12' : '#E94560'
  const tituloFinal = titulo || (variante === 'offline' ? 'Sin conexión' : 'Algo ha fallado')
  const mensajeFinal = mensaje || (variante === 'offline'
    ? 'Revisa tu Wi-Fi o datos móviles y vuelve a intentarlo.'
    : 'Vuelve a intentarlo en un momento. Si sigue sin funcionar, contacta con soporte.')

  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 px-6 text-center">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}15`, border: `1px solid ${color}40` }}
      >
        <Icon size={28} style={{ color }} />
      </div>
      <div>
        <p className="text-xl font-bold text-white text-display tracking-tight">{tituloFinal}</p>
        <p className="text-sm text-[#A0A0B8] mt-1.5 max-w-xs">{mensajeFinal}</p>
      </div>
      {onReintentar && (
        <Button variant="secondary" onClick={onReintentar}>
          <RotateCcw size={14} /> Reintentar
        </Button>
      )}
    </div>
  )
}

/**
 * Skeletons que tienen la forma del contenido real. Más calmados visualmente
 * que `animate-pulse` (shimmer suave) y con la silueta exacta de la card.
 */
export function SkeletonLocalCard() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-24 h-28 skeleton flex-shrink-0" />
        <div className="flex-1 p-4 space-y-2.5">
          <div className="h-4 skeleton rounded w-2/3" />
          <div className="h-3 skeleton rounded w-1/3" />
          <div className="flex gap-2 mt-3">
            <div className="h-2 skeleton rounded flex-1" />
          </div>
          <div className="flex justify-between mt-1">
            <div className="h-3 skeleton rounded w-12" />
            <div className="h-3 skeleton rounded w-8" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function SkeletonSuscritoCard() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="h-28 skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-1/3" />
      </div>
    </div>
  )
}

export function SkeletonPlanCard() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="flex items-stretch">
        <div className="w-24 h-32 skeleton flex-shrink-0" />
        <div className="flex-1 p-3.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="h-4 skeleton rounded w-2/3" />
            <div className="h-3 skeleton rounded w-1/3" />
            <div className="h-3 skeleton rounded w-full" />
          </div>
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between">
              <div className="h-3 skeleton rounded w-12" />
              <div className="h-3 skeleton rounded w-8" />
            </div>
            <div className="h-1 skeleton rounded" />
            <div className="h-8 skeleton rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
