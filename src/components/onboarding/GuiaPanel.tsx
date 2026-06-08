'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { HelpCircle } from 'lucide-react'
import { Tour } from '@/components/onboarding/Tour'
import { GUIAS_PANEL } from '@/lib/onboarding/guiasPanel'

/**
 * Guía por página del panel de local. Se monta UNA vez en el layout y, según la
 * ruta actual, muestra la guía de esa página (textos de guiasPanel.ts):
 *   - se lanza sola la PRIMERA vez que entras a cada página (se recuerda en
 *     localStorage, por página),
 *   - deja un botón flotante «?» para volver a verla cuando quieras.
 * El dashboard se excluye: tiene su propio tour anclado.
 */
const KEY = (zona: string) => `rumbo_guia_panel_${zona}_v1`

function zonaDe(pathname: string): string | null {
  const m = pathname.match(/^\/local-panel\/([^/?#]+)/)
  return m ? m[1] : null
}

export function GuiaPanel() {
  const pathname = usePathname()
  const zona = zonaDe(pathname)
  const pasos = zona ? GUIAS_PANEL[zona] : undefined
  const [activa, setActiva] = useState(false)

  // Auto-lanza la guía la primera vez que se visita esta página.
  useEffect(() => {
    if (!zona || !pasos) { setActiva(false); return }
    let visto = true
    try { visto = localStorage.getItem(KEY(zona)) === '1' } catch { /* SSR / privado */ }
    if (!visto) {
      const t = setTimeout(() => setActiva(true), 450) // deja respirar a la página
      return () => clearTimeout(t)
    }
    setActiva(false)
  }, [zona, pasos])

  if (!zona || !pasos) return null

  const marcarVisto = () => {
    try { localStorage.setItem(KEY(zona), '1') } catch { /* ignore */ }
  }
  const cerrar = () => { marcarVisto(); setActiva(false) }
  const abrir = () => setActiva(true)

  return (
    <>
      {/* Botón de ayuda: relanza la guía de esta página. En móvil va abajo-IZQUIERDA
          para no chocar con el pill "Terminar (N)" de Puesta a punto (abajo-derecha);
          en escritorio va abajo-derecha (allí el badge vive en el sidebar, no flota). */}
      {!activa && (
        <button
          onClick={abrir}
          aria-label="Ver la guía de esta página"
          className="fixed left-4 bottom-20 md:left-auto md:right-6 md:bottom-6 z-30 w-11 h-11 rounded-full glass-strong border border-white/12 text-[#E0455E] flex items-center justify-center shadow-lg hover:bg-white/5 transition-colors"
        >
          <HelpCircle size={22} />
        </button>
      )}
      <Tour steps={pasos} active={activa} onDone={cerrar} />
    </>
  )
}
