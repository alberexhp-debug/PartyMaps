'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearPrecio, getTemperaturaAforo, getColorTemperatura, getLabelTemperatura, aforoVisible } from '@/lib/utils'
import {
  Ticket, Users, TrendingUp, Bell, Star, Zap,
  Calendar, ChevronRight, BarChart3, AlertCircle, Gauge, Check, X, Beer,
  DoorClosed, MoonStar, AlertTriangle, HelpCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tour, type PasoTour } from '@/components/onboarding/Tour'

// Tour del dueño/gestor: 3 globos sobre el propio dashboard (doc 01 §6.1, versión por panel).
const TOUR_DASHBOARD: PasoTour[] = [
  { sel: 'ingresos', texto: 'Aquí ves tu noche en un vistazo: ingresos y entradas de hoy.' },
  { sel: 'kpis', texto: 'Tus números clave: suscriptores, valoración y entradas de la semana.' },
  { sel: 'acciones', texto: 'Desde aquí creas eventos, envías notificaciones y cierras la noche.' },
]
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface KPIs {
  entradas_hoy: number
  ingresos_hoy: number
  entradas_semana: number
  ingresos_semana_serie: { dia: string; ingresos: number; entradas: number }[]
  aforo_actual: number
  suscriptores: number
  media_reviews: number
  num_reviews: number
  evento_activo: { nombre: string; entradas_vendidas: number; aforo_maximo: number } | null
  pedidos_bar_hoy: number
  ingresos_bar_hoy: number
  pedidos_bar_pendientes: number
}

