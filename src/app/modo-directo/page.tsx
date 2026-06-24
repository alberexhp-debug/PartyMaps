'use client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowLeft, Radio, Pause, AlertTriangle, Tv, Clock } from 'lucide-react'

type Estado = 'ocupado' | 'libre' | 'caido'
type Setup = { n: number; tipo: string; estado: Estado; a?: string; b?: string; min?: number; stream?: boolean }

const SETUPS: Setup[] = [
  { n: 1, tipo: 'Consola', estado: 'ocupado', a: 'Kaze', b: 'Vito', min: 7 },
  { n: 2, tipo: 'Consola', estado: 'libre' },
  { n: 3, tipo: 'Stream', estado: 'ocupado', a: 'Sora', b: 'Ren', min: 12, stream: true },
  { n: 4, tipo: 'Consola', estado: 'caido' },
  { n: 5, tipo: 'PC', estado: 'ocupado', a: 'Lumi', b: 'Nox', min: 3 },
  { n: 6, tipo: 'PC', estado: 'libre' },
]
const COLA = [
  { a: 'Drako', b: 'Bel', ronda: 'Winners R2' },
  { a: 'Akali', b: 'Zoe', ronda: 'Losers R3' },
  { a: 'Gorka', b: 'Pau', ronda: 'Winners R2' },
  { a: 'Iván', b: 'Mireia', ronda: 'Losers R3' },
]

const COLORS: Record<Estado, { dot: string; label: string; text: string }> = {
  ocupado: { dot: '#B6FF3A', label: 'En juego', text: '#B6FF3A' },
  libre: { dot: '#4F8EF7', label: 'Libre', text: '#6FB0FF' },
  caido: { dot: '#FF6076', label: 'Caído', text: '#FF6076' },
}

export default function ModoDirectoPage() {
  const router = useRouter()
  return (
    <div className="relative min-h-screen pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0C0E13]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Modo directo</p>
          <p className="text-base font-bold text-white truncate">Lima Smash Weekly #42</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white shrink-0"><Radio size={12} className="animate-pulse-heat" /> Directo</span>
        <button aria-label="Pausar cola" className="h-9 w-9 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><Pause size={15} /></button>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Disputa */}
        <div className="flex items-center gap-3 rounded-2xl border border-[#FF6076]/40 bg-[#FF6076]/10 px-4 py-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6076]/20 text-[#FF6076] shrink-0"><AlertTriangle size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Disputa en Setup 5</p>
            <p className="text-xs text-[#FFB3BD]">Lumi y Nox reclaman la victoria</p>
          </div>
          <button className="h-9 px-4 rounded-xl bg-[#FF6076] text-[#0A0A0F] text-sm font-bold shrink-0">Resolver</button>
        </div>

        {/* Setups */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="eyebrow eyebrow-muted">Setups</p>
            <p className="text-xs text-[#8B8BA8]"><span className="text-[#B6FF3A] font-bold">3</span> en juego · <span className="text-[#6FB0FF] font-bold">2</span> libres</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {SETUPS.map(s => {
              const c = COLORS[s.estado]
              return (
                <div key={s.n} className="card-premium p-3" style={{ borderColor: s.estado === 'caido' ? 'rgba(255,96,118,0.3)' : undefined }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">Setup {s.n}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: c.text }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} /> {c.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mb-2 text-[10px] text-[#8B8BA8]">
                    {s.stream ? <span className="inline-flex items-center gap-1 text-[#9B82FF] font-semibold"><Tv size={11} /> Stream</span> : <span>{s.tipo}</span>}
                  </div>
                  {s.estado === 'ocupado' ? (
                    <div>
                      <p className="text-sm text-white font-semibold truncate">{s.a} <span className="text-[#6B6B85]">vs</span> {s.b}</p>
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#8B8BA8]"><Clock size={10} /> {s.min} min</p>
                    </div>
                  ) : s.estado === 'libre' ? (
                    <p className="text-sm text-[#6FB0FF] font-semibold">Asignar siguiente →</p>
                  ) : (
                    <p className="text-sm text-[#FF6076] font-semibold">Marcado caído</p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Cola */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="eyebrow eyebrow-muted">Cola de combates</p>
            <p className="text-xs text-[#8B8BA8]"><span className="text-white font-bold">{COLA.length}</span> listos</p>
          </div>
          <div className="space-y-2">
            {COLA.map((m, i) => (
              <div key={i} className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/8 px-3.5 py-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-[#8B8BA8] text-xs font-bold shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{m.a} <span className="text-[#6B6B85]">vs</span> {m.b}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{m.ronda}</p>
                </div>
                <span className="text-[11px] text-[#B6FF3A] font-semibold shrink-0">Listo</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
