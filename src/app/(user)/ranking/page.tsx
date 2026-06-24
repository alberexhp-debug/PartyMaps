'use client'
import { useMemo, useState } from 'react'
import { JUEGOS } from '@/lib/torneos/sample'
import { cn } from '@/lib/utils'
import { Globe, MapPin, Crown } from 'lucide-react'

type Jugador = { nombre: string; juego: string; rating: number; v: number; d: number }

const RANKING: Jugador[] = [
  { nombre: 'Kaze',   juego: 'smash', rating: 2480, v: 142, d: 38 },
  { nombre: 'Vito',   juego: 'smash', rating: 2390, v: 128, d: 44 },
  { nombre: 'Sora',   juego: 'smash', rating: 2350, v: 119, d: 51 },
  { nombre: 'Lumi',   juego: 'smash', rating: 2280, v: 101, d: 49 },
  { nombre: 'Drako',  juego: 'smash', rating: 2210, v: 94,  d: 55 },
  { nombre: 'Nox',    juego: 'smash', rating: 2150, v: 88,  d: 60 },
  { nombre: 'Mireia', juego: 'magic', rating: 2410, v: 96,  d: 30 },
  { nombre: 'Gorka',  juego: 'magic', rating: 2330, v: 88,  d: 35 },
  { nombre: 'Pau',    juego: 'magic', rating: 2270, v: 80,  d: 40 },
  { nombre: 'Iván',   juego: 'magic', rating: 2190, v: 72,  d: 44 },
  { nombre: 'Ren',    juego: 'tft',   rating: 2500, v: 160, d: 42 },
  { nombre: 'Akali',  juego: 'tft',   rating: 2440, v: 150, d: 48 },
  { nombre: 'Zoe',    juego: 'tft',   rating: 2360, v: 133, d: 50 },
  { nombre: 'Bel',    juego: 'tft',   rating: 2280, v: 120, d: 55 },
]

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const color = avatarColor(name)
  return (
    <span className="inline-flex items-center justify-center rounded-full font-black text-[#0A0A0F] shrink-0"
      style={{ width: size, height: size, background: color, fontSize: size * 0.4 }}>
      {name[0]}
    </span>
  )
}

export default function RankingPage() {
  const [juego, setJuego] = useState('smash')
  const [ambito, setAmbito] = useState<'pais' | 'mundial'>('pais')

  const lista = useMemo(
    () => RANKING.filter(j => j.juego === juego).sort((a, b) => b.rating - a.rating),
    [juego],
  )
  const top3 = lista.slice(0, 3)
  const resto = lista.slice(3)
  // Orden visual del podio: 2º, 1º, 3º
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const alturas = [88, 116, 70]
  const medallas = ['#C0C7D1', '#E0BE63', '#CD7F45']

  return (
    <div className="relative min-h-screen overflow-hidden">
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

      {lista.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <Crown size={32} className="text-[#8B8BA8]" />
          <p className="text-white font-bold">Sin ranking todavía</p>
          <p className="text-sm text-[#B8B8CC]">Este juego aún no tiene jugadores rankeados.</p>
        </div>
      ) : (
        <>
          {/* Podio */}
          <div className="relative px-4 mt-5 flex items-end justify-center gap-3">
            {podio.map((p, i) => {
              const first = i === 1
              const jColor = JUEGOS[juego].color
              return (
                <div key={p.nombre} className="flex flex-col items-center" style={{ width: 96 }}>
                  <div className="relative">
                    {first && <div className="absolute -inset-2.5 rounded-full blur-xl opacity-50" style={{ background: jColor }} />}
                    <div className="relative rounded-full p-[2.5px]" style={{ background: first ? `linear-gradient(135deg, #E0BE63, ${jColor})` : `${medallas[i]}55` }}>
                      <Avatar name={p.nombre} size={first ? 66 : 50} />
                    </div>
                    {first && <Crown size={22} className="absolute -top-4 left-1/2 -translate-x-1/2 text-[#E0BE63]" fill="#E0BE63" />}
                  </div>
                  <p className="mt-2 text-sm font-bold text-white truncate max-w-full">{p.nombre}</p>
                  <p className="text-[12px] font-bold font-mono-num" style={{ color: first ? '#E0BE63' : '#B6FF3A' }}>{p.rating}</p>
                  <div className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-1.5 ring-grad relative overflow-hidden"
                    style={{ height: alturas[i], background: `linear-gradient(180deg, ${medallas[i]}2E, ${medallas[i]}08)`, borderTop: `2px solid ${medallas[i]}` }}>
                    <span className="text-xl font-black font-mono-num" style={{ color: medallas[i] }}>{first ? 1 : i === 0 ? 2 : 3}</span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Tabla */}
          <div className="relative px-4 mt-4 pb-8 space-y-1.5">
            {resto.map((p, i) => (
              <div key={p.nombre} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8">
                <span className="w-6 text-center text-sm font-bold text-[#8B8BA8] text-numeric">{i + 4}</span>
                <Avatar name={p.nombre} size={38} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{p.nombre}</p>
                  <p className="text-[11px] text-[#8B8BA8] text-numeric">{p.v}V · {p.d}D</p>
                </div>
                <span className="text-sm font-bold text-white text-numeric">{p.rating}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
