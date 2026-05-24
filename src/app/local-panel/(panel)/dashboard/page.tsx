'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearPrecio, getTemperaturaAforo, getColorTemperatura, getLabelTemperatura } from '@/lib/utils'
import {
  Ticket, Users, TrendingUp, Bell, Star, Zap,
  Calendar, ChevronRight, BarChart3, AlertCircle, Gauge, Check, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface KPIs {
  entradas_hoy: number
  ingresos_hoy: number
  aforo_actual: number
  suscriptores: number
  media_reviews: number
  num_reviews: number
  evento_activo: { nombre: string; entradas_vendidas: number; aforo_maximo: number } | null
  historico_aforo: { hora: string; porcentaje: number }[]
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

  useEffect(() => {
    if (!local) return
    cargarKPIs()
  }, [local])

  async function cargarKPIs() {
    if (!local) return
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const [entradasRes, suscritorRes, reviewsRes, eventoRes, aforoRes] = await Promise.all([
      supabase.from('entradas').select('precio_total').eq('local_id', local.id)
        .gte('created_at', inicioHoy).eq('estado', 'activa'),
      supabase.from('suscripciones').select('id', { count: 'exact' }).eq('local_id', local.id),
      supabase.from('reviews').select('puntuacion').eq('local_id', local.id).eq('censurada', false),
      supabase.from('eventos').select('nombre, entradas_vendidas, aforo_maximo')
        .eq('local_id', local.id).eq('estado', 'publicado')
        .gte('fecha_fin', new Date().toISOString()).single(),
      supabase.from('historial_aforo').select('registrado_at, porcentaje')
        .eq('local_id', local.id)
        .gte('registrado_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('registrado_at', { ascending: true })
        .limit(24),
    ])

    const entradas = entradasRes.data || []
    const reviews = reviewsRes.data || []
    const historico = (aforoRes.data || []).map((h: { registrado_at: string; porcentaje: number }) => ({
      hora: new Date(h.registrado_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      porcentaje: Math.round(h.porcentaje),
    }))

    setKpis({
      entradas_hoy: entradas.length,
      ingresos_hoy: entradas.reduce((sum, e) => sum + (e.precio_total || 0), 0),
      aforo_actual: local.aforo_estimado_porcentaje || 0,
      suscriptores: suscritorRes.count || 0,
      media_reviews: reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.puntuacion, 0) / reviews.length
        : 0,
      num_reviews: reviews.length,
      evento_activo: eventoRes.data || null,
      historico_aforo: historico,
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

  const promoActiva = local?.promo_ultima_hora_hasta
    && new Date(local.promo_ultima_hora_hasta) > new Date()

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

  if (!local) return null
  const temperatura = getTemperaturaAforo(kpis?.aforo_actual || 0)
  const colorTemp = getColorTemperatura(temperatura)

  return (
    <div className="relative p-4 md:p-8 space-y-6 pb-20 md:pb-8 overflow-hidden">
      <div className="hero-halo-rose" />
      {/* Header */}
      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Dashboard</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{local.nombre}</h1>
          <p className="text-[#A0A0B8] text-sm capitalize mt-2">{local.tier} · {local.ciudad}</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold border backdrop-blur-md mt-1"
          style={{ background: `${colorTemp}22`, borderColor: `${colorTemp}70`, color: colorTemp, boxShadow: `0 8px 22px -4px ${colorTemp}55` }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colorTemp, boxShadow: `0 0 8px ${colorTemp}` }} />
          {getLabelTemperatura(temperatura)} · {Math.round(kpis?.aforo_actual || 0)}%
        </div>
      </div>

      {/* Estado del local */}
      {local.estado !== 'activo' && (
        <div className="flex items-center gap-3 p-4 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl">
          <AlertCircle size={18} className="text-[#F39C12] shrink-0" />
          <div>
            <p className="font-semibold text-[#F39C12] text-sm">Local en estado: {local.estado}</p>
            <p className="text-xs text-[#F39C12]/70">Contacta con soporte si tienes dudas</p>
          </div>
        </div>
      )}

      {/* KPI principal — ingresos hoy a tamaño hero */}
      <div className="card-premium relative overflow-hidden p-6 md:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30 blur-3xl bg-[#4F8EF7]" />
        <div className="relative">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-xl bg-[#4F8EF7]/22 border border-[#4F8EF7]/40 flex items-center justify-center" style={{ boxShadow: '0 4px 14px -4px rgba(79,142,247,0.7)' }}>
              <TrendingUp size={18} className="text-[#4F8EF7]" />
            </div>
            <span className="text-[10px] text-[#B8B8CC] font-bold uppercase tracking-[0.2em]">Ingresos hoy</span>
          </div>
          <p className="text-5xl md:text-6xl font-bold text-white text-display text-numeric tracking-tight">
            {loading ? '—' : formatearPrecio(kpis!.ingresos_hoy)}
          </p>
          <p className="text-sm text-[#B8B8CC] mt-2">
            {loading ? '' : `${kpis!.entradas_hoy} ${kpis!.entradas_hoy === 1 ? 'entrada vendida' : 'entradas vendidas'} hoy`}
          </p>
        </div>
      </div>

      {/* KPIs secundarios — pequeños */}
      <div className="grid grid-cols-3 gap-3">
        <KPISecundario
          icon={Users}
          label="Suscriptores"
          value={loading ? '—' : kpis!.suscriptores.toString()}
          color="#F39C12"
        />
        <KPISecundario
          icon={Star}
          label="Valoración"
          value={loading ? '—' : kpis!.media_reviews > 0 ? kpis!.media_reviews.toFixed(1) : '—'}
          sublabel={loading || kpis!.num_reviews === 0 ? undefined : `${kpis!.num_reviews} reseñas`}
          color="#27AE60"
        />
        <KPISecundario
          icon={Ticket}
          label="Aforo"
          value={loading ? '—' : `${Math.round(kpis!.aforo_actual)}%`}
          color={colorTemp}
        />
      </div>

      {/* Evento activo */}
      {kpis?.evento_activo && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white flex items-center gap-2">
              <Calendar size={16} className="text-[#F39C12]" />
              Evento activo
            </h2>
            <button onClick={() => router.push('/local-panel/eventos')} className="text-xs text-[#A0A0B8]">
              Ver todos <ChevronRight size={12} className="inline" />
            </button>
          </div>
          <p className="font-semibold text-white">{kpis.evento_activo.nombre}</p>
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-[#6B6B85] mb-1">
              <span>Entradas vendidas</span>
              <span>{kpis.evento_activo.entradas_vendidas}/{kpis.evento_activo.aforo_maximo}</span>
            </div>
            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E94560] rounded-full transition-all"
                style={{ width: `${Math.min(100, (kpis.evento_activo.entradas_vendidas / kpis.evento_activo.aforo_maximo) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Gráfica aforo últimas 24h */}
      {kpis?.historico_aforo && kpis.historico_aforo.length > 1 && (
        <div className="glass rounded-2xl p-4">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#4F8EF7]" />
            Aforo últimas 24h
          </h2>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={kpis.historico_aforo}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="hora" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(20,20,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: '#A0A0B8' }}
                itemStyle={{ color: '#E94560' }}
              />
              <Line type="monotone" dataKey="porcentaje" stroke="#E94560" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Aforo manual */}
      <div className="glass rounded-2xl p-4 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Gauge size={16} className="text-[#E94560]" />
          Ajuste manual de aforo
        </h2>
        <p className="text-xs text-[#6B6B85]">
          Corrige el aforo estimado. Tu valor sobreescribirá la estimación automática y expirará a las 6:00 AM.
        </p>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#A0A0B8]">Nivel actual</span>
            <span className="text-lg font-black" style={{ color: colorTemp }}>
              {aforoSlider !== null ? aforoSlider : Math.round(kpis?.aforo_actual || 0)}%
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={aforoSlider !== null ? aforoSlider : Math.round(kpis?.aforo_actual || 0)}
            onChange={e => setAforoSlider(Number(e.target.value))}
            className="w-full accent-[#E94560]"
          />
          <div className="flex justify-between text-xs text-[#6B6B85]">
            <span>Vacío</span>
            <span>Medio</span>
            <span>Lleno</span>
          </div>
        </div>
        <Button
          size="sm"
          fullWidth
          loading={guardandoAforo}
          disabled={aforoSlider === null}
          onClick={guardarAforo}
        >
          {aforoGuardado ? <><Check size={14} /> Guardado</> : <><Gauge size={14} /> Aplicar corrección</>}
        </Button>
      </div>

      {/* Promoción de última hora */}
      <div className={cn(
        'bg-white/6 rounded-2xl border p-4 space-y-3',
        promoActiva ? 'border-[#F39C12]/50' : 'border-white/10'
      )}>
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            <Zap size={16} className="text-[#F39C12]" />
            Promo de última hora
          </h2>
          {promoActiva && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F39C12]/20 text-[#F39C12]">
              Activa hasta {new Date(local!.promo_ultima_hora_hasta!).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        {promoActiva ? (
          <>
            <p className="text-sm text-[#A0A0B8]">
              Precio promocional aplicado: <strong className="text-white">{formatearPrecio(local!.precio_promocional!)}</strong>.
              Tras la expiración, vuelve al precio según la curva dinámica.
            </p>
            <Button size="sm" variant="secondary" fullWidth onClick={cancelarPromo} loading={activandoPromo}>
              <X size={14} /> Cancelar promo
            </Button>
          </>
        ) : (
          <>
            <p className="text-xs text-[#6B6B85]">
              Baja temporalmente el precio para atraer más gente. Envía notificación automática a tus suscriptores (no cuenta en tu límite semanal).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#6B6B85]">Precio promo (€)</label>
                <input type="number" min={local?.precio_entrada_min || 0} step="0.5"
                  value={promoPrecio}
                  onChange={e => setPromoPrecio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#6B6B85]">Duración: {promoHoras}h (máx 4h)</label>
                <input type="range" min={1} max={4} step={1}
                  value={promoHoras}
                  onChange={e => setPromoHoras(parseInt(e.target.value))}
                  className="w-full accent-[#F39C12]"
                />
              </div>
            </div>
            <Button size="sm" fullWidth onClick={activarPromo} loading={activandoPromo}
              disabled={promoPrecio < (local?.precio_entrada_min || 0)}>
              <Zap size={14} /> Activar promo
            </Button>
          </>
        )}
      </div>

      {/* Acciones rápidas */}
      <div className="glass rounded-2xl p-4 space-y-2">
        <h2 className="font-bold text-white mb-3">Acciones rápidas</h2>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/eventos')}>
            <Calendar size={14} /> Nuevo evento
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/notificaciones')}>
            <Bell size={14} /> Notificación
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/scanner')}>
            <Zap size={14} /> Scanner QR
          </Button>
          <Button variant="secondary" size="sm" onClick={() => router.push('/local-panel/analytics')}>
            <BarChart3 size={14} /> Analytics
          </Button>
        </div>
      </div>
    </div>
  )
}

function KPICard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string; color: string
}) {
  return (
    <div className="card-premium p-4 relative overflow-hidden">
      <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-30 blur-3xl" style={{ background: color }} />
      <div className="relative">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}40`, boxShadow: `0 4px 14px -4px ${color}80` }}>
            <Icon size={16} style={{ color }} />
          </div>
          <span className="text-[10px] text-[#B8B8CC] font-bold uppercase tracking-[0.18em]">{label}</span>
        </div>
        <p className="text-3xl font-bold text-white text-display text-numeric tracking-tight">{value}</p>
      </div>
    </div>
  )
}

/** KPI compacto para métricas secundarias bajo el hero */
function KPISecundario({ icon: Icon, label, value, sublabel, color }: {
  icon: React.ElementType; label: string; value: string; sublabel?: string; color: string
}) {
  return (
    <div className="card-premium p-3 md:p-4">
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={13} style={{ color }} />
        <span className="text-[9px] text-[#B8B8CC] font-bold uppercase tracking-[0.16em] truncate">{label}</span>
      </div>
      <p className="text-xl md:text-2xl font-bold text-white text-display text-numeric tracking-tight leading-none">{value}</p>
      {sublabel && <p className="text-[10px] text-[#8B8BA8] mt-1.5 truncate">{sublabel}</p>}
    </div>
  )
}
