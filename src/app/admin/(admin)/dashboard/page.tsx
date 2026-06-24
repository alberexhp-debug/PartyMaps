'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatearPrecio } from '@/lib/utils'
import {
  Store, Users, Ticket, TrendingUp, AlertCircle, ChevronRight,
  ArrowUpRight, Activity, BarChart3, Star,
} from 'lucide-react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'
import { HeroBanner } from '@/components/local-panel/ui'

interface GlobalStats {
  total_locales: number
  locales_pendientes: number
  total_usuarios: number
  nuevos_usuarios_semana: number
  total_entradas_hoy: number
  ingresos_plataforma_hoy: number
  ingresos_semana: { dia: string; ingresos: number; entradas: number }[]
  top_locales: { id: string; nombre: string; entradas: number; ingresos: number }[]
  tiers: Record<string, number>
  media_reviews: number
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'semana' | 'locales'>('semana')
  const [onb, setOnb] = useState<{ total: number; completos: number; pct: number; faltaPorPaso: Record<string, number> } | null>(null)

  useEffect(() => { cargar() }, [])
  useEffect(() => { fetch('/api/admin/onboarding-metricas').then(r => r.ok ? r.json() : null).then(d => { if (d && !d.error) setOnb(d) }).catch(() => {}) }, [])

