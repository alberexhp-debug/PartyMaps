'use client'
import { useEffect, useState, useCallback } from 'react'

export interface PasoTour { sel: string; texto: string }

/**
 * Tour de coachmarks (doc 01 §14.5). Recorre elementos marcados con `data-tour-id`,
 * los recorta sobre un fondo oscuro y muestra un globo con el texto. "Saltar" y Escape
 * cierran; al terminar llama onDone. Cero dependencias.
 */
export function Tour({ steps, active, onDone }: { steps: PasoTour[]; active: boolean; onDone: () => void }) {
  const [i, setI] = useState(0)
  const [rect, setRect] = useState<DOMRect | null>(null)

  const medir = useCallback(() => {
    const el = document.querySelector(`[data-tour-id="${steps[i]?.sel}"]`)
    if (el) { el.scrollIntoView({ block: 'center', behavior: 'smooth' }) ; setRect(el.getBoundingClientRect()) }
    else setRect(null)
  }, [i, steps])

  useEffect(() => { if (active) setI(0) }, [active])
  useEffect(() => {
    if (!active) return
    medir()
    const on = () => medir()
    window.addEventListener('resize', on); window.addEventListener('scroll', on, true)
    const t = setTimeout(medir, 350) // tras el scroll suave
    return () => { window.removeEventListener('resize', on); window.removeEventListener('scroll', on, true); clearTimeout(t) }
  }, [active, medir])
  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDone() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [active, onDone])

  if (!active || steps.length === 0) return null
  const total = steps.length
  const next = () => { if (i + 1 < total) setI(i + 1); else onDone() }

  const pad = 6
  const hueco = rect ? { top: rect.top - pad, left: rect.left - pad, width: rect.width + pad * 2, height: rect.height + pad * 2 } : null
  const arriba = rect ? rect.bottom + 180 > window.innerHeight : false
  const globoStyle: React.CSSProperties = rect
    ? (arriba
      ? { left: Math.max(12, Math.min(rect.left, window.innerWidth - 312)), bottom: window.innerHeight - rect.top + 12 }
      : { left: Math.max(12, Math.min(rect.left, window.innerWidth - 312)), top: rect.bottom + 12 })
    : { left: '50%', top: '50%', transform: 'translate(-50%,-50%)' }

  return (
    <div className="fixed inset-0 z-[90]" onClick={() => {}}>
      {hueco
        ? <div className="absolute rounded-2xl pointer-events-none" style={{ ...hueco, boxShadow: '0 0 0 9999px rgba(7,7,13,0.80)', border: '2px solid #E0455E' }} />
        : <div className="absolute inset-0" style={{ background: 'rgba(7,7,13,0.80)' }} />}
      <div className="absolute max-w-[300px] card-premium p-4 animate-fade-in" style={globoStyle} onClick={e => e.stopPropagation()}>
        <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B85] mb-1">Guía · {i + 1}/{total}</p>
        <p className="text-sm text-white leading-relaxed">{steps[i].texto}</p>
        <div className="flex items-center justify-between mt-3">
          <button onClick={onDone} className="text-xs text-[#8B8BA8] hover:text-white">Saltar</button>
          <button onClick={next} className="btn-primary text-sm px-4">{i + 1 < total ? 'Entendido' : 'Listo'}</button>
        </div>
      </div>
    </div>
  )
}
