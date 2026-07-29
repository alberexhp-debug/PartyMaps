'use client'
import { useState } from 'react'
import { Zap, ExternalLink } from 'lucide-react'

// ¿Dónde vive el bracket? Política de puntuación SIN letra pequeña:
// - Motor Tourneum → puntúa aquí (no en start.gg); resultados exportables al PR.
// - Espejo start.gg → el bracket sigue allí; puntúa en start.gg y, al terminar,
//   Tourneum importa los resultados y también los puntúa (ingesta automática).
// `valor` es la URL/slug de start.gg ('' = motor propio).
export function BracketDonde({ valor, onChange, disabled }: { valor: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [espejo, setEspejo] = useState(!!valor)

  return (
    <div>
      <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        <button type="button" disabled={disabled} onClick={() => { setEspejo(false); onChange('') }}
          className={`h-11 rounded-xl text-[13px] font-bold transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${!espejo ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#A0A0B8]'}`}>
          <Zap size={14} /> Motor Tourneum
        </button>
        <button type="button" disabled={disabled} onClick={() => setEspejo(true)}
          className={`h-11 rounded-xl text-[13px] font-bold transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50 ${espejo ? 'bg-[#6E9BFF] text-[#0A0A0F]' : 'text-[#A0A0B8]'}`}>
          <ExternalLink size={14} /> Espejo start.gg
        </button>
      </div>

      {espejo && (
        <input value={valor} onChange={e => onChange(e.target.value)} disabled={disabled}
          placeholder="https://start.gg/tournament/tu-torneo (o «demo»)"
          className="mt-2 w-full h-12 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#6B6B85] focus:border-[#6E9BFF]/60 outline-none transition-colors disabled:opacity-50" />
      )}

      <p className="mt-2 text-[11px] leading-relaxed text-[#8B8BA8]">
        {espejo
          ? <>Tu bracket sigue en start.gg y sus puntos no se tocan. La ficha lo enseña en vivo y, <span className="text-[#B6FF3A] font-semibold">al terminar, los resultados también puntúan en el ranking Tourneum</span> (importación automática).</>
          : <>Bracket y reportes con el motor de Tourneum: <span className="text-[#B6FF3A] font-semibold">puntúa en el ranking Tourneum</span>. No puntúa en start.gg — exporta los resultados (CSV) para tu Power Ranking local.</>}
      </p>
    </div>
  )
}
