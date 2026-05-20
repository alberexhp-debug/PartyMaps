'use client'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  fullWidth?: boolean
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  className, variant = 'primary', size = 'md', loading, fullWidth, children, disabled, ...props
}, ref) => {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none'
  const variants = {
    primary: 'bg-[#E94560] text-white hover:bg-[#d63a52] shadow-lg shadow-[#E94560]/20',
    secondary: 'bg-[#2A2A3E] text-white hover:bg-[#3A3A4E]',
    ghost: 'bg-transparent text-[#A0A0B8] hover:bg-[#1A1A2E] hover:text-white',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    outline: 'border border-[#2A2A3E] text-white hover:bg-[#1A1A2E]',
  }
  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-11 px-5 text-base',
    lg: 'h-13 px-6 text-lg',
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
