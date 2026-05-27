'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { Review, Usuario } from '@/types'
import { Star, MessageSquare, Flag, Check } from 'lucide-react'
import { tiempoRelativo } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { PageHeader, EmptyState, SkeletonCard } from '@/components/local-panel/ui'

type ReviewConUsuario = Review & { usuarios?: Partial<Usuario> }

export default function ReviewsPage() {
  const toast = useToast()
  const { local } = useLocalPanelStore()
  const [reviews, setReviews] = useState<ReviewConUsuario[]>([])
  const [loading, setLoading] = useState(true)
  const [respondiendo, setRespondiendo] = useState<string | null>(null)
  const [respuesta, setRespuesta] = useState('')

  useEffect(() => {
    if (!local) return
    cargar()
  }, [local])

  async function cargar() {
    const { data } = await supabase
      .from('reviews')
      .select('*, usuarios!usuario_id(id, nombre, foto_perfil_url)')
      .eq('local_id', local!.id)
      .order('created_at', { ascending: false })
    if (data) setReviews(data.map((r: ReviewConUsuario) => ({ ...r, usuario: r.usuarios })))
    setLoading(false)
  }

  const responder = async (reviewId: string) => {
    if (!respuesta.trim()) return
    const { error } = await supabase.from('reviews').update({ respuesta_local: respuesta.trim() }).eq('id', reviewId)
    if (error) { toast.error('Error al guardar respuesta'); return }
    toast.success('Respuesta publicada')
    setRespondiendo(null)
    setRespuesta('')
    cargar()
  }

  const reportar = async (reviewId: string) => {
    if (!confirm('¿Reportar esta reseña para revisión?')) return
    await supabase.from('reviews').update({ censurada: false }).eq('id', reviewId)
    toast.info('Reseña reportada para revisión por el equipo')
  }

  if (!local) return null

  const media = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.puntuacion, 0) / reviews.length
    : 0

  const distribucion = [5, 4, 3, 2, 1].map(n => ({
    estrellas: n,
    count: reviews.filter(r => r.puntuacion === n).length,
    pct: reviews.length > 0 ? (reviews.filter(r => r.puntuacion === n).length / reviews.length) * 100 : 0,
  }))

  return (
    <div className="relative p-4 md:p-8 pb-24 md:pb-8 space-y-6 overflow-hidden">
      <PageHeader eyebrow="Audiencia" titulo="Reseñas" subtitulo="Lo que opinan tus clientes" acento="gold" />

      {/* Resumen */}
      {reviews.length > 0 && (
        <div className="glass rounded-2xl p-4">
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-5xl font-bold text-display text-numeric text-white">{media.toFixed(1)}</p>
              <div className="flex gap-0.5 mt-1 justify-center">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={12} className={cn(n <= Math.round(media) ? 'text-[#F39C12] fill-current' : 'text-[#2A2A3E]')} />
                ))}
              </div>
              <p className="text-xs text-[#6B6B85] mt-1">{reviews.length} reseñas</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {distribucion.map(({ estrellas, count, pct }) => (
                <div key={estrellas} className="flex items-center gap-2">
                  <span className="text-xs text-[#6B6B85] w-4">{estrellas}</span>
                  <Star size={10} className="text-[#F39C12] fill-current" />
                  <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-[#F39C12] rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-[#6B6B85] w-4">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} className="h-32" />)
      ) : reviews.length === 0 ? (
        <EmptyState icon={Star} acento="gold" titulo="Sin reseñas todavía"
          descripcion="Cuando tus clientes valoren la noche, aparecerán aquí." />
      ) : (
        reviews.map(review => (
          <div key={review.id} className="glass rounded-2xl p-4 space-y-3">
            {/* Usuario + stars */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-[#2A2A3E] overflow-hidden flex items-center justify-center">
                  {review.usuarios?.foto_perfil_url
                    ? <img src={review.usuarios.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                    : <span className="text-xs text-white">{review.usuarios?.nombre?.[0]}</span>
                  }
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{review.usuarios?.nombre || 'Usuario'}</p>
                  <p className="text-xs text-[#6B6B85]">{tiempoRelativo(review.created_at)}</p>
                </div>
              </div>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <Star key={n} size={12} className={cn(n <= review.puntuacion ? 'text-[#F39C12] fill-current' : 'text-[#2A2A3E]')} />
                ))}
              </div>
            </div>

            {review.comentario && (
              <p className="text-sm text-[#A0A0B8]">{review.comentario}</p>
            )}

            {/* Respuesta del local */}
            {review.respuesta_local && (
              <div className="bg-white/5 rounded-xl p-3 border-l-2 border-[#E94560]">
                <p className="text-xs font-semibold text-[#E94560] mb-1">{local.nombre} respondió:</p>
                <p className="text-xs text-[#A0A0B8]">{review.respuesta_local}</p>
              </div>
            )}

            {/* Input respuesta */}
            {respondiendo === review.id && (
              <div className="space-y-2">
                <textarea
                  value={respuesta}
                  onChange={e => setRespuesta(e.target.value)}
                  rows={2}
                  maxLength={500}
                  placeholder="Escribe tu respuesta..."
                  className="w-full px-3 py-2 bg-white/5 border border-[#E94560]/50 rounded-xl text-white text-sm outline-none resize-none"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => responder(review.id)}>
                    <Check size={13} /> Publicar
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRespondiendo(null)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Acciones */}
            {!review.respuesta_local && respondiendo !== review.id && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setRespondiendo(review.id); setRespuesta('') }}
                  className="flex items-center gap-1.5 text-xs text-[#4F8EF7] hover:underline"
                >
                  <MessageSquare size={12} /> Responder
                </button>
                <button
                  onClick={() => reportar(review.id)}
                  className="flex items-center gap-1.5 text-xs text-[#6B6B85] hover:text-red-400"
                >
                  <Flag size={12} /> Reportar
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
