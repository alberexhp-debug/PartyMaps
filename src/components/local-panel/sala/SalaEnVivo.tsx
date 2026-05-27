'use client'
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Planta, Mesa, Reserva } from '@/types'
import { Users, Beer, Check, X, LogIn, RotateCcw } from 'lucide-react'

interface Props {
  localId: string
  plantas: Planta[]
  mesas: Mesa[]
}

type EstadoMesa = 'libre' | 'solicitada' | 'reservada' | 'sentada' | 'pedido'

const ESTADO_INFO: Record<EstadoMesa, { label: string; color: string; bg: string }> = {
  libre:      { label: 'Libre',      color: '#6B6B85', bg: 'rgba(255,255,255,0.04)' },
  solicitada: { label: 'Solicitada', color: '#F39C12', bg: 'rgba(243,156,18,0.14)' },
  reservada:  { label: 'Reservada',  color: '#D4A84B', bg: 'rgba(212,168,75,0.18)' },
  sentada:    { label: 'Sentada',    color: '#27AE60', bg: 'rgba(39,174,96,0.18)' },
  pedido:     { label: 'Pedido',     color: '#FF6B2C', bg: 'rgba(255,107,44,0.20)' },
}

// Prioridad de la reserva "viva" de una mesa (mayor gana).
const PRIORIDAD: Record<string, number> = { sentada: 3, confirmada: 2, solicitada: 1 }

function hoyLocal(): string {
  return new Date().toLocaleDateString('sv-SE') // YYYY-MM-DD en hora local
}

