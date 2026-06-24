'use client'
import { useState } from 'react'
import { Wallet, Check, AlertTriangle } from 'lucide-react'
import { SectionCard, SectionTitle } from '@/components/local-panel/ui'

export type Liquidacion = {
  id: string; local_id: string; periodo: string
  monto_total: number; num_ventas: number
  estado: 'pendiente' | 'marcado_pagado' | 'confirmado' | 'disputado'
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`
function periodoLabel(p: string): string {
  const [y, m] = p.split('-').map(Number)
  return `${MESES[(m || 1) - 1]} ${y}`
}
const ESTADO: Record<Liquidacion['estado'], { label: string; color: string }> = {
  pendiente: { label: 'Pendiente de pago', color: '#F39C12' },
  marcado_pagado: { label: 'El local dice que pagó', color: '#4F8EF7' },
  confirmado: { label: 'Cobrado', color: '#27AE60' },
  disputado: { label: 'En disputa', color: '#B6FF3A' },
}

/** Sección "Cobros" del dashboard del RRPP: confirmar o disputar lo que el local marca como pagado. */
export function CobrosRRPP({ liqs, localNombre, onChange }: {
  liqs: Liquidacion[]; localNombre: (id: string) => string; onChange: () => void
}) {
  const [accionando, setAccionando] = useState<string | null>(null)
  // Mostramos lo que requiere acción o histórico reciente; ocultamos las pendientes a 0.
  const visibles = liqs.filter(l => Number(l.monto_total) > 0)
  if (visibles.length === 0) return null

  async function responder(id: string, accion: 'confirmar' | 'disputar') {
    let nota: string | undefined
    if (accion === 'disputar') {
      nota = window.prompt('¿Qué pasa con este cobro? (lo verá el local)') ?? undefined
      if (nota === undefined) return
    }
    setAccionando(id)
    const r = await fetch('/api/rrpp/liquidaciones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, accion, nota }),
    })
    setAccionando(null)
    if (r.ok) onChange()
  }

  return (
    <SectionCard>
      <SectionTitle icon={Wallet} acento="green">Cobros por mes</SectionTitle>
      <div className="space-y-2">
        {visibles.map(l => {
          const est = ESTADO[l.estado]
          return (
            <div key={l.id} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{localNombre(l.local_id)}</p>
                  <p className="text-[11px] text-[#8B8BA8] capitalize">{periodoLabel(l.periodo)} · {l.num_ventas} {l.num_ventas === 1 ? 'venta' : 'ventas'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-white text-numeric">{eur(l.monto_total)}</p>
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
                </div>
              </div>
              {l.estado === 'marcado_pagado' && (
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => responder(l.id, 'confirmar')} disabled={accionando === l.id}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm py-2 hover:bg-emerald-500/25">
                    <Check size={14} /> Confirmar cobro
                  </button>
                  <button onClick={() => responder(l.id, 'disputar')} disabled={accionando === l.id}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/30 text-rose-300 text-sm px-3 py-2 hover:bg-rose-500/10">
                    <AlertTriangle size={14} /> Disputar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
