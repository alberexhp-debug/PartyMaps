'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { JUEGOS, TORNEOS_SAMPLE, type TorneoSample } from '@/lib/torneos/sample'
import {
  Search, Lock, Trophy, Calendar, MapPin, Users, Radio, Check, ArrowUpDown,
} from 'lucide-react'

type Orden = 'popularidad' | 'fecha' | 'precio'
const ORDEN_LABEL: Record<Orden, string> = {
  popularidad: 'Popularidad',
  fecha: 'Más próximos',
  precio: 'Precio',
}

export default function ExplorarPage() {
  const [busca, setBusca] = useState('')
  const [juego, setJuego] = useState<string | null>(null)
  const [soloHoy, setSoloHoy] = useState(false)
  const [soloGratis, setSoloGratis] = useState(false)
  const [orden, setOrden] = useState<Orden>('popularidad')
  const [showOrden, setShowOrden] = useState(false)

  const resultados = useMemo(() => {
    let r = [...TORNEOS_SAMPLE]
    const q = busca.trim().toLowerCase()
    if (q) r = r.filter(t => t.nombre.toLowerCase().includes(q) || JUEGOS[t.juego].nombre.toLowerCase().includes(q))
    if (juego) r = r.filter(t => t.juego === juego)
    if (soloHoy) r = r.filter(t => t.esHoy)
    if (soloGratis) r = r.filter(t => t.precio === 0)
    switch (orden) {
      case 'fecha': r.sort((a, b) => (b.esHoy ? 1 : 0) - (a.esHoy ? 1 : 0)); break
      case 'precio': r.sort((a, b) => a.precio - b.precio); break
      default: r.sort((a, b) => (b.enDirecto ? 1 : 0) - (a.enDirecto ? 1 : 0) || b.popularidad - a.popularidad)
    }
    return r
  }, [busca, juego, soloHoy, soloGratis, orden])

  const numFiltros = (juego ? 1 : 0) + (soloHoy ? 1 : 0) + (soloGratis ? 1 : 0)
  const limpiar = () => { setJuego(null); setSoloHoy(false); setSoloGratis(false) }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-halo-rose" />

      {/* Header */}
      <div className="relative px-5 pt-6 pb-3 safe-top">
        <p className="eyebrow mb-2">Próximos torneos</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Explorar</h1>
        <p className="text-sm text-[#B8B8CC] mt-2">
          <span className="text-white font-bold text-numeric">{resultados.length}</span>{' '}
          {resultados.length === 1 ? 'torneo' : 'torneos'} cerca de ti
        </p>
      </div>

      {/* Buscador + orden */}
      <div className="relative px-4 mt-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar torneo o juego…"
              aria-label="Buscar"
              className="w-full h-11 pl-10 pr-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#B6FF3A]/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowOrden(v => !v)}
            className="h-11 px-3 rounded-2xl flex items-center gap-1.5 font-semibold text-sm glass-strong text-[#B8B8CC] hover:text-white transition-all"
          >
            <ArrowUpDown size={15} /> <span className="hidden sm:inline">{ORDEN_LABEL[orden]}</span>
          </button>
        </div>

        {showOrden && (
          <div className="glass-strong rounded-2xl p-1.5 animate-slide-up-sm">
            {(Object.keys(ORDEN_LABEL) as Orden[]).map(o => (
              <button key={o} onClick={() => { setOrden(o); setShowOrden(false) }}
                className={cn('w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm transition-colors',
                  orden === o ? 'bg-[#B6FF3A]/12 text-white' : 'text-[#B8B8CC] hover:bg-white/5')}>
                {ORDEN_LABEL[o]} {orden === o && <Check size={15} className="text-[#B6FF3A]" />}
              </button>
            ))}
          </div>
        )}

        {/* Chips: juegos */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button onClick={() => setSoloHoy(v => !v)}
            className={cn('shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-colors',
              soloHoy ? 'bg-[#4F8EF7] text-white' : 'bg-white/4 border border-white/8 text-[#B8B8CC] hover:text-white')}>
            <Calendar size={11} /> Hoy
          </button>
          <button onClick={() => setSoloGratis(v => !v)}
            className={cn('shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-colors',
              soloGratis ? 'bg-[#27AE60] text-white' : 'bg-white/4 border border-white/8 text-[#B8B8CC] hover:text-white')}>
            Gratis
          </button>
          <span className="shrink-0 w-px h-5 bg-white/10 mx-0.5" />
          {Object.values(JUEGOS).map(j => {
            const activo = juego === j.id
            return (
              <button key={j.id} onClick={() => setJuego(activo ? null : j.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={activo
                  ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </button>
            )
          })}
          {numFiltros > 0 && (
            <button onClick={limpiar} className="shrink-0 text-xs text-[#B6FF3A] font-semibold hover:underline ml-1">Limpiar</button>
          )}
        </div>
      </div>

      {/* CTA organizador */}
      <Link href="/crear-torneo" className="relative mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.08] px-4 py-3 hover:bg-[#B6FF3A]/[0.12] transition-colors">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/20 text-[#B6FF3A]"><Trophy size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white">¿Organizas torneos?</span>
          <span className="block text-xs text-[#A0A0B8]">Publícalo en TODH en un minuto</span>
        </span>
        <span className="text-[#B6FF3A] text-lg">›</span>
      </Link>

      {/* Lista */}
      <div className="px-4 py-4 space-y-3 pb-8">
        {resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-4">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <Trophy size={28} className="text-[#8B8BA8]" />
            </div>
            <p className="text-xl font-bold text-white text-display tracking-tight">Sin torneos</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">Prueba a quitar algún filtro o cambia la búsqueda.</p>
            {numFiltros > 0 && (
              <button onClick={limpiar} className="mt-1 px-4 h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Quitar filtros</button>
            )}
          </div>
        ) : (
          resultados.map(t => <CardTorneo key={t.id} t={t} />)
        )}
      </div>
    </div>
  )
}

function CardTorneo({ t }: { t: TorneoSample }) {
  const juego = JUEGOS[t.juego]
  const completo = t.inscritos >= t.plazas
  const pct = Math.min(100, Math.round((t.inscritos / t.plazas) * 100))
  return (
    <Link href={`/torneo/${t.id}`} className="block">
      <div className="card-premium relative overflow-hidden hover:-translate-y-0.5 transition-transform">
        <div className="absolute left-0 top-0 bottom-0 w-1.5" style={{ background: juego.color }} />
        <div className="p-4 pl-5">
          {/* Juego + estados */}
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-bold"
              style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
            </span>
            {t.enDirecto && (
              <span className="inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#E63E54]/15 text-[#FF6076] border border-[#E63E54]/40">
                <Radio size={10} className="animate-pulse-heat" /> En directo
              </span>
            )}
            {t.vip && (
              <span className="ml-auto inline-flex items-center gap-1 px-2 h-7 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40">
                <Lock size={10} /> {t.vip}
              </span>
            )}
          </div>

          {/* Título */}
          <p className="font-bold text-white text-display tracking-tight text-[17px] leading-snug">{t.nombre}</p>

          {/* Meta */}
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#A0A0B8]">
            <span className="inline-flex items-center gap-1"><Trophy size={12} /> {t.formato}</span>
            <span className="inline-flex items-center gap-1 text-white font-medium"><Calendar size={12} className="text-[#B6FF3A]" /> {t.fechaLabel}</span>
          </div>
          <div className="mt-1 flex items-center gap-1 text-[12px] text-[#8B8BA8]">
            <MapPin size={12} className="shrink-0" />
            <span className="truncate">{t.local} · {t.ciudad}{t.distanciaKm > 0 ? ` · ${t.distanciaKm} km` : ''}</span>
          </div>

          {/* Footer: plazas + precio/bote */}
          <div className="mt-3 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="inline-flex items-center gap-1 text-[#B8B8CC]"><Users size={11} /> {t.inscritos}/{t.plazas} inscritos</span>
                <span className={cn('font-semibold', completo ? 'text-[#FF8A5C]' : 'text-[#B6FF3A]')}>
                  {completo ? 'Lista de espera' : 'Abierta'}
                </span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: completo ? '#FF8A5C' : '#B6FF3A' }} />
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[9px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{t.bote ? 'Bote' : 'Inscripción'}</p>
              <p className="text-base font-bold text-white text-numeric">
                {t.bote ? `${t.bote}€` : t.precio === 0 ? 'Gratis' : `${t.precio}€`}
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
