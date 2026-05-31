'use client'
import { useState, useEffect, useRef } from 'react'
import { MapPin, Loader2, Check } from 'lucide-react'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

export type DireccionElegida = { direccion: string; latitud: number; longitud: number }
type Sugerencia = { id: string; place_name: string; center: [number, number] }

/**
 * Buscador de direcciones con autocompletado de Mapbox Geocoding.
 * El usuario escribe la calle, elige una sugerencia y obtenemos la dirección
 * formateada + lat/long reales (para situarlo en el mapa en su calle).
 * onSelect(null) cuando se edita y aún no hay una dirección válida elegida.
 */
export function BuscadorDireccion({
  label = 'Dirección', placeholder = 'Calle y número…', valorInicial = '', onSelect,
}: {
  label?: string
  placeholder?: string
  valorInicial?: string
  onSelect: (d: DireccionElegida | null) => void
}) {
  const [q, setQ] = useState(valorInicial)
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([])
  const [buscando, setBuscando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [elegida, setElegida] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (elegida || q.trim().length < 4) { setSugerencias([]); return }
    const t = setTimeout(async () => {
      setBuscando(true)
      try {
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json`
          + `?access_token=${TOKEN}&country=es&language=es&limit=5&types=address,place,locality,neighborhood`
        const res = await fetch(url)
        const d = await res.json()
        setSugerencias((d.features ?? []).map((f: { id: string; place_name: string; center: [number, number] }) => ({
          id: f.id, place_name: f.place_name, center: f.center,
        })))
        setAbierto(true)
      } catch { setSugerencias([]) }
      setBuscando(false)
    }, 350)
    return () => clearTimeout(t)
  }, [q, elegida])

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setAbierto(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const elegir = (s: Sugerencia) => {
    setQ(s.place_name)
    setElegida(true)
    setAbierto(false)
    setSugerencias([])
    onSelect({ direccion: s.place_name, latitud: s.center[1], longitud: s.center[0] })
  }

  return (
    <div ref={boxRef} className="relative w-full space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#A0A0B8]">{label}</label>}
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85] pointer-events-none">
          {elegida ? <Check size={16} className="text-green-400" /> : <MapPin size={16} />}
        </div>
        <input
          value={q}
          onChange={e => { setQ(e.target.value); if (elegida) { setElegida(false); onSelect(null) } }}
          onFocus={() => { if (sugerencias.length) setAbierto(true) }}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6B6B85] pl-11 pr-10 outline-none transition-all focus:border-[#E94560]/60 focus:bg-white/8 hover:border-white/15"
        />
        {buscando && <Loader2 size={16} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85] animate-spin" />}
      </div>

      {abierto && sugerencias.length > 0 && (
        <div className="absolute z-30 mt-1 w-full overflow-hidden rounded-xl border border-white/12 bg-[#15151F] shadow-[0_12px_40px_-8px_rgba(0,0,0,0.7)]">
          {sugerencias.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => elegir(s)}
              className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-white/[0.06] transition-colors"
            >
              <MapPin size={14} className="mt-0.5 shrink-0 text-[#9B82FF]" />
              <span className="text-sm text-white leading-snug">{s.place_name}</span>
            </button>
          ))}
        </div>
      )}

      {!elegida && q.trim().length >= 4 && !buscando && (
        <p className="text-xs text-[#6B6B85]">Elige una opción de la lista para fijar la ubicación en el mapa.</p>
      )}
    </div>
  )
}
