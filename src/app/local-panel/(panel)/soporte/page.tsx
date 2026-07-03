'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { PageHeader, SectionCard, EmptyState } from '@/components/local-panel/ui'
import {
  ESTADO_LABEL, ESTADO_BADGE, CATEGORIA_LABEL, PRIORIDAD_LABEL, CATEGORIAS, PRIORIDADES,
  haceTiempo, type EstadoTicket, type CategoriaTicket, type PrioridadTicket,
} from '@/lib/soporte'
import { LifeBuoy, Plus, X, Send, ChevronRight } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'

type Ticket = {
  id: string; asunto: string; categoria: CategoriaTicket; prioridad: PrioridadTicket
  estado: EstadoTicket; no_leido_local: boolean; ultimo_mensaje_at: string; created_at: string
}
type Mensaje = { id: string; autor: 'local' | 'admin'; autor_nombre: string | null; mensaje: string; created_at: string }

export default function SoporteLocalPage() {
  const toast = useToast()
  const trabajador = useLocalPanelStore(s => s.trabajador)
  const puedeAbrir = trabajador?.rol === 'dueno' || trabajador?.rol === 'gestor'
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [abrirNuevo, setAbrirNuevo] = useState(false)
  const [ticketAbierto, setTicketAbierto] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/local-panel/soporte')
    const j = await r.json().catch(() => ({}))
    if (r.ok) setTickets(j.tickets ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <PageHeader
        eyebrow="Ayuda" titulo="Soporte"
        subtitulo="Abre un ticket y el equipo de Tourneum te responde por aquí."
        acciones={puedeAbrir ? <Button size="sm" onClick={() => setAbrirNuevo(true)}><Plus size={16} /> Abrir ticket</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-2xl skeleton" />)}</div>
      ) : tickets.length === 0 ? (
        <EmptyState icon={LifeBuoy} acento="blue" titulo="No tienes tickets abiertos"
          descripcion={puedeAbrir ? '¿Algo no funciona o tienes una duda? Abre un ticket y te ayudamos.' : 'Pide al dueño o encargado que abra un ticket si lo necesitáis.'}
          accion={puedeAbrir ? <Button size="sm" onClick={() => setAbrirNuevo(true)}><Plus size={16} /> Abrir ticket</Button> : undefined} />
      ) : (
        <div className="space-y-2">
          {tickets.map(t => (
            <button key={t.id} onClick={() => setTicketAbierto(t.id)}
              className="w-full text-left rounded-2xl bg-white/[0.03] border border-white/[0.07] p-4 hover:bg-white/[0.06] transition-colors flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{t.asunto}</p>
                  {t.no_leido_local && <span className="shrink-0 w-2 h-2 rounded-full bg-[#B6FF3A]" />}
                </div>
                <p className="text-xs text-[#8B8BA8] mt-0.5">
                  {CATEGORIA_LABEL[t.categoria]} · {haceTiempo(t.ultimo_mensaje_at)}
                </p>
              </div>
              <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${ESTADO_BADGE[t.estado]}`}>
                {ESTADO_LABEL[t.estado]}
              </span>
              <ChevronRight size={16} className="text-[#6B6B85] shrink-0" />
            </button>
          ))}
        </div>
      )}

      {abrirNuevo && <NuevoTicketModal onClose={() => setAbrirNuevo(false)} onCreado={() => { setAbrirNuevo(false); cargar() }} toastError={toast.error} />}
      {ticketAbierto && <TicketModal id={ticketAbierto} onClose={() => { setTicketAbierto(null); cargar() }} />}
    </div>
  )
}

function NuevoTicketModal({ onClose, onCreado, toastError }: { onClose: () => void; onCreado: () => void; toastError: (m: string) => void }) {
  const [asunto, setAsunto] = useState('')
  const [categoria, setCategoria] = useState<CategoriaTicket>('general')
  const [prioridad, setPrioridad] = useState<PrioridadTicket>('normal')
  const [mensaje, setMensaje] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function crear() {
    if (asunto.trim().length < 3) { toastError('Pon un asunto'); return }
    if (mensaje.trim().length < 3) { toastError('Describe tu consulta'); return }
    setEnviando(true)
    const r = await fetch('/api/local-panel/soporte', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ asunto, categoria, prioridad, mensaje }),
    })
    const j = await r.json().catch(() => ({}))
    setEnviando(false)
    if (!r.ok) { toastError(j.error || 'No se pudo crear'); return }
    onCreado()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white text-display">Abrir un ticket</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Asunto</label>
            <input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Resume el problema en una línea"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Categoría</label>
              <select value={categoria} onChange={e => setCategoria(e.target.value as CategoriaTicket)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-[#B6FF3A]/60">
                {CATEGORIAS.map(c => <option key={c} value={c} className="bg-[#181D28]">{CATEGORIA_LABEL[c]}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Prioridad</label>
              <select value={prioridad} onChange={e => setPrioridad(e.target.value as PrioridadTicket)}
                className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white outline-none focus:border-[#B6FF3A]/60">
                {PRIORIDADES.map(p => <option key={p} value={p} className="bg-[#181D28]">{PRIORIDAD_LABEL[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5">Mensaje</label>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} rows={4} placeholder="Cuéntanos con detalle qué ocurre"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none focus:border-[#B6FF3A]/60 resize-none" />
          </div>
          <Button fullWidth size="lg" loading={enviando} onClick={crear}>Enviar ticket</Button>
        </div>
      </div>
    </div>
  )
}

function TicketModal({ id, onClose }: { id: string; onClose: () => void }) {
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/local-panel/soporte/${id}`)
    const j = await r.json().catch(() => ({}))
    if (r.ok) { setTicket(j.ticket); setMensajes(j.mensajes ?? []) }
  }, [id])
  useEffect(() => { cargar() }, [cargar])
  // Tiempo real: respuestas del soporte al instante + respaldo por sondeo (§1.5).
  useEffect(() => {
    const t = setInterval(cargar, 5000)
    const ch = supabase.channel(`soporte-${id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ticket_mensajes', filter: `ticket_id=eq.${id}` }, () => cargar())
      .subscribe()
    return () => { clearInterval(t); supabase.removeChannel(ch) }
  }, [id, cargar])

  async function responder() {
    if (!texto.trim()) return
    setEnviando(true)
    const r = await fetch(`/api/local-panel/soporte/${id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto }),
    })
    setEnviando(false)
    if (r.ok) { setTexto(''); cargar() }
  }

  const cerrado = ticket?.estado === 'cerrado'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="glass-strong w-full max-w-lg rounded-t-3xl sm:rounded-3xl flex flex-col max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/8">
          <div className="min-w-0">
            <p className="font-bold text-white truncate text-display">{ticket?.asunto || 'Ticket'}</p>
            {ticket && <p className="text-xs text-[#8B8BA8]">{CATEGORIA_LABEL[ticket.categoria]} · {ESTADO_LABEL[ticket.estado]}</p>}
          </div>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white shrink-0"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {mensajes.map(m => (
            <div key={m.id} className={`flex ${m.autor === 'local' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.autor === 'local' ? 'bg-[#B6FF3A]/15 text-[#0A0A0F] rounded-br-sm' : 'bg-white/[0.06] text-[#E8E8F0] rounded-bl-sm'
              }`}>
                <p className="text-[10px] uppercase tracking-wide opacity-60 mb-0.5">{m.autor === 'local' ? 'Tú' : 'Soporte Tourneum'}</p>
                <p className="whitespace-pre-wrap break-words">{m.mensaje}</p>
                <p className="text-[10px] opacity-50 mt-1">{haceTiempo(m.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
        {cerrado ? (
          <div className="px-5 py-4 border-t border-white/8 text-center text-xs text-[#8B8BA8]">Este ticket está cerrado.</div>
        ) : (
          <div className="px-4 py-3 border-t border-white/8 flex items-center gap-2">
            <input value={texto} onChange={e => setTexto(e.target.value)} placeholder="Escribe una respuesta"
              onKeyDown={e => { if (e.key === 'Enter') responder() }}
              className="flex-1 h-11 rounded-xl border border-white/10 bg-white/5 px-4 text-white text-sm outline-none focus:border-[#B6FF3A]/60" />
            <button onClick={responder} disabled={enviando || !texto.trim()}
              className="shrink-0 h-11 w-11 rounded-xl bg-[#B6FF3A] flex items-center justify-center text-[#0A0A0F] disabled:opacity-40">
              <Send size={17} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
