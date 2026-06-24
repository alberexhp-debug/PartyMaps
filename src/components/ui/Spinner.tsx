import { cn } from '@/lib/utils'

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

/**
 * Spinner discreto para botones (mantiene API existente).
 */
export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' }
  return (
    <div className={cn(
      'rounded-full border-white/10 border-t-[#B6FF3A] animate-spin',
      sizes[size], className
    )} />
  )
}

/**
 * Loader con identidad de marca: logo holo pulsante + texto animado.
 * Sustituye al spinner genérico en transiciones de página.
 */
export function PageLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{
      background: 'radial-gradient(ellipse at center, rgba(124,92,255,0.08), transparent 60%), #06060C',
    }}>
      <div className="flex flex-col items-center gap-6">
        <BrandLoader />
        <p className="text-[10px] uppercase tracking-[0.4em] text-[#A0A0B8] font-bold animate-pulse">
          Cargando
        </p>
      </div>
    </div>
  )
}

/**
 * Logo PM en versión holo animada — usar como loader inline o splash hero.
 * Tres capas: el logo, un anillo orbital y un halo difuminado.
 */
export function BrandLoader({ size = 80 }: { size?: number }) {
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Halo de fondo */}
      <div
        className="absolute inset-0 rounded-3xl blur-2xl opacity-70"
        style={{
          background: 'linear-gradient(135deg, #B6FF3A, #7C5CFF, #4F8EF7)',
          animation: 'holo-rotate 4s ease infinite',
          backgroundSize: '200% 200%',
        }}
      />
      {/* Anillo orbital */}
      <div
        className="absolute inset-0 rounded-3xl"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, #B6FF3A 60deg, transparent 120deg, transparent 360deg)',
          animation: 'spotlight-rotate 1.6s linear infinite',
          padding: 2,
          WebkitMask: 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)',
          WebkitMaskComposite: 'xor',
          maskComposite: 'exclude',
        }}
      />
      {/* Logo */}
      <div className="absolute inset-1 rounded-3xl flex items-center justify-center holo-bg">
        <span className="text-2xl font-black text-white tracking-tight" style={{
          textShadow: '0 2px 8px rgba(0,0,0,0.4)',
          fontFamily: 'var(--font-display)',
        }}>T</span>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="card-premium overflow-hidden">
      <div className="h-48 skeleton" />
      <div className="p-4 space-y-3">
        <div className="h-4 skeleton rounded w-3/4" />
        <div className="h-3 skeleton rounded w-1/2" />
        <div className="h-3 skeleton rounded w-2/3" />
      </div>
    </div>
  )
}
