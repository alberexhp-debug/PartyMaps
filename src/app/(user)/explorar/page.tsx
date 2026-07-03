'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { JUEGOS, TORNEOS_SAMPLE, type TorneoSample } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { OnboardingJuegos } from '@/components/todh/OnboardingJuegos'
import { useT } from '@/lib/i18n'
import { TorneoArt, GameKeyart } from '@/components/todh/GameKeyart'
import { FillBar } from '@/components/ui/CountUp'
import {
  Search, Lock, Trophy, Calendar, MapPin, Users, Check, ArrowUpDown, Bell, SlidersHorizontal, X, Eye,
} from 'lucide-react'

const FORMATOS_ALL = ['Doble eliminación', 'Eliminación simple', 'Suizo', 'Pools → Top cut', 'Round robin']

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
  const [showFiltros, setShowFiltros] = useState(false)
  const [formatos, setFormatos] = useState<Set<string>>(new Set())
  const [precioMax, setPrecioMax] = useState<number | null>(null)
  const [soloLibres, setSoloLibres] = useState(false)
  const [soloAbiertos, setSoloAbiertos] = useState(false)
  const creados = useDemoStore(s => s.creados)
  const seguidos = useDemoStore(s => s.seguidos)
  const favoritos = useDemoStore(s => s.juegosFavoritos)
  const { t, idioma } = useT()
  const noLeidas = useDemoStore(s => s.notificaciones.filter(n => !n.leida).length)

  const resultados = useMemo(() => {
    let r = [...creados, ...TORNEOS_SAMPLE]
    const q = busca.trim().toLowerCase()
    if (q) r = r.filter(t => t.nombre.toLowerCase().includes(q) || JUEGOS[t.juego].nombre.toLowerCase().includes(q))
    if (juego) r = r.filter(t => t.juego === juego)
    if (soloHoy) r = r.filter(t => t.esHoy)
    if (soloGratis) r = r.filter(t => t.precio === 0)
    if (formatos.size) r = r.filter(t => formatos.has(t.formato))
    if (precioMax != null) r = r.filter(t => t.precio <= precioMax)
    if (soloLibres) r = r.filter(t => t.inscritos < t.plazas)
    if (soloAbiertos) r = r.filter(t => !t.vip)
    switch (orden) {
      case 'fecha': r.sort((a, b) => (b.esHoy ? 1 : 0) - (a.esHoy ? 1 : 0)); break
      case 'precio': r.sort((a, b) => a.precio - b.precio); break
      default: r.sort((a, b) => (b.enDirecto ? 1 : 0) - (a.enDirecto ? 1 : 0) || b.popularidad - a.popularidad)
    }
    return r
  }, [busca, juego, soloHoy, soloGratis, formatos, precioMax, soloLibres, soloAbiertos, orden, creados])

  const numFiltros = (juego ? 1 : 0) + (soloHoy ? 1 : 0) + (soloGratis ? 1 : 0) + formatos.size + (precioMax != null ? 1 : 0) + (soloLibres ? 1 : 0) + (soloAbiertos ? 1 : 0)
  const limpiar = () => { setJuego(null); setSoloHoy(false); setSoloGratis(false); setFormatos(new Set()); setPrecioMax(null); setSoloLibres(false); setSoloAbiertos(false) }
  const toggleFormato = (f: string) => setFormatos(prev => { const n = new Set(prev); n.has(f) ? n.delete(f) : n.add(f); return n })

  // Secciones del feed (solo sin búsqueda ni filtros): cada torneo va a la 1ª que encaje
  const sectioned = !busca.trim() && numFiltros === 0
  const secciones = useMemo(() => {
    if (!sectioned) return null
    const deSeguidos: TorneoSample[] = [], tusJuegos: TorneoSample[] = [], hoy: TorneoSample[] = [], cerca: TorneoSample[] = [], resto: TorneoSample[] = []
    for (const t of resultados) {
      if (t.organizadorId && seguidos.includes(t.organizadorId)) deSeguidos.push(t)
      else if (favoritos.includes(t.juego)) tusJuegos.push(t)
      else if (t.esHoy) hoy.push(t)
      else if (!t.online && t.distanciaKm > 0 && t.distanciaKm <= 3) cerca.push(t)
      else resto.push(t)
    }
    return [
      { titulo: t('explorar.secSeguidos'), sub: t('explorar.secSeguidosSub'), items: deSeguidos },
      { titulo: t('explorar.secTusJuegos'), sub: t('explorar.secTusJuegosSub'), items: tusJuegos },
      { titulo: t('explorar.secHoy'), sub: t('explorar.secHoySub'), items: hoy },
      { titulo: t('explorar.secCerca'), sub: t('explorar.secCercaSub'), items: cerca },
      { titulo: t('explorar.secMas'), sub: t('explorar.secMasSub'), items: resto },
    ].filter(s => s.items.length > 0)
  }, [sectioned, resultados, seguidos, favoritos, t])

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-halo-rose" />

      {/* Top bar (solo móvil/tablet; en escritorio la sidebar cubre logo/buscar/avisos) */}
      <div className="relative flex lg:hidden items-center justify-between px-5 pt-5 safe-top">
        <span className="text-lg font-black text-display tracking-tight text-white">Tourneum</span>
        <div className="flex items-center gap-2">
          <Link href="/buscar" aria-label="Buscar" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><Search size={18} /></Link>
          <Link href="/notificaciones" aria-label="Notificaciones" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white relative">
            <Bell size={18} />
            {noLeidas > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3D71] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">{noLeidas}</span>}
          </Link>
        </div>
      </div>

      {/* Header */}
      <div className="relative px-5 pt-3 lg:pt-7 pb-3">
        <p className="eyebrow mb-2">{t('explorar.eyebrow')}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{t('explorar.titulo')}</h1>
        <p className="text-sm text-[#B8B8CC] mt-2">
          <span className="text-white font-bold text-numeric">{resultados.length}</span>{' '}
          {idioma === 'en' ? `tournament${resultados.length === 1 ? '' : 's'} near you` : `${resultados.length === 1 ? 'torneo' : 'torneos'} cerca de ti`}
        </p>
      </div>

      {/* En directo ahora */}
      {TORNEOS_SAMPLE.some(t => t.enDirecto) && (
        <div className="relative mt-1">
          <div className="flex items-center gap-2 px-5 mb-2">
            <span className="dot-live" />
            <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-white">{t('explorar.endirecto')}</p>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-hide px-5 pb-1.5">
            {TORNEOS_SAMPLE.filter(t => t.enDirecto).map((t, i) => {
              const jj = JUEGOS[t.juego]
              return (
                <Link key={t.id} href={`/torneo/${t.id}/directo`}
                  className="relative shrink-0 w-[236px] h-[140px] lg:w-[300px] lg:h-[172px] rounded-2xl overflow-hidden ring-grad group card-int stagger-item"
                  style={{ ['--delay' as string]: `${i * 60}ms`, boxShadow: `0 14px 34px -18px ${jj.color}66` }}>
                  <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-[1.06]">
                    <GameKeyart juegoId={t.juego} label={false} className="h-full w-full" />
                    {t.banner && <img src={t.banner} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60 mix-blend-luminosity brightness-[1.6] contrast-[1.05]" />}
                  </div>
                  <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(6,8,12,.9) 4%, rgba(6,8,12,.2) 46%, transparent 68%)' }} />
                  <span className="badge-live absolute top-2.5 left-2.5 backdrop-blur-sm" style={{ background: 'rgba(10,10,16,.6)' }}>Live</span>
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 h-6 rounded-full bg-black/55 backdrop-blur-sm text-white text-[10px] font-bold font-mono-num border border-white/12">
                    <Eye size={10} /> {Math.round(t.popularidad * 1.4)}
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-3">
                    <span className="inline-flex items-center gap-1.5 px-2 h-5 rounded-full text-[9px] font-bold mb-1.5"
                      style={{ background: `${jj.color}30`, color: jj.color, border: `1px solid ${jj.color}55` }}>
                      <span className="w-1 h-1 rounded-full" style={{ background: jj.color }} /> {jj.corto}
                    </span>
                    <p className="text-[14px] lg:text-[15px] font-bold text-white leading-tight truncate text-display">{t.nombre}</p>
                    <p className="text-[10.5px] text-white/70 font-mono-num mt-0.5">{t.local} · {t.fechaLabel}</p>
                  </div>
                  <span className="absolute inset-x-3 bottom-0 h-[2px] rounded-full opacity-80" style={{ background: `linear-gradient(90deg, ${jj.color}, transparent)` }} />
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Buscador + orden */}
      <div className="relative px-4 mt-3 space-y-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder={t('explorar.buscar')}
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
          <button
            onClick={() => setShowFiltros(true)}
            className={cn('h-11 px-3 rounded-2xl flex items-center gap-1.5 font-semibold text-sm glass-strong transition-all relative', numFiltros > 0 ? 'text-[#B6FF3A]' : 'text-[#B8B8CC] hover:text-white')}
          >
            <SlidersHorizontal size={15} />
            {numFiltros > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#B6FF3A] text-[#0A0A0F] text-[10px] font-bold flex items-center justify-center font-mono-num">{numFiltros}</span>}
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
            <Calendar size={11} /> {t('explorar.hoy')}
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
      <Link href="/consola" className="relative mx-4 mt-3 flex items-center gap-3 rounded-2xl border border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.08] px-4 py-3 hover:bg-[#B6FF3A]/[0.12] transition-colors">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/20 text-[#B6FF3A]"><Trophy size={17} /></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-semibold text-white">{t('explorar.organizas')}</span>
          <span className="block text-xs text-[#A0A0B8]">{t('explorar.abreConsola')}</span>
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
        ) : secciones ? (
          secciones.map(sec => (
            <section key={sec.titulo} className="space-y-3">
              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-base font-bold text-white text-display tracking-tight">{sec.titulo}</p>
                  <p className="text-[11px] text-[#8B8BA8]">{sec.sub}</p>
                </div>
                <span className="text-[11px] font-mono-num text-[#6B6B85]">{sec.items.length}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
                {sec.items.map((t, i) => <CardTorneo key={t.id} t={t} i={i} />)}
              </div>
            </section>
          ))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
            {resultados.map((t, i) => <CardTorneo key={t.id} t={t} i={i} />)}
          </div>
        )}
      </div>

      {/* Hoja de filtros */}
      {showFiltros && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={() => setShowFiltros(false)} />
          <div className="relative w-full max-w-lg bg-[#141822] border-t border-white/10 rounded-t-3xl pb-6 animate-slide-up-sm max-h-[85vh] overflow-y-auto">
            <div className="sticky top-0 bg-[#141822] pt-3 pb-2 px-5 flex items-center justify-between z-10 border-b border-white/5">
              <span className="absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15" />
              <p className="text-[15px] font-bold text-white mt-2">Filtros</p>
              <button onClick={() => setShowFiltros(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
            </div>
            <div className="px-5 pt-4 space-y-5">
              {/* Formato */}
              <div>
                <p className="eyebrow eyebrow-muted mb-2.5">Formato</p>
                <div className="flex flex-wrap gap-2">
                  {FORMATOS_ALL.map(f => (
                    <button key={f} onClick={() => toggleFormato(f)}
                      className={cn('px-3 h-9 rounded-xl text-xs font-semibold border transition-all',
                        formatos.has(f) ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/45' : 'bg-white/4 text-[#B8B8CC] border-white/10')}>
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              {/* Precio máximo */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <p className="eyebrow eyebrow-muted">Precio máximo</p>
                  <span className="text-sm font-bold text-white font-mono-num">{precioMax == null ? 'Cualquiera' : precioMax === 0 ? 'Gratis' : `${precioMax}€`}</span>
                </div>
                <input type="range" min={0} max={20} step={1} value={precioMax ?? 20}
                  onChange={e => setPrecioMax(Number(e.target.value) >= 20 ? null : Number(e.target.value))}
                  className="w-full accent-[#B6FF3A]" />
                <div className="flex justify-between text-[10px] text-[#6B6B85] mt-1"><span>Gratis</span><span>20€+</span></div>
              </div>
              {/* Toggles */}
              <div className="space-y-2">
                <ToggleRow label="Solo con plazas libres" on={soloLibres} onClick={() => setSoloLibres(v => !v)} />
                <ToggleRow label="Solo torneos abiertos (no VIP)" on={soloAbiertos} onClick={() => setSoloAbiertos(v => !v)} />
                <ToggleRow label="Solo hoy" on={soloHoy} onClick={() => setSoloHoy(v => !v)} />
                <ToggleRow label="Solo gratis" on={soloGratis} onClick={() => setSoloGratis(v => !v)} />
              </div>
            </div>
            {/* CTA */}
            <div className="px-5 pt-5 flex gap-2.5">
              <button onClick={limpiar} className="h-12 px-5 rounded-2xl bg-white/8 text-white font-semibold text-sm">Limpiar</button>
              <button onClick={() => setShowFiltros(false)} className="flex-1 h-12 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-sm">
                Ver {resultados.length} {resultados.length === 1 ? 'torneo' : 'torneos'}
              </button>
            </div>
          </div>
        </div>
      )}
      <OnboardingJuegos />
    </div>
  )
}

function ToggleRow({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center justify-between py-2.5">
      <span className="text-sm text-white font-medium">{label}</span>
      <span className={cn('relative w-11 h-6 rounded-full transition-colors', on ? 'bg-[#B6FF3A]' : 'bg-white/12')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all', on ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function CardTorneo({ t, i = 0 }: { t: TorneoSample; i?: number }) {
  const juego = JUEGOS[t.juego]
  const completo = t.inscritos >= t.plazas
  const pct = Math.min(100, Math.round((t.inscritos / t.plazas) * 100))
  return (
    <Link href={`/torneo/${t.id}`} className="block group stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 10) * 45}ms` }}>
      <div className="ring-grad card-premium card-int relative overflow-hidden rounded-2xl flex items-stretch">
        <TorneoArt t={t} className="w-[92px] shrink-0" />
        <div className="flex-1 p-3.5 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold"
              style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
            </span>
            {t.enDirecto && <span className="badge-live">Live</span>}
            {t.vip && (
              <span className="ml-auto inline-flex items-center gap-1 px-1.5 h-6 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/8 text-[#E0BE63] border border-[#D4A84B]/40">
                <Lock size={9} /> {t.vip}
              </span>
            )}
          </div>

          <p className="font-bold text-white text-display tracking-tight text-[15px] leading-snug truncate">{t.nombre}</p>

          <div className="mt-1.5 flex items-center gap-2 text-[11px] text-[#A0A0B8] min-w-0">
            <span className="inline-flex items-center gap-1 text-white shrink-0"><Calendar size={11} className="text-[#B6FF3A]" /> {t.fechaLabel}</span>
            <span className="text-[#3A3A4A]">·</span>
            <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={11} className="shrink-0" /> <span className="truncate">{t.local}</span></span>
          </div>

          <div className="mt-2.5 flex items-end justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="inline-flex items-center gap-1 text-[#8B8BA8]"><Users size={10} /> <span className="font-mono-num text-[#B8B8CC]">{t.inscritos}/{t.plazas}</span></span>
                <span className={cn('font-semibold', completo ? 'text-[#FF8A5C]' : 'text-[#B6FF3A]')}>{completo ? 'Lista de espera' : 'Abierta'}</span>
              </div>
              <FillBar pct={pct} color={completo ? '#FF8A5C' : `linear-gradient(90deg, ${juego.color}, #C8FF5C)`} />
            </div>
            <div className="text-right shrink-0">
              <p className="text-[8px] text-[#8B8BA8] uppercase tracking-[0.12em] font-bold">{t.bote ? 'Bote' : 'Entrada'}</p>
              <p className="text-[15px] font-bold text-white font-mono-num leading-none mt-0.5">{t.bote ? `${t.bote}€` : t.precio === 0 ? 'Free' : `${t.precio}€`}</p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
