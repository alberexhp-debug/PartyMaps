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
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Dashboard global</h1>
        <p className="text-[#505065] text-sm">Vista en tiempo real de la plataforma</p>
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
          <div key={label} className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: `${color}20` }}>
                <Icon size={12} style={{ color }} />
              </div>
              <span className="text-xs text-[#505065]">{label}</span>
            </div>
            <p className="text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </div>

      {/* Gráfica comisiones */}
      {!loading && stats && (
        <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] p-4">
          <h2 className="font-bold text-white mb-4">Comisiones últimos 7 días</h2>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={stats.ingresos_semana}>
              <defs>
                <linearGradient id="gradAdmin" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A2A3E" />
              <XAxis dataKey="dia" tick={{ fill: '#505065', fontSize: 10 }} />
              <YAxis tick={{ fill: '#505065', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: '#1A1A2E', border: '1px solid #2A2A3E', borderRadius: 8 }}
                formatter={(v: unknown) => [formatearPrecio(Number(v)), 'Comisiones']}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#4F8EF7" fill="url(#gradAdmin)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: 'Gestionar locales', href: '/admin/locales', color: '#E94560' },
          { label: 'Gestionar usuarios', href: '/admin/usuarios', color: '#4F8EF7' },
          { label: 'Cola moderación', href: '/admin/moderacion', color: '#F39C12' },
          { label: 'Configuración', href: '/admin/configuracion', color: '#27AE60' },
        ].map(({ label, href, color }) => (
          <button key={href} onClick={() => router.push(href)}
            className="bg-[#1A1A2E] rounded-xl border border-[#2A2A3E] p-3 text-left hover:border-[#2A2A3E]/50 transition-colors"
            style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
            <p className="text-sm font-semibold text-white">{label}</p>
            <ChevronRight size={14} className="text-[#505065] mt-1" />
          </button>
        ))}
      </div>
    </div>
  )
}
