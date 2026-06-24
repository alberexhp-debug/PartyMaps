'use client'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { FaltanteObligatorio } from '@/lib/onboarding/gate'

/**
 * Modal "Te falta poco" del bloqueo suave (doc 01 §7, §14.6). Lista SOLO lo que falta
 * con su tiempo estimado. "Completar ahora" lleva al primer pendiente; el cierre deja
 * el trabajo en borrador (nunca se pierde).
 */
export function ModalTeFaltaPoco({
  faltantes, titulo = 'Te falta poco', descripcion, onCompletar, onCerrar, textoCerrar = 'Volver al borrador',
}: {
  faltantes: FaltanteObligatorio[]
  titulo?: string
  descripcion?: string
  onCompletar: (rutaPrimero: string) => void
  onCerrar: () => void
  textoCerrar?: string
}) {
  if (faltantes.length === 0) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onCerrar}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full sm:max-w-sm glass-strong rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up safe-bottom" onClick={e => e.stopPropagation()}>
        <div className="w-11 h-11 rounded-2xl bg-[#F39C12]/15 border border-[#F39C12]/25 flex items-center justify-center mb-3">
          <AlertTriangle size={20} className="text-[#F39C12]" />
        </div>
        <h3 className="text-lg font-bold text-white text-display">{titulo}</h3>
        <p className="text-[13px] text-[#B8B8CC] mt-1.5">
          {descripcion ?? 'Para publicar necesitas un par de cosas. Son minutos y tu evento sale perfecto.'}
        </p>
        <div className="mt-3 space-y-2">
          {faltantes.map(f => (
            <div key={f.id} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.07] px-3 py-2.5">
              <span className="w-4 h-4 rounded-full border-2 border-[#B6FF3A] shrink-0" />
              <span className="flex-1 text-sm text-white">{f.titulo}</span>
              <Badge variant="default" size="sm">{f.tiempo}</Badge>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-2">
          <Button variant="primary" fullWidth onClick={() => onCompletar(faltantes[0].ruta)}>Completar ahora →</Button>
          <Button variant="ghost" fullWidth onClick={onCerrar}>{textoCerrar}</Button>
        </div>
      </div>
    </div>
  )
}
