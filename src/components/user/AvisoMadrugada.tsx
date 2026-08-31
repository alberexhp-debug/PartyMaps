'use client'
import { useEffect, useState } from 'react'
import { useMapStore } from '@/lib/stores/useMapStore'
import { X } from '@/components/todh/iconosTorneum'
import { Moon } from 'lucide-react'

/**
 * Aviso proactivo de madrugada: en horas de cierre sugiere ver los sitios y
 * afters que siguen abiertos. Solo de 0:00 a 6:59, descartable. Activa el
 * filtro de afters del mapa in situ (el mapa lee del store y se refiltra).
 */
export function AvisoMadrugada() {
  const [visible, setVisible] = useState(false)
  const setFiltros = useMapStore(s => s.setFiltros)
  const yaAfters = useMapStore(s => s.filtros.solo_afters)

  useEffect(() => {
    const h = new Date().getHours()
    if (h >= 0 && h < 7) setVisible(true)
  }, [])

  if (!visible || yaAfters) return null
  return (
    <div className="fixed bottom-20 left-3 right-3 z-40 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-2xl border border-[#7C5CFF]/30 bg-[#15101F]/95 px-3.5 py-2.5 shadow-lg backdrop-blur-md">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/20 text-[#C9BCFF]"><Moon size={17} /></span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-white">Es de madrugada</p>
          <p className="text-xs text-[#A0A0B8]">Mira los sitios y afters que siguen abiertos ahora.</p>
        </div>
        <button onClick={() => { setFiltros({ solo_afters: true }); setVisible(false) }}
          className="shrink-0 rounded-xl bg-[#7C5CFF] px-3 py-1.5 text-xs font-bold text-white">Ver afters</button>
        <button onClick={() => setVisible(false)} aria-label="Cerrar aviso" className="shrink-0 text-[#6B6B85] hover:text-white"><X size={16} /></button>
      </div>
    </div>
  )
}
