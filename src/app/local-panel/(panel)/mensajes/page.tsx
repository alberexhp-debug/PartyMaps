'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { PageHeader } from '@/components/local-panel/ui'
import { ChatRrpp } from '@/components/chat/ChatRrpp'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'
import { sonidoMensaje, sonidoMensajesActivo, setSonidoMensajes } from '@/lib/sonido'
import { MessageSquare, ChevronRight, Bell, X } from '@/components/todh/iconosTorneum'
import { LifeBuoy, Volume2, VolumeX, Pin, PinOff, BellOff, Archive, ArchiveRestore, MoreVertical } from 'lucide-react'

type Tipo = 'rrpp' | 'empleado' | 'local' | 'gestor'
type Conversacion = {
  clave: string; tipo: Tipo; ref_id: string
  nombre: string; rol_label: string
  ultimo_mensaje: string; ultimo_at: string | null; no_leidos: number
  fijado?: boolean; silenciado?: boolean; archivado?: boolean
}

const CHIP: Record<Tipo, string> = {
  rrpp:     'bg-[#7C5CFF]/15 text-[#B7A6FF] border-[#7C5CFF]/30',
  empleado: 'bg-[#4F8EF7]/15 text-[#9CC0FF] border-[#4F8EF7]/30',
  local:    'bg-[#D4A84B]/15 text-[#E7CB86] border-[#D4A84B]/30',
  gestor:   'bg-[#34D399]/15 text-[#86E7C0] border-[#34D399]/30',
}
const AVATAR: Record<Tipo, string> = {
  rrpp:     'from-[#7C5CFF] to-[#4F8EF7]',
  empleado: 'from-[#4F8EF7] to-[#34D399]',
  local:    'from-[#D4A84B] to-[#B6FF3A]',
  gestor:   'from-[#34D399] to-[#4F8EF7]',
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
    postBody: { rrpp_id: c.ref_id } as Record<string, string>, yo: 'local', realtimeTabla: 'mensajes_rrpp',
  }
  if (c.tipo === 'empleado') return {
    getUrl: `/api/local-panel/equipo/chat?trabajador_id=${c.ref_id}`, postUrl: '/api/local-panel/equipo/chat',
    postBody: { trabajador_id: c.ref_id } as Record<string, string>, yo: 'local', realtimeTabla: 'mensajes_trabajador',
  }
  if (c.tipo === 'gestor') return {
    getUrl: '/api/local-panel/mi-gestor/chat', postUrl: '/api/local-panel/mi-gestor/chat',
    postBody: {} as Record<string, string>, yo: 'local', realtimeTabla: 'mensajes_gestor',
  }
  // Operativo: su chat con la dirección del local.
  return { getUrl: '/api/local-panel/cuenta/chat', postUrl: '/api/local-panel/cuenta/chat', postBody: {} as Record<string, string>, yo: 'trabajador', realtimeTabla: 'mensajes_trabajador' }
}