export function SalaEnVivo({ localId, plantas, mesas }: Props) {
  const toast = useToast()
  const [plantaId, setPlantaId] = useState<string | null>(plantas[0]?.id ?? null)
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [pedidosPorMesa, setPedidosPorMesa] = useState<Record<string, number>>({})
  const [selId, setSelId] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    const hoy = hoyLocal()
    const [{ data: rv }, { data: pd }] = await Promise.all([
      supabase.from('reservas').select('*')
        .eq('local_id', localId).eq('fecha_noche', hoy)
        .in('estado', ['solicitada', 'confirmada', 'sentada']),
      supabase.from('pedidos_bar').select('id, mesa_id')
        .eq('local_id', localId).eq('estado', 'pagado').not('mesa_id', 'is', null),
    ])
    setReservas((rv ?? []) as Reserva[])
    const conteo: Record<string, number> = {}
    for (const p of (pd ?? []) as { mesa_id: string | null }[]) {
      if (p.mesa_id) conteo[p.mesa_id] = (conteo[p.mesa_id] ?? 0) + 1
    }
    setPedidosPorMesa(conteo)
  }, [localId])

  useEffect(() => { cargar() }, [cargar])

  // Realtime: reservas y pedidos del local
  useEffect(() => {
    const ch = supabase.channel(`sala-${localId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reservas', filter: `local_id=eq.${localId}` }, () => cargar())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pedidos_bar', filter: `local_id=eq.${localId}` }, () => cargar())
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [localId, cargar])

  const reservaDeMesa = (mesaId: string): Reserva | null => {
    const candidatas = reservas.filter(r => r.mesa_id === mesaId)
    if (candidatas.length === 0) return null
    return candidatas.sort((a, b) => (PRIORIDAD[b.estado] ?? 0) - (PRIORIDAD[a.estado] ?? 0))[0]
  }

  const estadoDeMesa = (mesaId: string): EstadoMesa => {
    if (pedidosPorMesa[mesaId]) return 'pedido'
    const r = reservaDeMesa(mesaId)
    if (!r) return 'libre'
    if (r.estado === 'sentada') return 'sentada'
    if (r.estado === 'confirmada') return 'reservada'
    return 'solicitada'
  }

  const cambiarEstadoReserva = async (r: Reserva, estado: Reserva['estado']) => {
    const patch: Partial<Reserva> = { estado }
    if (estado === 'confirmada') patch.confirmada_at = new Date().toISOString()
    const { error } = await supabase.from('reservas').update(patch).eq('id', r.id)
    if (error) { toast.error('No se pudo actualizar la reserva'); return }
    toast.success(`Reserva ${estado}`)
    cargar()
  }

  const mesasPlanta = mesas.filter(m => m.planta_id === plantaId)
  const seleccionada = mesas.find(m => m.id === selId) ?? null
  const reservaSel = seleccionada ? reservaDeMesa(seleccionada.id) : null

  if (plantas.length === 0) {
    return <div className="glass rounded-2xl py-16 text-center text-sm text-[#6B6B85]">El local aún no tiene plano. Pídele al dueño/gestor que lo defina en la pestaña “Plano”.</div>
  }

  return (
    <div className="space-y-4">
      {/* Plantas + refrescar */}
      <div className="flex items-center gap-2 flex-wrap">
        {plantas.map(p => (
          <button key={p.id} onClick={() => { setPlantaId(p.id); setSelId(null) }}
            className={cn('px-3 py-2 rounded-xl text-sm font-medium border',
              p.id === plantaId ? 'border-[#E94560]/40 bg-[#E94560]/10 text-[#E94560]' : 'border-white/10 bg-white/[0.03] text-[#B8B8CC]')}>
            {p.nombre}
          </button>
        ))}
        <button onClick={cargar} className="ml-auto p-2 text-[#8B8BA8] hover:text-white" aria-label="Refrescar"><RotateCcw size={16} /></button>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3">
        {(Object.keys(ESTADO_INFO) as EstadoMesa[]).map(k => (
          <span key={k} className="flex items-center gap-1.5 text-xs text-[#B8B8CC]">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: ESTADO_INFO[k].color }} /> {ESTADO_INFO[k].label}
          </span>
        ))}
      </div>

      <div className="grid md:grid-cols-[1fr_300px] gap-4">
        {/* Mapa */}
        <div
          className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 overflow-hidden"
          style={{
            background: '#0C0C15',
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
            backgroundSize: '6.25% 8.33%',
          }}
        >
          {mesasPlanta.map(m => {
            const est = estadoDeMesa(m.id)
            const info = ESTADO_INFO[est]
            const sel = m.id === selId
            return (
              <button
                key={m.id}
                onClick={() => setSelId(m.id)}
                className={cn('absolute flex flex-col items-center justify-center transition-transform active:scale-95',
                  m.forma === 'redonda' ? 'rounded-full' : m.forma === 'rect' ? 'rounded-lg' : 'rounded-md',
                  est === 'pedido' && 'animate-pulse-heat')}
                style={{
                  left: `${m.pos_x * 100}%`, top: `${m.pos_y * 100}%`,
                  width: `${m.ancho * 100}%`, height: `${m.alto * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  background: info.bg,
                  border: `2px solid ${info.color}`,
                  boxShadow: sel ? '0 0 0 2px #fff' : est !== 'libre' ? `0 0 14px ${info.color}66` : 'none',
                }}
              >
                <span className="text-[10px] font-bold text-white leading-none">{m.codigo}</span>
                {pedidosPorMesa[m.id] ? (
                  <span className="text-[8px] text-white/90 leading-none mt-0.5 flex items-center gap-0.5"><Beer size={8} />{pedidosPorMesa[m.id]}</span>
                ) : null}
              </button>
            )
          })}
          {mesasPlanta.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center"><p className="text-sm text-[#6B6B85]">Sin mesas en esta planta.</p></div>
          )}
        </div>

        {/* Detalle */}
        <div className="glass rounded-2xl p-4 h-fit">
          {seleccionada ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-white">{seleccionada.codigo}</p>
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: ESTADO_INFO[estadoDeMesa(seleccionada.id)].color, background: ESTADO_INFO[estadoDeMesa(seleccionada.id)].bg }}>
                  {ESTADO_INFO[estadoDeMesa(seleccionada.id)].label}
                </span>
              </div>
              <p className="text-xs text-[#8B8BA8] flex items-center gap-1.5"><Users size={12} /> {seleccionada.capacidad} personas{seleccionada.zona ? ` · ${seleccionada.zona}` : ''}</p>

              {pedidosPorMesa[seleccionada.id] ? (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#FF6B2C]/10 border border-[#FF6B2C]/30 text-sm text-[#FF6B2C]">
                  <Beer size={14} /> {pedidosPorMesa[seleccionada.id]} pedido(s) por servir
                </div>
              ) : null}

              {reservaSel ? (
                <div className="space-y-2 pt-1 border-t border-white/8">
                  <p className="text-sm font-semibold text-white">{reservaSel.nombre_contacto}</p>
                  <p className="text-xs text-[#B8B8CC]">{reservaSel.personas} personas{reservaSel.telefono ? ` · ${reservaSel.telefono}` : ''}</p>
                  {reservaSel.notas && <p className="text-xs text-[#8B8BA8] italic">“{reservaSel.notas}”</p>}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {reservaSel.estado === 'solicitada' && (
                      <>
                        <Button size="sm" onClick={() => cambiarEstadoReserva(reservaSel, 'confirmada')}><Check size={14} /> Confirmar</Button>
                        <Button size="sm" variant="secondary" onClick={() => cambiarEstadoReserva(reservaSel, 'rechazada')}><X size={14} /> Rechazar</Button>
                      </>
                    )}
                    {reservaSel.estado === 'confirmada' && (
                      <Button size="sm" onClick={() => cambiarEstadoReserva(reservaSel, 'sentada')}><LogIn size={14} /> Sentar</Button>
                    )}
                    {reservaSel.estado === 'sentada' && (
                      <span className="text-xs text-[#27AE60] flex items-center gap-1"><Check size={13} /> Cliente sentado</span>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B6B85] pt-1 border-t border-white/8">Sin reserva esta noche.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-[#6B6B85]">Toca una mesa para ver su reserva y pedidos.</p>
          )}
        </div>
      </div>
    </div>
  )
}
