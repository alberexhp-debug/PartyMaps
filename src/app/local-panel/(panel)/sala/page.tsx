'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { supabase } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/Spinner'
import { Planta, Mesa } from '@/types'
import { PlanoEditor } from '@/components/local-panel/sala/PlanoEditor'
import { SalaEnVivo } from '@/components/local-panel/sala/SalaEnVivo'
import { ReservasPanel } from '@/components/local-panel/sala/ReservasPanel'
import { cn } from '@/lib/utils'
import { LayoutGrid, PencilRuler, CalendarClock } from 'lucide-react'

type Tab = 'vivo' | 'plano' | 'reservas'

export default function SalaPage() {
  const { local, trabajador } = useLocalPanelStore()
  const rol = trabajador?.rol
  const puedeEditar = rol === 'dueno' || rol === 'gestor'
  const [plantas, setPlantas] = useState<Planta[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('vivo')

  const cargar = useCallback(async () => {
    if (!local?.id) return
    const [{ data: pl }, { data: ms }] = await Promise.all([
      supabase.from('plantas').select('*').eq('local_id', local.id).order('orden'),
      supabase.from('mesas').select('*').eq('local_id', local.id).order('codigo'),
    ])
    setPlantas(pl ?? [])
    setMesas(ms ?? [])
    setLoading(false)
  }, [local?.id])

  useEffect(() => { cargar() }, [cargar])

  if (!local) return null
  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]"><Spinner size="lg" /></div>
  )

  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: 'vivo', label: 'En vivo', icon: LayoutGrid },
    ...(puedeEditar ? [{ key: 'plano' as Tab, label: 'Plano', icon: PencilRuler }] : []),
    { key: 'reservas', label: 'Reservas', icon: CalendarClock },
  ]

  return (
    <div className="p-4 md:p-8 pb-20 md:pb-8 space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">Sala · mesas y reservados</p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Sala</h1>
          <p className="text-sm text-[#B8B8CC] mt-2">
            {mesas.length} {mesas.length === 1 ? 'mesa' : 'mesas'} en {plantas.length} {plantas.length === 1 ? 'planta' : 'plantas'}
          </p>
        </div>
      </header>

      <div className="flex gap-1 p-1 bg-white/6 rounded-xl w-full max-w-md">
        {tabs.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors',
              tab === key ? 'bg-[#E94560] text-white' : 'text-[#8B8BA8] hover:text-white'
            )}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === 'vivo' && (
        <SalaEnVivo localId={local.id} plantas={plantas} mesas={mesas} />
      )}
      {tab === 'plano' && puedeEditar && (
        <PlanoEditor localId={local.id} plantas={plantas} mesas={mesas} onChange={cargar} />
      )}
      {tab === 'reservas' && (
        <ReservasPanel localId={local.id} mesas={mesas} puedeGestionar={!!rol} />
      )}
    </div>
  )
}
