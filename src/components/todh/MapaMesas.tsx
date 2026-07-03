'use client'
import type { Mesa } from '@/lib/torneos/sample'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { Monitor, Tv, Gamepad2, Joystick, Grid2x2 } from 'lucide-react'

// Plano de mesas del local, compartido por: el TO en modo directo (estados en vivo),
// el jugador cuando le toca (su mesa resaltada y vibrando) y la sede (editor).
// Cuadrícula de 8×5; cada mesa ocupa 1 celda (2 si es alargada) con su forma.

export type EstadoMesa = 'libre' | 'ocupada' | 'disputa' | 'caida'

export const ESTADO_MESA: Record<EstadoMesa, { color: string; label: string; clave: ClaveI18n }> = {
  libre: { color: '#4F8EF7', label: 'Libre', clave: 'em.libre' },
  ocupada: { color: '#B6FF3A', label: 'En juego', clave: 'em.ocupada' },
  disputa: { color: '#FF8A5C', label: 'Disputa', clave: 'em.disputa' },
  caida: { color: '#FF6076', label: 'Caída', clave: 'em.caida' },
}

const COLS = 8
const ROWS = 5

const ICONO_TIPO: Record<Mesa['tipo'], typeof Monitor> = {
  consola: Gamepad2, pc: Monitor, stream: Tv, arcade: Joystick, mesa: Grid2x2,
}

