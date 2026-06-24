'use client'
import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface LocalImagenProps {
  src?: string | null
  nombre: string
  className?: string
  /** Aspect ratio del contenedor. Default: cover absoluto (relleno) */
  fill?: boolean
  width?: number
  height?: number
  /** Si es true, usa <img> en vez de next/image. Para cuando no podemos garantizar el dominio en next.config. */
  raw?: boolean
  sizes?: string
  priority?: boolean
}

// Paleta de gradientes deterministas — generamos uno consistente por nombre
const PALETAS = [
  ['#B6FF3A', '#7C5CFF'],
  ['#7C5CFF', '#4F8EF7'],
  ['#4F8EF7', '#27AE60'],
  ['#F39C12', '#B6FF3A'],
  ['#D4A84B', '#7C5CFF'],
  ['#A6EE2B', '#4F8EF7'],
  ['#7C5CFF', '#B6FF3A'],
  ['#4FB2A0', '#7C5CFF'],
] as const

/**
 * Hash simple (djb2) para mapear nombre a un índice estable de paleta.
 * No criptográfico — solo para consistencia visual.
 */
function hashIndex(input: string, max: number): number {
  let hash = 5381
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % max
}

function inicialesDe(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean)
  if (partes.length === 0) return '?'
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

/**
 * Imagen de local con placeholder generativo. Si no hay src o la imagen falla,
 * muestra un gradiente determinista (siempre el mismo para el mismo local)
 * con las iniciales sobreimpuestas. Sin imágenes Unsplash genéricas.
 */
export function LocalImagen({
  src, nombre, className, fill = true, width, height, raw, sizes, priority,
}: LocalImagenProps) {
  const [error, setError] = useState(false)
  const showPlaceholder = !src || error

  if (showPlaceholder) {
    const [from, to] = PALETAS[hashIndex(nombre, PALETAS.length)]
    const iniciales = inicialesDe(nombre)
    return (
      <div
        className={cn('relative w-full h-full flex items-center justify-center select-none overflow-hidden', className)}
        style={{
          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        }}
        aria-label={nombre}
      >
        {/* Trama de puntos sutil */}
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: 'radial-gradient(circle at 25% 25%, rgba(255,255,255,0.12) 1px, transparent 1.5px), radial-gradient(circle at 75% 75%, rgba(0,0,0,0.08) 1px, transparent 1.5px)',
          backgroundSize: '14px 14px, 18px 18px',
        }} />
        {/* Iniciales */}
        <span
          className="relative font-black text-white text-display tracking-tight"
          style={{
            fontSize: 'clamp(2rem, 8vw, 3.5rem)',
            textShadow: '0 4px 18px rgba(0,0,0,0.35)',
            letterSpacing: '-0.04em',
          }}
        >
          {iniciales}
        </span>
      </div>
    )
  }

  if (raw) {
    return (
      <img
        src={src!}
        alt={nombre}
        className={cn('w-full h-full object-cover', className)}
        onError={() => setError(true)}
      />
    )
  }

  if (fill) {
    return (
      <Image
        src={src!}
        alt={nombre}
        fill
        className={cn('object-cover', className)}
        onError={() => setError(true)}
        sizes={sizes || '(max-width: 768px) 100vw, 600px'}
        priority={priority}
      />
    )
  }

  return (
    <Image
      src={src!}
      alt={nombre}
      width={width || 600}
      height={height || 400}
      className={cn('object-cover', className)}
      onError={() => setError(true)}
      priority={priority}
    />
  )
}
