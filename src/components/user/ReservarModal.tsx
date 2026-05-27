'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import { Planta, Mesa, LocalConAforo } from '@/types'
import { X, Users, Sofa } from 'lucide-react'

interface Props {
  local: LocalConAforo
  usuario: { id: string; nombre?: string | null }
  onClose: () => void
  onReservado: () => void
}

function hoyLocal(): string {
  return new Date().toLocaleDateString('sv-SE')
}

export function ReservarModal({ local, usuario, onClose, onReservado }: Props) {
  const toast = useToast()
  const [plantas, setPlantas] = useState<Planta[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [plantaId, setPlantaId] = useState<string | null>(null)
  const [mesaId, setMesaId] = useState<string | null>(null)
  const [personas, setPersonas] = useState(4)
  const [nombre, setNombre] = useState(usuario.nombre ?? '')
  const [telefono, setTelefono] = useState('')
  const [notas, setNotas] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    const cargar = async () => {
      const [{ data: pl }, { data: ms }] = await Promise.all([
        supabase.from('plantas').select('*').eq('local_id', local.id).order('orden'),
        supabase.from('mesas').select('*').eq('local_id', local.id).eq('reservable', true).eq('activa', true),
      ])
      setPlantas(pl ?? [])
      setMesas((ms ?? []) as Mesa[])
      setPlantaId(pl?.[0]?.id ?? null)
      setLoading(false)
    }
    cargar()
  }, [local.id])

  const mesasPlanta = mesas.filter(m => m.planta_id === plantaId)
  const mesaSel = mesas.find(m => m.id === mesaId) ?? null

  const enviar = async () => {
    if (!mesaId) { toast.error('Elige una mesa o reservado'); return }
    if (nombre.trim().length < 2) { toast.error('Indica un nombre de contacto'); return }
    setEnviando(true)
    const { error } = await supabase.from('reservas').insert({
      local_id: local.id,
      mesa_id: mesaId,
      usuario_id: usuario.id,
      nombre_contacto: nombre.trim(),
      telefono: telefono.trim() || null,
      personas,
      fecha_noche: hoyLocal(),
      estado: 'solicitada',
      modo: local.reservas_modo ?? 'solicitud',
    })
    setEnviando(false)
    if (error) { toast.error('No se pudo enviar la solicitud'); return }
    onReservado()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-[#0E0E1A] rounded-t-3xl max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#0E0E1A] flex items-center justify-between px-6 pt-5 pb-3 z-10">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2"><Sofa size={18} className="text-[#E94560]" /> Reservar</h2>
            <p className="text-xs text-[#8B8BA8] mt-0.5">{local.nombre} · esta noche</p>
          </div>
          <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
        </div>

        <div className="px-6 pb-6 space-y-4">
          {loading ? (
            <p className="text-sm text-[#6B6B85] py-10 text-center">Cargando plano…</p>
          ) : mesas.length === 0 ? (
            <p className="text-sm text-[#6B6B85] py-10 text-center">Este local aún no tiene mesas disponibles para reservar.</p>
          ) : (
            <>
              {/* Plantas */}
              {plantas.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  {plantas.map(p => (
                    <button key={p.id} onClick={() => { setPlantaId(p.id); setMesaId(null) }}
                      className={cn('px-3 py-1.5 rounded-lg text-sm border',
                        p.id === plantaId ? 'border-[#E94560]/40 bg-[#E94560]/10 text-[#E94560]' : 'border-white/10 text-[#B8B8CC]')}>
                      {p.nombre}
                    </button>
                  ))}
                </div>
              )}

              {/* Mini-mapa */}
              <div
                className="relative w-full aspect-[4/3] rounded-2xl border border-white/10 overflow-hidden"
                style={{
                  background: '#0C0C15',
                  backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                  backgroundSize: '6.25% 8.33%',
                }}
              >
                {mesasPlanta.map(m => {
                  const sel = m.id === mesaId
                  return (
                    <button key={m.id} onClick={() => setMesaId(m.id)}
                      className={cn('absolute flex flex-col items-center justify-center transition-transform active:scale-95',
                        m.forma === 'redonda' ? 'rounded-full' : m.forma === 'rect' ? 'rounded-lg' : 'rounded-md')}
                      style={{
                        left: `${m.pos_x * 100}%`, top: `${m.pos_y * 100}%`,
                        width: `${m.ancho * 100}%`, height: `${m.alto * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        background: sel ? 'rgba(233,69,96,0.30)' : 'rgba(255,255,255,0.06)',
                        border: `2px solid ${sel ? '#E94560' : 'rgba(255,255,255,0.25)'}`,
                        boxShadow: sel ? '0 0 14px rgba(233,69,96,0.6)' : 'none',
                      }}
                    >
                      <span className="text-[10px] font-bold text-white leading-none">{m.codigo}</span>
                      <span className="text-[8px] text-white/70 leading-none mt-0.5">{m.capacidad}p</span>
                    </button>
                  )
                })}
                {mesasPlanta.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center"><p className="text-xs text-[#6B6B85]">Sin mesas en esta planta.</p></div>
                )}
              </div>

              {mesaSel && (
                <p className="text-sm text-white flex items-center gap-2">
                  <Sofa size={14} className="text-[#E94560]" /> {mesaSel.codigo} · hasta {mesaSel.capacidad} personas
                </p>
              )}

              {/* Datos */}
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Personas</span>
                  <div className="mt-1 flex items-center gap-2">
                    <Users size={15} className="text-[#6B6B85]" />
                    <input type="number" min={1} value={personas}
                      onChange={e => setPersonas(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50" />
                  </div>
                </label>
                <label className="block">
                  <span className="text-xs text-[#8B8BA8]">Teléfono (opcional)</span>
                  <input value={telefono} onChange={e => setTelefono(e.target.value)} inputMode="tel"
                    className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50" />
                </label>
              </div>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Nombre de contacto</span>
                <input value={nombre} onChange={e => setNombre(e.target.value)}
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50" />
              </label>

              <label className="block">
                <span className="text-xs text-[#8B8BA8]">Notas (opcional)</span>
                <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} maxLength={300}
                  placeholder="Ej: cumpleaños, preferencia de zona…"
                  className="mt-1 w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]" />
              </label>

              <p className="text-xs text-[#6B6B85]">Tu solicitud quedará pendiente hasta que el local la confirme.</p>
              <Button fullWidth loading={enviando} onClick={enviar} disabled={!mesaId}>
                <Sofa size={15} /> Enviar solicitud
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
