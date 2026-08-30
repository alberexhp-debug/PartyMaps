'use client'
import { useEffect, useState } from 'react'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { PAISES } from '@/lib/torneos/puntos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { Check } from 'lucide-react'
import { useT, conParams } from '@/lib/i18n'

// Onboarding de primera visita: eliges tus juegos y TU PAÍS competitivo.
// El país decide en qué ranking nacional puntúas (juegues donde juegues);
// se puede corregir después desde el ranking.
export function OnboardingJuegos() {
  const { t: tr } = useT()
  const visto = useDemoStore(s => s.onboardingVisto)
  const guardar = useDemoStore(s => s.setJuegosFavoritos)
  const setPais = useDemoStore(s => s.setPaisJugador)
  const [abierto, setAbierto] = useState(false)
  const [sel, setSel] = useState<string[]>([])
  const [pais, setPaisSel] = useState('ES')

  useEffect(() => {
    if (visto) return
    const t = setTimeout(() => setAbierto(true), 700)
    return () => clearTimeout(t)
  }, [visto])

  if (!abierto || visto) return null

  const toggle = (id: string) => setSel(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  const terminar = (juegos: string[]) => { setPais(pais); guardar(juegos) }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto">
        <div className="px-5 pt-6 pb-2 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-black text-xl text-display">T</span>
          <h2 className="mt-3 text-xl font-bold text-white text-display">{tr('ob.titulo')}</h2>
          <p className="mt-1 text-sm text-[#A0A0B8]">{tr('ob.sub')}</p>
        </div>
        <div className="px-4 py-4 grid grid-cols-3 gap-2">
          {JUEGOS_LIST.map(j => {
            const on = sel.includes(j.id)
            return (
              <button key={j.id} onClick={() => toggle(j.id)}
                className={`relative h-20 rounded-2xl overflow-hidden border-2 transition-all ${on ? 'border-[#B6FF3A]' : 'border-white/10 opacity-85 hover:opacity-100'}`}>
                <GameKeyart juegoId={j.id} label={false} className="absolute inset-0" />
                <span className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <span className="absolute bottom-1.5 left-2 inline-flex items-center gap-1 text-[11px] font-black text-white text-display"><GameIcon juegoId={j.id} size={12} color="#FFFFFF" /> {j.corto}</span>
                {on && <span className="absolute top-1.5 right-1.5 h-5 w-5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Check size={12} /></span>}
              </button>
            )
          })}
        </div>

        {/* País competitivo: decide tu ranking nacional (corregible después) */}
        <div className="px-5 pb-1">
          <p className="text-sm font-bold text-white">{tr('ob.paisTitulo')}</p>
          <p className="mt-0.5 text-[11px] text-[#8B8BA8]">{tr('ob.paisSub')}</p>
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
            {PAISES.map(x => (
              <button key={x.id} onClick={() => setPaisSel(x.id)}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 h-8 rounded-full text-xs font-bold border transition-all ${pais === x.id ? 'bg-[#B6FF3A]/15 text-white border-[#B6FF3A]/60' : 'bg-white/4 text-[#B8B8CC] border-white/10 hover:text-white'}`}>
                {x.bandera} {x.id}
              </button>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-[#141822] px-4 pb-6 pt-2 space-y-2 border-t border-white/5">
          <button onClick={() => terminar(sel)} disabled={sel.length === 0}
            className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
            {tr('ob.empezar')} {sel.length > 0 ? conParams(sel.length === 1 ? tr('ob.conJuego') : tr('ob.conJuegos'), { n: sel.length }) : ''}
          </button>
          <button onClick={() => terminar([])} className="w-full h-9 text-xs text-[#8B8BA8] font-semibold hover:text-white">{tr('ob.saltar')}</button>
        </div>
      </div>
    </div>
  )
}
