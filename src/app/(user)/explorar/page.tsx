'use client'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useMapStore } from '@/lib/stores/useMapStore'
import { LocalConAforo, TipoLocal, TipoMusica } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { BottomSheet } from '@/components/ui/Modal'
import { LocalImagen } from '@/components/ui/LocalImagen'
import { IlustracionBola } from '@/components/ui/Illustration'
import { PullIndicator } from '@/components/ui/PullIndicator'
import { usePullToRefresh } from '@/lib/hooks/usePullToRefresh'
import { ErrorState, SkeletonLocalCard } from '@/components/ui/ErrorState'
import {
  getColorTemperatura, getLabelTemperatura, getLabelTipoLocal,
  getTemperaturaAforo, formatearPrecio, cn,
} from '@/lib/utils'
import {
  Search, SlidersHorizontal, ArrowUpDown, Clock, Flame, MapPin,
  Ticket, X, Check, CalendarDays,
} from 'lucide-react'

type Orden = 'relevancia' | 'precio_asc' | 'precio_desc' | 'aforo_desc' | 'aforo_asc' | 'nombre'
type FiltroFecha =
  | { tipo: 'hoy' | 'manana' | 'finde' | 'semana' }
  | { tipo: 'fecha'; valor: string } // 'YYYY-MM-DD'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'] as const

// Rango [desde, hasta) en hora local a partir de un FiltroFecha.
function rangoDeFiltro(f: FiltroFecha): { desde: Date; hasta: Date } {
  const ahora = new Date()
  const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const dia = 86400000
  if (f.tipo === 'hoy') return { desde: hoy, hasta: new Date(hoy.getTime() + dia) }
  if (f.tipo === 'manana') return { desde: new Date(hoy.getTime() + dia), hasta: new Date(hoy.getTime() + 2 * dia) }
  if (f.tipo === 'semana') return { desde: hoy, hasta: new Date(hoy.getTime() + 7 * dia) }
  if (f.tipo === 'fecha') {
    const [y, m, dd] = f.valor.split('-').map(Number)
    const desde = new Date(y, m - 1, dd)
    return { desde, hasta: new Date(desde.getTime() + dia) }
  }
  // finde: próximo viernes 00:00 → lunes 00:00 (incluye el actual si ya es vie/sáb/dom)
  const d = hoy.getDay() // 0 dom … 6 sáb
  let diasHastaViernes = (5 - d + 7) % 7
  if (d === 6) diasHastaViernes = -1 // sábado
  else if (d === 0) diasHastaViernes = -2 // domingo
  const desde = new Date(hoy.getTime() + diasHastaViernes * dia)
  return { desde, hasta: new Date(desde.getTime() + 3 * dia) }
}

// Un local "pasa" el filtro de fecha si tiene un evento publicado dentro del
// rango, o (si no tiene eventos) si su horario indica que abre algún día del rango.
function localEnRango(l: LocalConAforo, desde: Date, hasta: Date): boolean {
  const eventos = ((l as unknown as { eventos?: { estado: string; fecha_inicio: string }[] }).eventos) || []
  const hayEvento = eventos.some(e => {
    if (e.estado !== 'publicado') return false
    const t = new Date(e.fecha_inicio).getTime()
    return t >= desde.getTime() && t < hasta.getTime()
  })
  if (hayEvento) return true
  const horario = l.horario as Record<string, { apertura: string; cierre: string } | null> | null
  if (!horario) return false
  for (let t = desde.getTime(); t < hasta.getTime(); t += 86400000) {
    const key = DIAS_SEMANA[new Date(t).getDay()]
    if (horario[key]) return true
  }
  return false
}

const TIPOS_LABEL: Record<TipoLocal, string> = {
  discoteca: 'Discoteca',
  bar_copas: 'Bar de copas',
  rooftop: 'Rooftop',
  sala_conciertos: 'Sala de conciertos',
  bar_cocteleria: 'Coctelería',
  otro: 'Otro',
}
const MUSICAS_LABEL: Record<TipoMusica, string> = {
  techno: 'Techno', house: 'House', reggaeton: 'Reggaeton', pop: 'Pop',
  hip_hop: 'Hip-Hop', indie: 'Indie', electronica: 'Electrónica',
  flamenco: 'Flamenco', otro: 'Otro',
}

