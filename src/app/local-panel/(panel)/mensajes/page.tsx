'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { PageHeader } from '@/components/local-panel/ui'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { cn } from '@/lib/utils'
import { LifeBuoy, MessageSquare, ChevronRight } from 'lucide-react'

type Tipo = 'rrpp' | 'empleado' | 'local'
type Conversacion = {
  clave: string; tipo: Tipo; ref_id: string
  nombre: string; rol_label: string
  ultimo_mensaje: string; ultimo_at: string | null; no_leidos: number
}

const CHIP: Record<Tipo, string> = {
  rrpp:     'bg-[#7C5CFF]/15 text-[#B7A6FF] border-[#7C5CFF]/30',
  empleado: 'bg-[#4F8EF7]/15 text-[#9CC0FF] border-[#4F8EF7]/30',
  local:    'bg-[#D4A84B]/15 text-[#E7CB86] border-[#D4A84B]/30',
}
const AVATAR: Record<Tipo, string> = {
  rrpp:     'from-[#7C5CFF] to-[#4F8EF7]',
  empleado: 'from-[#4F8EF7] to-[#34D399]',
  local:    'from-[#D4A84B] to-[#E0455E]',
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

function chatProps(c: Conversacion) {
  if (c.tipo === 'rrpp') return {
    getUrl: `/api/local-panel/rrpp/chat?rrpp_id=${c.ref_id}`, postUrl: '/api/local-panel/rrpp/chat',
    postBody: { rrpp_id: c.ref_id } as Record<string, string>, yo: 'local',
  }
  if (c.tipo === 'empleado') return {
    getUrl: `/api/local-panel/equipo/chat?trabajador_id=${c.ref_id}`, postUrl: '/api/local-panel/equipo/chat',
    postBody: { trabajador_id: c.ref_id } as Record<string, string>, yo: 'local',
  }
  // Operativo: su chat con la dirección del local.
  return { getUrl: '/api/local-panel/cuenta/chat', postUrl: '/api/local-panel/cuenta/chat', postBody: {} as Record<string, string>, yo: 'trabajador' }
}

export default function MensajesPage() {
  const { trabajador } = useLocalPanelStore()
  const esGestor = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const [convs, setConvs] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Tipo | 'todos'>('todos')
  const [abierta, setAbierta] = useState<Conversacion | null>(null)

  const cargar = useCallback(async () => {
    const r = await fetch('/api/local-panel/mensajes').then(x => x.ok ? x.json() : null).catch(() => null)
    if (r?.conversaciones) setConvs(r.conversaciones)
    setLoading(false)
  }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 10000)
    return () => clearInterval(t)
  }, [cargar])

  const tipos = Array.from(new Set(convs.map(c => c.tipo)))
  const mostradas = filtro === 'todos' ? convs : convs.filter(c => c.tipo === filtro)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <PageHeader eyebrow="La noche" titulo="Mensajes" subtitulo="Tus conversaciones con RRPP, equipo y soporte, en un solo sitio." />

      {/* Acceso directo a Soporte (sigue siendo tickets, no chat) */}
      {esGestor && (
        <Link href="/local-panel/soporte"
          className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 hover:border-[#E0455E]/40 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#E0455E]/15 flex items-center justify-center shrink-0">
            <LifeBuoy size={17} className="text-[#E0455E]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Soporte de Rumbo</p>
            <p className="text-xs text-[#8B8BA8]">¿Una duda o incidencia? Abre un ticket con nuestro equipo.</p>
          </div>
          <ChevronRight size={18} className="text-[#6B6B85]" />
        </Link>
      )}

      {/* Filtros (solo si hay más de un tipo de conversación) */}
      {tipos.length > 1 && (
        <div className="flex gap-2">
          {(['todos', ...tipos] as (Tipo | 'todos')[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                filtro === f ? 'bg-[#E94560] border-[#E94560] text-white' : 'border-white/10 text-[#8B8BA8] hover:text-white')}>
              {f === 'todos' ? 'Todos' : f === 'rrpp' ? 'RRPP' : f === 'empleado' ? 'Equipo' : 'Local'}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 skeleton rounded-2xl" />)}</div>
      ) : mostradas.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-white/5 flex items-center justify-center mb-3">
            <MessageSquare size={22} className="text-[#6B6B85]" />
          </div>
          <p className="text-white font-semibold">Sin mensajes todavía</p>
          <p className="text-sm text-[#8B8BA8] mt-1">
            {esGestor ? 'Aquí verás tus conversaciones con los RRPP y el equipo del local.' : 'Aquí verás tus mensajes con la dirección del local.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {mostradas.map(c => (
            <button key={c.clave} onClick={() => setAbierta(c)}
              className="w-full flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-3.5 py-3 text-left hover:border-white/15 transition-colors">
              <div className={cn('w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white text-sm font-bold', AVATAR[c.tipo])}>
                {iniciales(c.nombre)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-white truncate">{c.nombre}</p>
                  <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', CHIP[c.tipo])}>{c.rol_label}</span>
                </div>
                <p className={cn('text-xs truncate mt-0.5', c.no_leidos > 0 ? 'text-white' : 'text-[#8B8BA8]')}>
                  {c.ultimo_mensaje || 'Sin mensajes aún'}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[11px] text-[#6B6B85]">{hora(c.ultimo_at)}</span>
                {c.no_leidos > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-[#E0455E] text-white text-[11px] font-bold flex items-center justify-center">
                    {c.no_leidos > 99 ? '99+' : c.no_leidos}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {abierta && (() => {
        const p = chatProps(abierta)
        return (
          <ChatRrpp
            titulo={abierta.nombre} subtitulo={abierta.rol_label}
            getUrl={p.getUrl} postUrl={p.postUrl} postBody={p.postBody} yo={p.yo}
            onClose={() => { setAbierta(null); cargar() }}
          />
        )
      })()}
    </div>
  )
}
