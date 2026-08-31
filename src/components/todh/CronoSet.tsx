'use client'
import { useEffect, useState } from 'react'

// Crono de un set EN JUEGO (pedido 31-08): la bracket lo enseña en tiempo real
// a partir del epoch publicado en el mundo (setsEnJuego) cuando ambos
// jugadores dan «Todo listo» en la mesa. Se apaga solo: al escribirse el
// resultado (o abrirse disputa) el set sale del mapa y el chip desaparece.
export function CronoSet({ inicio }: { inicio: number }) {
  const [seg, setSeg] = useState(() => Math.max(0, Math.floor((Date.now() - inicio) / 1000)))
  useEffect(() => {
    const iv = setInterval(() => setSeg(Math.max(0, Math.floor((Date.now() - inicio) / 1000))), 1000)
    return () => clearInterval(iv)
  }, [inicio])
  const mm = String(Math.floor(seg / 60)).padStart(2, '0')
  const ss = String(seg % 60).padStart(2, '0')
  return (
    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-md text-[10px] font-bold font-mono-num bg-[#E63E54]/12 text-[#FF8A8A] border border-[#E63E54]/35">
      <span className="w-1.5 h-1.5 rounded-full bg-[#E63E54] animate-pulse-heat" /> {mm}:{ss}
    </span>
  )
}
