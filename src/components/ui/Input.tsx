'use client'
import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
  iconRight?: React.ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  className, label, error, icon, iconRight, ...props
}, ref) => {
  return (
    <div className="w-full space-y-1.5">
      {label && <label className="block text-sm font-medium text-[#A0A0B8]">{label}</label>}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#505065]">{icon}</div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-12 bg-[#1A1A2E] border border-[#2A2A3E] rounded-xl text-white placeholder:text-[#505065] transition-colors',
            'focus:border-[#E94560] focus:ring-1 focus:ring-[#E94560]/30',
            icon ? 'pl-10' : 'pl-4',
            iconRight ? 'pr-10' : 'pr-4',
            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/30',
            className
          )}
          {...props}
        />
        {iconRight && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#505065]">{iconRight}</div>
        )}
      </div>
      {error && <p className="text-sm text-[#E94560]">{error}</p>}
    </div>
  )
})
Input.displayName = 'Input'
