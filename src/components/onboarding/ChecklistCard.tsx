'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Star, ArrowRight } from 'lucide-react'

interface Paso { id: string; titulo: string; motivo: string; ruta: string; tipo: 'obligatorio' | 'recomendado'; estado: 'hecho' | 'pendiente' }
interface Resumen { pasos: Paso[]; pct: number; obligatoriosPendientes: number }

/**
 * Card compacta de onboarding embebida en los dashboards de RRPP/gestor/grupo (doc 04 §3:
 * sin página propia, ≤5 pasos). Se calcula con datos reales y se OCULTA al 100%.
 */
export function ChecklistCard({ panel }: { panel: string }) {
  const [data, setData] = useState<Resumen | null>(null)
  useEffect(() => {
    let cancel = false
    fetch(`/api/onboarding?panel=${panel}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (!cancel && d) setData(d) })
      .catch(() => {})
    return () => { cancel = true }
  }, [panel])

  if (!data || data.pasos.length === 0 || data.pct >= 100) return null
  const pendientes = data.pasos.filter(p => p.estado === 'pendiente')

  return (
    <div className="rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div className="flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#6B6B85] mb-1.5">Primeros pasos</p>
          <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${data.pct}%`, background: 'linear-gradient(90deg,#E0455E,#7C5CFF)' }} />
          </div>
        </div>
        <span className="text-xl font-bold text-white text-numeric leading-none">{data.pct}%</span>
      </div>
      <div className="space-y-1.5">
        {pendientes.slice(0, 4).map(p => (
          <Link key={p.id} href={p.ruta} className="flex items-center gap-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] px-3 py-2 hover:bg-white/[0.05] transition-colors">
            {p.tipo === 'obligatorio'
              ? <span className="w-4 h-4 rounded-full border-2 border-[#E0455E] shrink-0" />
              : <Star size={15} className="text-[#D4A84B] shrink-0" />}
            <span className="flex-1 text-sm text-white truncate">{p.titulo}</span>
            <ArrowRight size={14} className="text-[#6B6B85] shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