const ORDEN_LABEL: Record<Orden, string> = {
  relevancia: 'Relevancia',
  precio_asc: 'Precio: menor primero',
  precio_desc: 'Precio: mayor primero',
  aforo_desc: 'Aforo: más lleno',
  aforo_asc: 'Aforo: más tranquilo',
  nombre: 'Nombre A-Z',
}

export default function ExplorarPage() {
  const { filtros, setFiltros, clearFiltros } = useMapStore()
  const [locales, setLocales] = useState<LocalConAforo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [busca, setBusca] = useState('')
  const [orden, setOrden] = useState<Orden>('relevancia')
  const [showFiltros, setShowFiltros] = useState(false)
  const [showOrden, setShowOrden] = useState(false)
  const [filtroFecha, setFiltroFecha] = useState<FiltroFecha | null>(null)
  const [soloOfertas, setSoloOfertas] = useState(false)

  const cargar = async () => {
    setLoading(true)
    setError(false)
    const { data, error: err } = await supabase
      .from('locales')
      .select('*, eventos(id, nombre, estado, fecha_inicio, precio_base, precio_maximo)')
      .eq('estado', 'activo')
      .limit(200)
    if (err || !data) { setError(true); setLoading(false); return }
    const conAforo: LocalConAforo[] = data.map(l => ({
      ...l,
      temperatura: getTemperaturaAforo(l.aforo_estimado_porcentaje || 0),
      evento_activo: l.eventos?.find((e: { estado: string }) => e.estado === 'publicado'),
    }))
    setLocales(conAforo)
    setLoading(false)
  }
  useEffect(() => { cargar() }, [])
  const ptr = usePullToRefresh({ onRefresh: cargar })

  // Aplicar filtros y orden en memoria
  const resultados = useMemo(() => {
    let r = locales
    const q = busca.trim().toLowerCase()
    if (q) r = r.filter(l => l.nombre.toLowerCase().includes(q) || (l.direccion || '').toLowerCase().includes(q))
    if (filtros.tipos.length > 0) r = r.filter(l => filtros.tipos.includes(l.tipo_local))
    if (filtros.musica.length > 0) r = r.filter(l => l.musica?.some(m => filtros.musica.includes(m)))
    if (filtros.solo_con_evento) r = r.filter(l => l.evento_activo)
    if (filtros.precio_min != null) r = r.filter(l => (l.precio_entrada_min ?? 0) >= filtros.precio_min!)
    if (filtros.precio_max != null) r = r.filter(l => (l.precio_entrada_min ?? 0) <= filtros.precio_max!)
    if (soloOfertas) r = r.filter(l => !!l.promo_ultima_hora_hasta && new Date(l.promo_ultima_hora_hasta).getTime() > Date.now())
    // Filtro por fecha (eventos publicados en el rango, o local abierto ese día)
    if (filtroFecha) {
      const { desde, hasta } = rangoDeFiltro(filtroFecha)
      r = r.filter(l => localEnRango(l, desde, hasta))
    }

    // Promoción activa
    const ahora = Date.now()
    const tienePromo = (l: LocalConAforo) => l.promo_ultima_hora_hasta && new Date(l.promo_ultima_hora_hasta).getTime() > ahora

    // Orden
    const sorted = [...r]
    switch (orden) {
      case 'precio_asc':  sorted.sort((a, b) => (a.precio_entrada_min ?? 0) - (b.precio_entrada_min ?? 0)); break
      case 'precio_desc': sorted.sort((a, b) => (b.precio_entrada_min ?? 0) - (a.precio_entrada_min ?? 0)); break
      case 'aforo_desc':  sorted.sort((a, b) => (b.aforo_estimado_porcentaje ?? 0) - (a.aforo_estimado_porcentaje ?? 0)); break
      case 'aforo_asc':   sorted.sort((a, b) => (a.aforo_estimado_porcentaje ?? 0) - (b.aforo_estimado_porcentaje ?? 0)); break
      case 'nombre':      sorted.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')); break
      case 'relevancia':
      default:
        // Score: destacado +100, promo activa +50, evento publicado +30, aforo medio +10
        sorted.sort((a, b) => {
          const score = (l: LocalConAforo) =>
            (l.tier === 'destacado' ? 100 : 0) +
            (tienePromo(l) ? 50 : 0) +
            (l.evento_activo ? 30 : 0) +
            Math.min(10, (l.aforo_estimado_porcentaje ?? 0) / 10)
          return score(b) - score(a)
        })
    }
    return sorted
  }, [locales, filtros, busca, orden, filtroFecha, soloOfertas])

  const numFiltros =
    filtros.tipos.length + filtros.musica.length +
    (filtros.solo_con_evento ? 1 : 0) +
    (filtros.precio_min != null || filtros.precio_max != null ? 1 : 0) +
    (filtroFecha != null ? 1 : 0) +
    (soloOfertas ? 1 : 0)

  const limpiarTodo = () => { clearFiltros(); setFiltroFecha(null); setSoloOfertas(false) }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <PullIndicator {...ptr} />
      <div className="hero-halo-rose" />

      {/* Header */}
      <div className="relative px-5 pt-6 pb-3 safe-top">
        <p className="eyebrow mb-2">Esta noche</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Explorar</h1>
        <p className="text-sm text-[#B8B8CC] mt-2">
          <span className="text-white font-bold text-numeric">{loading ? '—' : resultados.length}</span> {resultados.length === 1 ? 'local' : 'locales'} para ti
        </p>
      </div>

      {/* Controles: buscador + filtros + orden */}
      <div className="relative px-4 mt-3 space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#8B8BA8]" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar local…"
              aria-label="Buscar"
              className="w-full h-11 pl-10 pr-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-[#8B8BA8] focus:border-[#E94560]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#E94560]/20 outline-none transition-all"
            />
          </div>
          <button
            onClick={() => setShowFiltros(true)}
            aria-label="Filtros"
            className={cn(
              'h-11 px-3 rounded-2xl flex items-center gap-1.5 font-semibold text-sm transition-all',
              numFiltros > 0
                ? 'bg-[#E94560] text-white shadow-[0_6px_18px_-4px_rgba(233,69,96,0.55)]'
                : 'glass-strong text-[#B8B8CC] hover:text-white'
            )}
          >
            <SlidersHorizontal size={15} />
            {numFiltros > 0 && <span className="text-numeric">{numFiltros}</span>}
          </button>
        </div>

        {/* Chips de filtros activos + orden */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => setShowOrden(true)}
            className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full bg-white/6 border border-white/10 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <ArrowUpDown size={11} /> {ORDEN_LABEL[orden]}
          </button>
          {/* Filtros de fecha */}
          {([
            { id: 'hoy', label: 'Hoy' },
            { id: 'manana', label: 'Mañana' },
            { id: 'finde', label: 'Finde' },
            { id: 'semana', label: 'Semana' },
          ] as const).map(d => {
            const activo = filtroFecha?.tipo === d.id
            return (
              <button key={d.id}
                onClick={() => setFiltroFecha(activo ? null : { tipo: d.id })}
                className={cn(
                  'shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs font-semibold transition-colors',
                  activo
                    ? 'bg-[#4F8EF7] text-white'
                    : 'bg-white/4 border border-white/8 text-[#B8B8CC] hover:text-white'
                )}
              >
                <Clock size={10} /> {d.label}
              </button>
            )
          })}
          {/* Selector de fecha concreta */}
          <label
            className={cn(
              'shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full text-xs font-semibold cursor-pointer transition-colors relative',
              filtroFecha?.tipo === 'fecha'
                ? 'bg-[#4F8EF7] text-white'
                : 'bg-white/4 border border-white/8 text-[#B8B8CC] hover:text-white'
            )}
          >
            <CalendarDays size={11} />
            {filtroFecha?.tipo === 'fecha'
              ? new Date(filtroFecha.valor + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
              : 'Fecha'}
            <input
              type="date"
              value={filtroFecha?.tipo === 'fecha' ? filtroFecha.valor : ''}
              onChange={e => setFiltroFecha(e.target.value ? { tipo: 'fecha', valor: e.target.value } : null)}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Filtrar por fecha"
            />
          </label>
          {filtros.tipos.map(t => (
            <ChipActivo key={t} onClick={() => setFiltros({ tipos: filtros.tipos.filter(x => x !== t) })}>
              {TIPOS_LABEL[t]}
            </ChipActivo>
          ))}
          {filtros.musica.map(m => (
            <ChipActivo key={m} onClick={() => setFiltros({ musica: filtros.musica.filter(x => x !== m) })}>
              {MUSICAS_LABEL[m]}
            </ChipActivo>
          ))}
          {filtros.solo_con_evento && (
            <ChipActivo onClick={() => setFiltros({ solo_con_evento: false })}>Con evento</ChipActivo>
          )}
          {filtros.precio_max != null && (
            <ChipActivo onClick={() => setFiltros({ precio_min: undefined, precio_max: undefined })}>
              Hasta {filtros.precio_max}€
            </ChipActivo>
          )}
          {soloOfertas && (
            <ChipActivo onClick={() => setSoloOfertas(false)}>Ofertas</ChipActivo>
          )}
          {numFiltros > 0 && (
            <button onClick={limpiarTodo} className="shrink-0 text-xs text-[#E94560] font-semibold hover:underline ml-1">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="px-4 py-4 space-y-3 pb-8">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SkeletonLocalCard key={i} />)
        ) : error ? (
          <ErrorState onReintentar={cargar} />
        ) : resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
            <IlustracionBola size={140} />
            <p className="text-xl font-bold text-white text-display tracking-tight">Sin resultados</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">
              {numFiltros > 0
                ? 'Prueba a quitar algún filtro o cambiar la búsqueda.'
                : 'Aún no hay locales activos. Vuelve esta noche.'}
            </p>
            {numFiltros > 0 && (
              <Button variant="secondary" onClick={limpiarTodo}>Quitar filtros</Button>
            )}
          </div>
        ) : (
          resultados.map(l => <CardLocal key={l.id} local={l} />)
        )}
      </div>

      {/* Sheet de filtros */}
      <BottomSheet open={showFiltros} onClose={() => setShowFiltros(false)}>
        <div className="px-5 py-5 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white text-display">Filtros</h2>
            {numFiltros > 0 && (
              <button onClick={limpiarTodo} className="text-sm text-[#E94560] font-semibold">Limpiar todo</button>
            )}
          </div>

          <section className="space-y-2.5">
            <p className="eyebrow eyebrow-muted">Tipo de local</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TIPOS_LABEL) as TipoLocal[]).map(t => (
                <ChipToggle
                  key={t}
                  activo={filtros.tipos.includes(t)}
                  onClick={() => setFiltros({
                    tipos: filtros.tipos.includes(t)
                      ? filtros.tipos.filter(x => x !== t)
                      : [...filtros.tipos, t]
                  })}
                >
                  {TIPOS_LABEL[t]}
                </ChipToggle>
              ))}
            </div>
          </section>

          <section className="space-y-2.5">
            <p className="eyebrow eyebrow-muted">Música</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(MUSICAS_LABEL) as TipoMusica[]).map(m => (
                <ChipToggle
                  key={m}
                  activo={filtros.musica.includes(m)}
                  onClick={() => setFiltros({
                    musica: filtros.musica.includes(m)
                      ? filtros.musica.filter(x => x !== m)
                      : [...filtros.musica, m]
                  })}
                >
                  {MUSICAS_LABEL[m]}
                </ChipToggle>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="eyebrow eyebrow-muted">Precio entrada</p>
              <span className="text-sm font-bold text-white text-numeric">
                {filtros.precio_max == null ? 'Sin límite' : `Hasta ${filtros.precio_max}€`}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={filtros.precio_max ?? 50}
              onChange={e => {
                const v = Number(e.target.value)
                setFiltros({ precio_min: undefined, precio_max: v >= 50 ? undefined : v })
              }}
              aria-label="Precio máximo de la entrada"
              className="w-full accent-[#E94560] cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-[#6B6B85]">
              <span>Gratis</span>
              <span>50€+</span>
            </div>
          </section>

          <section>
            <ToggleRow
              label="Solo con evento esta noche"
              hint="Locales con un evento publicado"
              value={filtros.solo_con_evento}
              onChange={v => setFiltros({ solo_con_evento: v })}
            />
          </section>

          <section>
            <ToggleRow
              label="Solo ofertas"
              hint="Locales con descuento activo"
              value={soloOfertas}
              onChange={setSoloOfertas}
            />
          </section>

          <Button fullWidth size="lg" onClick={() => setShowFiltros(false)}>
            Ver {resultados.length} resultados
          </Button>
        </div>
      </BottomSheet>

      {/* Sheet de orden */}
      <BottomSheet open={showOrden} onClose={() => setShowOrden(false)}>
        <div className="px-5 py-5 space-y-1">
          <h2 className="text-xl font-bold text-white text-display mb-4">Ordenar por</h2>
          {(Object.keys(ORDEN_LABEL) as Orden[]).map(o => (
            <button
              key={o}
              onClick={() => { setOrden(o); setShowOrden(false) }}
              className={cn(
                'w-full flex items-center justify-between px-4 py-3 rounded-xl text-left transition-colors',
                orden === o ? 'bg-[#E94560]/12 text-white' : 'text-[#B8B8CC] hover:bg-white/5'
              )}
            >
              <span className="text-sm font-medium">{ORDEN_LABEL[o]}</span>
              {orden === o && <Check size={16} className="text-[#E94560]" />}
            </button>
          ))}
        </div>
      </BottomSheet>
    </div>
  )
}

