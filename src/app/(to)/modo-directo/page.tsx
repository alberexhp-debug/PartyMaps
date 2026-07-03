'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getTorneo, getLocal, rankingPorJuego, type Jugador } from '@/lib/torneos/sample'
import { construirRondas, nombreRonda } from '@/lib/torneos/bracket'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { MapaMesas, LeyendaMesas, ESTADO_MESA, type EstadoMesa } from '@/components/todh/MapaMesas'
import { ArrowLeft, Radio, Pause, Play, AlertTriangle, Tv, Clock, Check, RotateCcw, Flag, ListTree, Map as MapIcon, List } from 'lucide-react'

type Estado = 'ocupado' | 'libre' | 'caido'
type Setup = { n: number; tipo: string; stream?: boolean; estado: Estado; a?: string; b?: string; seg?: number; mid?: string }
type ColaItem = { id: string; a: string; b: string; ronda: string }

// Torneo en directo del demo (el LIVE de la consola)
const TORNEO_LIVE = 't1'

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
  const [usados, setUsados] = useState<string[]>([])
  const [pausada, setPausada] = useState(false)

  // Si el TO generó bracket en /gestionar, la cola sale de los combates
  // pendientes reales; si no, datos de muestra.
  const gestion = useDemoStore(s => s.gestion[TORNEO_LIVE])
  const override = useDemoStore(s => s.editados[TORNEO_LIVE])
  const pushNoti = useDemoStore(s => s.pushNoti)
  const torneo = getTorneo(TORNEO_LIVE)
  // Plano de mesas del local que acoge el torneo (el que edita la sede en su panel).
  const local = getLocal(torneo?.localId ?? 'gamba')
  const mesasOverride = useDemoStore(s => s.mesasSede[local?.id ?? ''])
  const mesas = mesasOverride ?? local?.mesas ?? []
  const [vistaMesas, setVistaMesas] = useState<'plano' | 'lista'>('plano')
  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const nombreTorneo = override?.nombre ?? torneo?.nombre ?? 'Torneo en directo'
  const colaBracket = useMemo<ColaItem[]>(() => {
    if (!torneo || !gestion?.generado) return []
    const pool = rankingPorJuego(torneo.juego)
    const seeds = gestion.seeds.map(sid => pool.find(p => p.id === sid)).filter(Boolean) as Jugador[]
    return construirRondas(seeds, gestion.winners).flatMap(matches =>
      matches.filter(m => m.a && m.b && !m.ganador)
        .map(m => ({ id: m.id, a: m.a!.nombre, b: m.b!.nombre, ronda: nombreRonda(matches.length) })))
  }, [torneo, gestion])
  const bracketReal = !!gestion?.generado
  const colaViva = bracketReal ? colaBracket.filter(m => !usados.includes(m.id)) : cola
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
    const next = colaViva[0]
    if (!next) { flash('No hay combates en cola'); return }
    if (bracketReal) setUsados(u => [...u, next.id])
    else setCola(c => c.slice(1))
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'ocupado', a: next.a, b: next.b, seg: 0, mid: next.id } : s))
    flash(`${next.a} vs ${next.b} → Mesa ${n}`)
    // Aviso "te toca" al jugador: abre su vista de mesa (resaltada + vibración).
    pushNoti({
      tipo: 'combate', titulo: `Te toca · Mesa ${n}`,
      cuerpo: `${next.a} vs ${next.b} (${next.ronda}). Preséntate en la mesa ${n}.`,
      href: `/torneo/${TORNEO_LIVE}/mesa?n=${n}&vs=${encodeURIComponent(`${next.a} vs ${next.b}`)}`,
    })
  }
  function liberar(n: number) {
    setSetups(prev => prev.map(s => s.n === n ? { ...s, estado: 'libre', a: undefined, b: undefined, seg: undefined, mid: undefined } : s))
    flash(`Mesa ${n} liberada`)
  }
  function toggleCaido(n: number) {
    setSetups(prev => prev.map(s => {
      if (s.n !== n) return s
      if (s.estado === 'caido') return { ...s, estado: 'libre' }
      // si estaba ocupado, su combate vuelve a la cola
      if (s.estado === 'ocupado' && s.a && s.b) {
        if (s.mid) setUsados(u => u.filter(x => x !== s.mid))
        else setCola(c => [{ id: `r${n}${Date.now()}`, a: s.a!, b: s.b!, ronda: 'Reasignar' }, ...c])
      }
      return { ...s, estado: 'caido', a: undefined, b: undefined, seg: undefined, mid: undefined }
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
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-6xl mx-auto lg:mx-0">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0D0F15]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Modo directo</p>
          <p className="text-base font-bold text-white truncate">{nombreTorneo}</p>
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
              <p className="text-sm font-bold text-white">Disputa en Mesa {disputa.setup}</p>
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

        {/* Escritorio: plano de mesas a la izquierda + cola de combates a la derecha */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-8 lg:items-start space-y-5 lg:space-y-0">
        {/* Mesas del local */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <p className="eyebrow eyebrow-muted">Mesas · {local?.nombre}</p>
              <div className="flex rounded-lg border border-white/10 bg-white/4 p-0.5">
                {([['plano', MapIcon], ['lista', List]] as const).map(([k, Ic]) => (
                  <button key={k} onClick={() => setVistaMesas(k)} aria-label={`Vista ${k}`}
                    className={cn('h-6 w-7 rounded-md flex items-center justify-center transition-colors', vistaMesas === k ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8]')}>
                    <Ic size={12} />
                  </button>
                ))}
              </div>
            </div>
            <p className="text-xs text-[#8B8BA8]"><span className="text-[#B6FF3A] font-bold font-mono-num">{enJuego}</span> en juego · <span className="text-[#6FB0FF] font-bold font-mono-num">{libres}</span> libres</p>
          </div>

          {vistaMesas === 'plano' && (
            <div>
              {/* El plano lo define la sede; los estados salen de los setups del torneo */}
              <MapaMesas
                mesas={mesas}
                estados={Object.fromEntries(setups.map(s => [s.n, disputa?.setup === s.n ? 'disputa' : s.estado === 'ocupado' ? 'ocupada' : s.estado === 'caido' ? 'caida' : 'libre']) ) as Record<number, EstadoMesa>}
                ocupantes={Object.fromEntries(setups.filter(s => s.a && s.b).map(s => [s.n, `${s.a} vs ${s.b}`]))}
                seleccionada={mesaSel ?? undefined}
                onPick={m => setMesaSel(sel => sel === m.n ? null : m.n)}
              />
              <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                <LeyendaMesas conNeutra />
              </div>
              {mesaSel != null && (() => {
                const s = setups.find(x => x.n === mesaSel)
                const m = mesas.find(x => x.n === mesaSel)
                if (!m) return null
                const estado: EstadoMesa | null = s ? (disputa?.setup === s.n ? 'disputa' : s.estado === 'ocupado' ? 'ocupada' : s.estado === 'caido' ? 'caida' : 'libre') : null
                return (
                  <div className="mt-2.5 card-premium p-3.5 animate-slide-up-sm">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-white">Mesa {m.n} <span className="text-[#8B8BA8] font-semibold">· {m.tipo} · {m.plazas} plazas</span></p>
                      {estado
                        ? <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: ESTADO_MESA[estado].color }}>
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: ESTADO_MESA[estado].color }} /> {ESTADO_MESA[estado].label}
                          </span>
                        : <span className="text-[10px] font-bold uppercase tracking-wider text-[#8B8BA8]">Fuera del torneo</span>}
                    </div>
                    {s?.estado === 'ocupado' && <p className="text-sm text-white font-semibold mb-2">{s.a} <span className="text-[#6B6B85]">vs</span> {s.b} · <span className="text-[#B6FF3A] font-mono-num text-[12px]">{fmt(s.seg ?? 0)}</span></p>}
                    {s ? (
                      <div className="flex gap-2">
                        {s.estado === 'libre' && <button onClick={() => { asignar(s.n); setMesaSel(null) }} className="flex-1 h-9 rounded-lg bg-[#4F8EF7]/15 text-[#6FB0FF] text-xs font-bold">Asignar siguiente →</button>}
                        {s.estado === 'ocupado' && <>
                          <button onClick={() => { liberar(s.n); setMesaSel(null) }} className="flex-1 h-9 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-xs font-bold inline-flex items-center justify-center gap-1"><Check size={13} /> Liberar</button>
                          <button onClick={() => { toggleCaido(s.n); setMesaSel(null) }} className="h-9 px-3 rounded-lg bg-white/6 text-[#FF6076] text-xs font-bold inline-flex items-center justify-center gap-1"><Flag size={12} /> Caída</button>
                        </>}
                        {s.estado === 'caido' && <button onClick={() => { toggleCaido(s.n); setMesaSel(null) }} className="flex-1 h-9 rounded-lg bg-white/6 text-[#FF6076] text-xs font-bold inline-flex items-center justify-center gap-1"><RotateCcw size={12} /> Reactivar</button>}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#8B8BA8]">Esta mesa del local no está asignada al torneo. La sede gestiona su plano desde su panel.</p>
                    )}
                  </div>
                )
              })()}
            </div>
          )}

          <div className={cn('grid grid-cols-2 gap-2.5', vistaMesas !== 'lista' && 'hidden')}>
            {setups.map(s => {
              const c = COLORS[s.estado]
              return (
                <div key={s.n} className="card-premium p-3" style={{ borderColor: s.estado === 'caido' ? 'rgba(255,96,118,0.3)' : undefined }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-white">Mesa {s.n}</span>
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
            <p className="eyebrow eyebrow-muted inline-flex items-center gap-1.5">Cola de combates
              {bracketReal && <span className="inline-flex items-center gap-1 normal-case tracking-normal px-1.5 h-5 rounded-md bg-[#B6FF3A]/12 text-[#B6FF3A] text-[10px] font-bold"><ListTree size={10} /> Bracket real</span>}
            </p>
            <p className="text-xs text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{colaViva.length}</span> listos {pausada && <span className="text-[#FF8A5C]">· pausada</span>}</p>
          </div>
          <div className="space-y-2">
            {colaViva.length === 0 && (
              <p className="text-sm text-[#8B8BA8] text-center py-4">
                {bracketReal ? 'Cola vacía. Reporta resultados en Gestión para que entren los siguientes combates.' : 'Cola vacía. Los combates aparecerán al avanzar el bracket.'}
              </p>
            )}
            {colaViva.map((m, i) => (
              <div key={m.id} className="flex items-center gap-3 rounded-2xl bg-white/4 border border-white/8 px-3.5 py-2.5 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 8) * 40}ms` }}>
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
        </div>{/* fin grid escritorio */}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-[#1D2230] border border-white/12 text-white text-sm font-semibold shadow-xl animate-slide-up-sm flex items-center gap-2">
          <Check size={15} className="text-[#B6FF3A]" /> {toast}
        </div>
      )}
    </div>
  )
}
