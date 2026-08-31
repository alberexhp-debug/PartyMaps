'use client'
import { Star } from '@/components/todh/iconosTorneum'
import { cn } from '@/lib/utils'

interface StarRatingProps {
  value: number
  max?: number
  onChange?: (v: number) => void
  size?: number
  className?: string
}

export function StarRating({ value, max = 5, onChange, size = 18, className }: StarRatingProps) {
  return (
    <div className={cn('flex items-center gap-0.5', className)}>
      {Array.from({ length: max }, (_, i) => i + 1).map(star => (
        <button
          key={star}
          type="button"
          aria-label={`${star} ${star === 1 ? 'estrella' : 'estrellas'}`}
          disabled={!onChange}
          onClick={() => onChange?.(star)}
          className={cn('transition-transform', onChange && 'hover:scale-110 cursor-pointer')}
        >
          <Star
            size={size}
            className={star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-[#6B6B85]'}
          />
        </button>
      ))}
    </div>
  )
}

export function StarDisplay({ value, count }: { value: number; count?: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <Star size={14} className="fill-yellow-400 text-yellow-400" />
      <span className="text-sm font-semibold text-white">{value.toFixed(1)}</span>
      {count !== undefined && <span className="text-sm text-[#6B6B85]">({count})</span>}
    </div>
  )
}
