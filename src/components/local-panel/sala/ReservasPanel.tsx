'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Mesa, Reserva, EstadoReserva } from '@/types'
import { Check, X, LogIn, Users, Calendar, Phone, Euro, Wallet } from 'lucide-react'

/** Reserva con los campos VIP de la migración 034 (opcionales hasta aplicarla). */
type ReservaVip = Reserva & { minimo_consumo?: number | null; deposito?: number | null; deposito_pagado?: boolean }
const eur = (n: number) => `${(Number(n) || 0).toFixed(2).replace(/\.00$/, '')} €`

interface Props {
  localId: string
  mesas: Mesa[]
  puedeGestionar: boolean
}

type Filtro = 'solicitada' | 'activas' | 'historico'

const ESTADOS_POR_FILTRO: Record<Filtro, EstadoReserva[]> = {
  solicitada: ['solicitada'],
  activas: ['confirmada', 'sentada'],
  historico: ['rechazada', 'cancelada', 'no_show'],
}

const ESTADO_LABEL: Record<EstadoReserva, { label: string; color: string }> = {
  solicitada: { label: 'Solicitada', color: '#F39C12' },
  confirmada: { label: 'Confirmada', color: '#D4A84B' },
  sentada:    { label: 'Sentada', color: '#27AE60' },
  rechazada:  { label: 'Rechazada', color: '#B6FF3A' },
  cancelada:  { label: 'Cancelada', color: '#6B6B85' },
  no_show:    { label: 'No-show', color: '#6B6B85' },
}

