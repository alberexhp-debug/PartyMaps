'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { Store, Megaphone, Tag, Ticket, Wallet, ChevronRight, TrendingUp, BarChart3 } from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { PageHeader, StatCard, SectionCard, SectionTitle, EmptyState } from '@/components/local-panel/ui'

type SerieMes = { mes: string; comision: number; incentivo: number }
type PorLocal = { nombre: string; comision: number }
type Resumen = {
  locales_total: number; locales_activos: number; rrpp_activos: number; incentivo_pct: number
  comision_generada_mes?: number; incentivo_ganado_mes?: number
  serie_meses?: SerieMes[]; por_local?: PorLocal[]
}

const eur = (n: number) => `${(n ?? 0).toFixed(2).replace(/\.00$/, '')} €`

export default function GestorDashboardPage() {
  const gestor = useGestorStore(s => s.gestor)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/gestor/resumen')
      .then(r => r.ok ? r.json() : null)
      .then(setResumen)
      .catch(() => {})
      .finally(() => setCargando(false))
  }, [])

  const serie = resumen?.serie_meses ?? []
  const hayDatos = serie.some(s => s.comision > 0)
  const porLocal = resumen?.por_local ?? []
  const maxLocal = Math.max(1, ...porLocal.map(p => p.comision))

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Tu cartera"
        acento="violet"
        titulo={`Hola, ${gestor?.nombre?.split(' ')[0] || 'Gestor'}`}
        subtitulo="Da de alta locales y RRPP, y sigue las comisiones que genera tu cartera."
      />

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-2.5">
        <StatCard icon={Store} acento="violet" label="Locales activos" loading={cargando}
          value={resumen ? resumen.locales_activos : '—'}
          sublabel={resumen ? `${resumen.locales_total} en cartera` : undefined} />
        <StatCard icon={Megaphone} acento="blue" label="RRPP activos" loading={cargando}
          value={resumen ? resumen.rrpp_activos : '—'} />
        <StatCard icon={Wallet} acento="rose" label="Tu incentivo" loading={cargando}
          value={`${gestor?.incentivo_pct ?? 0}%`} sublabel="de lo generado" />
      </div>

      {/* Comisión del mes — tarjeta destacada */}
      <SectionCard premium className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="eyebrow eyebrow-violet mb-1">Comisión generada · este mes</p>
          <p className="text-3xl md:text-4xl font-bold text-white text-display text-numeric">
            {resumen ? eur(resumen.comision_generada_mes ?? 0) : '—'}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] text-[#8B8BA8]">Tu incentivo</p>
          <p className="text-2xl font-bold text-[#E94560] text-numeric mt-0.5">
            {resumen ? eur(resumen.incentivo_ganado_mes ?? 0) : '—'}
          </p>
        </div>
      </SectionCard>

      {/* Gráfica: evolución 6 meses */}
      <SectionCard>
        <SectionTitle icon={TrendingUp} acento="violet">Comisión de la cartera · últimos 6 meses</SectionTitle>
        {hayDatos ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="gradGestor" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C5CFF" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C5CFF" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGestorInc" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E94560" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#E94560" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} width={32} />
              <Tooltip
                contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: unknown, n: unknown) => [eur(Number(v)), n === 'incentivo' ? 'Tu incentivo' : 'Comisión'] as [string, string]}
              />
              <Area type="monotone" dataKey="comision" stroke="#7C5CFF" fill="url(#gradGestor)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="incentivo" stroke="#E94560" fill="url(#gradGestorInc)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} acento="violet" titulo="Aún sin comisiones"
            descripcion="Cuando tus locales generen ventas atribuidas a RRPP, verás aquí la evolución mes a mes." />
        )}
      </SectionCard>

      {/* Desglose por local del mes */}
      {porLocal.length > 0 && (
        <SectionCard>
          <SectionTitle icon={BarChart3} acento="blue">Por local · este mes</SectionTitle>
          <div className="space-y-2.5">
            {porLocal.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white truncate pr-2">{p.nombre}</span>
                  <span className="text-[#B8B8CC] text-numeric shrink-0">{eur(p.comision)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#7C5CFF] to-[#4F8EF7]"
                    style={{ width: `${Math.max(4, (p.comision / maxLocal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {/* Secciones */}
      <div>
        <p className="eyebrow eyebrow-violet mb-3">Gestiona</p>
        <div className="space-y-2">
          <SeccionLink href="/gestor/locales" icon={Store} titulo="Locales"
            desc="Tu cartera de locales y dar de alta nuevos"
            badge={resumen && resumen.locales_total > 0 ? `${resumen.locales_total} en cartera` : 'Empezar'} />
          <SeccionLink href="/gestor/rrpp" icon={Megaphone} titulo="RRPP"
            desc="Vincular RRPP a tus locales y fijar el %"
            badge={resumen && resumen.rrpp_activos > 0 ? `${resumen.rrpp_activos} activos` : 'Gestionar'} />
          <SeccionLink href="/gestor/codigos" icon={Tag} titulo="Códigos de descuento"
            desc="Crear códigos pactados con los locales" badge="Gestionar" />
          <SeccionLink href="/gestor/entradas-gratis" icon={Ticket} titulo="Entradas gratis"
            desc="Generar entradas gratis (Pro/Destacado)" badge="Gestionar" />
        </div>
      </div>
    </div>
  )
}

function SeccionLink({ href, icon: Icon, titulo, desc, badge }: { href: string; icon: React.ElementType; titulo: string; desc: string; badge?: string | null }) {
  return (
    <Link href={href} className="group flex items-center gap-3.5 rounded-2xl glass px-4 py-3.5 transition-colors hover:bg-white/[0.07]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF] border border-white/10">
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-xs text-[#8B8BA8]">{desc}</p>
      </div>
      {badge && <span className="text-[10px] font-semibold text-[#9B82FF]">{badge}</span>}
      <ChevronRight size={16} className="text-[#6B6B85] transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}
