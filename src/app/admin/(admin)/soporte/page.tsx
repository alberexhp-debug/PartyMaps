'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { PageHeader, SectionCard, EmptyState } from '@/components/local-panel/ui'
import {
  ESTADO_LABEL, ESTADO_BADGE, CATEGORIA_LABEL, PRIORIDAD_LABEL, PRIORIDAD_COLOR, ESTADOS,
  haceTiempo, type EstadoTicket, type CategoriaTicket, type PrioridadTicket,
} from '@/lib/soporte'
import { LifeBuoy, X, Send, Store, ExternalLink, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase/client'

type Ticket = {
  id: string; local_id: string; local_nombre: string; asunto: string
  categoria: CategoriaTicket; prioridad: PrioridadTicket; estado: EstadoTicket
  no_leido_admin: boolean; ultimo_mensaje_at: string; created_at: string; abierto_por_email: string
}
type Mensaje = { id: string; autor: 'local' | 'admin'; autor_nombre: string | null; mensaje: string; created_at: string }

const FILTROS: { v: string; label: string }[] = [
  { v: 'abierto', label: 'Abiertos' },
  { v: 'en_curso', label: 'En curso' },
  { v: 'resuelto', label: 'Resueltos' },
  { v: 'todos', label: 'Todos' },
]

export default function AdminSoportePage() {
  const [filtro, setFiltro] = useState('abierto')
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [abierto, setAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/soporte?estado=${filtro}`)
    const j = await r.json().catch(() => ({}))
    if (r.ok) setTickets(j.tickets ?? [])
    setLoading(false)
  }, [filtro])
  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <PageHeader eyebrow="Equipo Torneum" acento="blue" titulo="Soporte"
        subtitulo="Tickets de los locales. Responde y cambia el estado." halo={false} />

      <div className="flex gap-2 overflow-x-auto scrollbar-hide">
        {FILTROS.map(f => (
          <button key={f.v} onClick={() => setFiltro(f.v)}
            className={cn('shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors',
              filtro === f.v ? 'bg-[#4F8EF7]/15 text-[#4F8EF7] border-[#4F8EF7]/40' : 'bg-white/[0.03] text-[#A0A0B8] border-white/[0.08] hover:text-white')}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} acento="blue" titulo="No hay tickets" descripcion="Cuando un local abra un ticket, aparecerá aquí." />
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => setAbierto(t.id)}
              className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 hover:bg-white/[0.06] transition-colors flex items-center gap-3">
              <span className="w-1.5 h-10 rounded-full shrink-0" style={{ background: PRIORIDAD_COLOR[t.prioridad] }} title={`Prioridad ${PRIORIDAD_LABEL[t.prioridad]}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{t.asunto}</p>
                  {t.no_leido_admin && <span className="shrink-0 w-2 h-2 rounded-full bg-[#B6FF3A]" />}
                </div>
                <p className="text-xs text-[#8B8BA8] mt-0.5 flex items-center gap-1 truncate">
                  <Store size={11} /> {t.local_nombre} · {CATEGORIA_LABEL[t.categoria]} · {haceTiempo(t.ultimo_mensaje_at)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ESTADO_BADGE[t.estado]}`}>
                {ESTADO_LABEL[t.estado]}
              </span>
            </button>
          ))}
        </div>
      )}

      {abierto && <TicketAdminModal id={abierto} onClose={() => { setAbierto(null); cargar() }} />}
    </div>
  )
}

function TicketAdminModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [ticket, setTicket] = useState<(Ticket & { locales?: { id: string; nombre: string; tier: string; estado: string } }) | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/admin/soporte/${id}`)
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setTicket(j.ticket); setMensajes(j.mensajes ?? []) }
  }, [id])
  useEffect(() => { cargar() }, [cargar])
  // Tiempo real: nuevos mensajes del local al instante + respaldo por sondeo (§1.5).
  useEffect(() => {
    const t = setInterval(cargar, 5000)
    const ch = supabase.channel(`soporte-adm-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_mensajes', filter: `ticket_id=eq.${id}` }, () => cargar())
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(ch) }
  }, [id, cargar])

  async function responder() {
    if (!texto.trim()) return
    setEnviando(true)
    const r = await fetch(`/api/admin/soporte/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto }),
    })
    setEnviando(false)
    if (r.ok) { setTexto(''); cargar() }
  }

  async function cambiarEstado(estado: EstadoTicket) {
    await fetch(`/api/admin/soporte/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado }),
    })
    cargar()
  }

  const localId = ticket?.locales?.id || ticket?.local_id

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="glass-strong w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[92vh] animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between px-5 py-4 border-b border-white/8 gap-3">
          <div className="min-w-0">
            <p className="font-bold text-white truncate text-display">{ticket?.asunto || 'Ticket'}</p>
            {ticket && (
              <p className="text-xs text-[#8B8BA8] flex items-center gap-1 mt-0.5">
                <Store size={11} /> {ticket.locales?.nombre || ticket.local_nombre} · {CATEGORIA_LABEL[ticket.categoria]} · {PRIORIDAD_LABEL[ticket.prioridad]}
              </p>
            )}
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white shrink-0"><X size={20} /></button>
        </div>

        {/* Acciones: estado + acceso a la config del local */}
        <div className="px-4 py-2.5 border-b border-white/8 flex items-center gap-2 overflow-x-auto scrollbar-hide">
          {ESTADOS.map(e => (
            <button key={e} onClick={() => cambiarEstado(e)}
              className={cn('shrink-0 px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors',
                ticket?.estado === e ? ESTADO_BADGE[e] : 'bg-white/[0.03] text-[#8B8BA8] border-white/[0.08] hover:text-white')}>
              {ESTADO_LABEL[e]}
            </button>
          ))}
          {localId && (
            <Link href={`/admin/locales/${localId}`}
              className="shrink-0 ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-[#7C5CFF]/15 text-[#9B82FF] border border-[#7C5CFF]/30 hover:bg-[#7C5CFF]/25">
              <Settings size={12} /> Editar local <ExternalLink size={11} />
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[160px]">
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.autor === 'admin' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.autor === 'admin' ? 'bg-[#4F8EF7]/15 text-white rounded-br-sm' : 'bg-white/[0.06] text-[#E8E8F0] rounded-bl-sm'
              }`}>
                <p className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">{m.autor === 'admin' ? (m.autor_nombre || 'Soporte') : 'Local'}</p>
                <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                <p className="text-[10px] opacity-50 mt-1">{haceTiempo(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-4 py-3 border-t border-white/8 flex items-center gap-2">
          <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Responde al local"
            onKeyDown={e => { if (e.key === 'Enter') responder() }}
            className="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-white text-sm outline-none focus:border-[#4F8EF7]/60" />
          <button onClick={responder} disabled={enviando || !texto.trim()} aria-label="Enviar"
            className="shrink-0 h-11 w-11 rounded-xl bg-[#4F8EF7] flex items-center justify-center text-white disabled:opacity-40">
            <Send size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
