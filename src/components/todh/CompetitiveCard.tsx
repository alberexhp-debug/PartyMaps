'use client'
import { useState } from 'react'
import { JUEGOS } from '@/lib/torneos/sample'
import { GameKeyart } from './GameKeyart'

const STATS: Record<string, { rating: number; tier: string; v: number; d: number; mejor: string; mains: string[]; pos: number }> = {
  smash: { rating: 2210, tier: 'Oro III', v: 94, d: 55, mejor: 'Top 4', mains: ['Pikachu', 'Fox'], pos: 5 },
  magic: { rating: 1980, tier: 'Plata I', v: 41, d: 33, mejor: 'Top 8', mains: ['Mono-Red'], pos: 22 },
  tft: { rating: 2340, tier: 'Diamante II', v: 120, d: 60, mejor: '1º', mains: ['Reroll'], pos: 3 },
}

export function CompetitiveCard() {
  const games = ['smash', 'magic', 'tft']
  const [juego, setJuego] = useState('smash')
  const s = STATS[juego]
  const j = JUEGOS[juego]
  const wr = Math.round((s.v / (s.v + s.d)) * 100)

  return (
    <div className="ring-grad relative overflow-hidden rounded-2xl border border-white/8" style={{ background: '#14141E' }}>
      <GameKeyart juegoId={juego} label={false} className="absolute inset-x-0 top-0 h-24" />
      <div className="absolute inset-x-0 top-0 h-24" style={{ background: 'linear-gradient(to bottom, transparent 18%, #14141E)' }} />

      <div className="relative p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-white/70 font-bold mr-1">Identidad</span>
          {games.map(g => {
            const on = juego === g
            const jj = JUEGOS[g]
            return (
              <button key={g} onClick={() => setJuego(g)}
                className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold transition-all border"
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
            <p className="text-[50px] font-bold text-score leading-none" style={{ color: j.color }}>{s.rating}</p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-xs font-bold bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40">{s.tier}</span>
            <p className="text-xs text-[#8B8BA8] mt-1.5 font-mono-num">#{s.pos} · {wr}% WR</p>
          </div>
        </div>

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
          {s.mains.map(m => (
            <span key={m} className="px-2.5 h-6 inline-flex items-center rounded-full text-[11px] font-semibold bg-white/6 border border-white/10 text-[#D4D4E4]">{m}</span>
          ))}
        </div>
      </div>
    </div>
  )
}
