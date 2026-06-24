import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'gold' | 'violet' | 'holo'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const variants = {
    default: 'bg-white/8 text-[#A0A0B8] border border-white/8',
    success: 'bg-[#27AE60]/15 text-[#27AE60] border border-[#27AE60]/25',
    warning: 'bg-[#F39C12]/15 text-[#F39C12] border border-[#F39C12]/25',
    danger: 'bg-[#B6FF3A]/15 text-[#B6FF3A] border border-[#B6FF3A]/25',
    blue: 'bg-[#4F8EF7]/15 text-[#4F8EF7] border border-[#4F8EF7]/25',
    gold: 'bg-[#D4A84B]/15 text-[#D4A84B] border border-[#D4A84B]/25',
    violet: 'bg-[#7C5CFF]/15 text-[#7C5CFF] border border-[#7C5CFF]/25',
    holo: 'holo-bg text-white border border-white/20',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-xs',
  }
  return (
    <span className={cn(
      'inline-flex items-center gap-1 rounded-full font-medium tracking-wide',
      variants[variant],
      sizes[size],
      className
    )}>
      {children}
    </span>
  )
}
