'use client'
import { forwardRef, useRef, useState, useCallback } from 'react'
import { cn, EMOJI_SIGNO } from '@/lib/utils'
import type { EstiloCarta, SignoZodiaco } from '@/types'
import { User, Star, Sparkles } from 'lucide-react'

/**
 * Hook de 3D tilt cinético. Devuelve refs + handlers para aplicar a la carta.
 * No actualiza estado React por frame — usa CSS vars + requestAnimationFrame.
 */
function useTilt(enabled: boolean) {
  const ref = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const targetRef = useRef({ x: 0, y: 0, gx: 50, gy: 50 })

  const apply = useCallback(() => {
    const el = ref.current
    if (!el) return
    const { x, y, gx, gy } = targetRef.current
    el.style.setProperty('--tilt-x', `${x.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${y.toFixed(2)}deg`)
    el.style.setProperty('--gloss-x', `${gx.toFixed(1)}%`)
    el.style.setProperty('--gloss-y', `${gy.toFixed(1)}%`)
  }, [])

  const updateFromPointer = useCallback((cx: number, cy: number) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (cx - r.left) / r.width   // 0-1
    const py = (cy - r.top) / r.height
    const tiltX = (py - 0.5) * -14         // grados
    const tiltY = (px - 0.5) * 14
    targetRef.current = { x: tiltX, y: tiltY, gx: px * 100, gy: py * 100 }
    if (rafRef.current == null) {
      rafRef.current = requestAnimationFrame(() => {
        apply()
        rafRef.current = null
      })
    }
  }, [apply])

  const reset = useCallback(() => {
    targetRef.current = { x: 0, y: 0, gx: 50, gy: 50 }
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      apply()
      rafRef.current = null
    })
  }, [apply])

  const handlers = !enabled ? {} : {
    onMouseMove: (e: React.MouseEvent) => updateFromPointer(e.clientX, e.clientY),
    onMouseLeave: reset,
    onTouchMove: (e: React.TouchEvent) => {
      const t = e.touches[0]
      if (t) updateFromPointer(t.clientX, t.clientY)
    },
    onTouchEnd: reset,
  }

  return { tiltRef: ref, tiltHandlers: handlers }
}

export interface CartaPerfilProps {
  nombre: string
  apodo?: string | null
  edad?: number
  signo: string
  foto?: string | null
  frase?: string | null
  ciudad?: string
  estilo?: EstiloCarta
  slug?: string
  stats?: { label: string; value: number | string; emoji?: string }[]
  reputacion?: { puntuacion: number; total: number } | null
  /** Cuando es true, deshabilita animaciones y filtros que rompen html2canvas */
  paraExportar?: boolean
  /** Activa efecto 3D tilt al mover el dedo/ratón sobre la carta (true por defecto en pantalla). */
  tilt?: boolean
  className?: string
}

/**
 * Estilos visuales de la carta. Cada estilo define el fondo de cara y el acento.
 * Mantener pocos, equilibrados, todos "premium".
 */
const ESTILOS: Record<EstiloCarta, { gradient: string; acento: string; trama: string; sello: string }> = {
  holo: {
    gradient: 'linear-gradient(135deg, #E94560 0%, #7C5CFF 35%, #4F8EF7 65%, #E94560 100%)',
    acento: '#FFFFFF',
    trama: 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.1), transparent 40%)',
    sello: '#FFE7EF',
  },
  aurora: {
    gradient: 'linear-gradient(135deg, #0E2A47 0%, #1E5F74 35%, #4FB2A0 70%, #7C5CFF 100%)',
    acento: '#A0F5E1',
    trama: 'radial-gradient(circle at 20% 30%, rgba(160,245,225,0.18), transparent 50%)',
    sello: '#CFF8EE',
  },
  oro: {
    gradient: 'linear-gradient(135deg, #1B0E04 0%, #5A3A0E 25%, #D4A84B 55%, #FBE08F 75%, #5A3A0E 100%)',
    acento: '#FBE08F',
    trama: 'radial-gradient(circle at 70% 20%, rgba(251,224,143,0.22), transparent 50%)',
    sello: '#FFF1C2',
  },
  noche: {
    gradient: 'linear-gradient(180deg, #0A0A14 0%, #14142A 50%, #1A1A30 100%)',
    acento: '#FAFAFC',
    trama: 'radial-gradient(circle at 50% 0%, rgba(124,92,255,0.18), transparent 55%)',
    sello: '#A0A0B8',
  },
  rosa: {
    gradient: 'linear-gradient(135deg, #2A0414 0%, #6B0E33 30%, #E94560 60%, #FF8FA8 100%)',
    acento: '#FFE7EF',
    trama: 'radial-gradient(circle at 80% 30%, rgba(255,143,168,0.25), transparent 50%)',
    sello: '#FFD7E2',
  },
}

