'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle } from '@/components/todh/iconosTorneum'
import { cn } from '@/lib/utils'

interface Resumen {
  pct: number
  obligatoriosPendientes: number
  pasos: { tipo: string; estado: string }[]
}

const RUTA = '/local-panel/puesta-a-punto'

/**
 * Badge persistente "Puesta a punto" (doc 01 pieza 3, §14.4).
 * - variant="sidebar": mini-card en el sidebar de escritorio; visible mientras pct < 100.
 * - variant="movil": pill flotante sobre la bottom nav; visible solo con obligatorios pendientes.
 * Lee /api/onboarding (no-op para roles sin checklist → no se muestra). Se revalida al cambiar de ruta.
 */
export function BadgePuestaAPunto({ variant }: { variant: 'sidebar' | 'movil' }) {
  const pathname = usePathname()
  const [data, setData] = useState<Resumen | null>(null)

  useEffect(() => {
    let cancel = false
    fetch('/api/onboarding')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && d) setData(d) })
      .catch(() => {})
    return () => { cancel = true }
  }, [pathname])

  if (!data || data.pasos.length === 0) return null
  const { pct, obligatoriosPendientes } = data
  const recomendadosPendientes = data.pasos.filter(p => p.tipo === 'recomendado' && p.estado === 'pendiente').length

  if (variant === 'movil') {
    // Pill flotante: solo cuando quedan obligatorios (el "anti-Saltar").
    if (obligatoriosPendientes === 0) return null
    return (
      <Link href={RUTA}
        className="md:hidden fixed bottom-20 right-4 z-40 inline-flex items-center gap-1.5 h-10 px-4 glass-strong rounded-full animate-slide-up-sm border border-[#F39C12]/30">
        <AlertTriangle size={14} className="text-[#F39C12]" />
        <span className="text-[13px] font-semibold text-white">Terminar ({obligatoriosPendientes})</span>
      </Link>
    )
  }

  // Sidebar: visible mientras no esté al 100% total.
  if (pct >= 100) return null
  return (
    <Link href={RUTA} className="block px-3 pt-3">
      <div className="rounded-xl glass-subtle border border-white/8 p-3 hover:border-white/15 transition-colors">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B85]">Puesta a punto</span>
          <span className="text-sm font-bold text-white text-numeric">{pct}%</span>
        </div>
        <div className="mt-1.5 h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#B6FF3A,#7C5CFF)' }} />
        </div>
        {obligatoriosPendientes > 0 ? (
          <p className="mt-1.5 text-[11px] text-[#F39C12] flex items-center gap-1">
            <AlertTriangle size={11} /> {obligatoriosPendientes} {obligatoriosPendientes === 1 ? 'obligatorio' : 'obligatorios'}
          </p>
        ) : (
          <p className="mt-1.5 text-[11px] text-[#8B8BA8]">{recomendadosPendientes} {recomendadosPendientes === 1 ? 'recomendado' : 'recomendados'}</p>
        )}
      </div>
    </Link>
  )
}
