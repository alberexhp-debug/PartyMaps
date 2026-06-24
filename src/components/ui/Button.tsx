'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline' | 'holo' | 'glass'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props
}, ref) => {
  const base = 'relative inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed select-none overflow-hidden'

  const variants = {
    primary: 'bg-[#B6FF3A] text-[#0A0A0F] hover:bg-[#A6EE2B] shadow-[0_8px_24px_-8px_rgba(182, 255, 58,0.6)] hover:shadow-[0_12px_28px_-6px_rgba(182, 255, 58,0.7)]',
    secondary: 'bg-white/10 text-white hover:bg-white/15 border border-white/10',
    ghost: 'bg-transparent text-[#A0A0B8] hover:bg-white/5 hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-white/15 text-white hover:bg-white/5 hover:border-white/25',
    holo: 'text-white holo-bg shadow-[0_8px_24px_-8px_rgba(124,92,255,0.5)] hover:brightness-110',
    glass: 'glass text-white hover:bg-white/10',
  }
  const sizes = {
    sm: 'h-9 px-3.5 text-sm',
    md: 'h-11 px-5 text-[15px]',
    lg: 'h-13 px-6 text-base',
    xl: 'h-14 px-7 text-lg',
  }
  return (
    <button
      ref={ref}
      className={cn(base, variants[variant], sizes[size], fullWidth && 'w-full', className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" />}
      {children}
    </button>
  )
})
Button.displayName = 'Button'
