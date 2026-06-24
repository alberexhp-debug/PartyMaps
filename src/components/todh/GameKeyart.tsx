import { JUEGOS } from '@/lib/torneos/sample'

// Keyart de juego generado por CSS (sin assets externos): gradiente del color del
// juego + grano + brillo diagonal. Da identidad visual fuerte a cards/fichas/perfil.
export function GameKeyart({ juegoId, className = '', label = true }: { juegoId: string; className?: string; label?: boolean }) {
  const j = JUEGOS[juegoId] || { color: '#B6FF3A', corto: '' }
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{ background: `radial-gradient(135% 120% at 0% 0%, ${j.color} 0%, ${j.color}5C 34%, transparent 72%), #0A0A12` }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'radial-gradient(circle at 25% 25%, #fff .6px, transparent 1.2px), radial-gradient(circle at 75% 65%, #fff .5px, transparent 1px)',
          backgroundSize: '9px 9px, 13px 13px',
        }}
      />
      <div className="absolute inset-0" style={{ background: 'linear-gradient(120deg, transparent 42%, rgba(255,255,255,.07) 50%, transparent 58%)' }} />
      {label && j.corto && (
        <span
          className="absolute bottom-1.5 left-2 right-1 font-black text-display leading-none tracking-tight text-white"
          style={{ fontSize: 12, textShadow: '0 2px 10px rgba(0,0,0,.55)' }}
        >
          {j.corto.toUpperCase()}
        </span>
      )}
    </div>
  )
}
