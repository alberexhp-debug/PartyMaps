import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'blue' | 'gold'
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, variant = 'default', size = 'md', className }: BadgeProps) {
  const variants = {
    default: 'bg-[#2A2A3E] text-[#A0A0B8]',
    success: 'bg-[#27AE60]/20 text-[#27AE60]',
    warning: 'bg-[#F39C12]/20 text-[#F39C12]',
    danger: 'bg-[#E94560]/20 text-[#E94560]',
    blue: 'bg-[#4F8EF7]/20 text-[#4F8EF7]',
    gold: 'bg-yellow-500/20 text-yellow-400',
  }
  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs',
  }
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full font-medium', variants[variant], sizes[size], className)}>
      {children}
    </span>
  )
}
