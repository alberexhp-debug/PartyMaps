'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { Send, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

type Mensaje = { id: string; emisor: string; mensaje: string; created_at: string }

/**
 * Hilo de chat reutilizable. Sirve para local↔RRPP y para local↔trabajador
 * según las URLs y el `yo` que se pasen (p.ej. 'local'/'rrpp' o
 * 'local'/'trabajador'). Carga al abrir + sondeo cada 5s.
 */
export function ChatRrpp({
  titulo, subtitulo, getUrl, postUrl, postBody, yo, onClose, realtimeTabla,
}: {
  titulo: string
  subtitulo?: string
  getUrl: string
  postUrl: string
  postBody: Record<string, string>
  yo: string
  onClose: () => void
  /** Si se pasa, suscribe a INSERTs de esa tabla y refresca el hilo al instante. */
  realtimeTabla?: string
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
    const t = setInterval(cargar, 5000)   // respaldo por si el realtime cae
    return () => clearInterval(t)
  }, [cargar])

  // Tiempo real: refresca el hilo en cuanto entra un mensaje (RLS scoped).
  useEffect(() => {
    if (!realtimeTabla) return
    const ch = supabase.channel(`chat-rt-${realtimeTabla}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: realtimeTabla }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [realtimeTabla, cargar])

  useEffect(() => { finRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [mensajes.length])

  // Cerrar con Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

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
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
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
                  mio ? 'bg-[#B6FF3A] text-[#0A0A0F] rounded-br-md' : 'bg-white/8 text-[#0A0A0F] rounded-bl-md')}>
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
            className="h-11 flex-1 rounded-xl border border-white/10 bg-white/5 px-3.5 text-sm text-white outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]"
          />
          <button onClick={enviar} disabled={enviando || !texto.trim()} aria-label="Enviar"
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] disabled:opacity-40">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
