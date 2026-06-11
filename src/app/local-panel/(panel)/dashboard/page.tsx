'use client'
import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { formatearPrecio, getColorTemperatura, getTemperaturaAforo, aforoVisible } from '@/lib/utils'
import { zonasDeTrabajador, type ZonaPanel } from '@/lib/permisosLocal'
import {
  Gauge, TicketPlus, Beer, LayoutGrid, Gift, MessagesSquare, Calendar, Sparkles,
  Bell, Contact, BarChart3, Star, MessageSquare, ChevronRight, Check, DoorClosed, MoonStar,
} from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface SerieDia { dia: string; ingresos: number; entradas: number; pedidos: number }
interface KPIs {
  entradas_hoy: number
  ingresos_hoy: number
  aforo_actual: number
  suscriptores: number
  media_reviews: number
  num_reviews: number
  evento_activo: { nombre: string } | null
  pedidos_bar_pendientes: number
  serie: SerieDia[]
}

type Seccion = { zona: ZonaPanel; href: string; icon: React.ElementType; label: string; sub: string; color: string }

export default function LocalPanelDashboard() {
  const toast = useToast()
  const { local, trabajador, setLocal } = useLocalPanelStore()
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)
  const [noLeidos, setNoLeidos] = useState(0)
  const [pendientePaso, setPendientePaso] = useState<string | null>(null)
  const [cerrandoNoche, setCerrandoNoche] = useState(false)
  const [showCerrarModal, setShowCerrarModal] = useState(false)

  const zonas = useMemo(() => zonasDeTrabajador(trabajador), [trabajador])

  useEffect(() => {
    if (!local) return
    cargarKPIs()
    fetch('/api/local-panel/mensajes').then(r => r.ok ? r.json() : null).then(d => { if (d) setNoLeidos(d.no_leidos_total || 0) }).catch(() => {})
    fetch('/api/onboarding').then(r => r.ok ? r.json() : null).then(d => { if (d?.recordatorio?.paso) setPendientePaso(String(d.recordatorio.paso)) }).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local])

  async function cargarKPIs() {
    if (!local) return
    const hoy = new Date()
    const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate()).toISOString()
    const hace7 = new Date(Date.now() - 7 * 86400000).toISOString()
    const [entradasHoyRes, semanaRes, pedidosSemanaRes, suscritorRes, reviewsRes, eventoRes, pedidosPendientesRes] = await Promise.all([
      supabase.from('entradas').select('precio_total').eq('local_id', local.id).gte('created_at', inicioHoy).eq('estado', 'activa'),
      supabase.from('entradas').select('created_at, precio_total').eq('local_id', local.id).gte('created_at', hace7).eq('estado', 'activa'),
      supabase.from('pedidos_bar').select('pagado_at').eq('local_id', local.id).gte('pagado_at', hace7).in('estado', ['pagado', 'entregado']),
      supabase.from('suscripciones').select('id', { count: 'exact', head: true }).eq('local_id', local.id),
      supabase.from('reviews').select('puntuacion').eq('local_id', local.id).eq('censurada', false),
      supabase.from('eventos').select('nombre').eq('local_id', local.id).eq('estado', 'publicado').gte('fecha_fin', new Date().toISOString()).single(),
      supabase.from('pedidos_bar').select('id', { count: 'exact', head: true }).eq('local_id', local.id).eq('estado', 'pagado'),
    ])
    const entradasHoy = entradasHoyRes.data || []
    const semana = semanaRes.data || []
    const pedidosSemana = pedidosSemanaRes.data || []
    const reviews = reviewsRes.data || []

    // Serie de los últimos 7 días: ingresos, entradas y pedidos por día
    const fmt = (d: Date) => d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })
    const grouped: Record<string, SerieDia> = {}
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      grouped[fmt(d)] = { dia: fmt(d), ingresos: 0, entradas: 0, pedidos: 0 }
    }
    semana.forEach(e => { const k = fmt(new Date(e.created_at)); if (grouped[k]) { grouped[k].ingresos += e.precio_total || 0; grouped[k].entradas++ } })
    pedidosSemana.forEach(p => { if (!p.pagado_at) return; const k = fmt(new Date(p.pagado_at)); if (grouped[k]) grouped[k].pedidos++ })

    setKpis({
      entradas_hoy: entradasHoy.length,
      ingresos_hoy: entradasHoy.reduce((s, e) => s + (e.precio_total || 0), 0),
      aforo_actual: aforoVisible(local),
      suscriptores: suscritorRes.count || 0,
      media_reviews: reviews.length > 0 ? reviews.reduce((s, r) => s + r.puntuacion, 0) / reviews.length : 0,
      num_reviews: reviews.length,
      pedidos_bar_pendientes: pedidosPendientesRes.count || 0,
      evento_activo: eventoRes.data || null,
      serie: Object.values(grouped),
    })
    setLoading(false)
  }

  async function setCerrarNoche(cerrar: boolean) {
    if (!local) return
    setCerrandoNoche(true)
    const res = await fetch('/api/local-panel/cerrar-noche', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cerrar }) })
    const data = await res.json().catch(() => ({})); setCerrandoNoche(false); setShowCerrarModal(false)
    if (!res.ok) { toast.error(data.error || 'No se pudo actualizar'); return }
    setLocal({ ...local, cerrado_hasta: data.cerrado_hasta })
    toast.success(cerrar ? 'Tu local saldrá cerrado esta noche' : 'Tu local vuelve a salir según su horario')
  }

  if (!local) return null

  const hora = new Date().getHours()
  const saludo = hora < 6 ? 'Buenas noches' : hora < 14 ? 'Buenos días' : hora < 21 ? 'Buenas tardes' : 'Buenas noches'
  const cerradoActivo = !!local.cerrado_hasta && new Date(local.cerrado_hasta) > new Date()
  const puedeCerrar = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const aforoPct = Math.round(kpis?.aforo_actual ?? aforoVisible(local))
  const colorTemp = getColorTemperatura(getTemperaturaAforo(aforoPct))

  const SECCIONES: Seccion[] = [
    { zona: 'scanner', href: '/local-panel/scanner', icon: Gauge, label: 'Afluencia & Puerta', sub: 'Escanear y controlar aforo', color: '#4F8EF7' },
    { zona: 'taquilla', href: '/local-panel/taquilla', icon: TicketPlus, label: 'Taquilla', sub: 'Vender en puerta', color: 'var(--p-accent)' },
    { zona: 'pedidos-bar', href: '/local-panel/pedidos-bar', icon: Beer, label: 'Pedidos', sub: kpis?.pedidos_bar_pendientes ? `${kpis.pedidos_bar_pendientes} por servir` : 'Barra', color: '#F39C12' },
    { zona: 'sala', href: '/local-panel/sala', icon: LayoutGrid, label: 'Sala & Mesas', sub: 'Reservas y mesas', color: '#7C5CFF' },
    { zona: 'cortesias', href: '/local-panel/cortesias', icon: Gift, label: 'Cortesías', sub: 'Emitir y canjear', color: '#27AE60' },
    { zona: 'mensajes', href: '/local-panel/mensajes', icon: MessagesSquare, label: 'Mensajes', sub: noLeidos ? `${noLeidos} sin leer` : 'Chat con tu equipo', color: '#7C5CFF' },
    { zona: 'eventos', href: '/local-panel/eventos', icon: Calendar, label: 'Eventos', sub: kpis?.evento_activo ? kpis.evento_activo.nombre : 'Crear y gestionar', color: 'var(--p-accent)' },
    { zona: 'rrpp', href: '/local-panel/rrpp', icon: Sparkles, label: 'RRPP', sub: 'Tus relaciones públicas', color: '#7C5CFF' },
    { zona: 'notificaciones', href: '/local-panel/notificaciones', icon: Bell, label: 'Notificaciones', sub: 'Avisar a seguidores', color: '#4F8EF7' },
    { zona: 'crm', href: '/local-panel/crm', icon: Contact, label: 'CRM', sub: 'Tus clientes', color: '#4F8EF7' },
    { zona: 'analytics', href: '/local-panel/analytics', icon: BarChart3, label: 'Analítica', sub: 'Cómo va el negocio', color: '#7C5CFF' },
    { zona: 'reviews', href: '/local-panel/reviews', icon: Star, label: 'Reseñas', sub: kpis?.num_reviews ? `${kpis.media_reviews.toFixed(1)} de media` : 'Valoraciones', color: '#D4A84B' },
    { zona: 'sugerencias', href: '/local-panel/sugerencias', icon: MessageSquare, label: 'Sugerencias', sub: 'De los clientes', color: '#27AE60' },
  ]
  const secciones = SECCIONES.filter(s => zonas.includes(s.zona))

  const avisos: { icon: React.ElementType; color: string; txt: string; sub: string; href: string }[] = []
  if (noLeidos > 0) avisos.push({ icon: MessagesSquare, color: '#7C5CFF', txt: `${noLeidos} ${noLeidos === 1 ? 'mensaje sin leer' : 'mensajes sin leer'}`, sub: 'De tu equipo o RRPP', href: '/local-panel/mensajes' })
  if (kpis?.pedidos_bar_pendientes) avisos.push({ icon: Beer, color: '#F39C12', txt: `${kpis.pedidos_bar_pendientes} ${kpis.pedidos_bar_pendientes === 1 ? 'pedido' : 'pedidos'} por servir`, sub: 'En la barra ahora mismo', href: '/local-panel/pedidos-bar' })
  if (pendientePaso) avisos.push({ icon: Check, color: 'var(--p-accent)', txt: `Te falta ${pendientePaso.toLowerCase()}`, sub: 'Tu local sale mejor en el mapa', href: '/local-panel/puesta-a-punto' })

  const card: React.CSSProperties = { background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 16, boxShadow: 'var(--p-shadow)' }
  const tint = (c: string) => c.startsWith('var') ? 'color-mix(in srgb, var(--p-accent) 12%, transparent)' : `${c}1f`
  const sinDatos = !loading && kpis !== null && kpis.serie.every(d => d.ingresos === 0 && d.entradas === 0 && d.pedidos === 0)

  return (
    <div className="px-4 pb-16 pt-6 md:px-6">
      {/* Saludo + estado */}
      <div className="mb-5">
        <h1 className="text-[26px] font-bold tracking-[-0.025em]" style={{ color: 'var(--p-text)' }}>{saludo}, {trabajador?.nombre?.split(' ')[0] || local.nombre}</h1>
        <p className="mt-1.5 flex items-center gap-2 text-[14.5px]" style={{ color: 'var(--p-text-2)' }}>
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: cerradoActivo ? '#F39C12' : colorTemp }} />
          {cerradoActivo ? 'Cerrado esta noche' : 'Abierto'} · {aforoPct}% de aforo · {local.ciudad}
        </p>
      </div>

      {/* Números */}
      <div className="mb-3.5 grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          [loading ? '—' : formatearPrecio(kpis!.ingresos_hoy), 'Ingresos hoy'],
          [loading ? '—' : String(kpis!.entradas_hoy), 'Entradas hoy'],
          [`${aforoPct}%`, 'Aforo ahora'],
          [loading ? '—' : String(kpis!.suscriptores), 'Suscriptores'],
        ].map(([n, l]) => (
          <div key={l} style={{ ...card, padding: '15px 18px' }}>
            <p className="text-[23px] font-bold tracking-[-0.03em]" style={{ color: 'var(--p-text)', fontFeatureSettings: '"tnum"' }}>{n}</p>
            <p className="mt-1 text-[12px] font-medium" style={{ color: 'var(--p-text-3)' }}>{l}</p>
          </div>
        ))}
      </div>

      {/* Gráfica de progresiones (últimos 7 días) */}
      <div className="mb-7" style={{ ...card, padding: '16px 14px 12px' }}>
        <p className="mb-3 px-1 text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-text-3)' }}>Últimos 7 días</p>
        {sinDatos ? (
          <div className="grid h-[150px] place-items-center text-center text-[13px]" style={{ color: 'var(--p-text-3)' }}>
            Aún no hay actividad esta semana.<br />Aquí verás cómo evolucionan ingresos, entradas y pedidos.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={190}>
            <LineChart data={kpis?.serie ?? []} margin={{ top: 4, right: 6, left: -14, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(130,130,150,0.16)" vertical={false} />
              <XAxis dataKey="dia" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
              <YAxis yAxisId="right" orientation="right" tick={{ fill: '#9A9AA6', fontSize: 10 }} axisLine={false} tickLine={false} width={26} />
              <Tooltip contentStyle={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', borderRadius: 12, fontSize: 12, color: 'var(--p-text)', boxShadow: 'var(--p-shadow)' }}
                labelStyle={{ color: 'var(--p-text-2)', fontWeight: 600 }} />
              <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} iconType="plainline" />
              <Line yAxisId="left" type="monotone" dataKey="ingresos" name="Ingresos €" stroke="#E0455E" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="entradas" name="Entradas" stroke="#4F8EF7" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              <Line yAxisId="right" type="monotone" dataKey="pedidos" name="Pedidos" stroke="#F39C12" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Te interesa */}
      {avisos.length > 0 && (
        <div className="mb-7 overflow-hidden" style={card}>
          {avisos.map((a, i) => (
            <Link key={a.txt} href={a.href} className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
              style={{ borderTop: i ? '1px solid var(--p-border)' : 'none', color: 'var(--p-text)' }}>
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px]" style={{ background: tint(a.color), color: a.color }}><a.icon size={15} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold">{a.txt}</span>
                <span className="block text-[12px]" style={{ color: 'var(--p-text-3)' }}>{a.sub}</span>
              </span>
              <ChevronRight size={17} style={{ color: 'var(--p-text-3)' }} />
            </Link>
          ))}
        </div>
      )}

      {/* Secciones */}
      <p className="mb-3 px-0.5 text-[12px] font-bold uppercase tracking-[0.12em]" style={{ color: 'var(--p-text-3)' }}>Secciones</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {secciones.map(({ icon: Icon, label, sub, color, href }) => (
          <Link key={href} href={href} className="text-left transition-transform hover:-translate-y-0.5" style={{ ...card, padding: 15 }}>
            <span className="mb-2.5 grid h-9 w-9 place-items-center rounded-[10px]" style={{ background: tint(color), color }}><Icon size={18} /></span>
            <p className="text-[14.5px] font-semibold" style={{ color: 'var(--p-text)' }}>{label}</p>
            <p className="mt-0.5 truncate text-[12px]" style={{ color: 'var(--p-text-3)' }}>{sub}</p>
          </Link>
        ))}
      </div>

      {/* Cerrar esta noche (acción puntual, discreta) */}
      {puedeCerrar && (
        <div className="mt-8">
          {cerradoActivo ? (
            <button onClick={() => setCerrarNoche(false)} disabled={cerrandoNoche}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold disabled:opacity-50" style={{ background: '#F39C1218', border: '1px solid #F39C1240', color: '#B45309' }}>
              <Check size={15} /> Reactivar local ahora
            </button>
          ) : (
            <button onClick={() => setShowCerrarModal(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold" style={{ background: 'transparent', border: '1px solid var(--p-border)', color: 'var(--p-text-2)' }}>
              <DoorClosed size={15} /> Cerrar el local esta noche
            </button>
          )}
        </div>
      )}

      {/* Modal cierre */}
      {showCerrarModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowCerrarModal(false)}>
          <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.5)' }} />
          <div className="relative w-full p-5 sm:max-w-sm" style={{ ...card, borderRadius: 24 }} onClick={e => e.stopPropagation()}>
            <div className="mb-3 grid h-11 w-11 place-items-center rounded-2xl" style={{ background: 'color-mix(in srgb, var(--p-accent) 12%, transparent)', color: 'var(--p-accent)' }}><MoonStar size={20} /></div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--p-text)' }}>Cerrar esta noche</h3>
            <p className="mt-1.5 text-sm" style={{ color: 'var(--p-text-2)' }}>Tu local saldrá cerrado en el mapa esta noche. Se reactiva solo mañana a las 12:00.</p>
            <div className="mt-4 flex gap-2">
              <Button variant="danger" fullWidth loading={cerrandoNoche} onClick={() => setCerrarNoche(true)}>Sí, cerrar</Button>
              <Button variant="ghost" onClick={() => setShowCerrarModal(false)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
