'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { formatearPrecio, calcularEdad } from '@/lib/utils'
import { TrendingUp, Users, Ticket, Star, Calendar, UserCircle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts'
import { cn } from '@/lib/utils'

interface Analytics {
  ingresos_semana: { dia: string; ingresos: number; entradas: number }[]
  top_eventos: { nombre: string; entradas: number }[]
  distribucion_edad: { rango: string; count: number }[]
  resumen: {
    total_ingresos: number
    total_entradas: number
    media_rating: number
    total_suscriptores: number
    clientes_unicos: number
  }
}

const RANGOS_EDAD = [
  { rango: '18-21', min: 18, max: 21 },
  { rango: '22-25', min: 22, max: 25 },
  { rango: '26-30', min: 26, max: 30 },
  { rango: '31-35', min: 31, max: 35 },
  { rango: '36+',   min: 36, max: 999 },
]

export default function AnalyticsPage() {
  const { local } = useLocalPanelStore()
  const [data, setData] = useState<Analytics | null>(null)
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    if (!local) return
    cargar()
  }, [local, periodo])

  async function cargar() {
    if (!local) return
    setLoading(true)
    const dias = periodo === '7d' ? 7 : periodo === '30d' ? 30 : 90
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString()

    const [entradasRes, reviewsRes, subRes, eventosRes] = await Promise.all([
      supabase.from('entradas').select('created_at, precio_total, precio_local, usuario_id')
        .eq('local_id', local.id).gte('created_at', desde).eq('estado', 'activa'),
      supabase.from('reviews').select('puntuacion').eq('local_id', local.id).eq('censurada', false),
      supabase.from('suscripciones').select('id', { count: 'exact' }).eq('local_id', local.id),
      supabase.from('eventos').select('nombre, entradas_vendidas').eq('local_id', local.id)
        .order('entradas_vendidas', { ascending: false }).limit(5),
    ])

    const entradas = entradasRes.data || []
    const reviews = reviewsRes.data || []

    // Agrupar ingresos por día
    const grouped: Record<string, { ingresos: number; entradas: number }> = {}
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const key = d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      grouped[key] = { ingresos: 0, entradas: 0 }
    }
    entradas.forEach(e => {
      const key = new Date(e.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      if (grouped[key]) {
        grouped[key].ingresos += e.precio_total || 0
        grouped[key].entradas += 1
      }
    })

    // Distribución de edad — clientes únicos con entrada en el periodo
    const usuarioIds = Array.from(new Set(entradas.map(e => e.usuario_id).filter(Boolean)))
    const distEdad = RANGOS_EDAD.map(r => ({ rango: r.rango, count: 0 }))
    if (usuarioIds.length > 0) {
      const { data: usuarios } = await supabase
        .from('usuarios').select('fecha_nacimiento').in('id', usuarioIds)
      usuarios?.forEach(u => {
        if (!u.fecha_nacimiento) return
        const edad = calcularEdad(u.fecha_nacimiento)
        const rango = RANGOS_EDAD.find(r => edad >= r.min && edad <= r.max)
        if (rango) {
          const slot = distEdad.find(d => d.rango === rango.rango)
          if (slot) slot.count += 1
        }
      })
    }

    setData({
      ingresos_semana: Object.entries(grouped).map(([dia, v]) => ({ dia, ...v })),
      top_eventos: (eventosRes.data || []).map(e => ({ nombre: e.nombre, entradas: e.entradas_vendidas })),
      distribucion_edad: distEdad,
      resumen: {
        total_ingresos: entradas.reduce((s, e) => s + (e.precio_total || 0), 0),
        total_entradas: entradas.length,
        media_rating: reviews.length > 0 ? reviews.reduce((s, r) => s + r.puntuacion, 0) / reviews.length : 0,
        total_suscriptores: subRes.count || 0,
        clientes_unicos: usuarioIds.length,
      },
    })
    setLoading(false)
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 pb-24 md:pb-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-black text-white">Analytics</h1>
        <div className="flex gap-1 bg-white/6 rounded-xl p-1 border border-white/10">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                periodo === p ? 'bg-[#E94560] text-white' : 'text-[#6B6B85]')}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 bg-white/6 rounded-2xl animate-pulse" />)}
        </div>
      ) : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: TrendingUp, label: 'Ingresos', value: formatearPrecio(data.resumen.total_ingresos), color: '#E94560' },
              { icon: Ticket, label: 'Entradas', value: data.resumen.total_entradas.toString(), color: '#4F8EF7' },
              { icon: Star, label: 'Rating', value: data.resumen.media_rating > 0 ? `${data.resumen.media_rating.toFixed(1)} ★` : 'N/A', color: '#F39C12' },
              { icon: Users, label: 'Suscriptores', value: data.resumen.total_suscriptores.toString(), color: '#27AE60' },
            ].map(({ icon: Icon, label, value, color }) => (
              <div key={label} className="glass rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                    <Icon size={12} style={{ color }} />
                  </div>
                  <span className="text-xs text-[#6B6B85]">{label}</span>
                </div>
                <p className="text-xl font-black text-white">{value}</p>
              </div>
            ))}
          </div>

          {/* Gráfica ingresos */}
          <div className="glass rounded-2xl p-4">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-[#E94560]" />
              Ingresos por día
            </h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.ingresos_semana}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dia" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'rgba(20,20,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                  formatter={(v: unknown) => [formatearPrecio(Number(v)), 'Ingresos']}
                />
                <Bar dataKey="ingresos" fill="#E94560" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Entradas por día */}
          <div className="glass rounded-2xl p-4">
            <h2 className="font-bold text-white mb-4 flex items-center gap-2">
              <Ticket size={16} className="text-[#4F8EF7]" />
              Entradas vendidas
            </h2>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={data.ingresos_semana}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="dia" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'rgba(20,20,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="entradas" stroke="#4F8EF7" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Distribución de edad de clientes */}
          {data.resumen.clientes_unicos > 0 && (
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-bold text-white flex items-center gap-2">
                  <UserCircle size={16} className="text-[#27AE60]" />
                  Edad de tus clientes
                </h2>
                <span className="text-xs text-[#6B6B85]">{data.resumen.clientes_unicos} únicos</span>
              </div>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.distribucion_edad}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="rango" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: 'rgba(20,20,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }} />
                  <Bar dataKey="count" fill="#27AE60" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Top eventos */}
          {data.top_eventos.length > 0 && (
            <div className="glass rounded-2xl p-4 space-y-3">
              <h2 className="font-bold text-white flex items-center gap-2">
                <Calendar size={16} className="text-[#F39C12]" />
                Top eventos
              </h2>
              {data.top_eventos.map((e, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-bold text-[#6B6B85] w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{e.nombre}</p>
                    <div className="w-full h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                      <div className="h-full bg-[#F39C12] rounded-full"
                        style={{ width: `${data.top_eventos[0].entradas > 0 ? (e.entradas / data.top_eventos[0].entradas) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className="text-xs text-[#6B6B85] shrink-0">{e.entradas} entradas</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
