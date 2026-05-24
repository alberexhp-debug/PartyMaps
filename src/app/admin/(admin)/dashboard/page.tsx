'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { formatearPrecio } from '@/lib/utils'
import { Store, Users, Ticket, TrendingUp, AlertCircle, Clock, ChevronRight } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

interface GlobalStats {
  total_locales: number
  locales_pendientes: number
  total_usuarios: number
  total_entradas_hoy: number
  ingresos_plataforma_hoy: number
  ingresos_semana: { dia: string; ingresos: number }[]
}

export default function AdminDashboard() {
  const router = useRouter()
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()

    const [localesRes, localesPendRes, usuariosRes, entradasRes, semanasRes] = await Promise.all([
      supabase.from('locales').select('id', { count: 'exact' }).eq('estado', 'activo'),
      supabase.from('locales').select('id', { count: 'exact' }).eq('estado', 'pendiente_verificacion'),
      supabase.from('usuarios').select('id', { count: 'exact' }).eq('estado_cuenta', 'activa'),
      supabase.from('entradas').select('comision_plataforma').gte('created_at', inicioHoy).eq('estado', 'activa'),
      // Últimos 7 días de ingresos
      supabase.from('entradas').select('created_at, comision_plataforma')
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .eq('estado', 'activa'),
    ])

    const entradas = entradasRes.data || []
    const semana = semanasRes.data || []

    // Agrupar por día
    const grouped: Record<string, number> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      grouped[d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })] = 0
    }
    semana.forEach(e => {
      const key = new Date(e.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
      if (grouped[key] !== undefined) grouped[key] += e.comision_plataforma || 0
    })

    setStats({
      total_locales: localesRes.count || 0,
      locales_pendientes: localesPendRes.count || 0,
      total_usuarios: usuariosRes.count || 0,
      total_entradas_hoy: entradas.length,
      ingresos_plataforma_hoy: entradas.reduce((s, e) => s + (e.comision_plataforma || 0), 0),
      ingresos_semana: Object.entries(grouped).map(([dia, ingresos]) => ({ dia, ingresos })),
    })
    setLoading(false)
  }

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-6">
      <div>
        <p className="text-[10px] font-bold text-[#4F8EF7] uppercase tracking-[0.25em] mb-1">Tiempo real</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">Dashboard global</h1>
        <p className="text-[#A0A0B8] text-sm mt-1">Vista de la plataforma</p>
      </div>

      {/* Alertas */}
      {(stats?.locales_pendientes || 0) > 0 && (
        <button
          onClick={() => router.push('/admin/locales?estado=pendiente_verificacion')}
          className="w-full flex items-center gap-3 p-4 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-xl text-left hover:bg-[#F39C12]/20 transition-colors"
        >
          <AlertCircle size={18} className="text-[#F39C12] shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-[#F39C12] text-sm">{stats?.locales_pendientes} locales pendientes de verificación</p>
            <p className="text-xs text-[#F39C12]/70">Requieren revisión manual</p>
          </div>
          <ChevronRight size={16} className="text-[#F39C12]" />
        </button>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: Store, label: 'Locales activos', value: loading ? '...' : stats!.total_locales.toString(), color: '#E94560' },
          { icon: Users, label: 'Usuarios activos', value: loading ? '...' : stats!.total_usuarios.toString(), color: '#4F8EF7' },
          { icon: Ticket, label: 'Entradas hoy', value: loading ? '...' : stats!.total_entradas_hoy.toString(), color: '#F39C12' },
          { icon: TrendingUp, label: 'Comisiones hoy', value: loading ? '...' : formatearPrecio(stats!.ingresos_plataforma_hoy), color: '#27AE60' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="glass rounded-2xl p-4 relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-20 blur-2xl" style={{ background: color }} />
            <div className="relative">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${color}22`, border: `1px solid ${color}38` }}>
                  <Icon size={14} style={{ color }} />
                </div>
                <span className="text-[10px] text-[#A0A0B8] font-semibold uppercase tracking-[0.15em]">{label}</span>
              </div>
              <p className="text-2xl font-bold text-white text-display tracking-tight">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Gráfica comisiones */}
      {!loading && stats && (
        <div className="glass rounded-2xl p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[#4F8EF7] uppercase tracking-[0.2em]">Últimos 7 días</p>
            <h2 className="font-bold text-white text-lg text-display">Comisiones de la plataforma</h2>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <AreaChart data={stats.ingresos_semana}>
              <defs>
                <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
              <XAxis dataKey="dia" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ background: 'rgba(20,20,42,0.95)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: unknown) => [formatearPrecio(Number(v)), 'Comisiones']}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#4F8EF7" fill="url(#gradAdmin)" strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accesos rápidos */}
      <div>
        <p className="text-[10px] font-bold text-[#A0A0B8] uppercase tracking-[0.2em] mb-3">Accesos rápidos</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Gestionar locales', href: '/admin/locales', color: '#E94560' },
            { label: 'Gestionar usuarios', href: '/admin/usuarios', color: '#4F8EF7' },
            { label: 'Cola moderación', href: '/admin/moderacion', color: '#F39C12' },
            { label: 'Configuración', href: '/admin/configuracion', color: '#27AE60' },
          ].map(({ label, href, color }) => (
            <button key={href} onClick={() => router.push(href)}
              className="glass rounded-2xl p-4 text-left transition-all hover:-translate-y-0.5 group relative overflow-hidden">
              <div className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <div className="ml-2 flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{label}</p>
                <ChevronRight size={14} className="text-[#6B6B85] group-hover:text-white group-hover:translate-x-0.5 transition-all" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
