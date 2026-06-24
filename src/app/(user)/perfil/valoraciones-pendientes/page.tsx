'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useToast } from '@/components/ui/Toast'
import { StarRating } from '@/components/ui/StarRating'
import { formatearFecha, tiempoRelativo } from '@/lib/utils'
import { ChevronLeft, User, MapPin } from 'lucide-react'

interface Pendiente {
  plan: {
    id: string
    hora_llegada: string
    descripcion: string | null
    locales: { nombre: string; imagenes: string[] } | null
  }
  companeros: { id: string; nombre: string; foto_perfil_url: string | null }[]
}

export default function ValoracionesPendientesPage() {
  const router = useRouter()
  const toast = useToast()
  const [pendientes, setPendientes] = useState<Pendiente[]>([])
  const [loading, setLoading] = useState(true)
  const [valores, setValores] = useState<Record<string, Record<string, number>>>({})
  const [enviando, setEnviando] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/planes/pendientes-valorar')
      .then(r => r.ok ? r.json() : Promise.reject(r.status))
      .then(json => setPendientes(json.pendientes ?? []))
      .catch(() => toast.error('No se pudieron cargar las valoraciones'))
      .finally(() => setLoading(false))
    // eslint-disable-next-line
  }, [])

  const setStar = (planId: string, userId: string, v: number) => {
    setValores(prev => ({
      ...prev,
      [planId]: { ...(prev[planId] || {}), [userId]: v },
    }))
  }

  const enviar = async (p: Pendiente) => {
    const valoraciones = p.companeros
      .map(c => ({ valorado_id: c.id, puntuacion: valores[p.plan.id]?.[c.id] || 0 }))
      .filter(v => v.puntuacion > 0)
    if (valoraciones.length === 0) {
      toast.error('Pulsa al menos una estrella en uno de los participantes')
      return
    }
    setEnviando(p.plan.id)
    const res = await fetch('/api/planes/valorar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_id: p.plan.id, valoraciones }),
    })
    if (res.ok) {
      toast.success(`${valoraciones.length} valoraciones enviadas`)
      setPendientes(prev => prev.filter(x => x.plan.id !== p.plan.id))
    } else {
      const j = await res.json()
      toast.error(j.error || 'Error al enviar')
    }
    setEnviando(null)
  }

  return (
    <div className="min-h-screen pb-24">
      <div className="sticky top-0 z-10 glass-strong border-b border-white/8 px-4 py-3 safe-top flex items-center gap-3">
        <button aria-label="Volver" onClick={() => router.back()} className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center text-white">
          <ChevronLeft size={20} />
        </button>
        <div>
          <p className="text-[10px] font-bold text-[#B6FF3A] uppercase tracking-[0.2em]">Pendientes</p>
          <h1 className="text-lg font-bold text-display">Valoraciones de plan</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20"><Spinner /></div>
        ) : pendientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-20 h-20 glass rounded-2xl flex items-center justify-center">
              <User size={32} className="text-[#A0A0B8]" />
            </div>
            <p className="text-[#A0A0B8] max-w-xs">No tienes valoraciones pendientes. Cuando termine un plan podrás valorar a tus compañeros desde aquí.</p>
          </div>
        ) : (
          pendientes.map(p => (
            <div key={p.plan.id} className="glass rounded-2xl overflow-hidden">
              {/* Cabecera */}
              <div className="relative h-24">
                <img
                  src={p.plan.locales?.imagenes?.[0] || ''}
                  alt={p.plan.locales?.nombre}
                  className="w-full h-full object-cover"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#14142A] via-[#14142A]/60 to-transparent" />
                <div className="absolute bottom-2 left-3">
                  <p className="font-bold text-white text-display">{p.plan.locales?.nombre || 'Plan'}</p>
                  <div className="flex items-center gap-2 text-xs text-[#A0A0B8] mt-0.5">
                    <MapPin size={10} />
                    <span>{formatearFecha(p.plan.hora_llegada)} · {tiempoRelativo(p.plan.hora_llegada)}</span>
                  </div>
                </div>
              </div>

              {/* Compañeros */}
              <div className="p-4 space-y-3">
                <p className="text-xs text-[#A0A0B8]">¿Qué tal estuvo cada compañero/a?</p>
                {p.companeros.map(c => (
                  <div key={c.id} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/8 overflow-hidden flex items-center justify-center shrink-0">
                      {c.foto_perfil_url
                        ? <img src={c.foto_perfil_url} alt="" className="w-full h-full object-cover" />
                        : <User size={18} className="text-[#A0A0B8]" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white truncate">{c.nombre}</p>
                    </div>
                    <StarRating
                      value={valores[p.plan.id]?.[c.id] || 0}
                      onChange={v => setStar(p.plan.id, c.id, v)}
                      size={20}
                    />
                  </div>
                ))}
                <Button fullWidth onClick={() => enviar(p)} loading={enviando === p.plan.id}>
                  Enviar valoraciones
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
