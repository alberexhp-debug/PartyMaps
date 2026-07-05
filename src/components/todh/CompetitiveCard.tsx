'use client'
import { useState } from 'react'
import { JUEGOS } from '@/lib/torneos/sample'
import { PERSONAJES } from '@/lib/torneos/personajes'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from './GameKeyart'
import { CountUp } from '@/components/ui/CountUp'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { Pencil, X, Check } from 'lucide-react'
import { RangoChip, RangoProgreso } from '@/components/todh/RangoChip'

type Stat = { rating: number; tier: string; v: number; d: number; mejor: string; mains: string[]; pos: number; racha: string[] }
const STATS: Record<string, Stat> = {
  smash:   { rating: 2210, tier: 'Oro III',     v: 94,  d: 55, mejor: 'Top 4', mains: ['Pikachu', 'Fox'], pos: 5,  racha: ['V', 'V', 'D', 'V', 'V'] },
  magic:   { rating: 1980, tier: 'Plata I',     v: 41,  d: 33, mejor: 'Top 8', mains: ['Aggro'],           pos: 22, racha: ['D', 'V', 'V', 'D', 'V'] },
  pokemon: { rating: 2050, tier: 'Oro I',       v: 58,  d: 30, mejor: 'Top 8', mains: ['Charizard ex'],    pos: 14, racha: ['V', 'V', 'V', 'D', 'V'] },
  tft:     { rating: 2340, tier: 'Diamante II', v: 120, d: 60, mejor: '1º',    mains: ['Reroll'],           pos: 3,  racha: ['V', 'V', 'V', 'V', 'D'] },
  tekken:  { rating: 1890, tier: 'Plata II',    v: 33,  d: 29, mejor: 'Top 16', mains: ['King'],            pos: 31, racha: ['D', 'V', 'D', 'V', 'V'] },
  sf6:     { rating: 2120, tier: 'Oro II',      v: 70,  d: 41, mejor: 'Top 8', mains: ['Cammy', 'Juri'],    pos: 9,  racha: ['V', 'D', 'V', 'V', 'V'] },
}

