'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Reto } from '@/types'
import { formatearHora } from '@/lib/utils'
import { Target, Plus, X, Crown, Eye, Check, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, SkeletonCard } from '@/components/local-panel/ui'

interface ParticipacionReto {
  id: string
  reto_id: string
  usuario_id: string
  contenido_url?: string
  contenido_texto?: string
  num_votos: number
  estado: string
  created_at: string
  usuarios?: { nombre: string }
}

type RetoConParticipaciones = Reto & { participaciones?: ParticipacionReto[] }

const ESTADO_COLORS: Record<string, string> = {
  activo: 'text-green-400 bg-green-400/10 border-green-400/30',
  cerrado: 'text-[#6B6B85] bg-white/6 border-white/10',
  cancelado: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export default function RetosPage() {
  const { local } = useLocalPanelStore()
  const toast = useToast()
  const [retos, setRetos] = useState<RetoConParticipaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [showCrear, setShowCrear] = useState(false)
  const [viendo, setViendo] = useState<RetoConParticipaciones | null>(null)

  useEffect(() => { if (local) cargar() }, [local])

  async function cargar() {
    const { data } = await supabase
      .from('retos')
      .select('*, participaciones_reto(id, usuario_id, contenido_texto, contenido_url, num_votos, estado, created_at, usuarios(nombre))')
      .eq('local_id', local!.id)
      .order('created_at', { ascending: false })
    if (data) setRetos(data.map(r => ({ ...r, participaciones: r.participaciones_reto })))
    setLoading(false)
  }

  async function cerrarReto(id: string) {
    await supabase.from('retos').update({ estado: 'cerrado' }).eq('id', id)
    toast.success('Reto cerrado')
    cargar()
  }

  async function declararGanador(retoId: string, participacionId: string) {
    await supabase.from('retos').update({ ganador_participacion_id: participacionId, estado: 'cerrado' }).eq('id', retoId)
    toast.success('¡Ganador declarado!')
    cargar()
    setViendo(null)
  }

  async function aprobarParticipacion(id: string) {
    await supabase.from('participaciones_reto').update({ estado: 'aprobada' }).eq('id', id)
    if (viendo) {
      setViendo({ ...viendo, participaciones: viendo.participaciones?.map(p => p.id === id ? { ...p, estado: 'aprobada' } : p) })
    }
  }

  if (!local) return null

  return (
    <div className="relative p-4 md:p-8 space-y-6 pb-20 md:pb-8 overflow-hidden">
      <PageHeader
        eyebrow="Crecimiento" titulo="Retos" subtitulo="Desafíos para dinamizar la noche" acento="violet"
        acciones={<Button size="sm" onClick={() => setShowCrear(true)}><Plus size={16} /> Nuevo reto</Button>}
      />

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <SkeletonCard key={i} className="h-24" />)}
        </div>
      ) : retos.length === 0 ? (
        <EmptyState icon={Target} acento="violet" titulo="No hay retos activos"
          descripcion="Crea uno para dinamizar la noche y enganchar a tus clientes."
          accion={<Button size="sm" onClick={() => setShowCrear(true)}><Plus size={14} /> Crear reto</Button>} />
      ) : (
        <div className="space-y-3">
          {retos.map(r => (
            <div key={r.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-white">{r.nombre}</p>
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border', ESTADO_COLORS[r.estado])}>
                      {r.estado}
                    </span>
                    {r.ganador_participacion_id && <Crown size={14} className="text-yellow-400" />}
                  </div>
                  <p className="text-sm text-[#A0A0B8] mt-1 line-clamp-2">{r.descripcion}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#6B6B85]">
                <span className="capitalize">{r.tipo_contenido}</span>
                {r.premio && <span>🎁 {r.premio}</span>}
                {r.hora_cierre && <span>Cierra: {formatearHora(r.hora_cierre)}</span>}
                <span className="flex items-center gap-1"><Users size={11} /> {r.participaciones?.length || 0}</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {r.estado === 'activo' && (
                  <>
                    <Button size="sm" variant="secondary" onClick={() => setViendo(r)}>
                      <Eye size={13} /> Ver participaciones
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => cerrarReto(r.id)}>
                      Cerrar reto
                    </Button>
                  </>
                )}
                {r.estado === 'cerrado' && (r.participaciones?.length || 0) > 0 && !r.ganador_participacion_id && (
                  <Button size="sm" variant="secondary" onClick={() => setViendo(r)}>
                    <Crown size={13} /> Declarar ganador
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCrear && (
        <CrearRetoModal
          localId={local.id}
          onClose={() => setShowCrear(false)}
          onCreado={() => { setShowCrear(false); cargar() }}
        />
      )}

      {viendo && (
        <VerParticipacionesModal
          reto={viendo}
          onClose={() => setViendo(null)}
          onAprobar={aprobarParticipacion}
          onGanador={(pId) => declararGanador(viendo.id, pId)}
        />
      )}
    </div>
  )
}

function CrearRetoModal({ localId, onClose, onCreado }: {
  localId: string; onClose: () => void; onCreado: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    nombre: '',
    descripcion: '',
    tipo_contenido: 'foto' as 'foto' | 'video' | 'texto',
    metodo_ganador: 'votos' as 'votos' | 'manual',
    premio: '',
    hora_cierre: '',
  })
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    if (!form.nombre.trim() || !form.descripcion.trim()) {
      toast.error('Nombre y descripción son obligatorios'); return
    }
    setLoading(true)
    const { error } = await supabase.from('retos').insert({
      local_id: localId,
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim(),
      tipo_contenido: form.tipo_contenido,
      metodo_ganador: form.metodo_ganador,
      premio: form.premio.trim() || null,
      hora_cierre: form.hora_cierre || null,
      estado: 'activo',
    })
    if (error) toast.error('Error al crear el reto')
    else { toast.success('Reto creado'); onCreado() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-white/6 rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo reto</h2>
            <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
          </div>

          <div className="space-y-4">
            <Field label="Nombre del reto *">
              <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                placeholder="Ej: El selfie más épico de la noche"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 placeholder:text-[#6B6B85]" />
            </Field>

            <Field label="Descripción *">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Explica las reglas del reto..." rows={3} maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]" />
            </Field>

            <Field label="Tipo de participación">
              <div className="flex gap-2">
                {(['foto', 'video', 'texto'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo_contenido: t }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                      form.tipo_contenido === t ? 'bg-[#E94560] border-[#E94560] text-white' : 'border-white/10 text-[#A0A0B8]')}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Ganador elegido por">
              <div className="flex gap-2">
                {(['votos', 'manual'] as const).map(m => (
                  <button key={m} onClick={() => setForm(f => ({ ...f, metodo_ganador: m }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                      form.metodo_ganador === m ? 'bg-[#E94560] border-[#E94560] text-white' : 'border-white/10 text-[#A0A0B8]')}>
                    {m === 'votos' ? 'Votos' : 'Manual'}
                  </button>
                ))}
              </div>
            </Field>

            <Field label="Premio (opcional)">
              <input value={form.premio} onChange={e => setForm(f => ({ ...f, premio: e.target.value }))}
                placeholder="Ej: Consumición gratis para el ganador"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 placeholder:text-[#6B6B85]" />
            </Field>

            <Field label="Hora de cierre (opcional)">
              <input type="datetime-local" value={form.hora_cierre}
                onChange={e => setForm(f => ({ ...f, hora_cierre: e.target.value }))}
                className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50" />
            </Field>
          </div>

          <Button fullWidth loading={loading} onClick={guardar}>
            <Target size={16} /> Crear reto
          </Button>
        </div>
      </div>
    </div>
  )
}

function VerParticipacionesModal({ reto, onClose, onAprobar, onGanador }: {
  reto: RetoConParticipaciones
  onClose: () => void
  onAprobar: (id: string) => void
  onGanador: (id: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-white/6 rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{reto.nombre} — Participaciones</h2>
          <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {(reto.participaciones?.length || 0) === 0 ? (
            <p className="text-center text-[#6B6B85] py-10">Sin participaciones todavía</p>
          ) : (
            reto.participaciones!.sort((a, b) => b.num_votos - a.num_votos).map(p => (
              <div key={p.id} className={cn('p-3 bg-white/5 rounded-xl border',
                reto.ganador_participacion_id === p.id ? 'border-yellow-400/50' : 'border-white/10')}>
                <div className="flex items-start gap-3">
                  {p.contenido_url && (
                    <img src={p.contenido_url} alt="" className="w-14 h-14 rounded-lg object-cover bg-[#2A2A3E] shrink-0"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-white">{p.usuarios?.nombre || 'Usuario'}</p>
                      {reto.ganador_participacion_id === p.id && <Crown size={14} className="text-yellow-400" />}
                    </div>
                    {p.contenido_texto && <p className="text-xs text-[#A0A0B8] mt-1">{p.contenido_texto}</p>}
                    <p className="text-xs text-[#6B6B85] mt-1">{p.num_votos} votos</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-2">
                  {p.estado === 'pendiente_moderacion' && (
                    <button onClick={() => onAprobar(p.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400">
                      <Check size={12} /> Aprobar
                    </button>
                  )}
                  {p.estado === 'aprobada' && !reto.ganador_participacion_id && reto.estado !== 'activo' && (
                    <button onClick={() => onGanador(p.id)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-xs text-yellow-400">
                      <Crown size={12} /> Declarar ganador
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-[#A0A0B8]">{label}</label>
      {children}
    </div>
  )
}