function CardLocal({ local }: { local: LocalConAforo }) {
  const colorTemp = getColorTemperatura(local.temperatura)
  const tienePromo = local.promo_ultima_hora_hasta && new Date(local.promo_ultima_hora_hasta).getTime() > Date.now()
  const precioMostrar = local.precio_entrada_min
  return (
    <Link href={`/local/${local.id}`} className="block">
      <div className="card-premium overflow-hidden hover:-translate-y-0.5 transition-transform">
        <div className="flex items-stretch">
          {/* Imagen */}
          <div className="w-28 h-32 flex-shrink-0 relative overflow-hidden">
            <LocalImagen src={local.imagenes?.[0]} nombre={local.nombre} />
            {local.tier === 'destacado' && (
              <div className="absolute top-2 left-2">
                <Badge variant="gold" size="sm">★</Badge>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-bold text-white truncate text-display tracking-tight">{local.nombre}</p>
                  <p className="text-xs text-[#B8B8CC] truncate mt-0.5">{getLabelTipoLocal(local.tipo_local)}</p>
                </div>
                <span
                  className="shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md"
                  style={{ background: `${colorTemp}22`, color: colorTemp, border: `1px solid ${colorTemp}55` }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: colorTemp, boxShadow: `0 0 4px ${colorTemp}` }} />
                  {Math.round(local.aforo_estimado_porcentaje || 0)}%
                </span>
              </div>

              {local.evento_activo && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[#F39C12]">
                  <span>🎵</span>
                  <span className="truncate">{local.evento_activo.nombre}</span>
                </div>
              )}

              <div className="mt-1.5 flex items-center gap-1 text-[11px] text-[#8B8BA8]">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{local.direccion || local.ciudad}</span>
              </div>
            </div>

            <div className="mt-2 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                {tienePromo && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#E94560]/15 text-[#E94560] text-[10px] font-bold uppercase tracking-wider border border-[#E94560]/30">
                    <Flame size={9} /> Promo
                  </span>
                )}
                {local.evento_activo && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-[#F39C12]/15 text-[#F39C12] text-[10px] font-bold uppercase tracking-wider border border-[#F39C12]/30">
                    <Clock size={9} /> Hoy
                  </span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-[9px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Desde</p>
                <p className="text-base font-bold text-white text-numeric flex items-center gap-1">
                  <Ticket size={11} className="text-[#E94560]" />
                  {precioMostrar == null || precioMostrar === 0 ? 'Gratis' : formatearPrecio(precioMostrar)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

function ChipActivo({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 inline-flex items-center gap-1 px-3 h-8 rounded-full bg-[#E94560]/15 border border-[#E94560]/40 text-xs font-semibold text-white"
    >
      {children}
      <X size={11} className="opacity-70" />
    </button>
  )
}

function ChipToggle({ children, activo, onClick }: { children: React.ReactNode; activo: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'px-3 h-9 rounded-xl text-xs font-semibold transition-all',
        activo
          ? 'bg-[#E94560] text-white shadow-[0_4px_14px_-4px_rgba(233,69,96,0.55)]'
          : 'bg-white/5 border border-white/10 text-[#B8B8CC] hover:text-white hover:bg-white/8'
      )}
    >
      {children}
    </button>
  )
}

function ToggleRow({ label, hint, value, onChange }: {
  label: string; hint?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 bg-white/4 border border-white/8 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        {hint && <p className="text-xs text-[#B8B8CC] leading-snug mt-0.5">{hint}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        aria-label={label}
        aria-pressed={value}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative shrink-0',
          value ? 'bg-[#E94560]' : 'bg-white/15'
        )}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
          value ? 'left-[22px]' : 'left-0.5'
        )} />
      </button>
    </div>
  )
}