export function MapaMesas({
  mesas, estados, ocupantes, destacada, seleccionada, onPick, onCeldaVacia, className = '',
}: {
  mesas: Mesa[]
  estados?: Record<number, EstadoMesa>       // sin entrada = mesa fuera del torneo (neutra)
  ocupantes?: Record<number, string>          // "Kaze vs Volt" bajo el número
  destacada?: number                          // la mesa del jugador: resaltada + pulso
  seleccionada?: number                       // selección del TO/sede (aro blanco)
  onPick?: (m: Mesa) => void
  onCeldaVacia?: (x: number, y: number) => void  // modo editor: añadir mesa
  className?: string
}) {
  const { t: tr } = useT()
  const ocupadasXY = new Set<string>()
  for (const m of mesas) {
    ocupadasXY.add(`${m.x},${m.y}`)
    if (m.forma === 'alargada') ocupadasXY.add(`${m.x + 1},${m.y}`)
  }

  return (
    <div className={`relative w-full rounded-2xl border border-white/10 overflow-hidden ${className}`}
      style={{ aspectRatio: '8/5', background: 'radial-gradient(120% 120% at 50% 0%, #1A1E2A 0%, #10131B 70%)' }}>
      {/* Rejilla de suelo */}
      <div className="absolute inset-0 opacity-[0.55]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
        backgroundSize: `${100 / COLS}% ${100 / ROWS}%`,
      }} />
      {/* Entrada del local, para orientar el plano */}
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-t-md bg-white/8 text-[8px] uppercase tracking-[0.2em] text-[#8B8BA8] font-bold">Entrada</span>

      {/* Celdas vacías clicables (editor) */}
      {onCeldaVacia && Array.from({ length: COLS * ROWS }).map((_, i) => {
        const x = i % COLS, y = Math.floor(i / COLS)
        if (ocupadasXY.has(`${x},${y}`)) return null
        return (
          <button key={`c${i}`} onClick={() => onCeldaVacia(x, y)} aria-label={`Añadir mesa en ${x},${y}`}
            className="absolute rounded-lg border border-dashed border-transparent hover:border-white/25 hover:bg-white/4 transition-colors group"
            style={{ left: `${(x / COLS) * 100}%`, top: `${(y / ROWS) * 100}%`, width: `${100 / COLS}%`, height: `${100 / ROWS}%` }}>
            <span className="opacity-0 group-hover:opacity-100 text-[#8B8BA8] text-sm font-bold transition-opacity">+</span>
          </button>
        )
      })}

      {mesas.map(m => {
        const estado = estados?.[m.n]
        const c = estado ? ESTADO_MESA[estado] : null
        const esDestacada = destacada === m.n
        const esSel = seleccionada === m.n
        const Icono = ICONO_TIPO[m.tipo]
        const w = (m.forma === 'alargada' ? 2 : 1) / COLS * 100
        const dim = !!destacada && !esDestacada
        const borde = esDestacada ? '#B6FF3A' : c ? c.color : 'rgba(255,255,255,0.16)'
        const fondo = esDestacada
          ? 'radial-gradient(120% 120% at 35% 25%, #2A3A18 0%, #16200C 75%)'
          : c ? `radial-gradient(120% 120% at 35% 25%, ${c.color}2E 0%, #141822 78%)`
          : 'radial-gradient(120% 120% at 35% 25%, #20242F 0%, #141822 78%)'
        return (
          <button key={m.n} onClick={() => onPick?.(m)} disabled={!onPick}
            aria-label={`Mesa ${m.n}${estado ? ` · ${tr(c!.clave)}` : ''}`}
            className="absolute p-[3.5%] sm:p-[3%] transition-all"
            style={{
              left: `${(m.x / COLS) * 100}%`, top: `${(m.y / ROWS) * 100}%`,
              width: `${w}%`, height: `${100 / ROWS}%`,
              opacity: dim ? 0.38 : 1, zIndex: esDestacada ? 5 : 1,
              padding: 4,
            }}>
            <span className="relative flex h-full w-full flex-col items-center justify-center gap-0.5"
              style={{
                borderRadius: m.forma === 'redonda' ? '9999px' : 10,
                background: fondo,
                border: `2px solid ${borde}`,
                boxShadow: esDestacada
                  ? '0 0 0 4px rgba(182,255,58,0.25), 0 0 24px -4px rgba(182,255,58,0.8)'
                  : esSel ? '0 0 0 3px rgba(255,255,255,0.35)'
                  : estado === 'disputa' ? `0 0 16px -4px ${c!.color}AA`
                  : '0 4px 12px rgba(0,0,0,0.35)',
                animation: esDestacada || estado === 'disputa' ? 'pulse-heat 1.4s ease-in-out infinite' : undefined,
              }}>
              <span className="flex items-center gap-1 leading-none">
                <Icono size={11} style={{ color: esDestacada ? '#B6FF3A' : c?.color || '#8B8BA8' }} />
                <span className="text-[11px] sm:text-xs font-black font-mono-num" style={{ color: esDestacada ? '#B6FF3A' : '#fff' }}>{m.n}</span>
              </span>
              {ocupantes?.[m.n]
                ? <span className="max-w-full truncate px-1 text-[7px] sm:text-[9px] font-semibold text-[#B8B8CC] leading-none">{ocupantes[m.n]}</span>
                : <span className="text-[7px] sm:text-[9px] font-semibold leading-none" style={{ color: c?.color || '#5A5A70' }}>{c ? tr(c.clave) : `${m.plazas} pl.`}</span>}
            </span>
          </button>
        )
      })}
    </div>
  )
}

// Leyenda compacta de estados para acompañar al plano.
export function LeyendaMesas({ conNeutra = false }: { conNeutra?: boolean }) {
  const { t: tr } = useT()
  return (
    <div className="flex items-center gap-3 flex-wrap">
      {(Object.keys(ESTADO_MESA) as EstadoMesa[]).map(k => (
        <span key={k} className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8B8BA8]">
          <span className="w-2 h-2 rounded-full" style={{ background: ESTADO_MESA[k].color }} /> {tr(ESTADO_MESA[k].clave)}
        </span>
      ))}
      {conNeutra && (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#8B8BA8]">
          <span className="w-2 h-2 rounded-full bg-white/25" /> {tr('em.fuera')}
        </span>
      )}
    </div>
  )
}
