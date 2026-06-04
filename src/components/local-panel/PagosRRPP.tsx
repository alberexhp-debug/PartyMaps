'use client'
import { useEffect, useState, useCallback } from 'react'
import { Wallet, Check, Clock } from 'lucide-react'
import { SectionCard, SectionTitle } from '@/components/local-panel/ui'

type Liq = {
  id: string; rrpp_id: string; rrpp_nombre: string; periodo: string
  monto_total: number; num_ventas: number
  estado: 'pendiente' | 'marcado_pagado' | 'confirmado' | 'disputado'
  disputa_nota: string | null
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`
function periodoLabel(p: string): string {
  const [y, m] = p.split('-').map(Number)
  return `${MESES[(m || 1) - 1]} ${y}`
}
const ESTADO: Record<Liq['estado'], { label: string; color: string }> = {
  pendiente: { label: 'Por pagar', color: '#F39C12' },
  marcado_pagado: { label: 'Pagado · esperando RRPP', color: '#4F8EF7' },
  confirmado: { label: 'Confirmado', color: '#27AE60' },
  disputado: { label: 'En disputa', color: '#E94560' },
}

/** Sección "Pagos a RRPP" del panel del local: marca como pagado lo que debes. */
export function PagosRRPP() {
  const [liqs, setLiqs] = useState<Liq[]>([])
  const [loading, setLoading] = useState(true)
  const [accionando, setAccionando] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const r = await fetch('/api/local-panel/rrpp/liquidaciones').then(x => x.ok ? x.json() : { liquidaciones: [] }).catch(() => ({ liquidaciones: [] }))
    setLiqs((r.liquidaciones ?? []).filter((l: Liq) => Number(l.monto_total) > 0))
    setLoading(false)
  }, [])
  useEffect(() => { cargar() }, [cargar])

  async function marcarPagado(l: Liq) {
    const nota = window.prompt(`Marcar como pagado a ${l.rrpp_nombre} (${eur(l.monto_total)}). Nota opcional (Bizum, efectivo…):`) ?? undefined
    if (nota === undefined) return
    setAccionando(l.id)
    const r = await fetch('/api/local-panel/rrpp/liquidaciones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: l.id, nota }),
    })
    setAccionando(null)
    if (r.ok) cargar()
  }

  if (loading) return <SectionCard><SectionTitle icon={Wallet} acento="violet">Pagos a RRPP</SectionTitle><div className="h-12 rounded-xl skeleton" /></SectionCard>
  if (liqs.length === 0) return null

  const pendiente = liqs.filter(l => l.estado === 'pendiente' || l.estado === 'disputado').reduce((s, l) => s + Number(l.monto_total), 0)

  return (
    <SectionCard>
      <SectionTitle icon={Wallet} acento="violet"
        accion={pendiente > 0 ? <span className="text-xs font-bold text-[#F39C12]">{eur(pendiente)} por pagar</span> : undefined}>
        Pagos a RRPP
      </SectionTitle>
      <div className="space-y-2">
        {liqs.map(l => {
          const est = ESTADO[l.estado]
          const accionable = l.estado === 'pendiente' || l.estado === 'disputado'
          return (
            <div key={l.id} className="rounded-xl bg-white/[0.03] border border-white/[0.07] p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{l.rrpp_nombre}</p>
                  <p className="text-[11px] text-[#8B8BA8] capitalize">{periodoLabel(l.periodo)} · {l.num_ventas} {l.num_ventas === 1 ? 'venta' : 'ventas'}</p>
                  {l.estado === 'disputado' && l.disputa_nota && <p className="text-[11px] text-rose-300 mt-0.5">Disputa: {l.disputa_nota}</p>}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-base font-bold text-white text-numeric">{eur(l.monto_total)}</p>
                  <span className="text-[10px] font-semibold rounded-full px-2 py-0.5" style={{ color: est.color, background: `${est.color}1F` }}>{est.label}</span>
                </div>
              </div>
              {accionable && (
                <button onClick={() => marcarPagado(l)} disabled={accionando === l.id}
                  className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm py-2 hover:bg-emerald-500/25">
                  <Check size={14} /> Marcar como pagado
                </button>
              )}
              {l.estado === 'marcado_pagado' && (
                <p className="mt-2 text-[11px] text-[#8B8BA8] flex items-center gap-1"><Clock size={11} /> Esperando que el RRPP confirme el cobro.</p>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}
