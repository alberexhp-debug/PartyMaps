'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LocalConAforo } from '@/types'
import { Button } from '@/components/ui/Button'
import { StarDisplay } from '@/components/ui/StarRating'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import {
  X, Bell, BellOff, ChevronRight, TrendingUp, Clock, Ticket, Star, MapPin
} from 'lucide-react'
import {
  getLabelTipoLocal, getColorTemperatura, getLabelTemperatura,
  getDescripcionTemperatura, formatearPrecio, formatearHora
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
  const colorTemp = getColorTemperatura(local.temperatura)

  const toggleSuscripcion = async () => {
    if (!usuario) { router.push('/login'); return }
    setLoadingSub(true)
    if (suscrito) {
      const ok = window.confirm(`¿Dejar de seguir a ${local.nombre}? Dejarás de recibir sus notificaciones.`)
      if (!ok) { setLoadingSub(false); return }
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

  const imagenPrincipal = local.imagenes?.[0] || '/placeholder-local.jpg'

  return (
    <div className="absolute bottom-20 left-0 right-0 z-20 animate-slide-up px-3">
      <div className="glass-strong rounded-3xl overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,0.7)]">
        {/* Imagen */}
        <div className="relative h-44">
          <img
            src={imagenPrincipal}
            alt={local.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#14142A] via-[#14142A]/30 to-transparent" />

          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 glass-strong rounded-full flex items-center justify-center text-white"
          >
            <X size={16} />
          </button>

          {/* Badge tier destacado */}
          {local.tier === 'destacado' && (
            <div className="absolute top-3 left-3">
              <Badge variant="gold" size="sm">★ Destacado</Badge>
            </div>
          )}

          {/* Temperatura indicator */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-md"
              style={{ background: `${colorTemp}25`, border: `1px solid ${colorTemp}70`, color: colorTemp }}>
              <div className={cn('w-2 h-2 rounded-full', local.temperatura === 'caliente' && 'animate-pulse-heat')}
                style={{ background: colorTemp, boxShadow: `0 0 8px ${colorTemp}` }} />
              {getLabelTemperatura(local.temperatura)}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-3">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-xl font-bold text-white leading-tight truncate text-display tracking-tight">{local.nombre}</h3>
              <p className="text-sm text-[#A0A0B8] mt-0.5">{getLabelTipoLocal(local.tipo_local)}</p>
            </div>
            <button
              onClick={toggleSuscripcion}
              disabled={loadingSub}
              className={cn(
                'flex items-center gap-1.5 px-3 h-10 rounded-xl font-semibold text-sm transition-all shrink-0 active:scale-[0.97]',
                suscrito
                  ? 'glass border border-white/15 text-white'
                  : 'bg-[#E94560] text-white shadow-[0_6px_18px_-6px_rgba(233,69,96,0.55)] hover:bg-[#FF3D71]'
              )}
            >
              {suscrito ? <Bell size={16} className="fill-current text-[#E94560]" /> : <BellOff size={16} />}
              <span>{suscrito ? 'Siguiendo' : 'Seguir'}</span>
            </button>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2.5 bg-white/5 border border-white/8 rounded-xl">
              <TrendingUp size={16} style={{ color: colorTemp }} />
              <span className="text-[10px] text-[#6B6B85] mt-1 font-medium uppercase tracking-wide">Aforo</span>
              <span className="text-xs font-semibold text-white">{Math.round(local.aforo_estimado_porcentaje || 0)}%</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-white/5 border border-white/8 rounded-xl">
              <Clock size={16} className="text-[#4F8EF7]" />
              <span className="text-[10px] text-[#6B6B85] mt-1 font-medium uppercase tracking-wide">Pico</span>
              <span className="text-xs font-semibold text-white">2:00 AM</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-white/5 border border-white/8 rounded-xl">
              <Ticket size={16} className="text-[#F39C12]" />
              <span className="text-[10px] text-[#6B6B85] mt-1 font-medium uppercase tracking-wide">Entrada</span>
              <span className="text-xs font-semibold text-white">
                {local.precio_entrada_min === 0 ? 'Gratis' : formatearPrecio(local.precio_entrada_min || 0)}
              </span>
            </div>
          </div>

          {/* Descripción de temperatura */}
          <p className="text-xs text-[#A0A0B8] leading-relaxed">
            {getDescripcionTemperatura(local.temperatura, local.aforo_estimado_porcentaje || 0)}
          </p>

          {/* Evento activo */}
          {local.evento_activo && (
            <div className="flex items-center gap-2 p-2.5 bg-[#F39C12]/10 border border-[#F39C12]/20 rounded-xl">
              <Star size={14} className="text-[#F39C12] fill-current shrink-0" />
              <span className="text-xs font-medium text-[#F39C12] truncate">{local.evento_activo.nombre}</span>
            </div>
          )}

          {/* Módulos activos */}
          {local.modulos_activos?.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {local.modulos_activos.includes('concurso') && (
                <Badge variant="blue" size="sm">📸 Concurso activo</Badge>
              )}
              {local.modulos_activos.includes('perfil_noche') && (
                <Badge variant="gold" size="sm">✨ Perfil de noche</Badge>
              )}
              {local.modulos_activos.includes('retos') && (
                <Badge variant="warning" size="sm">🎯 Retos</Badge>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex gap-2 pt-1">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => router.push(`/local/${local.id}`)}
            >
              Ver más <ChevronRight size={16} />
            </Button>
            <Button
              className="flex-1"
              onClick={() => router.push(`/local/${local.id}/comprar`)}
            >
              <Ticket size={16} />
              Comprar entrada
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
