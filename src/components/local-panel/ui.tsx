'use client'
/**
 * Kit visual compartido del panel del local.
 * Una sola familia de componentes para que TODAS las páginas hablen el mismo
 * idioma: header, tarjetas, KPIs, acciones rápidas, estados vacíos y tema de
 * gráficas. Construido sobre los tokens de globals.css (card-premium, eyebrow,
 * text-display, text-numeric, skeleton).
 */
import Link from 'next/link'
import { cn } from '@/lib/utils'

type AcentoColor = 'rose' | 'blue' | 'violet' | 'gold' | 'green' | 'neutral'

export const ACENTO: Record<AcentoColor, string> = {
  rose: '#E0455E',
  blue: '#4F8EF7',
  violet: '#7C5CFF',
  gold: '#D4A84B',
  green: '#27AE60',
  neutral: '#9DA0B5',
}

const EYEBROW_CLASS: Record<AcentoColor, string> = {
  rose: 'eyebrow',
  blue: 'eyebrow eyebrow-blue',
  violet: 'eyebrow eyebrow-violet',
  gold: 'eyebrow eyebrow-gold',
  green: 'eyebrow',
  neutral: 'eyebrow eyebrow-muted',
}

/* ─────────────────────────  Cabecera de página  ───────────────────────── */

export function PageHeader({
  eyebrow, titulo, subtitulo, acento = 'rose', acciones, halo = true,
}: {
  eyebrow?: string
  titulo: string
  subtitulo?: React.ReactNode
  acento?: AcentoColor
  acciones?: React.ReactNode
  halo?: boolean
}) {
  return (
    <div className="relative">
      {halo && <div className="hero-halo-rose" />}
      <div className="relative flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          {eyebrow && <p className={cn(EYEBROW_CLASS[acento], 'mb-2')}>{eyebrow}</p>}
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-display text-white truncate">
            {titulo}
          </h1>
          {subtitulo && <p className="text-sm text-[#A0A0B8] mt-1">{subtitulo}</p>}
        </div>
        {acciones && <div className="flex items-center gap-2 shrink-0">{acciones}</div>}
      </div>
    </div>
  )
}

/* ───────────────────────────  Tarjeta sección  ─────────────────────────── */

export function SectionCard({
  className, children, premium = false, padding = 'p-4 md:p-5',
}: {
  className?: string
  children: React.ReactNode
  premium?: boolean
  padding?: string
}) {
  return (
    <div className={cn(
      premium ? 'card-premium' : 'rounded-2xl bg-white/[0.03] border border-white/[0.07]',
      padding, className,
    )}>
      {children}
    </div>
  )
}

export function SectionTitle({
  icon: Icon, children, acento = 'rose', accion,
}: {
  icon?: React.ElementType
  children: React.ReactNode
  acento?: AcentoColor
  accion?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-2 mb-4">
      <h2 className="text-sm font-bold text-white flex items-center gap-2">
        {Icon && <Icon size={15} style={{ color: ACENTO[acento] }} />}
        {children}
      </h2>
      {accion}
    </div>
  )
}

/* ──────────────────────────────  KPI / Stat  ───────────────────────────── */

/** KPI compacto para rejillas de métricas secundarias. */
export function StatCard({
  icon: Icon, label, value, sublabel, acento = 'neutral', loading = false,
}: {
  icon?: React.ElementType
  label: string
  value: React.ReactNode
  sublabel?: string
  acento?: AcentoColor
  loading?: boolean
}) {
  const color = ACENTO[acento]
  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-3.5 md:p-4">
      <div className="flex items-center gap-2 mb-2">
        {Icon && (
          <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${color}1F` }}>
            <Icon size={12} style={{ color }} />
          </div>
        )}
        <span className="text-[11px] text-[#8B8BA8] font-medium truncate">{label}</span>
      </div>
      {loading ? (
        <div className="h-7 w-16 skeleton rounded-md" />
      ) : (
        <p className="text-xl md:text-2xl font-bold text-white text-display text-numeric tracking-tight">{value}</p>
      )}
      {sublabel && !loading && <p className="text-[11px] text-[#6B6B85] mt-0.5">{sublabel}</p>}
    </div>
  )
}

/* ───────────────────────────  Acción rápida  ──────────────────────────── */

export function QuickAction({
  icon: Icon, label, hint, acento = 'neutral', onClick, href, disabled,
}: {
  icon: React.ElementType
  label: string
  hint?: string
  acento?: AcentoColor
  onClick?: () => void
  href?: string
  disabled?: boolean
}) {
  const color = ACENTO[acento]
  const inner = (
    <>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-transform group-hover:scale-105"
        style={{ background: `${color}1F`, border: `1px solid ${color}3A` }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div className="min-w-0 text-left">
        <p className="text-sm font-semibold text-white leading-tight truncate">{label}</p>
        {hint && <p className="text-[11px] text-[#8B8BA8] truncate mt-0.5">{hint}</p>}
      </div>
    </>
  )
  const cls = cn(
    'group flex items-center gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/[0.07]',
    'transition-all hover:bg-white/[0.06] hover:-translate-y-0.5',
    disabled && 'opacity-40 pointer-events-none',
  )
  if (href && !disabled) return <Link href={href} className={cls}>{inner}</Link>
  return <button type="button" onClick={onClick} disabled={disabled} className={cn(cls, 'w-full')}>{inner}</button>
}

/* ───────────────────────────  Estado vacío  ───────────────────────────── */

export function EmptyState({
  icon: Icon, titulo, descripcion, accion, acento = 'neutral',
}: {
  icon: React.ElementType
  titulo: string
  descripcion?: string
  accion?: React.ReactNode
  acento?: AcentoColor
}) {
  const color = ACENTO[acento]
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4 text-center px-4">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: `${color}14`, border: `1px solid ${color}2E` }}>
        <Icon size={26} style={{ color }} />
      </div>
      <div>
        <p className="text-white font-semibold text-display text-lg">{titulo}</p>
        {descripcion && <p className="text-sm text-[#8B8BA8] mt-1 max-w-xs mx-auto">{descripcion}</p>}
      </div>
      {accion}
    </div>
  )
}

/* ─────────────────────────────  Skeletons  ─────────────────────────────── */

export function SkeletonCard({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-2xl', className)} />
}

export function SkeletonStats({ n = 3 }: { n?: number }) {
  return (
    <div className={cn('grid gap-2.5', n === 4 ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-3')}>
      {Array.from({ length: n }).map((_, i) => <SkeletonCard key={i} className="h-20" />)}
    </div>
  )
}

/* ──────────────────────  Tema compartido de gráficas  ──────────────────── */

export const chartTheme = {
  grid: { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.05)' },
  axis: { tick: { fill: '#6B6B85', fontSize: 10 }, axisLine: false, tickLine: false } as const,
  tooltip: {
    contentStyle: {
      background: 'rgba(12,12,21,0.95)',
      backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 12,
      fontSize: 12,
      color: '#FAFAFC',
    },
    cursor: { fill: 'rgba(255,255,255,0.04)' },
  },
}