function fechaLabel(iso: string): string {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function ReservasPanel({ localId, mesas, puedeGestionar }: Props) {
  const toast = useToast()
  const [filtro, setFiltro] = useState<Filtro>('solicitada')
  const [reservas, setReservas] = useState<ReservaVip[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmando, setConfirmando] = useState<ReservaVip | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('reservas').select('*')
      .eq('local_id', localId)
      .in('estado', ESTADOS_POR_FILTRO[filtro])
      .order('fecha_noche', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(100)
    setReservas((data ?? []) as ReservaVip[])
    setLoading(false)
  }, [localId, filtro])

  useEffect(() => { cargar() }, [cargar])

  useEffect(() => {
    const ch = supabase.channel(`reservas-${localId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `local_id=eq.${localId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [localId, cargar])

  const cambiar = async (r: Reserva, estado: EstadoReserva) => {
    const patch: Partial<Reserva> = { estado }
    if (estado === 'confirmada') patch.confirmada_at = new Date().toISOString()
    const { error } = await supabase.from('reservas').update(patch).eq('id', r.id)
    if (error) { toast.error('No se pudo actualizar'); return }
    toast.success(`Reserva ${ESTADO_LABEL[estado].label.toLowerCase()}`)
    setReservas(prev => prev.filter(x => x.id !== r.id))
  }

  // Confirma fijando mínimo de consumo y depósito. Si la migración 034 aún no
  // está, reintenta sin esos campos para que la confirmación básica funcione igual.
  const confirmar = async (r: ReservaVip, minimo: number | null, deposito: number | null) => {
    const ahora = new Date().toISOString()
    const full = { estado: 'confirmada', confirmada_at: ahora, minimo_consumo: minimo, deposito }
    let res = await supabase.from('reservas').update(full).eq('id', r.id)
    if (res.error && /minimo_consumo|deposito|column|schema cache/i.test(res.error.message)) {
      res = await supabase.from('reservas').update({ estado: 'confirmada', confirmada_at: ahora }).eq('id', r.id)
    }
    if (res.error) { toast.error('No se pudo confirmar'); return }
    toast.success('Reserva confirmada')
    setConfirmando(null)
    setReservas(prev => prev.filter(x => x.id !== r.id))
  }

  const toggleDeposito = async (r: ReservaVip) => {
    const nuevo = !r.deposito_pagado
    const { error } = await supabase.from('reservas').update({ deposito_pagado: nuevo }).eq('id', r.id)
    if (error) { toast.error('No se pudo actualizar (¿migración 034 aplicada?)'); return }
    setReservas(prev => prev.map(x => x.id === r.id ? { ...x, deposito_pagado: nuevo } : x))
  }

  const codigoMesa = (id: string) => mesas.find(m => m.id === id)?.codigo ?? '—'

  const filtros: { key: Filtro; label: string }[] = [
    { key: 'solicitada', label: 'Solicitudes' },
    { key: 'activas', label: 'Confirmadas' },
    { key: 'historico', label: 'Histórico' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex gap-1 p-1 bg-white/6 rounded-xl w-full max-w-sm">
        {filtros.map(f => (
          <button key={f.key} onClick={() => setFiltro(f.key)}
            className={cn('flex-1 py-2 rounded-lg text-sm font-medium transition-colors',
              filtro === f.key ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8] hover:text-[#0A0A0F]')}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#6B6B85] py-8 text-center">Cargando…</p>
      ) : reservas.length === 0 ? (
        <p className="text-sm text-[#6B6B85] py-12 text-center">
          {filtro === 'solicitada' ? 'No hay solicitudes pendientes.' : 'Nada por aquí.'}
        </p>
      ) : (
        <div className="space-y-2">
          {reservas.map(r => (
            <div key={r.id} className="glass rounded-2xl p-4 flex items-start gap-3">
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-white truncate">{r.nombre_contacto}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full shrink-0" style={{ color: ESTADO_LABEL[r.estado].color, background: `${ESTADO_LABEL[r.estado].color}1A` }}>
                    {ESTADO_LABEL[r.estado].label}
                  </span>
                  {r.modo === 'instantanea' && r.pagada && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#27AE60]/15 text-[#27AE60] shrink-0">Pagada</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#B8B8CC]">
                  <span className="flex items-center gap-1"><span className="font-bold text-white">{codigoMesa(r.mesa_id)}</span></span>
                  <span className="flex items-center gap-1"><Users size={12} /> {r.personas}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} /> {fechaLabel(r.fecha_noche)}</span>
                  {r.telefono && <a href={`tel:${r.telefono}`} className="flex items-center gap-1 text-[#4F8EF7]"><Phone size={12} /> {r.telefono}</a>}
                </div>
                {r.notas && <p className="text-xs text-[#8B8BA8] italic">“{r.notas}”</p>}
                {(r.minimo_consumo || r.deposito) && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {r.minimo_consumo ? (
                      <span className="text-[11px] rounded-full bg-white/8 text-[#B8B8CC] px-2 py-0.5 inline-flex items-center gap-1"><Euro size={10} /> Mín. {eur(r.minimo_consumo)}</span>
                    ) : null}
                    {r.deposito ? (
                      <button type="button" onClick={() => r.estado === 'confirmada' && puedeGestionar && toggleDeposito(r)}
                        className={cn('text-[11px] rounded-full px-2 py-0.5 inline-flex items-center gap-1',
                          r.deposito_pagado ? 'bg-[#27AE60]/15 text-[#27AE60]' : 'bg-[#F39C12]/15 text-[#F39C12]')}>
                        <Wallet size={10} /> Depósito {eur(r.deposito)} · {r.deposito_pagado ? 'cobrado' : 'pendiente'}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

              {puedeGestionar && (
                <div className="flex flex-col gap-1.5 shrink-0">
                  {r.estado === 'solicitada' && (
                    <>
                      <Button size="sm" onClick={() => setConfirmando(r)}><Check size={14} /> Confirmar</Button>
                      <Button size="sm" variant="secondary" onClick={() => cambiar(r, 'rechazada')}><X size={14} /> Rechazar</Button>
                    </>
                  )}
                  {r.estado === 'confirmada' && (
                    <Button size="sm" onClick={() => cambiar(r, 'sentada')}><LogIn size={14} /> Sentar</Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {confirmando && <ConfirmarReservaModal reserva={confirmando} onClose={() => setConfirmando(null)} onConfirmar={confirmar} />}
    </div>
  )
}

/** Al confirmar una reserva, el local puede fijar mínimo de consumo y depósito. */
function ConfirmarReservaModal({ reserva, onClose, onConfirmar }: {
  reserva: ReservaVip; onClose: () => void; onConfirmar: (r: ReservaVip, minimo: number | null, deposito: number | null) => void
}) {
  const [minimo, setMinimo] = useState(reserva.minimo_consumo != null ? String(reserva.minimo_consumo) : '')
  const [deposito, setDeposito] = useState(reserva.deposito != null ? String(reserva.deposito) : '')
  const [enviando, setEnviando] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4" onClick={onClose}>
      <div className="card-premium w-full max-w-sm rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-white text-display">Confirmar reserva</h2>
          <button onClick={onClose} className="text-[#8B8BA8] hover:text-white"><X size={20} /></button>
        </div>
        <p className="text-xs text-[#8B8BA8] mb-4">{reserva.nombre_contacto} · {reserva.personas} personas</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5 flex items-center gap-1.5"><Euro size={13} /> Mínimo de consumo (opcional)</label>
            <input type="number" min={0} step="10" value={minimo} onChange={e => setMinimo(e.target.value)} placeholder="Ej. 200"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#A0A0B8] mb-1.5 flex items-center gap-1.5"><Wallet size={13} /> Depósito por adelantado (opcional)</label>
            <input type="number" min={0} step="10" value={deposito} onChange={e => setDeposito(e.target.value)} placeholder="Ej. 50"
              className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 text-white outline-none focus:border-[#B6FF3A]/60" />
            <p className="text-[11px] text-[#6B6B85] mt-1">Lo cobras tú al cliente; luego lo marcas como cobrado en la reserva.</p>
          </div>
          <Button fullWidth size="lg" loading={enviando}
            onClick={() => { setEnviando(true); onConfirmar(reserva, minimo ? Number(minimo) : null, deposito ? Number(deposito) : null) }}>
            <Check size={16} /> Confirmar reserva
          </Button>
        </div>
      </div>
    </div>
  )
}
