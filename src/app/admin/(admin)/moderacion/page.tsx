'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { Review } from '@/types'
import { tiempoRelativo } from '@/lib/utils'
import { Shield, Check, X, Flag, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

type ReviewConExtra = Review & {
  usuarios?: { nombre: string }
  locales?: { nombre: string }
}

export default function MoederacionPage() {
  const toast = useToast()
  const [reviews, setReviews] = useState<ReviewConExtra[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    const { data } = await supabase
      .from('reviews')
      .select('*, usuarios!usuario_id(nombre), locales!local_id(nombre)')
      .eq('censurada', true)
      .order('created_at', { ascending: false })
      .limit(50)
    if (data) setReviews(data)
    setLoading(false)
  }

  const aprobar = async (id: string) => {
    await supabase.from('reviews').update({ censurada: false }).eq('id', id)
    toast.success('Reseña aprobada y visible')
    cargar()
  }

  const eliminar = async (id: string) => {
    await supabase.from('reviews').update({ censurada: true, motivo_censura: 'Eliminada por moderación' }).eq('id', id)
    toast.success('Reseña censurada')
    setReviews(prev => prev.filter(r => r.id !== id))
  }

  return (
    <div className="p-4 md:p-6 pb-20 md:pb-6 space-y-4">
      <div className="flex items-center gap-3">
        <Shield size={20} className="text-[#4F8EF7]" />
        <h1 className="text-2xl font-black text-white">Cola de moderación</h1>
      </div>
      <p className="text-sm text-[#505065]">Reseñas pendientes de revisión ({reviews.length})</p>

      {loading ? (
        Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 bg-[#1A1A2E] rounded-2xl animate-pulse" />)
      ) : reviews.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <Shield size={40} className="text-green-400" />
          <p className="text-green-400 font-semibold">Cola vacía — todo limpio</p>
        </div>
      ) : (
        reviews.map(r => (
          <div key={r.id} className="bg-[#1A1A2E] rounded-2xl border border-[#F39C12]/30 p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs text-[#505065]">
                  <span className="text-white font-medium">{r.usuarios?.nombre || 'Usuario'}</span>
                  {' → '}
                  <span className="text-white font-medium">{r.locales?.nombre || 'Local'}</span>
                </p>
                <div className="flex gap-0.5 mt-1">
                  {[1,2,3,4,5].map(n => (
                    <Star key={n} size={12} className={cn(n <= r.puntuacion ? 'text-[#F39C12] fill-current' : 'text-[#2A2A3E]')} />
                  ))}
                </div>
              </div>
              <span className="text-xs text-[#505065]">{tiempoRelativo(r.created_at)}</span>
            </div>
            {r.comentario && (
              <p className="text-sm text-[#A0A0B8] bg-[#0D0D1A] rounded-xl p-3">{r.comentario}</p>
            )}
            {r.motivo_censura && (
              <div className="flex items-center gap-2 text-xs text-[#F39C12]">
                <Flag size={12} /> Motivo: {r.motivo_censura}
              </div>
            )}
            <div className="flex gap-2">
              <button onClick={() => aprobar(r.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-400 hover:bg-green-500/20">
                <Check size={12} /> Aprobar
              </button>
              <button onClick={() => eliminar(r.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 hover:bg-red-500/20">
                <X size={12} /> Censurar
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )
}
