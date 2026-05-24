'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Concurso, ParticipacionConcurso } from '@/types'
import { formatearFecha, formatearHora } from '@/lib/utils'
import { Trophy, Plus, X, Users, Crown, Eye, Check, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConcursoConParticipaciones = Concurso & { participaciones?: ParticipacionConcurso[] }

const ESTADO_COLORS: Record<string, string> = {
  programado: 'text-blue-400 bg-blue-400/10 border-blue-400/30',
  activo: 'text-green-400 bg-green-400/10 border-green-400/30',
  cerrado: 'text-orange-400 bg-orange-400/10 border-orange-400/30',
  finalizado: 'text-[#6B6B85] bg-white/6 border-white/10',
  cancelado: 'text-red-400 bg-red-400/10 border-red-400/30',
}

export default function ConcursosPage() {
  const { local } = useLocalPanelStore()
  const toast = useToast()
  const [concursos, setConcursos] = useState<ConcursoConParticipaciones[]>([])
  const [loading, setLoading] = useState(true)
  const [showCrear, setShowCrear] = useState(false)
  const [viendo, setViendo] = useState<ConcursoConParticipaciones | null>(null)

  useEffect(() => { if (local) cargar() }, [local])

  async function cargar() {
    const { data } = await supabase
      .from('concursos')
      .select('*, participaciones_concurso(id, usuario_id, contenido_url, num_votos, estado, created_at, usuarios(nombre))')
      .eq('local_id', local!.id)
      .order('created_at', { ascending: false })
    if (data) setConcursos(data.map(c => ({ ...c, participaciones: c.participaciones_concurso })))
    setLoading(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    await supabase.from('concursos').update({ estado }).eq('id', id)
    toast.success('Estado actualizado')
    cargar()
  }

  async function declararGanador(concursoId: string, participacionId: string) {
    await supabase.from('concursos').update({
      ganador_participacion_id: participacionId,
      estado: 'finalizado',
    }).eq('id', concursoId)
    toast.success('¡Ganador declarado!')
    cargar()
    setViendo(null)
  }

  async function aprobarParticipacion(id: string) {
    await supabase.from('participaciones_concurso').update({ estado: 'aprobada' }).eq('id', id)
    toast.success('Participación aprobada')
    if (viendo) {
      const actualizado = { ...viendo, participaciones: viendo.participaciones?.map(p => p.id === id ? { ...p, estado: 'aprobada' as const } : p) }
      setViendo(actualizado)
    }
  }

  async function rechazarParticipacion(id: string) {
    await supabase.from('participaciones_concurso').update({ estado: 'rechazada' }).eq('id', id)
    toast.info('Participación rechazada')
    if (viendo) {
      const actualizado = { ...viendo, participaciones: viendo.participaciones?.map(p => p.id === id ? { ...p, estado: 'rechazada' as const } : p) }
      setViendo(actualizado)
    }
  }

  if (!local) return null

  return (
    <div className="p-4 md:p-6 space-y-6 pb-20 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Concursos</h1>
          <p className="text-[#6B6B85] text-sm">Gestiona los concursos de tu local</p>
        </div>
        <Button size="sm" onClick={() => setShowCrear(true)}>
          <Plus size={16} /> Nuevo concurso
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1,2].map(i => <div key={i} className="h-28 bg-white/6 rounded-2xl animate-pulse" />)}
        </div>
      ) : concursos.length === 0 ? (
        <div className="flex flex-col items-center py-20 gap-4">
          <Trophy size={40} className="text-[#6B6B85]" />
          <p className="text-[#6B6B85] text-center">No hay concursos todavía.<br/>Crea el primero para activar el módulo.</p>
          <Button size="sm" onClick={() => setShowCrear(true)}><Plus size={14} /> Crear concurso</Button>
        </div>
      ) : (
        <div className="space-y-3">
          {concursos.map(c => (
            <div key={c.id} className="glass rounded-2xl p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white truncate">{c.premio}</p>
                  <p className="text-sm text-[#A0A0B8] mt-0.5 line-clamp-2">{c.descripcion}</p>
                </div>
                <span className={cn('shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full border', ESTADO_COLORS[c.estado])}>
                  {c.estado}
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs text-[#6B6B85]">
                <span>{formatearFecha(c.hora_apertura)} {formatearHora(c.hora_apertura)} → {formatearHora(c.hora_cierre)}</span>
                <span className="flex items-center gap-1"><Users size={11} /> {c.participaciones?.length || 0} participantes</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {c.estado === 'programado' && (
                  <Button size="sm" variant="secondary" onClick={() => cambiarEstado(c.id, 'activo')}>
                    Activar
                  </Button>
                )}
                {c.estado === 'activo' && (
                  <Button size="sm" variant="secondary" onClick={() => cambiarEstado(c.id, 'cerrado')}>
                    Cerrar
                  </Button>
                )}
                {(c.estado === 'cerrado' || c.estado === 'activo') && (
                  <Button size="sm" variant="secondary" onClick={() => setViendo(c)}>
                    <Eye size={13} /> Ver participaciones
                  </Button>
                )}
                {c.estado !== 'cancelado' && c.estado !== 'finalizado' && (
                  <button
                    onClick={() => cambiarEstado(c.id, 'cancelado')}
                    className="text-xs text-red-400 hover:text-red-300 px-2"
                  >
                    Cancelar
                  </button>
                )}
                {c.ganador_participacion_id && (
                  <span className="flex items-center gap-1 text-xs text-yellow-400">
                    <Crown size={12} /> Ganador declarado
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCrear && (
        <CrearConcursoModal
          localId={local.id}
          onClose={() => setShowCrear(false)}
          onCreado={() => { setShowCrear(false); cargar() }}
        />
      )}

      {viendo && (
        <ParticipacionesModal
          concurso={viendo}
          onClose={() => setViendo(null)}
          onAprobar={aprobarParticipacion}
          onRechazar={rechazarParticipacion}
          onGanador={(pId) => declararGanador(viendo.id, pId)}
        />
      )}
    </div>
  )
}

function CrearConcursoModal({ localId, onClose, onCreado }: {
  localId: string; onClose: () => void; onCreado: () => void
}) {
  const toast = useToast()
  const [form, setForm] = useState({
    descripcion: '',
    premio: '',
    tipo_contenido: 'foto' as 'foto' | 'video' | 'ambos',
    hora_apertura: '',
    hora_cierre: '',
  })
  const [loading, setLoading] = useState(false)

  const guardar = async () => {
    if (!form.descripcion.trim() || !form.premio.trim() || !form.hora_apertura || !form.hora_cierre) {
      toast.error('Completa todos los campos obligatorios'); return
    }
    setLoading(true)
    const { error } = await supabase.from('concursos').insert({
      local_id: localId,
      descripcion: form.descripcion.trim(),
      premio: form.premio.trim(),
      tipo_contenido: form.tipo_contenido,
      fuente_contenido: 'directa',
      hora_apertura: form.hora_apertura,
      hora_cierre: form.hora_cierre,
      estado: 'programado',
    })
    if (error) toast.error('Error al crear el concurso')
    else { toast.success('Concurso creado'); onCreado() }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-white/6 rounded-t-3xl max-h-[90vh] overflow-y-auto">
        <div className="p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Nuevo concurso</h2>
            <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
          </div>

          <div className="space-y-4">
            <Field label="Descripción *">
              <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))}
                placeholder="Ej: Sube la mejor foto del ambiente y gana..." rows={3} maxLength={300}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 resize-none placeholder:text-[#6B6B85]" />
            </Field>

            <Field label="Premio *">
              <input value={form.premio} onChange={e => setForm(f => ({ ...f, premio: e.target.value }))}
                placeholder="Ej: Botella de champán para el ganador"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 placeholder:text-[#6B6B85]" />
            </Field>

            <Field label="Tipo de contenido">
              <div className="flex gap-2">
                {(['foto', 'video', 'ambos'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo_contenido: t }))}
                    className={cn('flex-1 py-2 rounded-xl text-sm font-medium border transition-colors',
                      form.tipo_contenido === t ? 'bg-[#E94560] border-[#E94560] text-white' : 'border-white/10 text-[#A0A0B8]')}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Apertura *">
                <input type="datetime-local" value={form.hora_apertura}
                  onChange={e => setForm(f => ({ ...f, hora_apertura: e.target.value }))}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50" />
              </Field>
              <Field label="Cierre *">
                <input type="datetime-local" value={form.hora_cierre}
                  onChange={e => setForm(f => ({ ...f, hora_cierre: e.target.value }))}
                  className="w-full px-3 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50" />
              </Field>
            </div>
          </div>

          <Button fullWidth loading={loading} onClick={guardar}>
            <Trophy size={16} /> Crear concurso
          </Button>
        </div>
      </div>
    </div>
  )
}

function ParticipacionesModal({ concurso, onClose, onAprobar, onRechazar, onGanador }: {
  concurso: ConcursoConParticipaciones
  onClose: () => void
  onAprobar: (id: string) => void
  onRechazar: (id: string) => void
  onGanador: (id: string) => void
}) {
  const aprobadas = concurso.participaciones?.filter(p => p.estado === 'aprobada') || []
  const pendientes = concurso.participaciones?.filter(p => p.estado === 'pendiente_moderacion') || []

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end">
      <div className="w-full bg-white/6 rounded-t-3xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">Participaciones ({concurso.participaciones?.length || 0})</h2>
          <button onClick={onClose} className="p-2 text-[#6B6B85] hover:text-white"><X size={20} /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {pendientes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Pendientes de moderación ({pendientes.length})</p>
              {pendientes.map(p => (
                <ParticipacionRow key={p.id} p={p} concurso={concurso}
                  onAprobar={() => onAprobar(p.id)} onRechazar={() => onRechazar(p.id)} onGanador={() => onGanador(p.id)} />
              ))}
            </div>
          )}
          {aprobadas.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-green-400 uppercase tracking-wider">Aprobadas ({aprobadas.length})</p>
              {aprobadas.sort((a, b) => b.num_votos - a.num_votos).map(p => (
                <ParticipacionRow key={p.id} p={p} concurso={concurso}
                  onAprobar={() => {}} onRechazar={() => onRechazar(p.id)} onGanador={() => onGanador(p.id)} />
              ))}
            </div>
          )}
          {(concurso.participaciones?.length || 0) === 0 && (
            <p className="text-center text-[#6B6B85] py-10">Aún no hay participaciones</p>
          )}
        </div>
      </div>
    </div>
  )
}

