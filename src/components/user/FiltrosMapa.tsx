'use client'
import { BottomSheet } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { useMapStore } from '@/lib/stores/useMapStore'
import { TipoLocal, TipoMusica } from '@/types'
import { cn } from '@/lib/utils'

interface Props { open: boolean; onClose: () => void }

const TIPOS: { value: TipoLocal; label: string; emoji: string }[] = [
  { value: 'discoteca', label: 'Discoteca', emoji: '🎵' },
  { value: 'bar_copas', label: 'Bar de copas', emoji: '🍸' },
  { value: 'rooftop', label: 'Rooftop', emoji: '🌆' },
  { value: 'sala_conciertos', label: 'Conciertos', emoji: '🎸' },
  { value: 'bar_cocteleria', label: 'Coctelería', emoji: '🍹' },
]

const MUSICA: { value: TipoMusica; label: string }[] = [
  { value: 'techno', label: 'Techno' },
  { value: 'house', label: 'House' },
  { value: 'reggaeton', label: 'Reggaeton' },
  { value: 'pop', label: 'Pop' },
  { value: 'hip_hop', label: 'Hip-hop' },
  { value: 'indie', label: 'Indie' },
  { value: 'electronica', label: 'Electrónica' },
]

export function FiltrosMapa({ open, onClose }: Props) {
  const { filtros, setFiltros, clearFiltros } = useMapStore()

  const toggleTipo = (t: TipoLocal) => {
    const next = filtros.tipos.includes(t) ? filtros.tipos.filter(x => x !== t) : [...filtros.tipos, t]
    setFiltros({ tipos: next })
  }

  const toggleMusica = (m: TipoMusica) => {
    const next = filtros.musica.includes(m) ? filtros.musica.filter(x => x !== m) : [...filtros.musica, m]
    setFiltros({ musica: next })
  }

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="px-5 pb-8 pt-2 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Filtros</h2>
          <button onClick={clearFiltros} className="text-sm text-[#E94560]">Limpiar todo</button>
        </div>

        {/* Tipo de local */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Tipo de local</h3>
          <div className="flex flex-wrap gap-2">
            {TIPOS.map(({ value, label, emoji }) => (
              <button
                key={value}
                onClick={() => toggleTipo(value)}
                className={cn(
                  'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                  filtros.tipos.includes(value)
                    ? 'bg-[#E94560] border-[#E94560] text-white'
                    : 'bg-white/5 border-white/10 text-[#A0A0B8]'
                )}
              >
                <span>{emoji}</span> {label}
              </button>
            ))}
          </div>
        </div>

        {/* Música */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Música</h3>
          <div className="flex flex-wrap gap-2">
            {MUSICA.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => toggleMusica(value)}
                className={cn(
                  'px-3 py-2 rounded-xl text-sm font-medium border transition-colors',
                  filtros.musica.includes(value)
                    ? 'bg-[#4F8EF7] border-[#4F8EF7] text-white'
                    : 'bg-white/5 border-white/10 text-[#A0A0B8]'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-[#A0A0B8] uppercase tracking-wider">Más filtros</h3>
          {[
            { key: 'solo_con_evento' as const, label: 'Solo con evento esta noche', emoji: '★' },
            { key: 'solo_con_planes' as const, label: 'Solo con planes públicos', emoji: '👥' },
          ].map(({ key, label, emoji }) => (
            <div
              key={key}
              onClick={() => setFiltros({ [key]: !filtros[key] })}
              className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10 cursor-pointer"
            >
              <span className="text-sm text-white">{emoji} {label}</span>
              <div className={cn(
                'w-11 h-6 rounded-full transition-colors relative',
                filtros[key] ? 'bg-[#E94560]' : 'bg-[#2A2A3E]'
              )}>
                <div className={cn(
                  'absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                  filtros[key] ? 'left-6' : 'left-1'
                )} />
              </div>
            </div>
          ))}
        </div>

        <Button fullWidth onClick={onClose}>
          Aplicar filtros
        </Button>
      </div>
    </BottomSheet>
  )
}
