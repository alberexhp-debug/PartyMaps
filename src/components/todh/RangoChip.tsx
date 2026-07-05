'use client'
import { rangoDe } from '@/lib/torneos/rangos'

// Placa de rango competitivo (E → S). Tamaños: sm (listas), md (fichas), lg (perfil).
export function RangoChip({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' | 'lg' }) {
  const r = rangoDe(rating)
  const dims = size === 'lg' ? { h: 34, px: 12, fs: 16 } : size === 'md' ? { h: 26, px: 9, fs: 13 } : { h: 20, px: 7, fs: 11 }
  return (
    <span className="inline-flex items-center justify-center rounded-lg font-black text-display shrink-0"
      title={`Rango ${r.letra} · ${r.puntos}/${r.umbral} pts`}
      style={{
        height: dims.h, padding: `0 ${dims.px}px`, fontSize: dims.fs,
        color: r.color, background: `${r.color}1A`, border: `1.5px solid ${r.color}66`,
        letterSpacing: '0.02em',
      }}>
      {r.letra}
    </span>
  )
}

// Barra de progreso hacia el siguiente rango (perfil propio)
export function RangoProgreso({ rating }: { rating: number }) {
  const r = rangoDe(rating)
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] font-semibold">
        <span className="uppercase tracking-[0.14em] text-[#8B8BA8]">Progreso de rango</span>
        <span className="font-mono-num" style={{ color: r.color }}>{r.puntos}/{r.umbral} pts</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${r.progreso}%`, background: r.color }} />
      </div>
    </div>
  )
}