function ParticipacionRow({ p, concurso, onAprobar, onRechazar, onGanador }: {
  p: ParticipacionConcurso; concurso: ConcursoConParticipaciones
  onAprobar: () => void; onRechazar: () => void; onGanador: () => void
}) {
  const esGanador = concurso.ganador_participacion_id === p.id
  return (
    <div className={cn('p-3 bg-white/5 rounded-xl border', esGanador ? 'border-yellow-400/50' : 'border-white/10')}>
      <div className="flex items-start gap-3">
        {p.contenido_url && (
          <img src={p.contenido_url} alt="" className="w-16 h-16 rounded-lg object-cover bg-[#2A2A3E] shrink-0"
            onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-white truncate">
              {(p.usuario as { nombre?: string })?.nombre || 'Usuario'}
            </p>
            {esGanador && <Crown size={14} className="text-yellow-400 shrink-0" />}
          </div>
          <p className="text-xs text-[#6B6B85]">{p.num_votos} votos</p>
        </div>
      </div>
      {p.estado === 'pendiente_moderacion' && (
        <div className="flex gap-2 mt-2">
          <button onClick={onAprobar} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-green-500/10 border border-green-500/30 rounded-lg text-xs text-green-400 hover:bg-green-500/20">
            <Check size={12} /> Aprobar
          </button>
          <button onClick={onRechazar} className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400 hover:bg-red-500/20">
            <X size={12} /> Rechazar
          </button>
        </div>
      )}
      {p.estado === 'aprobada' && !esGanador && concurso.estado === 'cerrado' && (
        <button onClick={onGanador}
          className="mt-2 w-full flex items-center justify-center gap-1 py-1.5 bg-yellow-400/10 border border-yellow-400/30 rounded-lg text-xs text-yellow-400 hover:bg-yellow-400/20">
          <Crown size={12} /> Declarar ganador
        </button>
      )}
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
