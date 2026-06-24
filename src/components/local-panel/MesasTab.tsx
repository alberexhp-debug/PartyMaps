'use client'
import { useEffect, useState, useCallback } from 'react'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { formatearPrecio, cn } from '@/lib/utils'
import { Users, Plus, Minus, X, Clock, Armchair } from 'lucide-react'

type Mesa = {
  id: string; codigo: string; tipo: string; zona: string | null; capacidad: number
  estado: 'libre' | 'ocupada' | 'reservada'
  sesion: { id: string; personas: number; nombre: string | null; abierta_at: string; pedidos_pendientes: number; total_noche: number } | null
  reserva: { nombre: string; personas: number } | null
}

const ESTADO_UI: Record<string, { label: string; color: string; bg: string }> = {
  libre:     { label: 'Libre',     color: '#8B8BA8', bg: 'bg-white/[0.03] border-white/[0.07]' },
  reservada: { label: 'Reservada', color: '#F39C12', bg: 'bg-[#F39C12]/8 border-[#F39C12]/25' },
  ocupada:   { label: 'Ocupada',   color: '#27AE60', bg: 'bg-[#27AE60]/8 border-[#27AE60]/25' },
}

function tiempoMesa(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (m < 1) return 'ahora'
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

export function MesasTab() {
  const { local } = useLocalPanelStore()
  const toast = useToast()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [loading, setLoading] = useState(true)
  const [sentando, setSentando] = useState<Mesa | null>(null)

  const cargar = useCallback(async () => {
    const r = await fetch('/api/local-panel/mesas-sesiones').then(x => x.ok ? x.json() : null).catch(() => null)
    if (r?.mesas) setMesas(r.mesas)
    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // Realtime: lo que cambia en una tablet (sentar, pedir, liberar) se ve en otra.
  useEffect(() => {
    if (!local?.id) return
    const ch = supabase.channel(`mesas-${local.id}-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mesa_sesiones', filter: `local_id=eq.${local.id}` }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_bar', filter: `local_id=eq.${local.id}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [local?.id, cargar])

  const liberar = async (m: Mesa) => {
    if (!m.sesion) return
    const r = await fetch('/api/local-panel/mesas-sesiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'liberar', sesion_id: m.sesion.id }),
    })
    const j = await r.json().catch(() => ({}))
    if (!r.ok) { toast.error(j.error || 'No se pudo liberar'); return }
    toast.success(`Mesa ${m.codigo} liberada · ${formatearPrecio(j.total || 0)}`)
    cargar()
  }

  if (loading) return <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-32 skeleton rounded-2xl" />)}</div>

  if (mesas.length === 0) return (
    <div className="card-premium p-10 text-center">
      <Armchair size={26} className="text-[#B8B8CC] mx-auto mb-2" />
      <p className="font-bold text-white text-display">Aún no hay mesas</p>
      <p className="text-sm text-[#B8B8CC] mt-1 max-w-xs mx-auto">Diseña tu plano en «Sala &amp; Mesas» y aquí podrás sentar clientes y ver sus pedidos.</p>
    </div>
  )

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {mesas.map(m => {
          const ui = ESTADO_UI[m.estado]
          const pendientes = m.sesion?.pedidos_pendientes || 0
          const rosa = m.estado === 'ocupada' && pendientes > 0
          return (
            <div key={m.id} className={cn('rounded-2xl border p-3 flex flex-col gap-1.5 min-h-32', rosa ? 'bg-[#B6FF3A]/8 border-[#B6FF3A]/30' : ui.bg)}>
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-white text-display truncate">{m.codigo}</span>
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0"
                  style={{ color: rosa ? '#B6FF3A' : ui.color, borderColor: (rosa ? '#B6FF3A' : ui.color) + '55' }}>
                  {rosa ? `${pendientes} ped.` : ui.label}
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B85] capitalize truncate">{m.tipo}{m.zona ? ` · ${m.zona}` : ''} · {m.capacidad}p</p>

              {m.sesion ? (
                <>
                  <div className="text-xs text-[#B8B8CC] flex items-center gap-2">
                    <span className="inline-flex items-center gap-1"><Users size={11} /> {m.sesion.personas}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={11} /> {tiempoMesa(m.sesion.abierta_at)}</span>
                  </div>
                  {m.sesion.nombre && <p className="text-xs text-white truncate">{m.sesion.nombre}</p>}
                  {m.sesion.total_noche > 0 && <p className="text-xs text-[#8B8BA8] text-numeric">{formatearPrecio(m.sesion.total_noche)}</p>}
                  <button onClick={() => liberar(m)} className="mt-auto text-xs font-semibold py-1.5 rounded-lg border border-white/10 text-[#B8B8CC] hover:text-white hover:border-white/25 transition-colors">Liberar</button>
                </>
              ) : (
                <>
                  {m.reserva && <p className="text-[11px] text-[#F39C12] truncate">Reserva: {m.reserva.nombre} ({m.reserva.personas}p)</p>}
                  <button onClick={() => setSentando(m)} className="mt-auto text-xs font-semibold py-1.5 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] hover:bg-[#A6EE2B] transition-colors">Sentar</button>
                </>
              )}
            </div>
          )
        })}
      </div>
      {sentando && <SentarSheet mesa={sentando} onClose={() => setSentando(null)} onDone={() => { setSentando(null); cargar() }} />}
    </>
  )
}

function SentarSheet({ mesa, onClose, onDone }: { mesa: Mesa; onClose: () => void; onDone: () => void }) {
  const toast = useToast()
  const [personas, setPersonas] = useState(mesa.reserva?.personas || mesa.capacidad || 2)
  const [nombre, setNombre] = useState(mesa.reserva?.nombre || '')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  const sentar = async () => {
    setGuardando(true)
    const r = await fetch('/api/local-panel/mesas-sesiones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'sentar', mesa_id: mesa.id, personas, nombre: nombre.trim() || undefined, telefono: telefono.trim() || undefined }),
    })
    const j = await r.json().catch(() => ({}))
    setGuardando(false)
    if (!r.ok) { toast.error(j.error || 'No se pudo sentar'); return }
    toast.success(`Mesa ${mesa.codigo} ocupada`)
    onDone()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm sm:p-4" onClick={onClose}>
      <div className="w-full sm:max-w-sm glass-strong rounded-t-3xl sm:rounded-3xl border border-white/10 p-5 space-y-4 safe-bottom" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-bold text-white text-display">Sentar en {mesa.codigo}</h3>
            <p className="text-xs text-[#8B8BA8] capitalize">{mesa.tipo}{mesa.zona ? ` · ${mesa.zona}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm text-[#B8B8CC]">Personas</span>
          <div className="flex items-center gap-3">
            <button onClick={() => setPersonas(p => Math.max(1, p - 1))} className="h-9 w-9 rounded-lg border border-white/10 text-white flex items-center justify-center hover:bg-white/5"><Minus size={15} /></button>
            <span className="w-7 text-center text-lg font-bold text-white">{personas}</span>
            <button onClick={() => setPersonas(p => Math.min(50, p + 1))} className="h-9 w-9 rounded-lg border border-white/10 text-white flex items-center justify-center hover:bg-white/5"><Plus size={15} /></button>
          </div>
        </div>

        <input value={nombre} onChange={e => setNombre(e.target.value.slice(0, 80))} placeholder="Nombre (opcional)"
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
        <div>
          <input value={telefono} onChange={e => setTelefono(e.target.value.slice(0, 30))} placeholder="Teléfono (opcional)" inputMode="tel"
            className="h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3.5 text-white text-sm outline-none focus:border-[#B6FF3A]/60 placeholder:text-[#6B6B85]" />
          <p className="text-[11px] text-[#8B8BA8] mt-1">Con su teléfono, el cliente entra en tu CRM.</p>
        </div>

        <Button fullWidth loading={guardando} onClick={sentar}><Armchair size={16} /> Sentar clientes</Button>
      </div>
    </div>
  )
}
