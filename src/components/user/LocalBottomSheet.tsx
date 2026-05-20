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
      <div className="bg-[#1A1A2E] rounded-3xl border border-[#2A2A3E] overflow-hidden shadow-2xl shadow-black/50">
        {/* Imagen */}
        <div className="relative h-44">
          <img
            src={imagenPrincipal}
            alt={local.nombre}
            className="w-full h-full object-cover"
            onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800' }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1A1A2E] via-transparent to-transparent" />

          {/* Cerrar */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center text-white"
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
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold backdrop-blur-sm"
              style={{ background: `${colorTemp}20`, border: `1px solid ${colorTemp}60`, color: colorTemp }}>
              <div className={cn('w-2 h-2 rounded-full', local.temperatura === 'caliente' && 'animate-pulse-heat')}
                style={{ background: colorTemp }} />
              {getLabelTemperatura(local.temperatura)}
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="p-4 space-y-3">
          {/* Cabecera */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-white leading-tight truncate">{local.nombre}</h3>
              <p className="text-sm text-[#A0A0B8]">{getLabelTipoLocal(local.tipo_local)}</p>
            </div>
            <button
              onClick={toggleSuscripcion}
              disabled={loadingSub}
              className={cn(
                'p-2.5 rounded-xl border transition-colors shrink-0',
                suscrito
                  ? 'bg-[#E94560]/10 border-[#E94560]/30 text-[#E94560]'
                  : 'bg-[#0D0D1A] border-[#2A2A3E] text-[#505065] hover:text-white'
              )}
            >
              {suscrito ? <Bell size={18} className="fill-current" /> : <BellOff size={18} />}
            </button>
          </div>

          {/* Info rápida */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center p-2.5 bg-[#0D0D1A] rounded-xl">
              <TrendingUp size={16} style={{ color: colorTemp }} />
              <span className="text-[10px] text-[#505065] mt-1">Aforo</span>
              <span className="text-xs font-semibold text-white">{Math.round(local.aforo_estimado_porcentaje || 0)}%</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-[#0D0D1A] rounded-xl">
              <Clock size={16} className="text-[#4F8EF7]" />
              <span className="text-[10px] text-[#505065] mt-1">Hora pico</span>
              <span className="text-xs font-semibold text-white">2:00 AM</span>
            </div>
            <div className="flex flex-col items-center p-2.5 bg-[#0D0D1A] rounded-xl">
              <Ticket size={16} className="text-[#F39C12]" />
              <span className="text-[10px] text-[#505065] mt-1">Entrada</span>
              <span className="text-xs font-semibold text-white">
                {local.precio_entrada_min === 0 ? 'Gratis' : formatearPrecio(local.precio_entrada_min || 0)}
              </span>
            </div>
          </div>

          {/* Descripción de temperatura */}
          <p className="text-xs text-[#505065]">
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
