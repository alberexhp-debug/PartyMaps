'use client'
import { useMemo, useState } from 'react'
import { JUEGOS, rankingPorJuego, type Jugador } from '@/lib/torneos/sample'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { cn } from '@/lib/utils'
import { Globe, MapPin, Crown, ChevronUp, ChevronDown, Minus } from 'lucide-react'

const TIER_COLOR: Record<string, string> = { Platino: '#67E8F9', Diamante: '#A78BFA', Oro: '#E0BE63' }

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

function Avatar({ name, size = 44, ring }: { name: string; size?: number; ring?: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full font-black text-[#0A0A0F] shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4, boxShadow: ring ? `0 0 0 2px #101019, 0 0 0 4px ${ring}` : undefined }}>
      {name[0]}
    </span>
  )
}

function Tendencia({ n }: { n: number }) {
  if (n === 0) return <span className="inline-flex items-center text-[#6B6B85]"><Minus size={13} /></span>
  if (n > 0) return <span className="inline-flex items-center gap-0.5 text-[#2ED47A] text-[11px] font-bold"><ChevronUp size={13} />{n}</span>
  return <span className="inline-flex items-center gap-0.5 text-[#FF6B6B] text-[11px] font-bold"><ChevronDown size={13} />{Math.abs(n)}</span>
}

export default function RankingPage() {
  const [juego, setJuego] = useState('smash')
  const [ambito, setAmbito] = useState<'pais' | 'mundial'>('pais')
  const [sel, setSel] = useState<{ j: Jugador; puesto: number } | null>(null)

  const lista = useMemo(() => {
    const base = rankingPorJuego(juego)
    // Mundial: ratings ligeramente superiores para diferenciar el ámbito
    return ambito === 'mundial' ? base.map(j => ({ ...j, rating: j.rating + 120 })) : base
  }, [juego, ambito])

  const top3 = lista.slice(0, 3)
  const resto = lista.slice(3)
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const alturas = [88, 116, 70]
  const medallas = ['#C0C7D1', '#E0BE63', '#CD7F45']
  // "Tu posición" (demo): posición fija a media tabla
  const miPuesto = 9
  const yo = lista[miPuesto - 1]

  return (
    <div className="relative min-h-screen overflow-hidden pb-24">
      <div className="hero-halo-violet" />

      <div className="relative px-5 pt-6 pb-2 safe-top">
        <p className="eyebrow mb-2">Clasificación</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Ranking</h1>
      </div>

      {/* País / Mundial */}
      <div className="relative px-4 mt-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 max-w-xs">
          {([['pais', 'España', MapPin], ['mundial', 'Mundial', Globe]] as const).map(([k, label, Icon]) => (
            <button key={k} onClick={() => setAmbito(k)}
              className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
                ambito === k ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Chips de juego */}
      <div className="relative px-4 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {Object.values(JUEGOS).map(j => {
            const activo = juego === j.id
            return (
              <button key={j.id} onClick={() => setJuego(j.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={activo
                  ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </button>
            )
          })}
        </div>
      </div>

      {/* Podio */}
      <div className="relative px-4 mt-5 flex items-end justify-center gap-3">
        {podio.map((p, i) => {
          const first = i === 1
          const jColor = JUEGOS[juego].color
          const puesto = first ? 1 : i === 0 ? 2 : 3
          return (
            <button key={p.id} onClick={() => setSel({ j: p, puesto })} className="flex flex-col items-center" style={{ width: 96 }}>
              <div className="relative">
                {first && <div className="absolute -inset-2.5 rounded-full blur-xl opacity-50" style={{ background: jColor }} />}
                <div className="relative rounded-full p-[2.5px]" style={{ background: first ? `linear-gradient(135deg, #E0BE63, ${jColor})` : `${medallas[i]}55` }}>
                  <Avatar name={p.nombre} size={first ? 66 : 50} />
                </div>
                {first && <Crown size={22} className="absolute -top-4 left-1/2 -translate-x-1/2 text-[#E0BE63]" fill="#E0BE63" />}
              </div>
              <p className="mt-2 text-sm font-bold text-white truncate max-w-full">{p.nombre} {p.bandera}</p>
              <p className="text-[15px] font-bold text-score" style={{ color: first ? '#E0BE63' : '#B6FF3A' }}>{p.rating}</p>
              <div className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-1.5 ring-grad relative overflow-hidden"
                style={{ height: alturas[i], background: `linear-gradient(180deg, ${medallas[i]}2E, ${medallas[i]}08)`, borderTop: `2px solid ${medallas[i]}` }}>
                <span className="text-3xl font-bold text-score" style={{ color: medallas[i] }}>{puesto}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="relative px-4 mt-4 space-y-1.5 pb-28">
        {resto.map((p, i) => {
          const puesto = i + 4
          return (
            <button key={p.id} onClick={() => setSel({ j: p, puesto })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/[0.07] transition-colors text-left">
              <span className="w-6 text-center text-sm font-bold text-[#8B8BA8] font-mono-num">{puesto}</span>
              <Avatar name={p.nombre} size={38} ring={TIER_COLOR[p.tier]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num">{p.victorias}V · {p.derrotas}D · {p.main}</p>
              </div>
              <Tendencia n={p.tendencia} />
              <span className="text-sm font-bold text-white font-mono-num w-12 text-right">{p.rating}</span>
            </button>
          )
        })}
      </div>

      {/* Tu posición (fija abajo) */}
      {yo && (
        <div className="fixed bottom-16 left-0 right-0 z-20 px-3 pb-2">
          <div className="max-w-lg mx-auto flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#B6FF3A]/12 border border-[#B6FF3A]/40 backdrop-blur-md shadow-lg">
            <span className="w-6 text-center text-sm font-bold text-[#B6FF3A] font-mono-num">{miPuesto}</span>
            <Avatar name="Tú" size={36} ring="#B6FF3A" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">Tú <span className="text-[10px] text-[#B6FF3A] font-semibold uppercase tracking-wide">· tu posición</span></p>
              <p className="text-[11px] text-[#8B8BA8] font-mono-num">{yo.victorias}V · {yo.derrotas}D</p>
            </div>
            <span className="text-sm font-bold text-[#B6FF3A] font-mono-num">{yo.rating}</span>
          </div>
        </div>
      )}

      {sel && <MiniPerfil jugador={sel.j} puesto={sel.puesto} onClose={() => setSel(null)} />}
    </div>
  )
}