export default function MensajesPage() {
  const { trabajador, local } = useLocalPanelStore()
  const esGestor = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const [convs, setConvs] = useState<Conversacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<Tipo | 'todos'>('todos')
  const [abierta, setAbierta] = useState<Conversacion | null>(null)
  const [sonidoOn, setSonidoOn] = useState(true)
  const [verArchivados, setVerArchivados] = useState(false)
  const [archivadosCount, setArchivadosCount] = useState(0)
  const [soporteNoLeidos, setSoporteNoLeidos] = useState(0)
  const [menu, setMenu] = useState<Conversacion | null>(null)
  const convsRef = useRef<Conversacion[]>([])

  const cargar = useCallback(async () => {
    const url = verArchivados ? '/api/local-panel/mensajes?archivados=1' : '/api/local-panel/mensajes'
    const r = await fetch(url).then(x => x.ok ? x.json() : null).catch(() => null)
    if (r?.conversaciones) setConvs(r.conversaciones)
    if (typeof r?.archivados_count === 'number') setArchivadosCount(r.archivados_count)
    if (typeof r?.soporte_no_leidos === 'number') setSoporteNoLeidos(r.soporte_no_leidos)
    setLoading(false)
  }, [verArchivados])

  useEffect(() => { setSonidoOn(sonidoMensajesActivo()) }, [])

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 10000)   // respaldo del realtime
    return () => clearInterval(t)
  }, [cargar])

  useEffect(() => { convsRef.current = convs }, [convs])

  // Tiempo real: nuevas conversaciones/mensajes al instante + ping al recibir
  // (salvo en conversaciones silenciadas).
  useEffect(() => {
    if (!local?.id) return
    const esEntrante = (emisor: string) => esGestor ? (emisor === 'rrpp' || emisor === 'trabajador' || emisor === 'gestor') : (emisor === 'local')
    const onMsg = (payload: { new?: { emisor?: string; rrpp_id?: string; trabajador_id?: string; gestor_id?: string } }) => {
      cargar()
      const n = payload.new || {}
      const refId = n.rrpp_id || n.trabajador_id || n.gestor_id
      const silenciado = convsRef.current.some(c => c.ref_id === refId && c.silenciado)
      if (esEntrante(n.emisor || '') && !silenciado) sonidoMensaje()
    }
    const ch = supabase.channel(`bandeja-${local.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_rrpp', filter: `local_id=eq.${local.id}` }, onMsg)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_trabajador', filter: `local_id=eq.${local.id}` }, onMsg)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_gestor', filter: `local_id=eq.${local.id}` }, onMsg)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [local?.id, esGestor, cargar])

  const toggleSonido = () => { const v = !sonidoOn; setSonidoOn(v); setSonidoMensajes(v) }

  const setEstado = async (c: Conversacion, campo: 'fijado' | 'silenciado' | 'archivado', valor: boolean) => {
    setMenu(null)
    setConvs(prev => prev.map(x => x.clave === c.clave ? { ...x, [campo]: valor } : x))
    await fetch('/api/local-panel/mensajes/estado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clave: c.clave, campo, valor }),
    }).catch(() => {})
    cargar()
  }

  const tipos = Array.from(new Set(convs.map(c => c.tipo)))
  const mostradas = filtro === 'todos' ? convs : convs.filter(c => c.tipo === filtro)

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-4">
      <PageHeader eyebrow="Mensajes" titulo="Mensajes" subtitulo="Tus conversaciones con RRPP, equipo y soporte, en un solo sitio."
        acciones={
          <button onClick={toggleSonido} aria-label={sonidoOn ? 'Silenciar sonido de mensajes' : 'Activar sonido de mensajes'}
            className="w-10 h-10 rounded-xl glass-strong border border-white/10 flex items-center justify-center text-[#A0A0B8] hover:text-white transition-colors">
            {sonidoOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        }
      />

      {/* Acceso directo a Soporte (sigue siendo tickets, no chat) */}
      {esGestor && (
        <Link href="/local-panel/soporte"
          className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3 hover:border-[#B6FF3A]/40 transition-colors">
          <div className="w-9 h-9 rounded-xl bg-[#B6FF3A]/15 flex items-center justify-center shrink-0">
            <LifeBuoy size={17} className="text-[#B6FF3A]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Soporte de Torneum</p>
            <p className="text-xs text-[#8B8BA8]">¿Una duda o incidencia? Abre un ticket con nuestro equipo.</p>
          </div>
          {soporteNoLeidos > 0 && (
            <span className="mr-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B6FF3A] px-1.5 text-[11px] font-bold text-[#0A0A0F]">
              {soporteNoLeidos > 99 ? '99+' : soporteNoLeidos}
            </span>
          )}
          <ChevronRight size={18} className="text-[#6B6B85]" />
        </Link>
      )}

      {/* Filtros (solo si hay más de un tipo de conversación) */}
      {tipos.length > 1 && (
        <div className="flex gap-2">
          {(['todos', ...tipos] as (Tipo | 'todos')[]).map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={cn('px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors',
                filtro === f ? 'bg-[#B6FF3A] border-[#B6FF3A] text-[#0A0A0F]' : 'border-white/10 text-[#8B8BA8] hover:text-[#0A0A0F]')}>
              {f === 'todos' ? 'Todos' : f === 'rrpp' ? 'RRPP' : f === 'empleado' ? 'Equipo' : f === 'gestor' ? 'Mi gestor' : 'Local'}
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
            <div key={c.clave} className={cn('w-full flex items-center gap-2 rounded-2xl border px-3.5 py-3 transition-colors',
              c.fijado ? 'border-[#B6FF3A]/25 bg-[#B6FF3A]/[0.04]' : 'border-white/[0.07] bg-white/[0.03] hover:border-white/15')}>
              <button onClick={() => setAbierta(c)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <div className={cn('w-11 h-11 rounded-2xl bg-gradient-to-br flex items-center justify-center shrink-0 text-white text-sm font-bold', AVATAR[c.tipo])}>
                  {iniciales(c.nombre)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {c.fijado && <Pin size={12} className="text-[#B6FF3A] shrink-0" />}
                    <p className="text-sm font-semibold text-white truncate">{c.nombre}</p>
                    <span className={cn('text-[10px] px-1.5 py-0.5 rounded-full border shrink-0', CHIP[c.tipo])}>{c.rol_label}</span>
                    {c.silenciado && <BellOff size={12} className="text-[#6B6B85] shrink-0" />}
                  </div>
                  <p className={cn('text-xs truncate mt-0.5', c.no_leidos > 0 ? 'text-white' : 'text-[#8B8BA8]')}>
                    {c.ultimo_mensaje || 'Sin mensajes aún'}
                  </p>
                </div>
              </button>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[11px] text-[#6B6B85]">{hora(c.ultimo_at)}</span>
                {c.no_leidos > 0 && (
                  <span className={cn('min-w-5 h-5 px-1.5 rounded-full text-[#0A0A0F] text-[11px] font-bold flex items-center justify-center', c.silenciado ? 'bg-white/15' : 'bg-[#B6FF3A]')}>
                    {c.no_leidos > 99 ? '99+' : c.no_leidos}
                  </span>
                )}
              </div>
              <button onClick={() => setMenu(c)} aria-label="Opciones de la conversación" className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-[#6B6B85] hover:text-white hover:bg-white/5">
                <MoreVertical size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {!loading && (verArchivados ? (
        <button onClick={() => setVerArchivados(false)} className="text-sm text-[#A0A0B8] hover:text-white">← Volver a la bandeja</button>
      ) : archivadosCount > 0 ? (
        <button onClick={() => setVerArchivados(true)} className="text-sm text-[#A0A0B8] hover:text-white inline-flex items-center gap-1.5">
          <Archive size={14} /> Archivados ({archivadosCount})
        </button>
      ) : null)}

      {menu && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4" onClick={() => setMenu(null)}>
          <div className="w-full sm:max-w-xs glass-strong rounded-t-3xl sm:rounded-3xl border border-white/10 p-2 safe-bottom" onClick={e => e.stopPropagation()}>
            <div className="px-3 py-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white truncate">{menu.nombre}</p>
              <button onClick={() => setMenu(null)} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={18} /></button>
            </div>
            <AccionFila icon={menu.fijado ? PinOff : Pin} label={menu.fijado ? 'Dejar de fijar' : 'Fijar arriba'} onClick={() => setEstado(menu, 'fijado', !menu.fijado)} />
            <AccionFila icon={menu.silenciado ? Bell : BellOff} label={menu.silenciado ? 'Reactivar sonido' : 'Silenciar'} onClick={() => setEstado(menu, 'silenciado', !menu.silenciado)} />
            <AccionFila icon={menu.archivado ? ArchiveRestore : Archive} label={menu.archivado ? 'Desarchivar' : 'Archivar'} onClick={() => setEstado(menu, 'archivado', !menu.archivado)} />
          </div>
        </div>
      )}

      {abierta && (() => {
        const p = chatProps(abierta)
        return (
          <ChatRrpp
            titulo={abierta.nombre} subtitulo={abierta.rol_label}
            getUrl={p.getUrl} postUrl={p.postUrl} postBody={p.postBody} yo={p.yo}
            realtimeTabla={p.realtimeTabla}
            onClose={() => { setAbierta(null); cargar() }}
          />
        )
      })()}
    </div>
  )
}

function AccionFila({ icon: Icon, label, onClick }: { icon: React.ElementType; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-white hover:bg-white/5 text-left">
      <Icon size={17} className="text-[#A0A0B8]" /> {label}
    </button>
  )
}
