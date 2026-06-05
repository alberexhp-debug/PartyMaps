'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import type { UsuarioLocal, TierLocal } from '@/types'
import { Lock, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CORTESIA_LABEL, cortesiaPermitidaPorPlan, NIVELES_CORTESIA, type PermisosCortesia } from '@/lib/cortesias'

/**
 * Modal para que el dueño configure qué cortesías puede regalar un trabajador
 * (nivel preset + ajuste fino + tope diario). Gateado por el plan del local.
 */
export function CortesiasModal({ worker, tier, onClose, onSaved }: {
  worker: UsuarioLocal
  tier: TierLocal | undefined
  onClose: () => void
  onSaved: (m: UsuarioLocal) => void
}) {
  const toast = useToast()
  const [perm, setPerm] = useState<PermisosCortesia>({
    cortesia_consumiciones: !!worker.cortesia_consumiciones,
    cortesia_descuentos: !!worker.cortesia_descuentos,
    cortesia_entradas_gratis: !!worker.cortesia_entradas_gratis,
  })
  const [nivel, setNivel] = useState<number>(worker.nivel_cortesia ?? 0)
  const [maxDia, setMaxDia] = useState<string>(String(worker.cortesia_max_dia ?? 0))
  const [guardando, setGuardando] = useState(false)
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h)
  }, [onClose])

  const tipos = [
    { key: 'cortesia_consumiciones' as const, tipo: 'consumicion' as const },
    { key: 'cortesia_descuentos' as const, tipo: 'descuento' as const },
    { key: 'cortesia_entradas_gratis' as const, tipo: 'entrada_gratis' as const },
  ]

  // Aplica un preset de nivel, respetando el gating por plan.
  const aplicarNivel = (n: number) => {
    setNivel(n)
    const base = NIVELES_CORTESIA.find(x => x.nivel === n)!.permisos
    setPerm({
      cortesia_consumiciones: base.cortesia_consumiciones && cortesiaPermitidaPorPlan(tier, 'consumicion'),
      cortesia_descuentos: base.cortesia_descuentos && cortesiaPermitidaPorPlan(tier, 'descuento'),
      cortesia_entradas_gratis: base.cortesia_entradas_gratis && cortesiaPermitidaPorPlan(tier, 'entrada_gratis'),
    })
  }

  const toggle = (key: keyof PermisosCortesia) => {
    setNivel(-1) // override manual: ya no coincide con un preset
    setPerm(p => ({ ...p, [key]: !p[key] }))
  }

  const guardar = async () => {
    setGuardando(true)
    const patch = {
      nivel_cortesia: nivel < 0 ? null : nivel,
      cortesia_consumiciones: perm.cortesia_consumiciones,
      cortesia_descuentos: perm.cortesia_descuentos,
      cortesia_entradas_gratis: perm.cortesia_entradas_gratis,
      cortesia_max_dia: Math.max(0, parseInt(maxDia, 10) || 0),
    }
    const { error } = await supabase.from('usuario_local').update(patch).eq('id', worker.id)
    setGuardando(false)
    if (error) { toast.error('No se pudo guardar'); return }
    toast.success('Cortesías actualizadas')
    onSaved({ ...worker, ...patch, nivel_cortesia: patch.nivel_cortesia ?? undefined })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-3xl glass-strong p-6 sm:rounded-3xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#9B82FF]">Cortesías</p>
            <h2 className="text-lg font-bold text-white">{worker.nombre}</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        {/* Niveles preset */}
        <p className="mb-2 text-xs text-[#8B8BA8]">Nivel rápido</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {NIVELES_CORTESIA.map(n => (
            <button key={n.nivel} onClick={() => aplicarNivel(n.nivel)}
              className={cn('rounded-xl border p-2.5 text-left transition-colors',
                nivel === n.nivel ? 'border-[#7C5CFF] bg-[#7C5CFF]/10' : 'border-white/10 bg-white/5 hover:bg-white/8')}>
              <p className="text-sm font-semibold text-white">{n.label}</p>
              <p className="mt-0.5 text-[10px] leading-tight text-[#8B8BA8]">{n.desc}</p>
            </button>
          ))}
        </div>

        {/* Toggles finos (gateados por plan) */}
        <p className="mb-2 text-xs text-[#8B8BA8]">Ajuste fino</p>
        <div className="mb-4 space-y-2">
          {tipos.map(({ key, tipo }) => {
            const permitido = cortesiaPermitidaPorPlan(tier, tipo)
            const on = perm[key]
            return (
              <button key={key} disabled={!permitido} onClick={() => toggle(key)}
                className={cn('flex w-full items-center justify-between rounded-xl border px-3.5 py-3 text-left transition-colors',
                  !permitido ? 'cursor-not-allowed border-white/8 bg-white/[0.02] opacity-60'
                    : on ? 'border-[#7C5CFF]/50 bg-[#7C5CFF]/10' : 'border-white/10 bg-white/5')}>
                <div>
                  <p className="text-sm font-medium text-white">{CORTESIA_LABEL[tipo]}</p>
                  {!permitido && <p className="mt-0.5 text-[10px] text-[#F39C12]">Requiere plan Pro/Destacado</p>}
                </div>
                {!permitido
                  ? <Lock size={15} className="text-[#6B6B85]" />
                  : <span className={cn('flex h-6 w-6 items-center justify-center rounded-full border',
                      on ? 'border-[#7C5CFF] bg-[#7C5CFF] text-white' : 'border-white/20 text-transparent')}>
                      <Check size={13} />
                    </span>}
              </button>
            )
          })}
        </div>

        {/* Límite diario */}
        <div className="mb-5">
          <label className="text-xs text-[#8B8BA8]">Máximo al día <span className="text-[#6B6B85]">(0 = sin límite)</span></label>
          <input type="number" min={0} value={maxDia} onChange={e => setMaxDia(e.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none focus:border-[#7C5CFF]/60" />
        </div>

        <Button fullWidth loading={guardando} onClick={guardar}>Guardar cortesías</Button>
      </div>
    </div>
  )
}