export function CompetitiveCard() {
  const juego = useDemoStore(s => s.juegoPerfil)
  const setJuego = useDemoStore(s => s.setJuegoPerfil)
  const mainsGuardados = useDemoStore(st => st.mainsPerfil[juego])
  const [picker, setPicker] = useState(false)
  const s = STATS[juego] || STATS.smash
  const j = JUEGOS[juego]
  const wr = Math.round((s.v / (s.v + s.d)) * 100)
  const mains = mainsGuardados ?? s.mains
  const pool = PERSONAJES[juego]

  return (
    <div className="ring-grad relative overflow-hidden rounded-2xl border border-white/8" style={{ background: '#171B25' }}>
      <GameKeyart juegoId={juego} label={false} className="absolute inset-x-0 top-0 h-24" />
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent 18%, #171B25)' }} />

      <div className="relative p-4">
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto scrollbar-hide">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-bold mr-1 shrink-0">Identidad</span>
          <span className="shrink-0 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-black border border-[#E0BE63]/50 bg-[#E0BE63]/12 text-[#E0BE63]" title="Fundador de Tourneum">⚡ Fundador #12</span>
          <span className="shrink-0 inline-flex items-center px-2 h-6 rounded-full text-[10px] font-bold bg-white/6 text-[#8B8BA8] border border-white/10" title="Los rangos se reinician cada temporada">Temporada 2026-2</span>
          {Object.keys(JUEGOS).map(g => {
            const on = juego === g
            const jj = JUEGOS[g]
            return (
              <button key={g} onClick={() => setJuego(g)}
                className="shrink-0 inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold transition-all border"
                style={on
                  ? { background: `${jj.color}26`, color: jj.color, borderColor: `${jj.color}88` }
                  : { background: 'rgba(255,255,255,.06)', color: '#9A9AAE', borderColor: 'transparent' }}>
                {jj.corto}
              </button>
            )
          })}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B8BA8] font-bold mb-0.5">Rating</p>
            <p className="text-[50px] font-bold text-score leading-none" style={{ color: j.color }}><CountUp key={juego} value={s.rating} duration={1100} /></p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1.5 justify-end">
              <RangoChip rating={s.rating} size="md" />
              <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-bold bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40">{s.tier}</span>
            </div>
            <p className="text-xs text-[#8B8BA8] mt-1.5 font-mono-num">#{s.pos} · {wr}% WR</p>
          </div>
        </div>

        {/* Progreso hacia el siguiente rango (sistema de puntos de la reunión) */}
        <div className="mt-3"><RangoProgreso rating={s.rating} /></div>
        <p className="mt-1.5 text-[10px] text-[#8B8BA8]">⏳ Rango activo · sin torneos en 45 días tu rango empieza a decaer</p>

        <div className="mt-3.5 grid grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
            <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Récord</p>
            <p className="text-sm font-bold text-white font-mono-num">{s.v}V · {s.d}D</p>
          </div>
          <div className="rounded-xl bg-white/4 border border-white/8 px-3 py-2">
            <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Mejor puesto</p>
            <p className="text-sm font-bold text-[#E0BE63]">🏆 {s.mejor}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Mains</span>
          {mains.map(m => (
            <span key={m} className="pl-1 pr-2.5 h-6 inline-flex items-center gap-1 rounded-full text-[11px] font-semibold bg-white/6 border border-white/10 text-[#D4D4E4]">
              <PersonajeIcon juegoId={juego} nombre={m} px={17} /> {m}
            </span>
          ))}
          {pool && (
            <button onClick={() => setPicker(true)} aria-label="Editar mains"
              className="h-6 w-6 rounded-full bg-white/6 border border-white/10 text-[#8B8BA8] hover:text-white flex items-center justify-center transition-colors">
              <Pencil size={11} />
            </button>
          )}
        </div>
        {picker && pool && <MainsPicker juego={juego} actuales={mains} onClose={() => setPicker(false)} />}

        {/* Racha reciente */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Racha</span>
          <div className="flex items-center gap-1">
            {s.racha.map((r, i) => (
              <span key={i} className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[11px] font-black font-mono-num ${r === 'V' ? 'bg-[#2ED47A]/18 text-[#2ED47A]' : 'bg-[#FF6B6B]/18 text-[#FF6B6B]'}`}>{r}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Selector de mains con los iconos del pool del juego (máx. 3, persiste por juego).
function MainsPicker({ juego, actuales, onClose }: { juego: string; actuales: string[]; onClose: () => void }) {
  const setMainsPerfil = useDemoStore(s => s.setMainsPerfil)
  const [sel, setSel] = useState<string[]>(actuales.filter(m => PERSONAJES[juego]?.some(p => p.nombre === m)))
  const j = JUEGOS[juego]
  const pool = PERSONAJES[juego] ?? []

  const toggle = (nombre: string) => setSel(prev =>
    prev.includes(nombre) ? prev.filter(x => x !== nombre) : prev.length >= 3 ? prev : [...prev, nombre])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[80vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#141822] px-5 pt-4 pb-3 z-10 border-b border-white/5 flex items-center justify-between">
          <div>
            <p className="text-[15px] font-bold text-white">Tus mains de {j?.corto ?? juego}</p>
            <p className="text-[11px] text-[#8B8BA8]">Elige hasta 3 · se muestran en tu perfil y ranking</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={16} /></button>
        </div>
        <div className="px-4 py-4 grid grid-cols-3 gap-2">
          {pool.map(p => {
            const on = sel.includes(p.nombre)
            return (
              <button key={p.nombre} onClick={() => toggle(p.nombre)}
                className="flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all"
                style={on
                  ? { background: `${p.color}1A`, borderColor: `${p.color}77` }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)' }}>
                <PersonajeIcon juegoId={juego} nombre={p.nombre} px={34} />
                <span className={`text-[11px] font-bold leading-tight text-center ${on ? 'text-white' : 'text-[#B8B8CC]'}`}>{p.nombre}</span>
                {on && <Check size={12} className="text-[#B6FF3A]" />}
              </button>
            )
          })}
        </div>
        <div className="sticky bottom-0 bg-[#141822] px-4 pb-5 pt-2 border-t border-white/5">
          <button onClick={() => { setMainsPerfil(juego, sel); onClose() }} disabled={sel.length === 0}
            className="w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">
            Guardar {sel.length ? `(${sel.length})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
