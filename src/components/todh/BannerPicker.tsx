'use client'
import { useRef, useState } from 'react'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { Upload, Link2, X, Check, ImageIcon } from 'lucide-react'

// Selector de imagen/banner del torneo: galería de muestra, URL propia o SUBIDA
// desde el dispositivo (reescalada a ≤1280px JPEG para caber en el estado demo).
// Sin imagen → keyart del juego (el fallback de toda la app).

const PRESETS = [
  'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200&q=80',
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=1200&q=80',
  'https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=1200&q=80',
  'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=1200&q=80',
]

async function redimensionar(file: File, maxW = 1280): Promise<string> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image()
      i.onload = () => res(i)
      i.onerror = rej
      i.src = url
    })
    const scale = Math.min(1, maxW / img.width)
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.width * scale)
    canvas.height = Math.round(img.height * scale)
    canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.82)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export function BannerPicker({ juegoId, value, onChange }: { juegoId: string; value?: string; onChange: (banner: string | undefined) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urlOpen, setUrlOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [subiendo, setSubiendo] = useState(false)

  const subir = async (f: File | undefined) => {
    if (!f || !f.type.startsWith('image/')) return
    setSubiendo(true)
    try { onChange(await redimensionar(f)) } finally { setSubiendo(false) }
  }

  return (
    <div className="space-y-2.5">
      {/* Vista previa del banner actual (o keyart del juego si no hay) */}
      <div className="relative w-full overflow-hidden rounded-2xl border border-white/10" style={{ aspectRatio: '16/6' }}>
        {value
          ? <img src={value} alt="Banner del torneo" className="absolute inset-0 h-full w-full object-cover" />
          : <GameKeyart juegoId={juegoId} label={false} className="absolute inset-0" />}
        <span className="absolute bottom-2 left-2.5 px-2 py-0.5 rounded-md bg-black/55 text-[10px] font-bold text-white backdrop-blur-sm">
          {value ? 'Banner personalizado' : 'Keyart del juego (por defecto)'}
        </span>
        {value && (
          <button onClick={() => onChange(undefined)} aria-label="Quitar banner"
            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-sm hover:bg-black/75">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Galería de muestra */}
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(u => (
          <button key={u} onClick={() => onChange(u)}
            className={`relative rounded-xl overflow-hidden border-2 transition-all ${value === u ? 'border-[#B6FF3A]' : 'border-white/10 opacity-80 hover:opacity-100'}`}
            style={{ aspectRatio: '16/9' }}>
            { /* eslint-disable-next-line @next/next/no-img-element */ }
            <img src={u} alt="" className="absolute inset-0 h-full w-full object-cover" />
            {value === u && <span className="absolute top-1 right-1 h-5 w-5 rounded-full bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Check size={12} /></span>}
          </button>
        ))}
      </div>

      {/* Subir / URL */}
      <div className="flex gap-2">
        <button onClick={() => fileRef.current?.click()} disabled={subiendo}
          className="flex-1 h-10 rounded-xl bg-white/6 border border-white/10 text-white text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:bg-white/10 transition-colors disabled:opacity-50">
          {subiendo ? <span className="h-3.5 w-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <Upload size={14} />}
          {subiendo ? 'Procesando…' : 'Subir imagen'}
        </button>
        <button onClick={() => setUrlOpen(v => !v)}
          className={`h-10 px-3.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 border transition-colors ${urlOpen ? 'bg-[#B6FF3A]/12 text-[#B6FF3A] border-[#B6FF3A]/40' : 'bg-white/6 text-white border-white/10 hover:bg-white/10'}`}>
          <Link2 size={14} /> URL
        </button>
      </div>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => subir(e.target.files?.[0])} />
      {urlOpen && (
        <div className="flex gap-2 animate-slide-up-sm">
          <input value={url} onChange={e => setUrl(e.target.value)} type="url" placeholder="https://… (imagen del banner)"
            className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-[#B6FF3A]/60 outline-none" />
          <button onClick={() => { if (url.trim()) { onChange(url.trim()); setUrlOpen(false); setUrl('') } }}
            className="h-10 px-3.5 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold">Usar</button>
        </div>
      )}
      <p className="text-[11px] text-[#8B8BA8] flex items-center gap-1"><ImageIcon size={12} /> Recomendado 1200×450. La subida se ajusta sola de tamaño.</p>
    </div>
  )
}
