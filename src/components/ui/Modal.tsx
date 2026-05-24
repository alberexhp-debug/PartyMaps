'use client'
import { cn } from '@/lib/utils'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  className?: string
  size?: 'sm' | 'md' | 'lg' | 'full'
}

export function Modal({ open, onClose, title, children, className, size = 'md' }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!open) return null

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', full: 'max-w-full h-full' }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center animate-fade-in">
      <div ref={overlayRef} className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className={cn(
        'relative w-full glass-strong shadow-2xl animate-slide-up',
        'rounded-t-3xl sm:rounded-2xl',
        sizes[size],
        className
      )}>
        {title && (
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/8">
            <h2 className="text-lg font-semibold text-white text-display">{title}</h2>
            <button onClick={onClose} aria-label="Cerrar" className="p-1.5 rounded-lg text-[#A0A0B8] hover:text-white hover:bg-white/10 transition-colors">
              <X size={20} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

// Bottom Sheet — optimizado para móvil
interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  snapPoints?: boolean
}

export function BottomSheet({ open, onClose, children, className }: BottomSheetProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={cn(
        'absolute bottom-0 left-0 right-0 glass-strong rounded-t-3xl animate-slide-up',
        'max-h-[90vh] overflow-y-auto',
        className
      )}>
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-white/20 rounded-full" />
        </div>
        {children}
      </div>
    </div>
  )
}
