'use client'
import { useEffect, useRef, useState } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { X, Send } from 'lucide-react'

// Chat del torneo (reunión 5-jul): sala por torneo para inscritos y espectadores.
// Abre antes del evento; complementa al canal del TO y al hilo por combate.
const SEMILLA: Record<string, { autor: string; texto: string; hora: string }[]> = {
  default: [
    { autor: 'Lima Esports · TO', texto: '¡Bienvenidos! Check-in desde las 17:30 en la entrada. El bracket sale 15 min antes.', hora: '12:04' },
    { autor: 'Kaze', texto: '¿Alguien para unos amistosos antes de empezar?', hora: '12:31' },
    { autor: 'Nyx', texto: 'Yo me apunto, llego 17:00 🔥', hora: '12:33' },
    { autor: 'Volt', texto: '¿Hay sitio para dejar mochilas?', hora: '13:02' },
    { autor: 'Lima Esports · TO', texto: 'Sí, taquillas junto a la barra. Recordad: reportad desde la app al acabar cada set.', hora: '13:05' },
  ],
}

export function ChatTorneoSheet({ torneoId, torneoNombre, onClose }: { torneoId: string; torneoNombre: string; onClose: () => void }) {
  const mios = useDemoStore(s => s.chatsTorneo[torneoId])
  const enviar = useDemoStore(s => s.enviarChat)
  const [texto, setTexto] = useState('')
  const endRef = useRef<HTMLDivElement>(null)
  const mensajes = [...SEMILLA.default, ...(mios || [])]

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes.length])

  const mandar = () => {
    const t = texto.trim()
    if (!t) return
    enviar(torneoId, t)
    setTexto('')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop flex flex-col" style={{ height: 'min(72vh, 640px)' }}>
        <div className="px-4 pt-4 pb-3 border-b border-white/8 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold text-white truncate">💬 Chat del torneo</p>
            <p className="text-[11px] text-[#8B8BA8] truncate">{torneoNombre} · {58 + (mios?.length || 0)} dentro</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={15} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {mensajes.map((m, i) => {
            const esTO = m.autor.includes('· TO')
            const esMio = m.autor === 'Tú'
            return (
              <div key={i} className={`flex ${esMio ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] rounded-2xl px-3 py-2 ${esMio ? 'bg-[#B6FF3A]/14 border border-[#B6FF3A]/30' : esTO ? 'bg-[#9B82FF]/10 border border-[#9B82FF]/30' : 'bg-white/[0.05] border border-white/8'}`}>
                  {!esMio && <p className={`text-[10px] font-bold ${esTO ? 'text-[#B9A6FF]' : 'text-[#8B8BA8]'}`}>{m.autor}</p>}
                  <p className="text-[13px] text-white leading-snug">{m.texto}</p>
                  <p className="mt-0.5 text-right text-[9px] text-[#6B6B85] font-mono-num">{m.hora}</p>
                </div>
              </div>
            )
          })}
          <div ref={endRef} />
        </div>
        <div className="p-3 border-t border-white/8 flex gap-2">
          <input value={texto} onChange={e => setTexto(e.target.value)} onKeyDown={e => e.key === 'Enter' && mandar()}
            placeholder="Escribe al torneo…" className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder:text-[#7B7B92] focus:border-[#B6FF3A]/60 outline-none" />
          <button onClick={mandar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center"><Send size={16} /></button>
        </div>
      </div>
    </div>
  )
}
