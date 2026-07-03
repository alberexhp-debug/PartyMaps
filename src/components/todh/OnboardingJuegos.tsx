'use client'
import { useEffect, useState } from 'react'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { Check } from 'lucide-react'

// Onboarding de primera visita: eliges tus juegos y la app se personaliza
// (sección "Tus juegos" en Explorar, ranking abierto por tu juego principal).
export function OnboardingJuegos() {
  const visto = useDemoStore(s => s.onboardingVisto)
  const guardar = useDemoStore(s => s.setJuegosFavoritos)
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState<string[]>([])

  useEffect(() => {
    if (visto) return
    const t = setTimeout(() => setAbierto(true), 700)
    return () => clearTimeout(t)
  }, [visto])

  if (!abierto || visto) return null

  const toggle = (id: string) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto">
        <div className="px-5 pt-6 pb-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-black text-xl text-display">T</span>
          <h2 className="mt-3 text-xl font-bold text-white text-display">¿A qué juegas?</h2>
          <p className="mt-1 text-sm text-[#A0A0B8]">Elige tus juegos y te enseñamos primero sus torneos y rankings.</p>
        </div>
        <div className="px-4 py-4 grid grid-cols-3 gap-2">
          {JUEGOS_LIST.map(j => {
            const on = sel.includes(j.id)
            return (
              <button key={j.id} onClick={() => toggle(j.id)}
                className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all ${on ? 'border-[#B6FF3A]' : 'border-white/10 opacity-85 hover:opacity-100'}`}>
                <GameKeyart juegoId={j.id} label={false} className="absolute inset-0" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-1.5 left-2 text-[11px] font-black text-white text-display">{j.corto}</span>
                {on && <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Check size={12} /></span>}
              </button>
            )
          })}
        </div>
        <div className="sticky bottom-0 bg-[#141822] px-4 pb-6 pt-2 space-y-2 border-t border-white/5">
          <button onClick={() => guardar(sel)} disabled={sel.length === 0}
            className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
            Empezar {sel.length > 0 ? `con ${sel.length} ${sel.length === 1 ? 'juego' : 'juegos'}` : ''}
          </button>
          <button onClick={() => guardar([])} className="w-full h-9 text-xs text-[#8B8BA8] font-semibold hover:text-white">Saltar por ahora</button>
        </div>
      </div>
    </div>
  )
}
