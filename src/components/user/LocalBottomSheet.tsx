'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocalConAforo } from '@/types'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { X, Bell, ChevronRight, Ticket, Sparkles, MapPin } from 'lucide-react'
import { LocalImagen } from '@/components/ui/LocalImagen'
import {
  getLabelTipoLocal, getColorTemperatura, getLabelTemperatura,
  getTemperaturaAforo, aforoVisible, formatearPrecio, getLabelMusica,
} from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  local: LocalConAforo
  onClose: () => void
}

export function LocalBottomSheet({ local, onClose }: Props) {
  const router = useRouter()
  const toast = useToast()
  const { usuario } = useAuthStore()
  const [suscrito, setSuscrito] = useState(local.esta_suscrito || false)
  const [loadingSub, setLoadingSub] = useState(false)

  const aforo = Math.round(aforoVisible(local))
  const temp = getTemperaturaAforo(aforo)
  const colorTemp = getColorTemperatura(temp)
  const precio = local.precio_entrada_min
  const genero = local.musica?.[0] ? getLabelMusica(local.musica[0]) : null

  const toggleSuscripcion = async () => {
    if (!usuario) { router.push('/login'); return }
    setLoadingSub(true)
    if (suscrito) {
      await supabase.from('suscripciones').delete().match({ usuario_id: usuario.id, local_id: local.id })
      setSuscrito(false)
      toast.info(`Dejaste de seguir a ${local.nombre}`)
    } else {
      await supabase.from('suscripciones').insert({ usuario_id: usuario.id, local_id: local.id })
      setSuscrito(true)
      toast.success(`Siguiendo a ${local.nombre}`)
    }
    setLoadingSub(false)
  }

  return (
    <div className="absolute bottom-20 left-0 right-0 z-20 animate-slide-up px-3">
      <div className="card-premium overflow-hidden">
        {/* ── Hero ── */}
        <div className="relative h-40">
          <LocalImagen src={local.imagenes?.[0]} nombre={local.nombre} />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0C0C15] via-[#0C0C15]/55 to-transparent" />

          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            <X size={16} />
          </button>

          {local.tier === 'destacado' && (
            <div className="absolute top-3 left-3">
              <Badge variant="gold" size="sm">★ Destacado</Badge>
            </div>
          )}

          {/* Nombre sobre la imagen */}
          <div className="absolute bottom-3 left-4 right-4">
            <h3 className="text-2xl font-bold text-white leading-tight text-display tracking-tight truncate">{local.nombre}</h3>
            <p className="text-sm text-[#D7D7E2] mt-0.5 flex items-center gap-1.5 truncate">
              {getLabelTipoLocal(local.tipo_local)}
              {local.ciudad && <><span className="text-[#8B8BA8]">·</span><MapPin size={11} className="shrink-0" />{local.ciudad}</>}
            </p>
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="p-4 space-y-3">
          {/* Strip de datos reales: ambiente · entrada · música */}
          <div className="flex items-stretch rounded-2xl bg-white/[0.03] border border-white/[0.07] divide-x divide-white/[0.06]">
            <div className="flex-1 px-3 py-2.5 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className={cn('w-2 h-2 rounded-full', temp === 'caliente' && 'animate-pulse-heat')}
                  style={{ background: colorTemp, boxShadow: `0 0 8px ${colorTemp}` }} />
                <span className="text-sm font-bold text-display" style={{ color: colorTemp }}>{getLabelTemperatura(temp)}</span>
              </div>
              <p className="text-[10px] text-[#8B8BA8] mt-0.5 uppercase tracking-wide">Ambiente</p>
            </div>
            <div className="flex-1 px-3 py-2.5 text-center">
              <p className="text-sm font-bold text-white text-display text-numeric">
                {precio == null ? '—' : precio === 0 ? 'Gratis' : formatearPrecio(precio)}
              </p>
              <p className="text-[10px] text-[#8B8BA8] mt-0.5 uppercase tracking-wide">Entrada</p>
            </div>
            {genero && (
              <div className="flex-1 px-3 py-2.5 text-center">
                <p className="text-sm font-bold text-white text-display truncate">{genero}</p>
                <p className="text-[10px] text-[#8B8BA8] mt-0.5 uppercase tracking-wide">Música</p>
              </div>
            )}
          </div>

          {/* Evento de esta noche */}
          {local.evento_activo && (
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#E0455E]/[0.08] border border-[#E0455E]/20">
              <Sparkles size={15} className="text-[#E0455E] shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#E0455E]">Esta noche</p>
                <p className="text-sm font-semibold text-white truncate">{local.evento_activo.nombre}</p>
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-0.5">
            <button
              onClick={toggleSuscripcion}
              disabled={loadingSub}
              aria-label={suscrito ? 'Siguiendo' : 'Seguir'}
              className={cn(
                'w-11 shrink-0 rounded-xl flex items-center justify-center transition-all active:scale-[0.97]',
                suscrito
                  ? 'bg-[#E0455E]/12 border border-[#E0455E]/30 text-[#E0455E]'
                  : 'bg-white/[0.05] border border-white/10 text-[#B8B8CC] hover:text-white',
              )}
            >
              <Bell size={17} className={suscrito ? 'fill-current' : ''} />
            </button>
            <Button variant="secondary" className="flex-1" onClick={() => router.push(`/local/${local.id}`)}>
              Ver más <ChevronRight size={16} />
            </Button>
            <Button className="flex-1" onClick={() => router.push(`/local/${local.id}/comprar`)}>
              <Ticket size={16} /> Comprar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
