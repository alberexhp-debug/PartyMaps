import { JUEGOS, type TorneoSample } from '@/lib/torneos/sample'
import { GameIcon } from '@/components/todh/GameIcon'

// Keyart de juego generado por CSS (sin assets externos): gradiente del color del
// juego + grano + brillo diagonal. Da identidad visual fuerte a cards/fichas/perfil.
export function GameKeyart({ juegoId, className = '', label = true }: { juegoId: string; className?: string; label?: boolean }) {
  const j = JUEGOS[juegoId] || { color: '#B6FF3A', corto: '' }
  // 'relative' solo si el caller no posiciona él mismo (evita el choque relative/absolute
  // que colapsaba el keyart a altura 0 cuando se pasaba "absolute inset-0")
  const pos = /\babsolute\b|\bfixed\b/.test(className) ? '' : 'relative'
  return (
    <div
      className={`${pos} overflow-hidden pointer-events-none ${className}`}
      style={{ background: `radial-gradient(135% 120% at 0% 0%, ${j.color} 0%, ${j.color}7A 40%, transparent 78%), radial-gradient(90% 90% at 100% 100%, ${j.color}33 0%, transparent 60%), #12161F` }}
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
          className="absolute bottom-1.5 left-2 right-1 inline-flex items-center gap-1 font-black text-display leading-none tracking-tight text-white"
          style={{ fontSize: 12, textShadow: '0 2px 10px rgba(0,0,0,.55)' }}
        >
          {/* Icono en blanco: sobre el keyart del propio color del juego, el
              glifo tintado se fundiría con el fondo */}
          <GameIcon juegoId={juegoId} size={12} color="#FFFFFF" />
          {j.corto.toUpperCase()}
        </span>
      )}
    </div>
  )
}

// Arte de un torneo: su banner propio si lo tiene; si no, el keyart del juego.
// Unifica el fallback usado en la ficha, las cards de Explorar y la hoja del mapa.
export function TorneoArt({ t, className = '', label = false }: { t: Pick<TorneoSample, 'juego' | 'banner'>; className?: string; label?: boolean }) {
  if (t.banner) {
    const pos = /\babsolute\b|\bfixed\b/.test(className) ? '' : 'relative'
    return (
      <div className={`${pos} overflow-hidden pointer-events-none ${className}`} aria-hidden="true">
        <img src={t.banner} alt="" className="absolute inset-0 h-full w-full object-cover" />
      </div>
    )
  }
  return <GameKeyart juegoId={t.juego} className={className} label={label} />
}