  async function cargar() {
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const hace7 = new Date(Date.now() - 7 * 86400000).toISOString()

    const [localesRes, pendRes, usuariosRes, nuevosRes, entradasRes, semanaRes, reviewsRes, tieresRes] = await Promise.all([
      supabase.from('locales').select('id', { count: 'exact' }).eq('estado', 'activo'),
      supabase.from('locales').select('id', { count: 'exact' }).eq('estado', 'pendiente_verificacion'),
      supabase.from('usuarios').select('id', { count: 'exact' }).eq('estado_cuenta', 'activa'),
      supabase.from('usuarios').select('id', { count: 'exact' }).gte('created_at', hace7).eq('estado_cuenta', 'activa'),
      supabase.from('entradas').select('comision_plataforma').gte('created_at', inicioHoy).eq('estado', 'activa'),
      supabase.from('entradas').select('created_at, comision_plataforma, local_id').gte('created_at', hace7).eq('estado', 'activa'),
      supabase.from('reviews').select('puntuacion').eq('censurada', false),
      supabase.from('locales').select('tier').eq('estado', 'activo'),
    ])

    const entradas = entradasRes.data || []
    const semana = semanaRes.data || []

    // Agrupar por día
    const grouped: Record<string, { ingresos: number; entradas: number }> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      grouped[d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })] = { ingresos: 0, entradas: 0 }
    }
    semana.forEach(e => {
      const key = new Date(e.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      if (grouped[key]) { grouped[key].ingresos += e.comision_plataforma || 0; grouped[key].entradas++ }
    })

    // Top locales por ingresos
    const localMap: Record<string, { id: string; nombre: string; entradas: number; ingresos: number }> = {}
    semana.forEach(e => {
      if (!localMap[e.local_id]) localMap[e.local_id] = { id: e.local_id, nombre: e.local_id.slice(0, 8), entradas: 0, ingresos: 0 }
      localMap[e.local_id].entradas++
      localMap[e.local_id].ingresos += e.comision_plataforma || 0
    })
    // Intentar resolver nombres
    if (Object.keys(localMap).length > 0) {
      const { data: locData } = await supabase.from('locales').select('id, nombre').in('id', Object.keys(localMap))
      locData?.forEach(l => { if (localMap[l.id]) localMap[l.id].nombre = l.nombre })
    }
    const topLocales = Object.values(localMap).sort((a, b) => b.ingresos - a.ingresos).slice(0, 5)

    // Distribución de tiers
    const tierCounts: Record<string, number> = {}
    ;(tieresRes.data || []).forEach(l => {
      tierCounts[l.tier] = (tierCounts[l.tier] || 0) + 1
    })

    const reviews = reviewsRes.data || []
    const mediaReviews = reviews.length > 0
      ? reviews.reduce((s, r) => s + r.puntuacion, 0) / reviews.length
      : 0

    setStats({
      total_locales: localesRes.count || 0,
      locales_pendientes: pendRes.count || 0,
      total_usuarios: usuariosRes.count || 0,
      nuevos_usuarios_semana: nuevosRes.count || 0,
      total_entradas_hoy: entradas.length,
      ingresos_plataforma_hoy: entradas.reduce((s, e) => s + (e.comision_plataforma || 0), 0),
      ingresos_semana: Object.entries(grouped).map(([dia, v]) => ({ dia, ...v })),
      top_locales: topLocales,
      tiers: tierCounts,
      media_reviews: mediaReviews,
    })
    setLoading(false)
  }

  const NEUTRO = '#9DA0B5'
  const kpis = [
    { icon: Store,      label: 'Locales activos',    value: stats?.total_locales.toString() ?? '—',       color: NEUTRO,     sub: `${stats?.locales_pendientes ?? 0} pendientes` },
    { icon: Users,      label: 'Usuarios',            value: stats?.total_usuarios.toString() ?? '—',       color: NEUTRO,     sub: `+${stats?.nuevos_usuarios_semana ?? 0} esta semana` },
    { icon: Ticket,     label: 'Entradas hoy',        value: stats?.total_entradas_hoy.toString() ?? '—',   color: NEUTRO,     sub: undefined },
    { icon: TrendingUp, label: 'Comisiones hoy',      value: stats ? formatearPrecio(stats.ingresos_plataforma_hoy) : '—', color: '#27AE60', sub: undefined },
    { icon: Star,       label: 'Valoración media',    value: stats ? stats.media_reviews.toFixed(1) : '—', color: '#D4A84B', sub: 'todas las reseñas' },
    { icon: Activity,   label: 'Tiers (pro+dest.)',   value: stats ? ((stats.tiers.pro || 0) + (stats.tiers.destacado || 0)).toString() : '—', color: NEUTRO, sub: undefined },
  ]

  return (
    <div className="relative p-4 md:p-8 pb-20 md:pb-8 space-y-6 overflow-hidden">
      {/* Header con hero */}
      <HeroBanner acento="blue" bleed="-mx-4 md:-mx-8 -mt-4 md:-mt-8"
        eyebrow="Tiempo real" titulo="Dashboard" subtitulo="Vista global de la plataforma"
        heroLabel="Comisiones · hoy" heroValue={stats ? Math.round(stats.ingresos_plataforma_hoy) : '—'} heroUnit="€"
        pillLabel="Entradas hoy" pillValue={stats ? stats.total_entradas_hoy : '—'} />

      {/* Alerta locales pendientes */}
      {(stats?.locales_pendientes || 0) > 0 && (
        <button
          onClick={() => router.push('/admin/locales?estado=pendiente_verificacion')}
          className="w-full flex items-center gap-3 p-4 bg-[#F39C12]/8 border border-[#F39C12]/25 rounded-2xl text-left hover:bg-[#F39C12]/12 transition-colors"
        >
          <AlertCircle size={18} className="text-[#F39C12] shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-[#F39C12] text-sm">{stats?.locales_pendientes} locales pendientes de verificación</p>
            <p className="text-xs text-[#F39C12]/60 mt-0.5">Requieren revisión manual</p>
          </div>
          <ChevronRight size={16} className="text-[#F39C12]" />
        </button>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map(({ icon: Icon, label, value, color, sub }) => (
          <div key={label} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center">
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-[10px] text-[#8B8BA8] font-bold uppercase tracking-[0.15em] truncate">{label}</span>
            </div>
            <p className="text-2xl md:text-3xl font-bold text-white text-display text-numeric">{loading ? '—' : value}</p>
            {sub && <p className="text-[11px] text-[#8B8BA8] mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Salud del onboarding de los locales (doc 01 §12) */}
      {onb && onb.total > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
          <div className="flex items-end justify-between gap-3 mb-2">
            <span className="text-[10px] text-[#8B8BA8] font-bold uppercase tracking-[0.15em]">Locales listos (obligatorios)</span>
            <span className="text-2xl font-bold text-white text-numeric leading-none">{onb.pct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${onb.pct}%`, background: onb.pct >= 80 ? '#27AE60' : onb.pct >= 50 ? '#F39C12' : '#B6FF3A' }} />
          </div>
          <p className="text-[11px] text-[#8B8BA8] mt-2">
            {onb.completos}/{onb.total} con datos, horarios, fotos y aforo.
            {Object.entries(onb.faltaPorPaso).sort((a, b) => b[1] - a[1])[0] && (() => { const top = Object.entries(onb.faltaPorPaso).sort((a, b) => b[1] - a[1])[0]; return ` Lo que más falta: ${top[0].toLowerCase()} (${top[1]}).` })()}
          </p>
        </div>
      )}

      {/* Gráficas */}
      {!loading && stats && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          {/* Tabs */}
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-sm font-bold text-white flex-1">Actividad últimos 7 días</h2>
            <div className="flex gap-1 bg-white/6 rounded-lg p-0.5">
              {(['semana', 'locales'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-semibold transition-colors',
                    tab === t ? 'bg-white/10 text-white' : 'text-[#8B8BA8] hover:text-white')}>
                  {t === 'semana' ? 'Comisiones' : 'Top locales'}
                </button>
              ))}
            </div>
          </div>

          {tab === 'semana' && (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={stats.ingresos_semana}>
                <defs>
                  <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="dia" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: unknown, name: unknown) => [name === 'ingresos' ? formatearPrecio(Number(v)) : String(v), name === 'ingresos' ? 'Comisiones' : 'Entradas'] as [string, string]}
                />
                <Area type="monotone" dataKey="ingresos" stroke="#4F8EF7" fill="url(#gradAdmin)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          )}

          {tab === 'locales' && (
            stats.top_locales.length === 0 ? (
              <p className="text-center text-[#6B6B85] py-8 text-sm">Sin datos de locales esta semana</p>
            ) : (
              <div className="space-y-2.5">
                {stats.top_locales.map((l, i) => (
                  <button key={l.id} onClick={() => router.push(`/admin/locales/${l.id}`)}
                    className="w-full flex items-center gap-3 hover:bg-white/4 rounded-xl px-2 py-1.5 transition-colors text-left">
                    <span className="text-xs font-bold text-[#6B6B85] w-4 shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{l.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{l.entradas} entradas</p>
                    </div>
                    <p className="text-sm font-bold text-[#27AE60] text-numeric shrink-0">{formatearPrecio(l.ingresos)}</p>
                    <ArrowUpRight size={13} className="text-[#6B6B85] shrink-0" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Distribución tiers */}
      {!loading && stats && Object.keys(stats.tiers).length > 0 && (
        <div className="bg-white/3 border border-white/6 rounded-2xl p-4">
          <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={15} className="text-[#7C5CFF]" /> Distribución de tiers
          </h2>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={Object.entries(stats.tiers).map(([tier, count]) => ({ tier, count }))}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="tier" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
              />
              <Bar dataKey="count" fill="#7C5CFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <p className="text-[10px] font-bold text-[#8B8BA8] uppercase tracking-[0.2em] mb-3">Gestión</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Gestionar locales',   href: '/admin/locales' },
            { label: 'Gestionar usuarios',  href: '/admin/usuarios' },
            { label: 'Moderación',          href: '/admin/moderacion' },
            { label: 'Configuración',       href: '/admin/configuracion' },
            { label: 'Auditoría',           href: '/admin/auditoria' },
          ].map(({ label, href }) => (
            <button key={href} onClick={() => router.push(href)}
              className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 text-left hover:bg-white/[0.06] transition-colors group">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">{label}</p>
                <ChevronRight size={14} className="text-[#6B6B85] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
