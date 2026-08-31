'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { formatearPrecio, calcularEdad } from '@/lib/utils'
import { TrendingUp, Users, Ticket, Star, Calendar, Wallet } from '@/components/todh/iconosTorneum'
import { UserCircle, Beer } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line,
} from 'recharts'
import { cn } from '@/lib/utils'
import { PageHeader, SectionCard, SectionTitle, StatCard, SkeletonStats, chartTheme, ACENTO } from '@/components/local-panel/ui'

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
  bar: {
    unidades: number
    ingresos: number
    beneficio: number | null   // null = ningún producto tiene coste registrado
    top_productos: { nombre: string; cantidad: number; ingresos: number }[]
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

    const [entradasRes, reviewsRes, subRes, eventosRes, barItemsRes, productosRes] = await Promise.all([
      supabase.from('entradas').select('created_at, precio_total, precio_local, usuario_id')
        .eq('local_id', local.id).gte('created_at', desde).eq('estado', 'activa'),
      supabase.from('reviews').select('puntuacion').eq('local_id', local.id).eq('censurada', false),
      supabase.from('suscripciones').select('id', { count: 'exact' }).eq('local_id', local.id),
      supabase.from('eventos').select('nombre, entradas_vendidas').eq('local_id', local.id)
        .order('entradas_vendidas', { ascending: false }).limit(5),
      supabase.from('pedido_items')
        .select('cantidad, precio_unitario, producto_id, nombre_snapshot, pedidos_bar!inner(local_id, estado, pagado_at)')
        .eq('pedidos_bar.local_id', local.id)
        .gte('pedidos_bar.pagado_at', desde)
        .in('pedidos_bar.estado', ['pagado', 'entregado']),
      supabase.from('productos_local').select('id, nombre, coste').eq('local_id', local.id),
    ])

    const entradas = entradasRes.data || []
    const reviews = reviewsRes.data || []

    // ── Consumibles: unidades, ingresos, beneficio y top productos ──
    type BarItem = { cantidad: number; precio_unitario: number; producto_id: string | null; nombre_snapshot: string }
    const barItems = (barItemsRes.data || []) as unknown as BarItem[]
    const productos = (productosRes.data || []) as { id: string; nombre: string; coste: number | null }[]
    const costePorProducto = new Map(productos.map(p => [p.id, p.coste]))
    const nombrePorProducto = new Map(productos.map(p => [p.id, p.nombre]))

    let barUnidades = 0, barIngresos = 0, barBeneficio = 0, algunCoste = false
    const porProducto = new Map<string, { nombre: string; cantidad: number; ingresos: number }>()
    for (const it of barItems) {
      const ingreso = it.precio_unitario * it.cantidad
      barUnidades += it.cantidad
      barIngresos += ingreso
      const coste = it.producto_id ? costePorProducto.get(it.producto_id) : null
      if (coste != null) { algunCoste = true; barBeneficio += (it.precio_unitario - coste) * it.cantidad }
      const key = it.producto_id ?? it.nombre_snapshot
      const nombre = (it.producto_id && nombrePorProducto.get(it.producto_id)) || it.nombre_snapshot
      const acc = porProducto.get(key) ?? { nombre, cantidad: 0, ingresos: 0 }
      acc.cantidad += it.cantidad
      acc.ingresos += ingreso
      porProducto.set(key, acc)
    }
    const topProductos = Array.from(porProducto.values())
      .sort((a, b) => b.cantidad - a.cantidad).slice(0, 6)

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
      bar: {
        unidades: barUnidades,
        ingresos: barIngresos,
        beneficio: algunCoste ? barBeneficio : null,
        top_productos: topProductos,
      },
    })
    setLoading(false)
  }

  if (!local) return null

  return (
    <div className="relative p-4 md:p-8 pb-24 md:pb-8 space-y-6 overflow-hidden">
      <PageHeader
        eyebrow="Audiencia" titulo="Analítica"
        subtitulo="Cómo va tu negocio en el tiempo"
        acciones={
          <div className="flex gap-1 bg-white/6 rounded-xl p-1 border border-white/10">
            {(['7d', '30d', '90d'] as const).map(p => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={cn('px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                  periodo === p ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8] hover:text-[#0A0A0F]')}>
                {p}
              </button>
            ))}
          </div>
        }
      />

      {loading ? (
        <SkeletonStats n={4} />
      ) : data && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard icon={TrendingUp} label="Ingresos" value={formatearPrecio(data.resumen.total_ingresos)} acento="rose" />
            <StatCard icon={Ticket} label="Entradas" value={data.resumen.total_entradas.toString()} acento="blue" />
            <StatCard icon={Star} label="Rating" value={data.resumen.media_rating > 0 ? `${data.resumen.media_rating.toFixed(1)} ★` : '—'} acento="gold" />
            <StatCard icon={Users} label="Suscriptores" value={data.resumen.total_suscriptores.toString()} acento="green" />
          </div>

          {/* Gráfica ingresos */}
          <SectionCard>
            <SectionTitle icon={TrendingUp} acento="rose">Ingresos por día</SectionTitle>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={data.ingresos_semana}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="dia" {...chartTheme.axis} />
                <YAxis {...chartTheme.axis} />
                <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [formatearPrecio(Number(v)), 'Ingresos']} />
                <Bar dataKey="ingresos" fill={ACENTO.rose} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* Entradas por día */}
          <SectionCard>
            <SectionTitle icon={Ticket} acento="blue">Entradas vendidas</SectionTitle>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={data.ingresos_semana}>
                <CartesianGrid {...chartTheme.grid} />
                <XAxis dataKey="dia" {...chartTheme.axis} />
                <YAxis {...chartTheme.axis} />
                <Tooltip {...chartTheme.tooltip} />
                <Line type="monotone" dataKey="entradas" stroke={ACENTO.blue} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </SectionCard>

          {/* ── Consumibles ── */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <StatCard icon={Beer} label="Ingresos" value={formatearPrecio(data.bar.ingresos)} acento="gold" />
              <StatCard icon={Ticket} label="Unidades vendidas" value={data.bar.unidades.toString()} acento="blue" />
              <StatCard
                icon={Wallet} label="Beneficio"
                value={data.bar.beneficio != null ? formatearPrecio(data.bar.beneficio) : '—'}
                sublabel={data.bar.beneficio == null ? 'Añade costes a tus productos' : 'Ingresos − coste'}
                acento="green"
              />
            </div>

            <SectionCard>
              <SectionTitle icon={Beer} acento="gold">Lo más vendido</SectionTitle>
              {data.bar.top_productos.length === 0 ? (
                <p className="text-sm text-[#8B8BA8] py-6 text-center">Sin ventas en este periodo.</p>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(140, data.bar.top_productos.length * 38)}>
                  <BarChart data={data.bar.top_productos} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <CartesianGrid {...chartTheme.grid} horizontal={false} />
                    <XAxis type="number" {...chartTheme.axis} allowDecimals={false} />
                    <YAxis type="category" dataKey="nombre" width={96} {...chartTheme.axis} />
                    <Tooltip {...chartTheme.tooltip} formatter={(v: unknown) => [`${Number(v)} uds`, 'Vendidas']} />
                    <Bar dataKey="cantidad" fill={ACENTO.gold} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </SectionCard>
          </div>

          {/* Distribución de edad de clientes */}
          {data.resumen.clientes_unicos > 0 && (
            <SectionCard>
              <SectionTitle icon={UserCircle} acento="green"
                accion={<span className="text-xs text-[#8B8BA8]">{data.resumen.clientes_unicos} únicos</span>}>
                Edad de tus clientes
              </SectionTitle>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={data.distribucion_edad}>
                  <CartesianGrid {...chartTheme.grid} />
                  <XAxis dataKey="rango" {...chartTheme.axis} />
                  <YAxis {...chartTheme.axis} allowDecimals={false} />
                  <Tooltip {...chartTheme.tooltip} />
                  <Bar dataKey="count" fill={ACENTO.green} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </SectionCard>
          )}

          {/* Top eventos */}
          {data.top_eventos.length > 0 && (
            <SectionCard className="space-y-3">
              <SectionTitle icon={Calendar} acento="gold">Top eventos</SectionTitle>
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
                  <span className="text-xs text-[#8B8BA8] shrink-0">{e.entradas} entradas</span>
                </div>
              ))}
            </SectionCard>
          )}
        </>
      )}
    </div>
  )
}
