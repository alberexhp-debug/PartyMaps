/**
 * Ilustraciones SVG abstractas para empty states. Más personalidad que un
 * icono lucide genérico. Todas usan la paleta TODH y se animan.
 */

interface IllustrationProps {
  className?: string
  size?: number
}

/** Bola de discoteca facetada con halo neón — para empty de explorar/locales */
export function IlustracionBola({ className, size = 120 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={className}>
      <defs>
        <radialGradient id="bola-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#B6FF3A" stopOpacity="0.6" />
          <stop offset="60%" stopColor="#7C5CFF" stopOpacity="0.25" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
        <linearGradient id="bola-rim" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#C9FF6B" />
          <stop offset="50%" stopColor="#7C5CFF" />
          <stop offset="100%" stopColor="#4F8EF7" />
        </linearGradient>
      </defs>
      {/* Halo */}
      <circle cx="80" cy="80" r="74" fill="url(#bola-halo)">
        <animate attributeName="r" values="70;76;70" dur="3s" repeatCount="indefinite" />
      </circle>
      {/* Bola */}
      <circle cx="80" cy="82" r="44" fill="#14142A" stroke="url(#bola-rim)" strokeWidth="2" />
      {/* Facetas */}
      <g opacity="0.7" stroke="#FAFAFC" strokeWidth="0.7" fill="none">
        <ellipse cx="80" cy="82" rx="44" ry="14" />
        <ellipse cx="80" cy="82" rx="44" ry="28" />
        <line x1="80" y1="38" x2="80" y2="126" />
        <line x1="36" y1="82" x2="124" y2="82" />
        <line x1="48" y1="50" x2="112" y2="114" />
        <line x1="112" y1="50" x2="48" y2="114" />
      </g>
      {/* Diamantes brillantes */}
      <circle cx="68" cy="62" r="3" fill="#EEFCD9">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="98" cy="78" r="2" fill="#FBE08F">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="76" cy="100" r="2.5" fill="#A8D5FF">
        <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/** Entradas/tickets apilados con perforación — para empty de /entradas */
export function IlustracionTickets({ className, size = 120 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="ticket-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B6FF3A" />
          <stop offset="100%" stopColor="#7C5CFF" />
        </linearGradient>
        <radialGradient id="ticket-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#B6FF3A" stopOpacity="0.45" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="74" fill="url(#ticket-halo)" />
      {/* Ticket trasero */}
      <g transform="rotate(-8 80 80)">
        <rect x="32" y="58" width="96" height="50" rx="10" fill="#1A1A30" stroke="rgba(255,255,255,0.12)" />
        <circle cx="62" cy="83" r="5" fill="#06060C" />
        <circle cx="98" cy="83" r="5" fill="#06060C" />
        <line x1="62" y1="83" x2="98" y2="83" stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" />
      </g>
      {/* Ticket frontal */}
      <g transform="rotate(6 80 80)">
        <rect x="32" y="62" width="96" height="50" rx="10" fill="url(#ticket-grad)" />
        <circle cx="62" cy="87" r="5" fill="#06060C" />
        <circle cx="98" cy="87" r="5" fill="#06060C" />
        <line x1="62" y1="87" x2="98" y2="87" stroke="rgba(255,255,255,0.5)" strokeDasharray="3 3" />
        <text x="44" y="79" fill="#fff" fontSize="9" fontWeight="800" fontFamily="Inter, sans-serif" letterSpacing="0.15em">T</text>
        <text x="44" y="103" fill="#fff" fontSize="6" fontWeight="600" fontFamily="Inter, sans-serif" letterSpacing="0.15em" opacity="0.7">ADMIT</text>
        <text x="100" y="103" fill="#fff" fontSize="6" fontWeight="600" fontFamily="Inter, sans-serif" letterSpacing="0.15em" opacity="0.7">ONE</text>
      </g>
    </svg>
  )
}

/** Antena radar / corazón con onda — para empty de /suscritos */
export function IlustracionRadar({ className, size = 120 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={className}>
      <defs>
        <radialGradient id="radar-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#7C5CFF" stopOpacity="0.5" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="74" fill="url(#radar-halo)" />
      {/* Ondas concéntricas */}
      {[28, 44, 60].map((r, i) => (
        <circle key={r} cx="80" cy="80" r={r} fill="none" stroke="#7C5CFF" strokeWidth="1.5" opacity={0.6 - i * 0.18}>
          <animate attributeName="r" values={`${r};${r + 6};${r}`} dur={`${2 + i * 0.4}s`} repeatCount="indefinite" />
        </circle>
      ))}
      {/* Punto central */}
      <circle cx="80" cy="80" r="10" fill="#7C5CFF" />
      <circle cx="80" cy="80" r="6" fill="#FAFAFC" />
      {/* Pings */}
      <circle cx="118" cy="58" r="3" fill="#B6FF3A">
        <animate attributeName="opacity" values="1;0;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="46" cy="98" r="2.5" fill="#4F8EF7">
        <animate attributeName="opacity" values="0;1;0" dur="2.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="108" cy="118" r="2" fill="#FBE08F">
        <animate attributeName="opacity" values="1;0;1" dur="1.8s" repeatCount="indefinite" />
      </circle>
    </svg>
  )
}

/** Estrellas brillantes — para empty de planes/valoraciones */
export function IlustracionEstrellas({ className, size = 120 }: IllustrationProps) {
  return (
    <svg viewBox="0 0 160 160" width={size} height={size} className={className}>
      <defs>
        <linearGradient id="star-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FBE08F" />
          <stop offset="100%" stopColor="#D4A84B" />
        </linearGradient>
        <radialGradient id="star-halo" cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor="#FBE08F" stopOpacity="0.4" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
      <circle cx="80" cy="80" r="74" fill="url(#star-halo)" />
      <path d="M80 36 L88 70 L122 78 L88 86 L80 124 L72 86 L38 78 L72 70 Z" fill="url(#star-grad)" />
      <circle cx="48" cy="50" r="2.5" fill="#FAFAFC">
        <animate attributeName="opacity" values="1;0.3;1" dur="1.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="120" cy="108" r="2" fill="#FAFAFC">
        <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="116" cy="42" r="1.5" fill="#EEFCD9" />
      <circle cx="42" cy="118" r="2" fill="#EEFCD9" />
    </svg>
  )
}
