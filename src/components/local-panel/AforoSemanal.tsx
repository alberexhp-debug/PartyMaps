'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { getTemperaturaAforo, getColorTemperatura, getLabelTemperatura, diaSemanaKey } from '@/lib/utils'
import { AforoPorDia, DiaSemana, Local } from '@/types'
import { Gauge } from 'lucide-react'
import { cn } from '@/lib/utils'

const DIAS: { key: DiaSemana; label: string }[] = [
  { key: 'lunes', label: 'Lunes' },
  { key: 'martes', label: 'Martes' },
  { key: 'miercoles', label: 'Miércoles' },
  { key: 'jueves', label: 'Jueves' },
  { key: 'viernes', label: 'Viernes' },
  { key: 'sabado', label: 'Sábado' },
  { key: 'domingo', label: 'Domingo' },
]

/**
 * Editor del perfil semanal de ocupación que ve el usuario. El dueño fija un %
 * por día (Lun 30%, Sáb 90%…) y eso es lo que ve la gente como "lo lleno que está"
 * ese día. Guarda en locales.aforo_por_dia.
 */
export function AforoSemanal({ local, onSaved }: { local: Local; onSaved?: (l: Local) => void }) {
  const toast = useToast()
  const [valores, setValores] = useState<AforoPorDia>(() => ({ ...(local.aforo_por_dia ?? {}) }))
  const [guardando, setGuardando] = useState(false)
  const hoy = diaSemanaKey()

  const set = (key: DiaSemana, v: number) => setValores(prev => ({ ...prev, [key]: v }))

  const guardar = async () => {
    setGuardando(true)
    const { data, error } = await supabase
      .from('locales')
      .update({ aforo_por_dia: valores })
      .eq('id', local.id)
      .select()
      .single()
    setGuardando(false)
    if (error) { toast.error('No se pudo guardar el aforo'); return }
    toast.success('Aforo por día guardado')
    if (data) onSaved?.(data)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#E0455E]/10 border border-[#E0455E]/20 flex items-center justify-center shrink-0">
          <Gauge size={18} className="text-[#E0455E]" />
        </div>
        <div>
          <h2 className="font-semibold text-white text-sm">Cuán lleno se muestra tu local</h2>
          <p className="text-xs text-[#8B8BA8] mt-0.5">
            Es lo que ve la gente en el mapa. Fija un nivel por día; el operador podrá
            ajustarlo en vivo esa noche si hace falta.
          </p>
        </div>
      </div>

      <div className="space-y-2.5">
        {DIAS.map(({ key, label }) => {
          const v = valores[key] ?? 0
          const color = getColorTemperatura(getTemperaturaAforo(v))
          const esHoy = key === hoy
          return (
            <div key={key} className={cn(
              'rounded-2xl p-3 border transition-colors',
              esHoy ? 'bg-white/[0.05] border-[#E0455E]/25' : 'bg-white/[0.03] border-white/[0.07]',
            )}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-white flex items-center gap-2">
                  {label}
                  {esHoy && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#E0455E]/15 text-[#E0455E] font-bold uppercase tracking-wide">Hoy</span>}
                </span>
                <span className="text-sm font-bold text-numeric flex items-center gap-1.5" style={{ color }}>
                  <span className="w-2 h-2 rounded-full" style={{ background: color }} />
                  {v}% · {getLabelTemperatura(getTemperaturaAforo(v))}
                </span>
              </div>
              <input
                type="range" min={0} max={100} step={5} value={v}
                onChange={e => set(key, Number(e.target.value))}
                className="w-full accent-[#E0455E]"
                aria-label={`Aforo ${label}`}
              />
            </div>
          )
        })}
      </div>

      <Button fullWidth loading={guardando} onClick={guardar}>
        <Gauge size={15} /> Guardar aforo por día
      </Button>
    </div>
  )
}
