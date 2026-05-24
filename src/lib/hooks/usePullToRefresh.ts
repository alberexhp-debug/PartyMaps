'use client'
import { useEffect, useRef, useState } from 'react'

const THRESHOLD = 70           // px de pull para considerar refresco
const MAX_PULL = 100           // límite visual del indicador
const RESISTANCE = 0.5         // factor de "resistencia" en el pull

interface UsePullToRefreshOpts {
  /** Función async que recarga datos. Debe devolver una promesa. */
  onRefresh: () => Promise<unknown> | void
  /** Si false, deshabilita el gesto (útil en SSR o desktop). */
  enabled?: boolean
}

/**
 * Pull-to-refresh nativo para PWAs móviles. Sin librerías externas.
 * Solo activo en touch screens y cuando window.scrollY === 0.
 * Devuelve `pullDistance` (0-MAX_PULL) y `refreshing` para pintar UI.
 */
export function usePullToRefresh({ onRefresh, enabled = true }: UsePullToRefreshOpts) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)
  const pulling = useRef(false)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    if (!('ontouchstart' in window)) return

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshing) return
      startY.current = e.touches[0].clientY
      pulling.current = true
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling.current || startY.current == null) return
      const dy = e.touches[0].clientY - startY.current
      if (dy <= 0) { setPullDistance(0); return }
      // Solo activamos pull si seguimos en top
      if (window.scrollY > 0) {
        pulling.current = false
        setPullDistance(0)
        return
      }
      const resisted = Math.min(MAX_PULL, dy * RESISTANCE)
      setPullDistance(resisted)
    }

    const onTouchEnd = async () => {
      if (!pulling.current) return
      pulling.current = false
      const d = pullDistance
      startY.current = null
      if (d >= THRESHOLD) {
        setRefreshing(true)
        setPullDistance(THRESHOLD)
        try { await onRefresh() } catch {}
        setRefreshing(false)
        setPullDistance(0)
      } else {
        setPullDistance(0)
      }
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled, onRefresh, pullDistance, refreshing])

  const progress = Math.min(1, pullDistance / THRESHOLD)
  return { pullDistance, progress, refreshing, threshold: THRESHOLD }
}
