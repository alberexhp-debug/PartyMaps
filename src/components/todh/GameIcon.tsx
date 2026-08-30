'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { JUEGOS } from '@/lib/torneos/sample'
import { GAME_GLYPHS } from './gameGlyphs'

// ─────────────────────────────────────────────────────────────────────────────
// Icono de juego. Prioridad de resolución:
//   1. Asset del usuario en /public/assets/games/<slug>.svg (y si no, .png):
//      se pinta tal cual, respetando su color (logos oficiales de press kits).
//   2. Glifo propio integrado (gameGlyphs.tsx), del color del juego.
//   3. Juegos creados en runtime sin glifo: inicial del `corto` sobre su color.
// El color sale SIEMPRE del dato del juego (o del prop `color`); nunca del
// tema, así funciona igual en oscuro y en claro ([data-pt="light"]).
// Variantes: 'bare' (solo glifo) · 'tile' (cuadrado redondeado, receta de los
// tiles de logros) · 'medallion' (redondo, como PersonajeIcon).
// ─────────────────────────────────────────────────────────────────────────────

export type GameIconVariant = 'bare' | 'tile' | 'medallion'

// Color para juegos desconocidos (id borrado / aún no inyectado): gris medio
// neutro, legible sobre fondo oscuro y claro. No es un color de tema.
const COLOR_DESCONOCIDO = '#94A3B8'

// ¿Hay glifo propio integrado para este juego? (Los assets del usuario en
// /assets/games no se pueden saber en síncrono: se detectan al pintar.)
export function gameIconExists(juegoId: string): boolean {
  return juegoId in GAME_GLYPHS
}

const EXTENSIONES = ['svg', 'png'] as const
const assetDe = (juegoId: string, paso: number) =>
  `/assets/games/${encodeURIComponent(juegoId)}.${EXTENSIONES[paso]}`

// Cache del resultado de la sonda por juego, persistida en sessionStorage:
// cada juego se prueba UNA vez por sesión de pestaña (svg → png → no hay) y el
// resultado sobrevive a recargas — sin repetir 404s en cada página (fix QA
// 30-08: ~20 peticiones fallidas por carga). El primer render (SSR y cliente)
// es SIEMPRE el glifo propio; el asset del usuario, si existe, entra tras el
// montaje (un frame de glifo a cambio de cero mismatch de hidratación).
const cacheAssets = new Map<string, number>()
let cacheHidratada = false
const CACHE_KEY = 'todh-gameicon-sondas'
function hidratarCache() {
  if (cacheHidratada || typeof window === 'undefined') return
  cacheHidratada = true
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (raw) for (const [k, v] of Object.entries(JSON.parse(raw) as Record<string, number>)) cacheAssets.set(k, v)
  } catch { /* storage bloqueado: la cache queda solo en memoria */ }
}
function persistirCache() {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(Object.fromEntries(cacheAssets))) } catch { /* idem */ }
}

export function GameIcon({
  juegoId,
  size = 16,
  variant = 'bare',
  color,
  className = '',
  title,
}: {
  juegoId: string
  size?: number
  variant?: GameIconVariant
  color?: string // override; si se pasa, debe ser hex para tile/medallion (tintes `${color}1A`)
  className?: string
  title?: string
}) {
  const juego = JUEGOS[juegoId]
  const c = color ?? juego?.color ?? COLOR_DESCONOCIDO

  // Índice de candidato de asset (0 svg → 1 png → 2 sin asset). Arranca en
  // «sin asset» (glifo) para que SSR e hidratación coincidan; el efecto decide
  // después si hay que sondear (primera vez) o usar el resultado cacheado.
  const [asset, setAsset] = useState<{ id: string; paso: number }>(() => ({ id: juegoId, paso: EXTENSIONES.length }))
  if (asset.id !== juegoId) setAsset({ id: juegoId, paso: EXTENSIONES.length })
  useEffect(() => {
    hidratarCache()
    const conocido = cacheAssets.get(juegoId)
    const destino = conocido === undefined ? 0 : conocido
    if (destino < EXTENSIONES.length) setAsset({ id: juegoId, paso: destino })
  }, [juegoId])
  const falloAsset = () => {
    const sig = asset.paso + 1
    cacheAssets.set(juegoId, Math.max(cacheAssets.get(juegoId) ?? 0, sig))
    persistirCache()
    setAsset({ id: juegoId, paso: sig })
  }

  // Tamaño del dibujo: la variante bare ocupa `size` entero; en tile/medallion
  // `size` es la caja y el glifo va dentro al ~60%.
  const enCaja = variant !== 'bare'
  const px = enCaja ? Math.round(size * 0.6) : size

  let dibujo: React.ReactNode
  if (asset.paso < EXTENSIONES.length) {
    dibujo = (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={assetDe(juegoId, asset.paso)}
        alt=""
        width={px}
        height={px}
        draggable={false}
        onError={falloAsset}
        onLoad={() => { cacheAssets.set(juegoId, asset.paso); persistirCache() }}
        className="shrink-0 object-contain"
        style={{ width: px, height: px }}
      />
    )
  } else if (GAME_GLYPHS[juegoId]) {
    dibujo = (
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
        {GAME_GLYPHS[juegoId]}
      </svg>
    )
  } else {
    // Fallback para juegos runtime: inicial del corto sobre el color del juego.
    const inicial = (juego?.corto ?? juegoId).trim().charAt(0).toUpperCase() || '?'
    dibujo = (
      <span
        aria-hidden="true"
        className="flex items-center justify-center shrink-0 font-black select-none"
        style={{ width: px, height: px, fontSize: px * 0.92, lineHeight: 1, color: c }}
      >
        {inicial}
      </span>
    )
  }

  const caja: CSSProperties =
    variant === 'tile'
      ? { background: `${c}1A`, border: `1px solid ${c}40`, borderRadius: Math.round(size * 0.3) }
      : variant === 'medallion'
        ? { background: `${c}26`, border: `1px solid ${c}66`, borderRadius: 9999 }
        : {}

  return (
    <span
      title={title ?? juego?.nombre ?? juegoId}
      className={`inline-flex items-center justify-center shrink-0 align-middle ${className}`}
      style={{ width: size, height: size, ...caja }}
    >
      {dibujo}
    </span>
  )
}

// Sustituto de una línea del patrón «punto de color + corto»: icono bare
// pequeño + corto. Hereda la tipografía del contexto, como hacía el punto.
export function GameChip({ juegoId, size = 14, className = '' }: { juegoId: string; size?: number; className?: string }) {
  const juego = JUEGOS[juegoId]
  return (
    <span className={`inline-flex items-center gap-1.5 align-middle whitespace-nowrap ${className}`}>
      <GameIcon juegoId={juegoId} size={size} />
      {juego?.corto ?? juegoId}
    </span>
  )
}

// Sustituto de una línea del patrón píldora de juego (`${color}1F` + borde
// `${color}44` + punto + corto), ahora con el icono.
export function GameBadge({ juegoId, className = '' }: { juegoId: string; className?: string }) {
  const juego = JUEGOS[juegoId]
  const c = juego?.color ?? COLOR_DESCONOCIDO
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold whitespace-nowrap ${className}`}
      style={{ background: `${c}1F`, color: c, border: `1px solid ${c}44` }}
    >
      <GameIcon juegoId={juegoId} size={12} />
      {juego?.corto ?? juegoId}
    </span>
  )
}
