'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Concurso, ParticipacionConcurso } from '@/types'
import { ArrowLeft, Trophy, Heart, Upload, Users, Crown } from 'lucide-react'
import { cn } from '@/lib/utils'

type ConcursoConParticipaciones = Concurso & {
  participaciones_concurso: (ParticipacionConcurso & { usuarios?: { nombre: string } })[]
  locales?: { nombre: string }
}

export default function ConcursoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()
  const [concurso, setConcurso] = useState<ConcursoConParticipaciones | null>(null)
  const [loading, setLoading] = useState(true)
  const [miParticipacion, setMiParticipacion] = useState<ParticipacionConcurso | null>(null)
  const [urlContenido, setUrlContenido] = useState('')
  const [participando, setParticipando] = useState(false)
  const [votando, setVotando] = useState<string | null>(null)
  const [misVotos, setMisVotos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario])

  async function cargar() {
    const { data } = await supabase
      .from('concursos')
      .select('*, participaciones_concurso(*, usuarios(nombre)), locales(nombre)')
      .eq('id', id)
      .single()

    if (!data) { router.push('/explorar'); return }
    setConcurso(data)

    const miP = data.participaciones_concurso.find((p: ParticipacionConcurso) => p.usuario_id === usuario?.id)
    if (miP) setMiParticipacion(miP)

    // cargar mis votos
    if (usuario) {
      const { data: votos } = await supabase
        .from('votos_concurso')
        .select('participacion_id')
        .eq('usuario_id', usuario.id)
        .eq('concurso_id', id)
      if (votos) setMisVotos(new Set(votos.map((v: { participacion_id: string }) => v.participacion_id)))
    }

    setLoading(false)
  }

  async function participar() {
    if (!usuario || !concurso) return
    setParticipando(true)
    const { data, error } = await supabase.from('participaciones_concurso').insert({
      concurso_id: id,
      usuario_id: usuario.id,
      contenido_url: urlContenido.trim() || null,
      estado: 'pendiente_moderacion',
    }).select('*').single()

    if (error) {
      if (error.code === '23505') toast.error('Ya has participado en este concurso')
      else toast.error('Error al participar')
    } else {
      setMiParticipacion(data)
      toast.success('¡Participación enviada! El equipo del local la revisará pronto.')
      cargar()
    }
    setParticipando(false)
  }

  async function votar(participacionId: string) {
    if (!usuario) return
    if (misVotos.has(participacionId)) {
      // quitar voto
      await supabase.from('votos_concurso').delete()
        .match({ usuario_id: usuario.id, participacion_id: participacionId })
      await supabase.from('participaciones_concurso')
        .update({ num_votos: (concurso!.participaciones_concurso.find(p => p.id === participacionId)?.num_votos || 1) - 1 })
        .eq('id', participacionId)
      setMisVotos(v => { const n = new Set(v); n.delete(participacionId); return n })
    } else {
      setVotando(participacionId)
      const { error } = await supabase.from('votos_concurso').insert({
        participacion_id: participacionId,
        usuario_id: usuario.id,
        concurso_id: id,
      })
      if (!error) {
        await supabase.from('participaciones_concurso')
          .update({ num_votos: (concurso!.participaciones_concurso.find(p => p.id === participacionId)?.num_votos || 0) + 1 })
          .eq('id', participacionId)
        setMisVotos(v => new Set([...v, participacionId]))
        toast.success('Voto registrado')
        cargar()
      }
      setVotando(null)
    }
  }

  if (loading || !concurso) return (
    <div className="min-h-screen bg-[#0D0D1A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#E94560] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const aprobadas = concurso.participaciones_concurso
    .filter(p => p.estado === 'aprobada')
    .sort((a, b) => b.num_votos - a.num_votos)

  return (
    <div className="min-h-screen bg-[#0D0D1A] pb-24">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">Concurso</h1>
          <p className="text-xs text-[#505065]">{concurso.locales?.nombre}</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Info concurso */}
        <div className="bg-[#4F8EF7]/10 border border-[#4F8EF7]/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Trophy size={18} className="text-[#4F8EF7]" />
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full',
              concurso.estado === 'activo' ? 'bg-green-400/10 border border-green-400/30 text-green-400' : 'bg-[#2A2A3E] text-[#505065]')}>
              {concurso.estado}
            </span>
          </div>
          <p className="text-[#A0A0B8] text-sm">{concurso.descripcion}</p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-[#4F8EF7] font-semibold">🎁 Premio:</span>
            <span className="text-white">{concurso.premio}</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-[#505065]">
            <Users size={12} />
            <span>{concurso.participaciones_concurso.length} participantes</span>
          </div>
        </div>

        {/* Ganador */}
        {concurso.ganador_participacion_id && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
            <Crown size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="font-bold text-white text-sm">¡Ganador declarado!</p>
              <p className="text-xs text-yellow-400">El concurso ha finalizado</p>
            </div>
          </div>
        )}

        {/* Participar */}
        {concurso.estado === 'activo' && !miParticipacion && (
          <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-white text-sm">Tu participación</p>
            {(concurso.tipo_contenido === 'foto' || concurso.tipo_contenido === 'ambos') && (
              <input
                value={urlContenido}
                onChange={e => setUrlContenido(e.target.value)}
                placeholder="URL de tu foto (Imgur, Google Photos...)"
                className="w-full px-4 py-3 bg-[#0D0D1A] border border-[#2A2A3E] rounded-xl text-white text-sm outline-none focus:border-[#E94560]/50 placeholder:text-[#505065]"
              />
            )}
            <Button fullWidth loading={participando} onClick={participar}>
              <Upload size={15} /> Enviar participación
            </Button>
          </div>
        )}

        {miParticipacion && (
          <div className={cn('flex items-center gap-3 p-3 rounded-2xl border',
            miParticipacion.estado === 'aprobada' ? 'bg-green-400/10 border-green-400/30' :
            miParticipacion.estado === 'rechazada' ? 'bg-red-400/10 border-red-400/30' :
            'bg-[#F39C12]/10 border-[#F39C12]/30')}>
            <Trophy size={18} className={
              miParticipacion.estado === 'aprobada' ? 'text-green-400' :
              miParticipacion.estado === 'rechazada' ? 'text-red-400' : 'text-[#F39C12]'} />
            <div>
              <p className="text-sm font-semibold text-white">Tu participación</p>
              <p className="text-xs text-[#A0A0B8]">
                {miParticipacion.estado === 'aprobada' ? `Aprobada · ${miParticipacion.num_votos} votos` :
                 miParticipacion.estado === 'rechazada' ? 'Rechazada por el local' :
                 'Pendiente de moderación'}
              </p>
            </div>
          </div>
        )}

        {/* Galería de participaciones */}
        {aprobadas.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Participaciones aprobadas ({aprobadas.length})</p>
            {aprobadas.map((p, i) => (
              <div key={p.id} className={cn('bg-[#1A1A2E] rounded-2xl border overflow-hidden',
                concurso.ganador_participacion_id === p.id ? 'border-yellow-400/50' : 'border-[#2A2A3E]')}>
                {concurso.ganador_participacion_id === p.id && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10">
                    <Crown size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">GANADOR</span>
                  </div>
                )}
                {p.contenido_url && (
                  <img src={p.contenido_url} alt="" className="w-full max-h-64 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#2A2A3E] flex items-center justify-center text-xs font-bold text-white">
                      {i + 1}
                    </div>
                    <p className="text-sm font-medium text-white">{p.usuarios?.nombre || 'Usuario'}</p>
                  </div>
                  <button
                    onClick={() => votar(p.id)}
                    disabled={votando === p.id || p.usuario_id === usuario?.id}
                    className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                      misVotos.has(p.id) ? 'bg-[#E94560] text-white' : 'bg-[#2A2A3E] text-[#A0A0B8] hover:text-white')}
                  >
                    <Heart size={14} className={misVotos.has(p.id) ? 'fill-current' : ''} />
                    {p.num_votos}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
