'use client'
import { RotateCcw } from '@/components/todh/iconosTorneum'
import { cn } from '@/lib/utils'

interface PullIndicatorProps {
  pullDistance: number
  progress: number      // 0-1
  refreshing: boolean
  threshold: number
}

/**
 * Indicador visual del pull-to-refresh. Se monta arriba del contenido y
 * traduce el progreso a una rotación + opacidad. Cuando refreshing=true
 * gira en bucle.
 */
export function PullIndicator({ pullDistance, progress, refreshing, threshold }: PullIndicatorProps) {
  if (pullDistance === 0 && !refreshing) return null
  const rotation = refreshing ? 0 : progress * 360
  const filled = progress >= 1 || refreshing
  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] flex justify-center pointer-events-none safe-top"
      style={{ height: pullDistance, transition: refreshing ? 'none' : 'height 0.18s cubic-bezier(0.4,0,0.2,1)' }}
    >
      <div className="flex items-center justify-center" style={{ height: pullDistance }}>
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200',
            filled ? 'bg-[#B6FF3A] shadow-[0_6px_18px_-4px_rgba(182, 255, 58,0.55)]' : 'glass-strong'
          )}
          style={{
            opacity: Math.min(1, pullDistance / (threshold * 0.4)),
            transform: `scale(${0.6 + progress * 0.4})`,
          }}
        >
          <RotateCcw
            size={16}
            className={cn(filled ? 'text-white' : 'text-[#A0A0B8]', refreshing && 'animate-spin')}
            style={{ transform: refreshing ? undefined : `rotate(${rotation}deg)`, transition: 'transform 0.05s linear' }}
          />
        </div>
      </div>
    </div>
  )
}
