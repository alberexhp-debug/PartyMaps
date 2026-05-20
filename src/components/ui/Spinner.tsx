import { cn } from '@/lib/utils'

interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; className?: string }

export function Spinner({ size = 'md', className }: SpinnerProps) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-2', lg: 'w-12 h-12 border-3' }
  return (
    <div className={cn(
      'rounded-full border-[#2A2A3E] border-t-[#E94560] animate-spin',
      sizes[size], className
    )} />
  )
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-[#0D0D1A] flex items-center justify-center z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#E94560] flex items-center justify-center">
          <span className="text-2xl font-bold text-white">FV</span>
        </div>
        <Spinner size="md" />
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-[#1A1A2E] rounded-2xl border border-[#2A2A3E] overflow-hidden animate-pulse">
      <div className="h-48 bg-[#2A2A3E]" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-[#2A2A3E] rounded w-3/4" />
        <div className="h-3 bg-[#2A2A3E] rounded w-1/2" />
        <div className="h-3 bg-[#2A2A3E] rounded w-2/3" />
      </div>
    </div>
  )
}
