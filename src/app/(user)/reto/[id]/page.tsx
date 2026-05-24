'use client'
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { useToast } from '@/components/ui/Toast'
import { Button } from '@/components/ui/Button'
import { Reto } from '@/types'
import { ArrowLeft, Target, Heart, Crown, Upload, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ParticipacionReto {
  id: string; reto_id: string; usuario_id: string
  contenido_url?: string; contenido_texto?: string
  num_votos: number; estado: string
  usuarios?: { nombre: string }
}

type RetoConParticipaciones = Reto & {
  participaciones_reto: ParticipacionReto[]
  locales?: { nombre: string }
}

export default function RetoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()
  const [reto, setReto] = useState<RetoConParticipaciones | null>(null)
  const [loading, setLoading] = useState(true)
  const [miParticipacion, setMiParticipacion] = useState<ParticipacionReto | null>(null)
  const [form, setForm] = useState({ texto: '', url: '' })
  const [enviando, setEnviando] = useState(false)
  const [misVotos, setMisVotos] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!usuario) { router.push('/login'); return }
    cargar()
  }, [usuario])

  async function cargar() {
    const { data } = await supabase
      .from('retos')
      .select('*, participaciones_reto(*, usuarios(nombre)), locales(nombre)')
      .eq('id', id)
      .single()

    if (!data) { router.push('/explorar'); return }
    setReto(data)

    const miP = data.participaciones_reto.find((p: ParticipacionReto) => p.usuario_id === usuario?.id)
    if (miP) setMiParticipacion(miP)

    setLoading(false)
  }

  async function participar() {
    if (!usuario || !reto) return
    if (reto.tipo_contenido === 'texto' && !form.texto.trim()) {
      toast.error('Escribe tu respuesta'); return
    }
    // Filtro de palabras prohibidas para retos de texto (Doc6 §4.4)
    if (reto.tipo_contenido === 'texto' && form.texto.trim()) {
      const { contienePalabraProhibida } = await import('@/lib/utils')
      const palabra = contienePalabraProhibida(form.texto)
      if (palabra) {
        toast.error('Tu respuesta contiene lenguaje no permitido. Por favor, reformúlala.')
        return
      }
    }
    setEnviando(true)
    const { data, error } = await supabase.from('participaciones_reto').insert({
      reto_id: id,
      usuario_id: usuario.id,
      contenido_texto: form.texto.trim() || null,
      contenido_url: form.url.trim() || null,
      estado: 'pendiente_moderacion',
    }).select('*').single()

    if (error) toast.error('Error al enviar tu participación')
    else {
      setMiParticipacion(data)
      toast.success('¡Participación enviada! El local la revisará pronto.')
      cargar()
    }
    setEnviando(false)
  }

  async function votar(participacionId: string) {
    if (!usuario) return
    if (misVotos.has(participacionId)) return
    const { error } = await supabase.from('participaciones_reto')
      .update({ num_votos: (reto!.participaciones_reto.find(p => p.id === participacionId)?.num_votos || 0) + 1 })
      .eq('id', participacionId)
    if (!error) {
      setMisVotos(v => new Set([...v, participacionId]))
      toast.success('Voto registrado')
      cargar()
    }
  }

  if (loading || !reto) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-[#F39C12] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const aprobadas = reto.participaciones_reto
    .filter(p => p.estado === 'aprobada')
    .sort((a, b) => b.num_votos - a.num_votos)

  return (
    <div className="min-h-screen pb-24">
      <div className="px-4 py-3 flex items-center gap-3 safe-top">
        <button aria-label="Volver" onClick={() => router.back()} className="p-2 -ml-2 text-[#A0A0B8]">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">{reto.nombre}</h1>
          <p className="text-xs text-[#6B6B85]">{reto.locales?.nombre}</p>
        </div>
      </div>

      <div className="px-4 space-y-5">
        {/* Info reto */}
        <div className="bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-2xl p-4 space-y-2">
          <div className="flex items-center gap-2">
            <Target size={18} className="text-[#F39C12]" />
            <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full border',
              reto.estado === 'activo' ? 'bg-green-400/10 border-green-400/30 text-green-400' : 'bg-[#2A2A3E] border-white/10 text-[#6B6B85]')}>
              {reto.estado}
            </span>
          </div>
          <p className="text-[#A0A0B8] text-sm">{reto.descripcion}</p>
          {reto.premio && (
            <p className="text-sm"><span className="text-[#F39C12] font-semibold">🎁 Premio:</span> <span className="text-white">{reto.premio}</span></p>
          )}
          <div className="flex items-center gap-4 text-xs text-[#6B6B85]">
            <span className="flex items-center gap-1"><Users size={11} /> {reto.participaciones_reto.length} participantes</span>
            <span className="capitalize">Tipo: {reto.tipo_contenido}</span>
          </div>
        </div>

        {/* Ganador */}
        {reto.ganador_participacion_id && (
          <div className="bg-yellow-400/10 border border-yellow-400/30 rounded-2xl p-4 flex items-center gap-3">
            <Crown size={20} className="text-yellow-400" />
            <div>
              <p className="font-bold text-white text-sm">¡Ganador declarado!</p>
              <p className="text-xs text-yellow-400">El reto ha finalizado</p>
            </div>
          </div>
        )}

        {/* Formulario participación */}
        {reto.estado === 'activo' && !miParticipacion && (
          <div className="glass rounded-2xl p-4 space-y-3">
            <p className="font-semibold text-white text-sm">Tu participación</p>
            {reto.tipo_contenido === 'texto' && (
              <textarea
                value={form.texto}
                onChange={e => setForm(f => ({ ...f, texto: e.target.value }))}
                placeholder="Escribe tu respuesta aquí..."
                rows={4}
                maxLength={500}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#F39C12]/50 resize-none placeholder:text-[#6B6B85]"
              />
            )}
            {(reto.tipo_contenido === 'foto' || reto.tipo_contenido === 'video') && (
              <input
                value={form.url}
                onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
                placeholder={`URL de tu ${reto.tipo_contenido} (Imgur, Google Photos...)`}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm outline-none focus:border-[#F39C12]/50 placeholder:text-[#6B6B85]"
              />
            )}
            <Button fullWidth loading={enviando} onClick={participar}
              className="bg-[#F39C12] hover:bg-[#E67E22] text-white">
              <Upload size={15} /> Enviar participación
            </Button>
          </div>
        )}

        {miParticipacion && (
          <div className="flex items-center gap-3 p-3 bg-[#F39C12]/10 border border-[#F39C12]/30 rounded-2xl">
            <Target size={18} className="text-[#F39C12] shrink-0" />
            <div>
              <p className="text-sm font-semibold text-white">Ya participaste</p>
              <p className="text-xs text-[#A0A0B8]">
                {miParticipacion.estado === 'aprobada' ? `Aprobada · ${miParticipacion.num_votos} votos` :
                 miParticipacion.estado === 'rechazada' ? 'Rechazada' : 'Pendiente de revisión'}
              </p>
            </div>
          </div>
        )}

        {/* Participaciones aprobadas */}
        {aprobadas.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-white">Participaciones ({aprobadas.length})</p>
            {aprobadas.map((p, i) => (
              <div key={p.id} className={cn('bg-white/6 rounded-2xl border overflow-hidden',
                reto.ganador_participacion_id === p.id ? 'border-yellow-400/50' : 'border-white/10')}>
                {reto.ganador_participacion_id === p.id && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-yellow-400/10">
                    <Crown size={14} className="text-yellow-400" />
                    <span className="text-xs font-bold text-yellow-400">GANADOR</span>
                  </div>
                )}
                {p.contenido_url && (
                  <img src={p.contenido_url} alt="" className="w-full max-h-64 object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
                )}
                <div className="p-3">
                  {p.contenido_texto && (
                    <p className="text-sm text-[#A0A0B8] mb-2">{p.contenido_texto}</p>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-[#2A2A3E] flex items-center justify-center text-xs font-bold text-white">
                        {i + 1}
                      </div>
                      <p className="text-sm font-medium text-white">{p.usuarios?.nombre || 'Usuario'}</p>
                    </div>
                    <button
                      onClick={() => votar(p.id)}
                      disabled={misVotos.has(p.id) || p.usuario_id === usuario?.id}
                      className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                        misVotos.has(p.id) ? 'bg-[#F39C12] text-white' : 'bg-[#2A2A3E] text-[#A0A0B8] hover:text-white')}
                    >
                      <Heart size={14} className={misVotos.has(p.id) ? 'fill-current' : ''} />
                      {p.num_votos}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
