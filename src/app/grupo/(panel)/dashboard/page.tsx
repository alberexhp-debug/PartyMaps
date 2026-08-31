'use client'
import { useEffect, useState } from 'react'
import { useGrupoStore } from '@/lib/stores/useGrupoStore'
import { Store, Users, Ticket, TrendingUp } from '@/components/todh/iconosTorneum'
import { BarChart3 } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { HeroBanner, KpiBold, SectionCard, SectionTitle, EmptyState } from '@/components/local-panel/ui'
import { ChecklistCard } from '@/components/onboarding/ChecklistCard'

type Resumen = {
  grupo: string; rol: 'propietario' | 'manager'
  locales_total: number; locales_activos: number; suscriptores: number
  entradas_mes: number; ingresos_mes: number
  serie_meses: { mes: string; ingresos: number }[]
  por_local: { nombre: string; ingresos: number }[]
}

const eur = (n: number) => `${(n ?? 0).toFixed(0)} €`

export default function GrupoDashboardPage() {
  const miembro = useGrupoStore(s => s.miembro)
  const [r, setR] = useState<Resumen | null>(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    fetch('/api/grupo/resumen').then(res => res.ok ? res.json() : null).then(setR).catch(() => {}).finally(() => setCargando(false))
  }, [])

  const serie = r?.serie_meses ?? []
  const hayDatos = serie.some(s => s.ingresos > 0)
  const porLocal = r?.por_local ?? []
  const maxLocal = Math.max(1, ...porLocal.map(p => p.ingresos))
  const esManager = miembro?.rol === 'manager'

  return (
    <div className="space-y-6">
      <ChecklistCard panel="grupo" />
      <HeroBanner
        acento="blue"
        eyebrow={esManager ? 'Manager' : 'Propietario'}
        titulo={r?.grupo || miembro?.grupo?.nombre || 'Tu grupo'}
        subtitulo={esManager
          ? 'Métricas operativas de los locales que tienes asignados.'
          : 'Visión agregada de todos los locales de tu grupo.'}
        heroLabel="Ingresos del grupo · este mes"
        heroValue={r ? (r.ingresos_mes ?? 0).toFixed(0) : '—'}
        pillLabel="Locales"
        pillValue={r ? `${r.locales_total}` : '—'}
      />

      <div className="grid grid-cols-3 gap-2.5">
        <KpiBold icon={Store} color="#4F8EF7" label="Locales activos" value={cargando ? '—' : (r?.locales_activos ?? 0)} />
        <KpiBold icon={Users} color="#7C5CFF" label="Suscriptores" value={cargando ? '—' : (r?.suscriptores ?? 0).toLocaleString('es-ES')} />
        <KpiBold icon={Ticket} color="#B6FF3A" label="Entradas mes" value={cargando ? '—' : (r?.entradas_mes ?? 0)} />
      </div>

      <SectionCard>
        <SectionTitle icon={TrendingUp} acento="blue">Ingresos del grupo · últimos 6 meses</SectionTitle>
        {hayDatos ? (
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={serie}>
              <defs>
                <linearGradient id="gradGrupo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F8EF7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4F8EF7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mes" tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#6B6B85', fontSize: 10 }} axisLine={false} tickLine={false} width={38} />
              <Tooltip
                contentStyle={{ background: 'rgba(14,14,26,0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, fontSize: 12 }}
                formatter={(v: unknown) => [`${Number(v).toFixed(2)} €`, 'Ingresos'] as [string, string]}
              />
              <Area type="monotone" dataKey="ingresos" stroke="#4F8EF7" fill="url(#gradGrupo)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState icon={BarChart3} acento="blue" titulo="Aún sin ingresos"
            descripcion="Cuando tus locales vendan entradas o consumiciones, verás aquí la evolución del grupo." />
        )}
      </SectionCard>

      {porLocal.length > 0 && (
        <SectionCard>
          <SectionTitle icon={BarChart3} acento="violet">Ingresos por local · este mes</SectionTitle>
          <div className="space-y-2.5">
            {porLocal.map((p, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white truncate pr-2">{p.nombre}</span>
                  <span className="text-[#B8B8CC] text-numeric shrink-0">{p.ingresos.toFixed(2)} €</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#4F8EF7] to-[#7C5CFF]"
                    style={{ width: `${Math.max(4, (p.ingresos / maxLocal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  )
}