export default function LocalPanelDashboard() {
  const router = useRouter()
  const toast = useToast()
  const { local, trabajador, setLocal } = useLocalPanelStore()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [aforoSlider, setAforoSlider] = useState<number | null>(null)
  const [guardandoAforo, setGuardandoAforo] = useState(false)
  const [aforoGuardado, setAforoGuardado] = useState(false)
  const [promoPrecio, setPromoPrecio] = useState<number>(local?.precio_entrada_min || 0)
  const [promoHoras, setPromoHoras] = useState<number>(2)
  const [activandoPromo, setActivandoPromo] = useState(false)
  const [cerrandoNoche, setCerrandoNoche] = useState(false)
  const [showCerrarModal, setShowCerrarModal] = useState(false)
  const [tourActivo, setTourActivo] = useState(false)
  const [tourVisto, setTourVisto] = useState(true) // optimista: no parpadea si ya lo vio

  // Auto-lanza el tour la primera vez (dueño/gestor); recordatorio anti-spam si lleva días con pendientes.
  useEffect(() => {
    fetch('/api/onboarding').then(r => r.ok ? r.json() : null).then(d => {
      if (!d) return
      if (typeof d.tourVisto === 'boolean') { setTourVisto(d.tourVisto); if (!d.tourVisto) setTourActivo(true) }
      if (d.recordatorio) {
        toast.conAccion(`Te falta ${String(d.recordatorio.paso).toLowerCase()}. 1 minuto y tu local sale mejor en el mapa.`,
          { label: 'Ir', onClick: () => router.push('/local-panel/puesta-a-punto') }, 'warning')
        fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recordatorio: true }) }).catch(() => {})
      }
    }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const cerrarTour = () => {
    setTourActivo(false)
    if (!tourVisto) { fetch('/api/onboarding', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ tour: true }) }).catch(() => {}); setTourVisto(true) }
  }

  useEffect(() => {
    if (!local) return
    cargarKPIs()
  }, [local])

  async function cargarKPIs() {
    if (!local) return
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const hace7 = new Date(Date.now() - 7 * 86400000).toISOString()

    const [entradasHoyRes, semanaRes, suscritorRes, reviewsRes, eventoRes, pedidosBarRes, pedidosPendientesRes] = await Promise.all([
      supabase.from('entradas').select('precio_total').eq('local_id', local.id)
        .gte('created_at', inicioHoy).eq('estado', 'activa'),
      supabase.from('entradas').select('created_at, precio_total').eq('local_id', local.id)
        .gte('created_at', hace7).eq('estado', 'activa'),
      supabase.from('suscripciones').select('id', { count: 'exact' }).eq('local_id', local.id),
      supabase.from('reviews').select('puntuacion').eq('local_id', local.id).eq('censurada', false),
      supabase.from('eventos').select('nombre, entradas_vendidas, aforo_maximo')
        .eq('local_id', local.id).eq('estado', 'publicado')
        .gte('fecha_fin', new Date().toISOString()).single(),
      supabase.from('pedidos_bar').select('precio_total').eq('local_id', local.id)
        .gte('pagado_at', inicioHoy).in('estado', ['pagado', 'entregado']),
      supabase.from('pedidos_bar').select('id', { count: 'exact', head: true }).eq('local_id', local.id).eq('estado', 'pagado'),
    ])

    const entradasHoy = entradasHoyRes.data || []
    const semana = semanaRes.data || []
    const reviews = reviewsRes.data || []
    const pedidosBar = pedidosBarRes.data || []

    // Serie de 7 días
    const grouped: Record<string, { ingresos: number; entradas: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      grouped[d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })] = { ingresos: 0, entradas: 0 }
    }
    semana.forEach(e => {
      const key = new Date(e.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      if (grouped[key]) { grouped[key].ingresos += e.precio_total || 0; grouped[key].entradas++ }
    })

    setKpis({
      entradas_hoy: entradasHoy.length,
      ingresos_hoy: entradasHoy.reduce((s, e) => s + (e.precio_total || 0), 0),
      entradas_semana: semana.length,
      ingresos_semana_serie: Object.entries(grouped).map(([dia, v]) => ({ dia, ...v })),
      aforo_actual: aforoVisible(local),
      suscriptores: suscritorRes.count || 0,
      media_reviews: reviews.length > 0 ? reviews.reduce((s, r) => s + r.puntuacion, 0) / reviews.length : 0,
      num_reviews: reviews.length,
      pedidos_bar_hoy: pedidosBar.length,
      ingresos_bar_hoy: pedidosBar.reduce((s, p) => s + (p.precio_total || 0), 0),
      pedidos_bar_pendientes: pedidosPendientesRes.count || 0,
      evento_activo: eventoRes.data || null,
    })
    setLoading(false)
  }

  async function guardarAforo() {
    if (aforoSlider === null || !local || !trabajador) return
    setGuardandoAforo(true)
    await fetch('/api/locales/aforo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: local.id, porcentaje: aforoSlider, worker_id: trabajador.usuario_id }),
    })
    setGuardandoAforo(false)
    setAforoGuardado(true)
    setTimeout(() => setAforoGuardado(false), 3000)
  }

  const promoActiva = local?.promo_ultima_hora_hasta && new Date(local.promo_ultima_hora_hasta) > new Date()

  async function activarPromo() {
    if (!local) return
    setActivandoPromo(true)
    const res = await fetch('/api/locales/promo-ultima-hora', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: local.id, precio: promoPrecio, horas: promoHoras }),
    })
    const data = await res.json()
    setActivandoPromo(false)
    if (!res.ok) { toast.error(data.error || 'Error al activar la promo'); return }
    setLocal({ ...local, precio_promocional: promoPrecio, promo_ultima_hora_hasta: data.expira })
    toast.success('Promo activada y notificación enviada a suscriptores')
  }

  async function cancelarPromo() {
    if (!local) return
    setActivandoPromo(true)
    const res = await fetch('/api/locales/promo-ultima-hora', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: local.id }),
    })
    setActivandoPromo(false)
    if (!res.ok) { toast.error('Error al cancelar'); return }
    setLocal({ ...local, precio_promocional: undefined, promo_ultima_hora_hasta: undefined })
    toast.success('Promo cancelada')
  }

  async function setCerrarNoche(cerrar: boolean) {
    if (!local) return
    setCerrandoNoche(true)
    const res = await fetch('/api/local-panel/cerrar-noche', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cerrar }),
    })
    const data = await res.json().catch(() => ({}))
    setCerrandoNoche(false)
    setShowCerrarModal(false)
    if (!res.ok) { toast.error(data.error || 'No se pudo actualizar'); return }
    setLocal({ ...local, cerrado_hasta: data.cerrado_hasta })
    toast.success(cerrar ? 'Tu local saldrá cerrado esta noche' : 'Tu local vuelve a salir según su horario')
  }

  if (!local) return null
  const temperatura = getTemperaturaAforo(kpis?.aforo_actual || 0)
  const colorTemp = getColorTemperatura(temperatura)

  const capNoche = local.entradas_disponibles_noche
  const pctEntradas = capNoche && capNoche > 0 ? Math.min(100, Math.round(((kpis?.entradas_hoy || 0) / capNoche) * 100)) : null
  const cerradoActivo = !!local.cerrado_hasta && new Date(local.cerrado_hasta) > new Date()
  const puedeCerrar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'

  return (
    <div className="relative p-4 md:p-8 space-y-5 pb-20 md:pb-8 overflow-hidden">
      <div className="hero-halo-rose" />

      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{local.nombre}</h1>
          <p className="text-[#A0A0B8] text-sm capitalize mt-1">{local.tier} · {local.ciudad}</p>
        </div>
        <div className="flex items-center gap-2 mt-1 shrink-0">
          <button onClick={() => setTourActivo(true)} aria-label="Guía"
            className="w-8 h-8 rounded-full glass-strong flex items-center justify-center text-[#B8B8CC] hover:text-white transition-colors">
            <HelpCircle size={16} />
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur-md"
            style={{ background: `${colorTemp}18`, borderColor: `${colorTemp}50`, color: colorTemp }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: colorTemp }} />
            {Math.round(kpis?.aforo_actual || 0)}%
          </div>
        </div>
      </div>

      {/* Alerta estado */}
      {local.estado !== 'activo' && (
        <div className="flex items-center gap-3 p-4 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl">
          <AlertCircle size={18} className="text-[#F39C12] shrink-0" />
          <div>
            <p className="font-semibold text-[#F39C12] text-sm">Local en estado: {local.estado}</p>
            <p className="text-xs text-[#F39C12]/70">Contacta con soporte si tienes dudas</p>
          </div>
        </div>
      )}

      {/* Banner: cierre puntual activo */}
      {cerradoActivo && (
        <div className="flex items-center gap-3 p-4 bg-[#F39C12]/10 border border-[#F39C12]/40 rounded-xl">
          <AlertTriangle size={18} className="text-[#F39C12] shrink-0" />
          <p className="flex-1 text-sm text-[#F39C12]">Tu local sale cerrado esta noche · se reactiva solo mañana a las 12:00</p>
          {puedeCerrar && (
            <Button size="sm" variant="outline" loading={cerrandoNoche} onClick={() => setCerrarNoche(false)}>
              Reactivar ahora
            </Button>
          )}
        </div>
      )}

      {/* Hero — ingresos + entradas hoy */}
      <div data-tour-id="ingresos" className="card-premium relative overflow-hidden p-5 md:p-7">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-25 blur-3xl bg-[#4F8EF7]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-[#4F8EF7]/20 border border-[#4F8EF7]/35 flex items-center justify-center">
              <TrendingUp size={15} className="text-[#4F8EF7]" />
            </div>
            <span className="text-[10px] text-[#B8B8CC] font-bold uppercase tracking-[0.2em]">Ingresos hoy</span>
          </div>
          <p className="text-5xl md:text-6xl font-bold text-white text-display text-numeric tracking-tight">
            {loading ? '—' : formatearPrecio(kpis!.ingresos_hoy)}
          </p>

          {/* Entradas hoy + cap */}
          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#B8B8CC] flex items-center gap-1.5">
                <Ticket size={12} className="text-[#E94560]" />
                {loading ? '—' : kpis!.entradas_hoy} {kpis?.entradas_hoy === 1 ? 'entrada vendida' : 'entradas vendidas'} hoy
              </span>
              {capNoche && (
                <span className="text-xs text-[#8B8BA8]">
                  cap: {capNoche}
                </span>
              )}
            </div>
            {pctEntradas !== null && (
              <div className="w-full h-1.5 bg-white/8 rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', pctEntradas >= 90 ? 'bg-[#E94560]' : pctEntradas >= 60 ? 'bg-[#F39C12]' : 'bg-[#27AE60]')}
                  style={{ width: `${pctEntradas}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* KPIs secundarios */}
      <div data-tour-id="kpis" className="grid grid-cols-3 gap-2.5">
        <KPISecundario icon={Users} label="Suscriptores" value={loading ? '—' : kpis!.suscriptores.toString()} color="#9DA0B5" />
        <KPISecundario
          icon={Star} label="Valoración"
          value={loading ? '—' : kpis!.media_reviews > 0 ? kpis!.media_reviews.toFixed(1) : '—'}
          sublabel={!loading && kpis!.num_reviews > 0 ? `${kpis!.num_reviews} reseñas` : undefined}
          color="#D4A84B"
        />
        <KPISecundario
          icon={Ticket} label="Esta semana"
          value={loading ? '—' : kpis!.entradas_semana.toString()}
          sublabel="entradas"
          color="#9DA0B5"
        />
      </div>

      {/* Gráfica ingresos 7 días */}
      {!loading && kpis && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-[#4F8EF7]" /> Ingresos últimos 7 días
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={kpis.ingresos_semana_serie}>
              <defs>
                <linearGradient id="gradLocal" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E94560" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E94560" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="dia" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: unknown) => [formatearPrecio(Number(v)), 'Ingresos'] as [string, string]}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#E94560" fill="url(#gradLocal)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bar */}
      {!loading && (kpis!.pedidos_bar_hoy > 0 || kpis!.pedidos_bar_pendientes > 0) && (
        <button
          onClick={() => router.push('/local-panel/pedidos-bar')}
          className="card-premium relative w-full overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5"
        >
          <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-25 blur-3xl bg-[#F39C12]" />
          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#F39C12]/15 border border-[#F39C12]/40 flex items-center justify-center shrink-0">
              <Beer size={20} className="text-[#F39C12]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="eyebrow" style={{ color: '#F39C12' }}>Bar · hoy</p>
              <p className="text-3xl font-bold text-white text-display text-numeric mt-1">
                {formatearPrecio(kpis!.ingresos_bar_hoy)}
              </p>
              <p className="text-xs text-[#B8B8CC] mt-1">
                {kpis!.pedidos_bar_hoy} {kpis!.pedidos_bar_hoy === 1 ? 'pedido' : 'pedidos'}
                {kpis!.pedidos_bar_pendientes > 0 && (
                  <span className="text-[#E94560] font-bold ml-2">· {kpis!.pedidos_bar_pendientes} por servir</span>
                )}
              </p>
            </div>
            <ChevronRight size={20} className="text-[#B8B8CC] shrink-0" />
          </div>
        </button>
      )}

      {/* Evento activo */}
      {kpis?.evento_activo && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Calendar size={15} className="text-[#F39C12]" /> Evento activo
            </h2>
            <button onClick={() => router.push('/local-panel/eventos')} className="text-xs text-[#8B8BA8] hover:text-white transition-colors">
              Ver todos <ChevronRight size={11} className="inline" />
            </button>
          </div>
          <p className="font-semibold text-white text-sm">{kpis.evento_activo.nombre}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-[#8B8BA8] mb-1.5">
              <span>Entradas vendidas</span>
              <span className="text-white font-medium">{kpis.evento_activo.entradas_vendidas}/{kpis.evento_activo.aforo_maximo}</span>
            </div>
            <div className="w-full h-1.5 bg-white/6 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E94560] rounded-full transition-all"
                style={{ width: `${Math.min(100, (kpis.evento_activo.entradas_vendidas / kpis.evento_activo.aforo_maximo) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Aforo — override en vivo (el baseline por día se fija en Configuración) */}
      <div className="bg-white/3 border border-white/6 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2 text-sm">
            <Gauge size={15} className="text-[#E94560]" /> Afluencia ahora mismo
          </h2>
          <button onClick={() => router.push('/local-panel/configuracion?tab=aforo')}
            className="text-xs text-[#8B8BA8] hover:text-white transition-colors">
            Afluencia por día <ChevronRight size={11} className="inline" />
          </button>
        </div>
        <p className="text-xs text-[#6B6B85]">
          Ajuste puntual de lo lleno que ve la gente esta noche. Expira a las 6:00 AM.
          El nivel base de cada día se configura en <span className="text-[#A0A0B8]">Afluencia por día</span>.
        </p>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#A0A0B8]">Nivel actual</span>
            <span className="text-lg font-black" style={{ color: colorTemp }}>
              {aforoSlider !== null ? aforoSlider : Math.round(kpis?.aforo_actual || 0)}%
            </span>
          </div>
          <input
            type="range" min={0} max={100} step={5}
            value={aforoSlider !== null ? aforoSlider : Math.round(kpis?.aforo_actual || 0)}
            onChange={e => setAforoSlider(Number(e.target.value))}
            className="w-full accent-[#E94560]"
          />
          <div className="flex justify-between text-xs text-[#6B6B85]">
            <span>Vacío</span><span>Medio</span><span>Lleno</span>
          </div>
        </div>
        <Button size="sm" fullWidth loading={guardandoAforo} disabled={aforoSlider === null} onClick={guardarAforo}>
          {aforoGuardado ? <><Check size={13} /> Guardado</> : <><Gauge size={13} /> Aplicar</>}
        </Button>
      </div>

      {/* Promo última hora */}
      <div className={cn('bg-white/3 rounded-2xl border p-4 space-y-3', promoActiva ? 'border-[#F39C12]/40' : 'border-white/6')}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2 text-sm">
            <Zap size={15} className="text-[#F39C12]" /> Promo última hora
          </h2>
          {promoActiva && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F39C12]/15 text-[#F39C12] border border-[#F39C12]/25">
              Activa hasta {new Date(local!.promo_ultima_hora_hasta!).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {promoActiva ? (
          <>
            <p className="text-sm text-[#A0A0B8]">
              Precio promocional: <strong className="text-white">{formatearPrecio(local!.precio_promocional!)}</strong>
            </p>
            <Button size="sm" variant="secondary" fullWidth onClick={cancelarPromo} loading={activandoPromo}>
              <X size={13} /> Cancelar promo
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6B6B85]">
              Baja el precio temporalmente y notifica a tus suscriptores.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#6B6B85]">Precio (€)</label>
                <input type="number" min={local?.precio_entrada_min || 0} step="0.5"
                  value={promoPrecio} onChange={e => setPromoPrecio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#6B6B85]">Duración: {promoHoras}h</label>
                <input type="range" min={1} max={4} step={1}
                  value={promoHoras} onChange={e => setPromoHoras(parseInt(e.target.value))}
                  className="w-full accent-[#F39C12] mt-2" />
              </div>
            </div>
            <Button size="sm" fullWidth onClick={activarPromo} loading={activandoPromo}
              disabled={promoPrecio < (local?.precio_entrada_min || 0)}>
              <Zap size={13} /> Activar promo
            </Button>
          </>
        )}
      </div>

      {/* Acciones rápidas */}
      <div data-tour-id="acciones" className="bg-white/3 border border-white/6 rounded-2xl p-4">
        <h2 className="text-sm font-bold text-white mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/eventos')}>
            <Calendar size={13} /> Nuevo evento
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/notificaciones')}>
            <Bell size={13} /> Notificación
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/scanner')}>
            <Zap size={13} /> Scanner QR
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/analytics')}>
            <BarChart3 size={13} /> Analytics
          </Button>
          {/* Cerrar esta noche (cierre puntual) — solo dueño/gestor */}
          {puedeCerrar && (cerradoActivo ? (
            <button onClick={() => setCerrarNoche(false)} disabled={cerrandoNoche}
              className="col-span-2 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold bg-[#F39C12]/12 border border-[#F39C12]/30 text-[#F39C12] hover:bg-[#F39C12]/18 transition-colors disabled:opacity-50">
              <Check size={14} /> Reactivar local ahora
            </button>
          ) : (
            <button onClick={() => setShowCerrarModal(true)}
              className="col-span-2 flex items-center justify-center gap-2 h-9 rounded-xl text-sm font-semibold bg-[#E94560]/10 border border-[#E94560]/25 text-[#E94560] hover:bg-[#E94560]/16 transition-colors">
              <DoorClosed size={14} /> Cerrar esta noche
            </button>
          ))}
        </div>
      </div>

      {/* Modal: confirmar cierre puntual */}
      {showCerrarModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={() => setShowCerrarModal(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full sm:max-w-sm glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up safe-bottom" onClick={e => e.stopPropagation()}>
            <div className="w-11 h-11 rounded-2xl bg-[#E94560]/12 border border-[#E94560]/25 flex items-center justify-center mb-3">
              <MoonStar size={20} className="text-[#E94560]" />
            </div>
            <h3 className="text-lg font-bold text-white text-display">Cerrar esta noche</h3>
            <p className="text-sm text-[#B8B8CC] mt-1.5">Tu local saldrá cerrado en el mapa esta noche. Se reactiva solo mañana a las 12:00.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="danger" fullWidth loading={cerrandoNoche} onClick={() => setCerrarNoche(true)}>Sí, cerrar esta noche</Button>
              <Button variant="ghost" onClick={() => setShowCerrarModal(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}

      <Tour steps={TOUR_DASHBOARD} active={tourActivo} onDone={cerrarTour} />
    </div>
  )
}

function KPISecundario({ icon: Icon, label, value, sublabel, color }: {
  icon: React.ElementType; label: string; value: string; sublabel?: string; color: string
}) {
  return (
    <div className="card-premium p-3 md:p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={12} style={{ color }} />
        <span className="text-[9px] text-[#B8B8CC] font-bold uppercase tracking-[0.15em] truncate">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-white text-display text-numeric tracking-tight leading-none">{value}</p>
      {sublabel && <p className="text-[10px] text-[#8B8BA8] mt-1.5 truncate">{sublabel}</p>}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────
// Dashboard operador de noche
// ─────────────────────────────────────────────────────────────
function DashboardOperador() {
  const router = useRouter()
  const toast = useToast()
  const { local, trabajador } = useLocalPanelStore()
  const [pedidosPendientes, setPedidosPendientes] = useState(0)
  const [aforoSlider, setAforoSlider] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (!local) return
    const cargar = async () => {
      const { count } = await supabase
        .from('pedidos_bar').select('id', { count: 'exact', head: true })
        .eq('local_id', local.id).eq('estado', 'pagado')
      setPedidosPendientes(count ?? 0)
    }
    cargar()
    const ch = supabase.channel(`op-${local.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_bar', filter: `local_id=eq.${local.id}` }, cargar)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [local])

  if (!local) return null
  const temperatura = getTemperaturaAforo(aforoVisible(local))
  const colorTemp = getColorTemperatura(temperatura)
  const aforoActual = aforoSlider !== null ? aforoSlider : Math.round(aforoVisible(local))

  const guardar = async () => {
    if (aforoSlider === null || !trabajador) return
    setGuardando(true)
    await fetch('/api/locales/aforo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: local.id, porcentaje: aforoSlider, worker_id: trabajador.usuario_id }),
    })
    setGuardando(false)
    toast.success('Afluencia actualizada')
  }

  return (
    <div className="relative p-4 md:p-8 space-y-5 pb-20 md:pb-8 overflow-hidden">
      <div className="hero-halo-rose" />
      <div className="relative">
        <p className="eyebrow mb-2">Esta noche</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{local.nombre}</h1>
      </div>

      <div className="card-premium relative overflow-hidden p-5">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full opacity-25 blur-3xl" style={{ background: colorTemp }} />
        <div className="relative">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colorTemp }} />
              <p className="eyebrow" style={{ color: colorTemp }}>{getLabelTemperatura(temperatura)}</p>
            </div>
            <p className="text-5xl md:text-6xl font-bold text-display text-numeric" style={{ color: colorTemp }}>{aforoActual}%</p>
          </div>
          <input type="range" min={0} max={100}
            value={aforoActual} onChange={e => setAforoSlider(Number(e.target.value))}
            className="w-full accent-[#E94560]" />
          {aforoSlider !== null && (
            <Button fullWidth size="md" className="mt-3" onClick={guardar} loading={guardando}>
              Guardar aforo
            </Button>
          )}
          <p className="text-xs text-[#8B8BA8] mt-2">Expira a las 6 AM.</p>
        </div>
      </div>

      <button
        onClick={() => router.push('/local-panel/pedidos-bar')}
        className="card-premium relative w-full overflow-hidden p-5 text-left transition-all hover:-translate-y-0.5"
      >
        <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-25 blur-3xl bg-[#F39C12]" />
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#F39C12]/15 border border-[#F39C12]/40 flex items-center justify-center shrink-0">
            <Beer size={20} className="text-[#F39C12]" />
          </div>
          <div className="flex-1">
            <p className="eyebrow" style={{ color: '#F39C12' }}>Bar · cola en vivo</p>
            <p className="text-3xl font-bold text-white text-display text-numeric mt-1">{pedidosPendientes}</p>
            <p className="text-xs text-[#B8B8CC] mt-1">
              {pedidosPendientes === 0 ? 'Sin pedidos por servir' : `${pedidosPendientes} ${pedidosPendientes === 1 ? 'pedido' : 'pedidos'} por servir`}
            </p>
          </div>
          <ChevronRight size={20} className="text-[#B8B8CC]" />
        </div>
      </button>

      <div className="grid grid-cols-2 gap-3">
        {[
          { href: '/local-panel/scanner',        icon: Zap,       label: 'Scanner',      sublabel: 'Entradas y bar' },
          { href: '/local-panel/notificaciones', icon: Bell,      label: 'Notificación', sublabel: 'A tus seguidores' },
          { href: '/local-panel/sugerencias',    icon: Check,     label: 'Sugerencias',  sublabel: 'De los clientes' },
          { href: '/local-panel/sala',           icon: BarChart3, label: 'Sala',         sublabel: 'Mesas y reservas' },
        ].map(({ href, icon: Icon, label, sublabel }) => (
          <button key={href} onClick={() => router.push(href)}
            className="card-premium relative p-4 text-left overflow-hidden transition-all hover:-translate-y-0.5">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2.5 bg-white/5 border border-white/8">
                <Icon size={16} className="text-[#B8B8CC]" />
              </div>
              <p className="text-sm font-bold text-white text-display">{label}</p>
              <p className="text-[11px] text-[#B8B8CC] mt-0.5">{sublabel}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
