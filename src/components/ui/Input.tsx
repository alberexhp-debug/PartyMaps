'use client'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className, label, error, icon, iconRight, hint, ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#A0A0B8]">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85] pointer-events-none">{icon}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#6B6B85] transition-all',
            'focus:border-[#B6FF3A]/60 focus:bg-white/8 focus:ring-2 focus:ring-[#B6FF3A]/20',
            'hover:border-white/15',
            icon ? 'pl-11' : 'pl-4',
            iconRight ? 'pr-11' : 'pr-4',
            error && 'border-[#B6FF3A]/60 focus:border-[#B6FF3A] focus:ring-[#B6FF3A]/30',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6B6B85]">{iconRight}</div>
        )}
      </div>
      {hint && !error && <p className="text-xs text-[#6B6B85]">{hint}</p>}
      {error && <p className="text-sm text-[#B6FF3A]">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
