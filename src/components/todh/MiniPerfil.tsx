'use client'
import type { Jugador } from '@/lib/torneos/sample'
import { JUEGOS } from '@/lib/torneos/sample'
import { X, Star, Swords, TrendingUp, Trophy } from 'lucide-react'

const TIER_COLOR: Record<string, string> = { Platino: '#67E8F9', Diamante: '#A78BFA', Oro: '#E0BE63' }

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

// Mini-perfil público (modal) abierto desde ranking, bracket o participantes.
// Sin datos personales: alias, juego, tier, rating, récord, main, logros.
export function MiniPerfil({ jugador, puesto, onClose }: { jugador: Jugador; puesto?: number; onClose: () => void }) {
  const juego = JUEGOS[jugador.juego]
  const tierColor = TIER_COLOR[jugador.tier] || '#E0BE63'
  const winrate = Math.round((jugador.victorias / (jugador.victorias + jugador.derrotas)) * 100)
  const color = avatarColor(jugador.nombre)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up-sm sm:animate-pop">
        {/* Cabecera con keyart del juego */}
        <div className="relative h-24" style={{ background: `radial-gradient(120% 140% at 0% 0%, ${juego.color} 0%, ${juego.color}55 40%, transparent 75%), #0E1119` }}>
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
        </div>
        <div className="px-5 pb-6 -mt-10">
          <div className="flex items-end gap-3">
            <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] border-4 border-[#141822]" style={{ width: 72, height: 72, background: color, fontSize: 30 }}>{jugador.nombre[0]}</span>
            <div className="pb-1">
              <p className="text-lg font-bold text-white text-display leading-tight">{jugador.nombre} <span className="text-base">{jugador.bandera}</span></p>
              <p className="text-xs text-[#8B8BA8]">{jugador.handle}</p>
            </div>
          </div>

          {/* Tier + juego */}
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold border" style={{ color: tierColor, borderColor: `${tierColor}55`, background: `${tierColor}1A` }}>{jugador.tier}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
            </span>
            {puesto && <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-[#E0BE63]"><Trophy size={13} /> #{puesto} {juego.corto}</span>}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Star size={14} className="text-[#E0BE63]" />} label="Rating" value={jugador.rating.toString()} />
            <Stat icon={<Swords size={14} className="text-[#B6FF3A]" />} label="Récord" value={`${jugador.victorias}-${jugador.derrotas}`} />
            <Stat icon={<TrendingUp size={14} className="text-[#4F8EF7]" />} label="Winrate" value={`${winrate}%`} />
          </div>

          {/* Main + mejor puesto */}
          <div className="mt-3 space-y-2">
            {jugador.main && (
              <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
                <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">Main</span>
                <span className="text-sm font-bold text-white">{jugador.main}</span>
              </div>
            )}
            <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
              <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">Mejor puesto</span>
              <span className="text-sm font-bold text-white">{jugador.mejorPuesto}</span>
            </div>
            <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
              <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">Torneos jugados</span>
              <span className="text-sm font-bold text-white font-mono-num">{jugador.torneosJugados}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
      {icon}
      <span className="text-base font-bold text-white font-mono-num leading-none">{value}</span>
      <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider">{label}</span>
    </div>
  )
}
