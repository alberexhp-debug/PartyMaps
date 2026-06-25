'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { ArrowLeft, Radio, Pause, Play, AlertTriangle, Tv, Clock, Check, RotateCcw, Flag } from 'lucide-react'

type Estado = 'ocupado' | 'libre' | 'caido'
type Setup = { n: number; tipo: string; stream?: boolean; estado: Estado; a?: string; b?: string; seg?: number }
type ColaItem = { id: string; a: string; b: string; ronda: string }

const SETUPS0: Setup[] = [
  { n: 1, tipo: 'Consola', estado: 'ocupado', a: 'Kaze', b: 'Volt', seg: 7 * 60 },
  { n: 2, tipo: 'Consola', estado: 'libre' },
  { n: 3, tipo: 'Stream', stream: true, estado: 'ocupado', a: 'Sora', b: 'Rei', seg: 12 * 60 },
  { n: 4, tipo: 'Consola', estado: 'caido' },
  { n: 5, tipo: 'PC', estado: 'ocupado', a: 'Lux', b: 'Nyx', seg: 3 * 60 },
  { n: 6, tipo: 'PC', estado: 'libre' },
]
const COLA0: ColaItem[] = [
  { id: 'c1', a: 'Drako', b: 'Kira', ronda: 'Winners R2' },
  { id: 'c2', a: 'Faze', b: 'Aqua', ronda: 'Losers R3' },
  { id: 'c3', a: 'Mist', b: 'Pyra', ronda: 'Winners R2' },
  { id: 'c4', a: 'Vega', b: 'Onyx', ronda: 'Losers R3' },
]
const COLORS: Record<Estado, { dot: string; label: string; text: string }> = {
  ocupado: { dot: '#B6FF3A', label: 'En juego', text: '#B6FF3A' },
  libre: { dot: '#4F8EF7', label: 'Libre', text: '#6FB0FF' },
  caido: { dot: '#FF6076', label: 'Caído', text: '#FF6076' },
}
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export default function ModoDirectoPage() {
  const router = useRouter()
  const [setups, setSetups] = useState<Setup[]>(SETUPS0)
  const [cola, setCola] = useState<ColaItem[]>(COLA0)
  const [pausada, setPausada] = useState(false)
  const [disputa, setDisputa] = useState<{ setup: number; a: string; b: string } | null>({ setup: 5, a: 'Lux', b: 'Nyx' })
  const [toast, setToast] = useState<string | null>(null)
  const toastT = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Timers en vivo
  useEffect(() => {
    const iv = setInterval(() => {
      setSetups(prev => prev.map(s => s.estado === 'ocupado' ? { ...s, seg: (s.seg ?? 0) + 1 } : s))
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  function flash(msg: string) {
    setToast(msg)
    if (toastT.current) clearTimeout(toastT.current)
    toastT.current = setTimeout(() => setToast(null), 2200)
  }

  function asignar(n: number) {
    if (pausada) { flash('La cola está pausada'); return }
    const next = cola[0]
    if (!next) { flash('No hay combates en cola'); return }
    setCola(c => c.slice(1))
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'ocupado', a: next.a, b: next.b, seg: 0 } : s))
    flash(`${next.a} vs ${next.b} → Setup ${n}`)
  }
  function liberar(n: number) {
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'libre', a: undefined, b: undefined, seg: undefined } : s))
    flash(`Setup ${n} liberado`)
  }
  function toggleCaido(n: number) {
    setSetups(prev => prev.map(s => {
      if (s.n !== n) return s
      if (s.estado === 'caido') return { ...s, estado: 'libre' }
      // si estaba ocupado, su combate vuelve a la cola
      if (s.estado === 'ocupado' && s.a && s.b) setCola(c => [{ id: `r${n}${Date.now()}`, a: s.a!, b: s.b!, ronda: 'Reasignar' }, ...c])
      return { ...s, estado: 'caido', a: undefined, b: undefined, seg: undefined }
    }))
  }
  function resolver(ganador: string) {
    if (!disputa) return
    setSetups(prev => prev.map(s => s.n === disputa.setup ? { ...s, estado: 'libre', a: undefined, b: undefined, seg: undefined } : s))
    flash(`Disputa resuelta: gana ${ganador}`)
    setDisputa(null)
  }

  const enJuego = setups.filter(s => s.estado === 'ocupado').length
  const libres = setups.filter(s => s.estado === 'libre').length

  return (
    <div className="relative min-h-screen pb-10">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0C0E13]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Modo directo</p>
          <p className="text-base font-bold text-white truncate">Lima Smash Weekly #42</p>
        </div>
        <span className="inline-flex items-center gap-1 px-2.5 h-9 rounded-xl text-[11px] font-bold uppercase tracking-wider bg-[#E63E54] text-white shrink-0"><Radio size={12} className="animate-pulse-heat" /> Directo</span>
        <button onClick={() => { setPausada(p => !p); flash(pausada ? 'Cola reanudada' : 'Cola pausada') }} aria-label="Pausar cola"
          className={cn('h-9 w-9 rounded-xl flex items-center justify-center shrink-0', pausada ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-white')}>
          {pausada ? <Play size={15} /> : <Pause size={15} />}
        </button>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {/* Disputa */}
        {disputa && (
          <div className="flex items-center gap-3 rounded-2xl border border-[#FF6076]/40 bg-[#FF6076]/10 px-4 py-3 animate-slide-up-sm">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6076]/20 text-[#FF6076] shrink-0"><AlertTriangle size={18} /></span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">Disputa en Setup {disputa.setup}</p>
              <p className="text-xs text-[#FFB3BD]">{disputa.a} y {disputa.b} reclaman la victoria</p>
            </div>
          </div>
        )}
        {disputa && (
          <div className="grid grid-cols-2 gap-2 -mt-2">
            <button onClick={() => resolver(disputa.a)} className="h-11 rounded-xl bg-white/8 border border-white/12 text-white text-sm font-bold hover:bg-white/12">Gana {disputa.a}</button>
            <button onClick={() => resolver(disputa.b)} className="h-11 rounded-xl bg-white/8 border border-white/12 text-white text-sm font-bold hover:bg-white/12">Gana {disputa.b}</button>
          </div>
        )}

        {/* Setups */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <p className="eyebrow eyebrow-muted">Setups</p>
            <p className="text-xs text-[#8B8BA8]"><span className="text-[#B6FF3A] font-bold font-mono-num">{enJuego}</span> en juego · <span className="text-[#6FB0FF] font-bold font-mono-num">{libres}</span> libres</p>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {setups.map(s => {
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
                      <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-[#B6FF3A] font-mono-num"><Clock size={10} /> {fmt(s.seg ?? 0)}</p>
                      <div className="mt-2 flex gap-1.5">
                        <button onClick={() => liberar(s.n)} className="flex-1 h-8 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[11px] font-bold inline-flex items-center justify-center gap-1"><Check size={12} /> Liberar</button>
                        <button onClick={() => toggleCaido(s.n)} aria-label="Marcar caído" className="h-8 w-8 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><Flag size={13} /></button>
                      </div>
                    </div>
                  ) : s.estado === 'libre' ? (
                    <button onClick={() => asignar(s.n)} className="w-full h-8 rounded-lg bg-[#4F8EF7]/15 text-[#6FB0FF] text-[12px] font-bold hover:bg-[#4F8EF7]/25 transition-colors">Asignar siguiente →</button>
                  ) : (
                    <button onClick={() => toggleCaido(s.n)} className="w-full h-8 rounded-lg bg-white/6 text-[#FF6076] text-[12px] font-bold inline-flex items-center justify-center gap-1"><RotateCcw size={12} /> Reactivar</button>
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
            <p className="text-xs text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{cola.length}</span> listos {pausada && <span className="text-[#FF8A5C]">· pausada</span>}</p>
          </div>
          <div className="space-y-2">
            {cola.length === 0 && <p className="text-sm text-[#8B8BA8] text-center py-4">Cola vacía. Los combates aparecerán al avanzar el bracket.</p>}
            {cola.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/8 px-3.5 py-2.5">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-white/6 text-[#8B8BA8] text-xs font-bold shrink-0 font-mono-num">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-semibold truncate">{m.a} <span className="text-[#6B6B85]">vs</span> {m.b}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{m.ronda}</p>
                </div>
                <span className={cn('text-[11px] font-semibold shrink-0', i === 0 ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]')}>{i === 0 ? 'Siguiente' : 'Listo'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#1A1A26] border border-white/12 text-white text-sm font-semibold shadow-xl animate-slide-up-sm flex items-center gap-2">
          <Check size={15} className="text-[#B6FF3A]" /> {toast}
        </div>
      )}
    </div>
  )
}
