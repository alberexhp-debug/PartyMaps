import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  variant?: 'solid' | 'glass' | 'glass-strong' | 'glass-subtle' | 'flat'
  interactive?: boolean
}

export function Card({ className, elevated, variant = 'solid', interactive, children, ...props }: CardProps) {
  const variantClasses = {
    solid: 'bg-[#171C27] border border-white/10',
    glass: 'glass',
    'glass-strong': 'glass-strong',
    'glass-subtle': 'glass-subtle',
    flat: 'bg-transparent border border-white/5',
  }
  return (
    <div
      className={cn(
        'rounded-2xl',
        variantClasses[variant],
        elevated && 'glow-soft',
        interactive && 'transition-all duration-200 hover:border-white/15 hover:-translate-y-0.5 active:scale-[0.99]',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pt-5 pb-3', className)} {...props}>{children}</div>
}

export function CardBody({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('px-5 pb-5', className)} {...props}>{children}</div>
}

export function CardFooter({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-5 pb-5 pt-3 border-t border-white/5', className)} {...props}>
      {children}
    </div>
  )
}
