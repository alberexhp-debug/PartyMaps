'use client'
import { useState } from 'react'
import { LocalConAforo } from '@/types'
import { Input } from '@/components/ui/Input'
import { Search, X } from '@/components/todh/iconosTorneum'
import { getLabelTipoLocal, getColorTemperatura } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  locales: LocalConAforo[]
  onSelect: (local: LocalConAforo) => void
}

export function BuscadorLocales({ open, onClose, locales, onSelect }: Props) {
  const [query, setQuery] = useState('')

  if (!open) return null

  const resultados = query.trim().length >= 1
    ? locales.filter(l => l.nombre.toLowerCase().includes(query.toLowerCase()) || l.direccion.toLowerCase().includes(query.toLowerCase()))
    : locales.slice(0, 10)

  return (
    <div className="fixed inset-0 z-50 bg-white/5 flex flex-col">
      <div className="p-4 flex items-center gap-3 border-b border-white/10 safe-top">
        <div className="flex-1">
          <Input
            autoFocus
            icon={<Search size={16} />}
            placeholder="Buscar local por nombre..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <button onClick={() => { setQuery(''); onClose() }} aria-label="Cerrar" className="p-2 text-[#A0A0B8] hover:text-white">
          <X size={22} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {resultados.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-3">
            <Search size={40} className="text-[#6B6B85]" />
            <p className="text-[#6B6B85] text-sm">No encontramos ningún local con ese nombre</p>
          </div>
        ) : (
          resultados.map(local => {
            const colorTemp = getColorTemperatura(local.temperatura)
            return (
              <button
                key={local.id}
                onClick={() => onSelect(local)}
                className="w-full flex items-center gap-4 p-4 glass rounded-xl hover:border-[#B6FF3A]/30 transition-colors text-left"
              >
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 bg-[#2A2A3E]">
                  <img
                    src={local.imagenes?.[0] || ''}
                    alt={local.nombre}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-white truncate">{local.nombre}</p>
                  <p className="text-xs text-[#6B6B85] truncate">{getLabelTipoLocal(local.tipo_local)} · {local.ciudad}</p>
                </div>
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: colorTemp }} />
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
