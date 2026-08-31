'use client'
import { useState } from 'react'
import type { Jugador } from '@/lib/torneos/sample'
import { JUEGOS, plantillaDe, TORNEOS_SAMPLE } from '@/lib/torneos/sample'
import Link from 'next/link'
import { X, Star, Swords, TrendingUp, Trophy, Search } from '@/components/todh/iconosTorneum'
import { ArrowUpRight } from 'lucide-react'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import { RangoChip } from '@/components/todh/RangoChip'
import { GameIcon, GameChip } from '@/components/todh/GameIcon'
import { ScoutingSheet } from '@/components/todh/ScoutingSheet'
import { useT } from '@/lib/i18n'

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
  const { t: tr } = useT()
  const [scout, setScout] = useState(false)   // scouting v1: «Estudiar a fondo»
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
            <RangoChip rating={jugador.rating} size="md" />
            <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold border" style={{ color: tierColor, borderColor: `${tierColor}55`, background: `${tierColor}1A` }}>{jugador.tier}</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <GameIcon juegoId={jugador.juego} size={13} /> {juego.corto}
            </span>
            {puesto && <span className="ml-auto inline-flex items-center gap-1 text-[12px] font-bold text-[#E0BE63]"><Trophy size={13} /> #{puesto} <GameChip juegoId={jugador.juego} size={12} /></span>}
          </div>

          {/* Stats */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Star size={14} className="text-[#E0BE63]" />} label={tr('mp.rating')} value={jugador.rating.toString()} />
            <Stat icon={<Swords size={14} className="text-[#B6FF3A]" />} label={tr('mp.record')} value={`${jugador.victorias}-${jugador.derrotas}`} />
            <Stat icon={<TrendingUp size={14} className="text-[#4F8EF7]" />} label={tr('mp.winrate')} value={`${winrate}%`} />
          </div>

          {/* Main + mejor puesto */}
          <div className="mt-3 space-y-2">
            {jugador.main && (
              <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
                <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{plantillaDe(jugador.juego).labelMain}</span>
                <PersonajeChip juegoId={jugador.juego} nombre={jugador.main} size="md" />
              </div>
            )}
            <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
              <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('mp.mejorPuesto')}</span>
              <span className="text-sm font-bold text-white">{jugador.mejorPuesto}</span>
            </div>
            <div className="flex items-center justify-between card-premium px-3.5 py-2.5">
              <span className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('mp.torneosJugados')}</span>
              <span className="text-sm font-bold text-white font-mono-num">{jugador.torneosJugados}</span>
            </div>
          </div>

          {/* Historial: últimos torneos jugados (deterministas por jugador) */}
          {(() => {
            const delJuego = TORNEOS_SAMPLE.filter(x => x.juego === jugador.juego).slice(0, 3)
            if (delJuego.length === 0) return null
            const puestoDe = (tid: string) => {
              let h = 0
              for (const ch of jugador.nombre + tid) h = (h * 31 + ch.charCodeAt(0)) >>> 0
              return ['🥇 1º', '🥈 2º', 'Top 4', 'Top 8', 'Top 16'][h % 5]
            }
            return (
              <div className="mt-3">
                <p className="text-[10px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold mb-1.5">{tr('mp.ultimosTorneos')}</p>
                <div className="space-y-1.5">
                  {delJuego.map(x => (
                    <Link key={x.id} href={`/torneo/${x.id}/resultados`} className="flex items-center gap-2.5 card-premium px-3 py-2 hover:bg-white/[0.06] transition-colors">
                      <span className="w-1 self-stretch rounded-full" style={{ background: juego.color }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-white truncate">{x.nombre}</p>
                        <p className="text-[10px] text-[#8B8BA8]">{x.fechaLabel}</p>
                      </div>
                      <span className="text-[11px] font-bold text-[#E0BE63] shrink-0">{puestoDe(x.id)}</span>
                    </Link>
                  ))}
                </div>
              </div>
            )
          })()}

          {/* Scouting v1: enlace discreto al estudio a fondo (muros por tier
              dentro del propio sheet: sin tier se ve el teaser con candados) */}
          <button onClick={() => setScout(true)}
            className="mt-3 w-full text-[12px] font-semibold text-[#67E8F9] flex items-center justify-center gap-1 hover:text-white transition-colors">
            <Search size={12} /> {tr('sc.estudiarFondo')} ›
          </button>

          {/* Perfil completo (página) */}
          <Link href={`/jugador/${encodeURIComponent(jugador.nombre)}?juego=${jugador.juego}`}
            className="mt-3 w-full h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-1.5">
            {tr('mp.verPerfil')} <ArrowUpRight size={15} />
          </Link>
        </div>
      </div>
      {scout && <ScoutingSheet nombre={jugador.nombre} juego={jugador.juego} onClose={() => setScout(false)} />}
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
