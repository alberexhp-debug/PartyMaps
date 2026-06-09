'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LocalConAforo } from '@/types'
import { estadoDeLocal } from '@/lib/estado-local'
import { textoEstadoFicha } from '@/lib/horarios'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAuthStore } from '@/lib/stores/useAuthStore'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/Toast'
import { X, Bell, ChevronRight, Ticket, Sparkles, MapPin, Music2 } from 'lucide-react'
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

  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setAhora(new Date())
    const id = setInterval(tick, 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])

  const aforo = Math.round(aforoVisible(local))
  const temp = getTemperaturaAforo(aforo)
  const colorTemp = getColorTemperatura(temp)
  const precio = local.precio_entrada_min
  const genero = local.musica?.[0] ? getLabelMusica(local.musica[0]) : null
  const estadoAp = estadoDeLocal(local, ahora)
  const lineaEstado = textoEstadoFicha(estadoAp, ahora)
  const colorEstado = estadoAp.estado === 'abierto' ? '#27AE60' : estadoAp.estado === 'abre_pronto' ? '#F39C12' : '#4A4A60'

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
          {/* Asa de arrastre — afordancia de hoja inferior */}
          <div className="absolute left-1/2 top-2 z-10 h-1 w-9 -translate-x-1/2 rounded-full bg-white/45 shadow-[0_1px_3px_rgba(0,0,0,0.4)]" />

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
            {lineaEstado && (
              <p className="text-[13px] text-[#D7D7E2] mt-1 flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colorEstado }} />
                {lineaEstado}
              </p>
            )}
            {local.admite_after && (
              <span className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-[#7C5CFF]/40 bg-[#7C5CFF]/25 px-2 py-0.5 text-[11px] font-semibold text-[#C9BCFF] backdrop-blur-sm">
                🌙 Admite afters
              </span>
            )}
          </div>
        </div>

        {/* ── Contenido ── */}
        <div className="p-4 space-y-3">
          {/* Strip de datos reales: ambiente · entrada · música */}
          <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.055] to-white/[0.02] divide-x divide-white/[0.06]">
            <div className="flex-1 px-3 py-3 text-center">
              <div className="flex items-center justify-center gap-1.5">
                <span className={cn('h-2 w-2 rounded-full', temp === 'caliente' && 'animate-pulse-heat')}
                  style={{ background: colorTemp, boxShadow: `0 0 8px ${colorTemp}` }} />
                <span className="text-sm font-bold text-display" style={{ color: colorTemp }}>{getLabelTemperatura(temp)}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8B8BA8]">Ambiente</p>
            </div>
            <div className="flex-1 px-3 py-3 text-center">
              <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-white text-display text-numeric">
                <Ticket size={12} className="text-[#8B8BA8]" />
                {precio == null ? '—' : precio === 0 ? 'Gratis' : formatearPrecio(precio)}
              </p>
              <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8B8BA8]">Entrada</p>
            </div>
            {genero && (
              <div className="flex-1 px-3 py-3 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-bold text-white text-display">
                  <Music2 size={12} className="shrink-0 text-[#8B8BA8]" />
                  <span className="truncate">{genero}</span>
                </p>
                <p className="mt-1 text-[10px] uppercase tracking-wide text-[#8B8BA8]">Música</p>
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
