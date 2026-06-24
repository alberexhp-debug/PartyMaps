'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import { PageHeader } from '@/components/local-panel/ui'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { supabase } from '@/lib/supabase/client'
import { sonidoMensaje, sonidoMensajesActivo, setSonidoMensajes } from '@/lib/sonido'
import { MessageSquare, Volume2, VolumeX, Store } from 'lucide-react'
import { cn } from '@/lib/utils'

type Conversacion = {
  local_id: string
  nombre: string
  imagen: string | null
  ultimo_mensaje: string
  ultimo_at: string | null
  no_leidos: number
}

function iniciales(nombre: string) {
  const p = nombre.trim().split(/\s+/).filter(Boolean)
  return ((p[0]?.[0] || '') + (p[1]?.[0] || '')).toUpperCase() || '?'
}
function hora(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso), ahora = new Date()
  const mismoDia = d.toDateString() === ahora.toDateString()
  return mismoDia
    ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

export default function GestorMensajesPage() {
  const [convs, setConvs] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [abierta, setAbierta] = useState<Conversacion | null>(null)
  const [sonidoOn, setSonidoOn] = useState(true)
  const convsRef = useRef<Conversacion[]>([])

  const cargar = useCallback(async () => {
    const r = await fetch('/api/gestor/mensajes').then(x => x.ok ? x.json() : null).catch(() => null)
    if (r?.conversaciones) setConvs(r.conversaciones)
    setLoading(false)
  }, [])

  useEffect(() => { setSonidoOn(sonidoMensajesActivo()) }, [])
  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 10000)   // respaldo del realtime
    return () => clearInterval(t)
  }, [cargar])
  useEffect(() => { convsRef.current = convs }, [convs])

  // Tiempo real: mensaje nuevo de un local → refresca la bandeja + ping. La RLS
  // de mensajes_gestor scope-a los eventos a los locales de este gestor.
  useEffect(() => {
    const ch = supabase.channel(`gestor-bandeja-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_gestor' }, (payload) => {
        cargar()
        const n = (payload.new || {}) as { emisor?: string }
        if (n.emisor === 'local') sonidoMensaje()
      })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [cargar])

  const toggleSonido = () => { const v = !sonidoOn; setSonidoOn(v); setSonidoMensajes(v) }

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="Tu cartera" acento="violet" titulo="Mensajes"
        subtitulo="Habla con cada local de tu cartera en tiempo real."
        acciones={
          <button onClick={toggleSonido} aria-label={sonidoOn ? 'Silenciar sonido de mensajes' : 'Activar sonido de mensajes'}
            className="w-10 h-10 rounded-xl glass-strong border border-white/10 flex items-center justify-center text-[#A0A0B8] hover:text-white transition-colors">
            {sonidoOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        }
      />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-2xl bg-white/5 animate-pulse" />)}</div>
      ) : convs.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-white/12 px-6 py-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#7C5CFF]/15 text-[#9B82FF]"><Store size={24} /></div>
          <p className="text-base font-semibold text-white">Aún no tienes locales en tu cartera</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-[#8B8BA8]">Cuando des de alta un local, podrás chatear con él desde aquí.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {convs.map(c => (
            <button key={c.local_id} onClick={() => setAbierta(c)}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left transition-colors hover:border-white/15">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-[#7C5CFF] to-[#4F8EF7] text-sm font-bold text-white">
                {c.imagen ? <img src={c.imagen} alt="" className="h-full w-full object-cover" /> : iniciales(c.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">{c.nombre}</p>
                <p className={cn('truncate text-xs mt-0.5', c.no_leidos > 0 ? 'text-white' : 'text-[#8B8BA8]')}>
                  {c.ultimo_mensaje || 'Sin mensajes aún'}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[11px] text-[#6B6B85]">{hora(c.ultimo_at)}</span>
                {c.no_leidos > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B6FF3A] px-1.5 text-[11px] font-bold text-[#0A0A0F]">
                    {c.no_leidos > 99 ? '99+' : c.no_leidos}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {convs.length === 0 && !loading && (
        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-[#6B6B85]">
          <MessageSquare size={13} /> Los mensajes con tus locales aparecerán aquí.
        </p>
      )}

      {abierta && (
        <ChatRrpp
          titulo={abierta.nombre} subtitulo="Local de tu cartera"
          getUrl={`/api/gestor/chat?local_id=${abierta.local_id}`} postUrl="/api/gestor/chat"
          postBody={{ local_id: abierta.local_id }} yo="gestor" realtimeTabla="mensajes_gestor"
          onClose={() => { setAbierta(null); cargar() }}
        />
      )}
    </div>
  )
}