export const CartaPerfil = forwardRef<HTMLDivElement, CartaPerfilProps>(function CartaPerfil({
  nombre, apodo, edad, signo, foto, frase, ciudad,
  estilo = 'holo', slug, stats, reputacion, paraExportar = false, tilt = true, className,
}, ref) {
  const tema = ESTILOS[estilo]
  const emojiSigno = EMOJI_SIGNO[signo as SignoZodiaco] || '✨'
  const numeroCorto = slug ? `#${slug.slice(0, 4).toUpperCase()}` : '#0000'
  const nombreMostrar = apodo?.trim() || nombre

  const tiltActivo = tilt && !paraExportar
  const { tiltRef, tiltHandlers } = useTilt(tiltActivo)

  // Asignar ambos refs (forwarded + tilt) al mismo elemento
  const setRefs = (node: HTMLDivElement | null) => {
    if (typeof ref === 'function') ref(node)
    else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    ;(tiltRef as React.MutableRefObject<HTMLDivElement | null>).current = node
  }

  return (
    <div
      ref={setRefs}
      {...tiltHandlers}
      className={cn(
        'relative w-full aspect-[5/7] rounded-[28px] overflow-hidden select-none',
        !paraExportar && 'shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)]',
        tiltActivo && 'transition-transform duration-100',
        className,
      )}
      style={{
        background: tema.gradient,
        backgroundSize: '300% 300%',
        transformStyle: 'preserve-3d',
        transform: tiltActivo ? 'perspective(900px) rotateX(var(--tilt-x,0deg)) rotateY(var(--tilt-y,0deg))' : undefined,
      }}
    >
      {/* Trama radial */}
      <div className="absolute inset-0" style={{ background: tema.trama }} />

      {/* Granulado sutil */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.06) 1px, transparent 1.5px), radial-gradient(circle at 75% 75%, rgba(255,255,255,0.04) 1px, transparent 1.5px)',
          backgroundSize: '8px 8px, 12px 12px',
        }}
      />

      {/* Brillo holo animado */}
      {!paraExportar && estilo === 'holo' && (
        <div
          className="absolute inset-0 animate-shimmer"
          style={{
            background:
              'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.18) 45%, rgba(255,255,255,0.05) 55%, transparent 70%)',
            backgroundSize: '200% 200%',
            mixBlendMode: 'overlay',
          }}
        />
      )}

      {/* Gloss que sigue al cursor (3D tilt) */}
      {tiltActivo && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(circle at var(--gloss-x, 50%) var(--gloss-y, 50%), rgba(255,255,255,0.35), rgba(255,255,255,0.08) 25%, transparent 50%)',
            mixBlendMode: 'overlay',
            transition: 'background 0.08s linear',
          }}
        />
      )}

      {/* Marco interior */}
      <div className="absolute inset-3 rounded-[22px] border border-white/25" />

      {/* Esquinas decorativas */}
      <div className="absolute top-5 left-5 w-6 h-6 border-t-2 border-l-2 rounded-tl-lg" style={{ borderColor: tema.acento }} />
      <div className="absolute top-5 right-5 w-6 h-6 border-t-2 border-r-2 rounded-tr-lg" style={{ borderColor: tema.acento }} />
      <div className="absolute bottom-5 left-5 w-6 h-6 border-b-2 border-l-2 rounded-bl-lg" style={{ borderColor: tema.acento }} />
      <div className="absolute bottom-5 right-5 w-6 h-6 border-b-2 border-r-2 rounded-br-lg" style={{ borderColor: tema.acento }} />

      {/* Contenido */}
      <div className="relative h-full flex flex-col p-6 text-white">
        {/* Top: signo + número */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-3xl drop-shadow-lg" aria-hidden>{emojiSigno}</span>
            <div className="leading-tight">
              <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-semibold">Signo</p>
              <p className="text-sm font-bold tracking-wide">{signo}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-[0.2em] opacity-70 font-semibold">PartyMaps</p>
            <p className="text-sm font-bold tracking-wider" style={{ color: tema.sello }}>{numeroCorto}</p>
          </div>
        </div>

        {/* Foto */}
        <div className="mt-5 flex justify-center">
          <div
            className="relative w-32 h-32 rounded-2xl overflow-hidden ring-2 ring-white/40"
            style={{ boxShadow: '0 12px 30px -8px rgba(0,0,0,0.5)' }}
          >
            {foto ? (
              <img src={foto} alt="" className="w-full h-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="w-full h-full bg-white/10 flex items-center justify-center">
                <User size={48} className="text-white/60" />
              </div>
            )}
          </div>
        </div>

        {/* Nombre + ciudad/edad */}
        <div className="mt-4 text-center">
          <h2 className="text-2xl font-bold tracking-tight text-display drop-shadow-md" style={{ letterSpacing: '-0.02em' }}>
            {nombreMostrar}
          </h2>
          <p className="mt-0.5 text-xs uppercase tracking-[0.18em] opacity-80">
            {ciudad || 'Madrid'}{edad ? ` · ${edad} años` : ''}
          </p>
          {reputacion && reputacion.total > 0 && (
            <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/25 border border-white/15">
              <Star size={11} className="fill-current" style={{ color: tema.sello }} />
              <span className="text-[11px] font-semibold">{reputacion.puntuacion.toFixed(1)}</span>
              <span className="text-[10px] opacity-70">({reputacion.total})</span>
            </div>
          )}
        </div>

        {/* Frase */}
        <div className="mt-auto">
          <div className="relative rounded-2xl px-4 py-3 bg-black/30 border border-white/15 backdrop-blur-[2px]">
            <Sparkles size={12} className="absolute -top-2 -left-2 text-white/80 drop-shadow" />
            <p className="text-[13px] leading-snug italic font-medium text-center">
              &ldquo;{frase || `${signo}, brilla esta noche.`}&rdquo;
            </p>
          </div>

          {/* Stats */}
          {stats && stats.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {stats.slice(0, 3).map((s, i) => (
                <div key={i} className="text-center rounded-xl bg-black/25 border border-white/12 py-1.5">
                  <p className="text-base font-bold leading-none">
                    {s.emoji && <span className="mr-0.5">{s.emoji}</span>}
                    {s.value}
                  </p>
                  <p className="text-[9px] uppercase tracking-wider opacity-70 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Pie */}
          <p className="mt-3 text-center text-[9px] uppercase tracking-[0.25em] opacity-60 font-semibold">
            partymaps.es{slug ? ` / c / ${slug}` : ''}
          </p>
        </div>
      </div>
    </div>
  )
})
