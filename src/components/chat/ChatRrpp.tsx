'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Mensaje = { id: string; emisor: 'local' | 'rrpp'; mensaje: string; created_at: string }

/**
 * Hilo de chat reutilizable (local↔RRPP). Funciona para ambos lados según las
 * URLs y el `yo` que se pasen. Carga al abrir + sondeo cada 5s.
 */
export function ChatRrpp({
  titulo, subtitulo, getUrl, postUrl, postBody, yo, onClose,
}: {
  titulo: string
  subtitulo?: string
  getUrl: string
  postUrl: string
  postBody: Record<string, string>
  yo: 'local' | 'rrpp'
  onClose: () => void
}) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const finRef = useRef<HTMLDivElement>(null)

  const cargar = useCallback(async () => {
    const res = await fetch(getUrl)
    if (res.ok) { const d = await res.json(); setMensajes(d.mensajes ?? []) }
  }, [getUrl])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 5000)
    return () => clearInterval(t)
  }, [cargar])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes.length])

  const enviar = async () => {
    const m = texto.trim()
    if (!m) return
    setEnviando(true)
    const res = await fetch(postUrl, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...postBody, mensaje: m }),
    })
    setEnviando(false)
    if (res.ok) { setTexto(''); const d = await res.json(); if (d.mensaje) setMensajes(prev => [...prev, d.mensaje]) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4" onClick={onClose}>
      <div className="flex h-[80vh] w-full max-w-md flex-col rounded-t-3xl bg-[#0E0E1A] sm:h-[70vh] sm:rounded-3xl overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
        <header className="flex items-center justify-between gap-3 border-b border-white/8 px-4 py-3 glass-strong">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">{titulo}</p>
            {subtitulo && <p className="truncate text-xs text-[#8B8BA8]">{subtitulo}</p>}
          </div>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </header>

        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {mensajes.length === 0 && (
            <p className="mt-8 text-center text-sm text-[#6B6B85]">Aún no hay mensajes. Escribe el primero 👋</p>
          )}
          {mensajes.map(m => {
            const mio = m.emisor === yo
            return (
              <div key={m.id} className={cn('flex', mio ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[80%] rounded-2xl px-3.5 py-2 text-sm',
                  mio ? 'bg-[#E94560] text-white rounded-br-md' : 'bg-white/8 text-white rounded-bl-md')}>
                  {m.mensaje}
                </div>
              </div>
            )
          })}
          <div ref={finRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-white/8 p-3">
          <input
            value={texto} onChange={e => setTexto(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() } }}
            placeholder="Escribe un mensaje…"
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none focus:border-[#E94560]/60 placeholder:text-[#6B6B85]"
          />
          <button onClick={enviar} disabled={enviando || !texto.trim()}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E94560] text-white disabled:opacity-40">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
