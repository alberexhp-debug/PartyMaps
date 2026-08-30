import type { CSSProperties } from 'react'
import { CREW_EMBLEM_GLYPHS } from './crewEmblemGlyphs'

// ─────────────────────────────────────────────────────────────────────────────
// Emblema de nivel de crew. Misma carcasa que GameIcon: variantes 'bare'
// (solo glifo), 'tile' (cuadrado redondeado, receta de los tiles de logros
// del perfil: `${color}1A` + borde `${color}40`) y 'medallion' (redonda).
// El color sale SIEMPRE del nivel, nunca del tema: funciona igual en oscuro
// y en claro ([data-pt="light"]). Sin textos: los nombres de nivel los
// pondrá i18n en la fase de crews.
// ─────────────────────────────────────────────────────────────────────────────

export type NivelCrew = 1 | 2 | 3 | 4 | 5
export type CrewEmblemaVariant = 'bare' | 'tile' | 'medallion'

// Orden ascendente; el índice `nivel - 1` es válido por construcción.
export const NIVELES_CREW: { nivel: NivelCrew; color: string }[] = [
  { nivel: 1, color: '#C08B5C' }, // bronce
  { nivel: 2, color: '#B8C4D4' }, // plata
  { nivel: 3, color: '#E0BE63' }, // oro
  { nivel: 4, color: '#7DD3FC' }, // diamante
  { nivel: 5, color: '#B6FF3A' }, // élite
]

// Umbrales PROVISIONALES sobre la escala de rating 0-3000 (puntos.ts). Cada
// entrada es el mínimo para alcanzar el nivel; se ajustarán en la fase de
// crews sin tocar `nivelPorPuntuacion`.
export const UMBRALES_NIVEL_CREW: { nivel: NivelCrew; min: number }[] = [
  { nivel: 1, min: 0 },
  { nivel: 2, min: 1200 },
  { nivel: 3, min: 1700 },
  { nivel: 4, min: 2100 },
  { nivel: 5, min: 2500 },
]

export function nivelPorPuntuacion(p: number): NivelCrew {
  let nivel: NivelCrew = 1
  for (const u of UMBRALES_NIVEL_CREW) if (p >= u.min) nivel = u.nivel
  return nivel // NaN o negativos caen en 1
}

export function CrewEmblema({
  nivel,
  size = 24,
  variant = 'bare',
  className = '',
  title,
}: {
  nivel: NivelCrew
  size?: number
  variant?: CrewEmblemaVariant
  className?: string
  title?: string
}) {
  // Datos de runtime pueden traer un nivel fuera de rango: degradar a 1.
  const n = (Number.isInteger(nivel) && nivel >= 1 && nivel <= 5 ? nivel : 1) as NivelCrew
  const c = NIVELES_CREW[n - 1].color

  // Como en GameIcon: en bare el glifo ocupa `size` entero; en tile/medallion
  // `size` es la caja y el glifo va dentro al ~60%.
  const enCaja = variant !== 'bare'
  const px = enCaja ? Math.round(size * 0.6) : size

  const caja: CSSProperties =
    variant === 'tile'
      ? { background: `${c}1A`, border: `1px solid ${c}40`, borderRadius: Math.round(size * 0.3) }
      : variant === 'medallion'
        ? { background: `${c}26`, border: `1px solid ${c}66`, borderRadius: 9999 }
        : {}

  return (
    <span
      title={title}
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{ width: size, height: size, ...caja }}
    >
      <svg
        viewBox="0 0 24 24"
        width={px}
        height={px}
        fill="none"
        stroke={c}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        {CREW_EMBLEM_GLYPHS[n]}
      </svg>
    </span>
  )
}
