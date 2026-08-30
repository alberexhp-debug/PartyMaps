'use client'
import { useEffect, useState } from 'react'
import { BrandLoader } from './Spinner'

const STORAGE_KEY = 'pm_splash_seen_session'

/**
 * Splash que cubre toda la app durante el primer render de la sesión.
 * Se oculta automáticamente tras 1.2s con fade-out. No se vuelve a mostrar
 * en la misma pestaña (sessionStorage).
 */
export function SplashScreen() {
  const [visible, setVisible] = useState(true)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(STORAGE_KEY)) {
      setVisible(false)
      return
    }
    sessionStorage.setItem(STORAGE_KEY, '1')
    const t1 = setTimeout(() => setFading(true), 450)
    const t2 = setTimeout(() => setVisible(false), 750)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center transition-opacity duration-500"
      style={{
        background: 'radial-gradient(ellipse at center, rgba(124,92,255,0.15), #06060C 70%)',
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      <div className="relative">
        <BrandLoader size={96} />
      </div>
      <div className="mt-8 flex flex-col items-center gap-2">
        <p className="text-2xl font-bold text-white text-display tracking-tight">Torneum</p>
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#A0A0B8] font-bold">Torneos presenciales</p>
      </div>
    </div>
  )
}
