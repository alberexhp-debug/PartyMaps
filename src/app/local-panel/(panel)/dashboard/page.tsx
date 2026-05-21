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
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">{local.nombre}</h1>
          <p className="text-[#505065] text-sm capitalize">{local.tier} · {local.ciudad}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border"
          style={{ background: `${colorTemp}20`, borderColor: `${colorTemp}60`, color: colorTemp }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: colorTemp }} />
          {getLabelTemperatura(temperatura)} ({Math.round(kpis?.aforo_actual || 0)}%)
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3">
        <KPICard
          icon={Ticket}
          label="Entradas hoy"
          value={loading ? '...' : kpis!.entradas_hoy.toString()}
          color="#E94560"
        />
        <KPICard
          icon={TrendingUp}
          label="Ingresos hoy"
          value={loading ? '...' : formatearPrecio(kpis!.ingresos_hoy)}
          color="#4F8EF7"
        />
        <KPICard
          icon={Users}
          label="Suscriptores"
          value={loading ? '...' : kpis!.suscriptores.toString()}
          color="#F39C12"
        />
        <KPICard
          icon={Star}
          label="Valoración"
          value={loading ? '...' : kpis!.media_reviews > 0
            ? `${kpis!.media_reviews.toFixed(1)} ★ (${kpis!.num_reviews})`
            : 'Sin reseñas'}
          color="#27AE60"
        />
      </div>

      {/* Evento activo */}
      {kpis?.evento_activo && (
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4">
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
            <div className="flex items-center justify-between text-xs text-[#505065] mb-1">
              <span>Entradas vendidas</span>
              <span>{kpis.evento_activo.entradas_vendidas}/{kpis.evento_activo.aforo_maximo}</span>
            </div>
            <div className="w-full h-2 bg-[#0D0D1A] rounded-full overflow-hidden">
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
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4">
          <h2 className="font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-[#4F8EF7]" />
            Aforo últimas 24h
          </h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={kpis.historico_aforo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
              <XAxis dataKey="hora" tick={{ fill: '#505065', fontSize: 10 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#505065', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: 8 }}
                labelStyle={{ color: '#A0A0B8' }}
                itemStyle={{ color: '#E94560' }}
              />
              <Line type="monotone" dataKey="porcentaje" stroke="#E94560" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Aforo manual */}
      <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-4">
        <h2 className="font-bold text-white flex items-center gap-2">
          <Gauge size={16} className="text-[#E94560]" />
          Ajuste manual de aforo
        </h2>
        <p className="text-xs text-[#505065]">
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
          <div className="flex justify-between text-xs text-[#505065]">
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
        'bg-[#1A1A2E] rounded-2xl border p-4 space-y-3',
        promoActiva ? 'border-[#F39C12]/50' : 'border-[#2A2A3E]'
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
            <p className="text-xs text-[#505065]">
              Baja temporalmente el precio para atraer más gente. Envía notificación automática a tus suscriptores (no cuenta en tu límite semanal).
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs text-[#505065]">Precio promo (€)</label>
                <input type="number" min={local?.precio_entrada_min || 0} step="0.5"
                  value={promoPrecio}
                  onChange={e => setPromoPrecio(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-[#505065]">Duración: {promoHoras}h (máx 4h)</label>
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
      <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4 space-y-2">
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
    <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={14} style={{ color }} />
        </div>
        <span className="text-xs text-[#505065] font-medium">{label}</span>
      </div>
      <p className="text-xl font-black text-white">{value}</p>
    </div>
  )
}
