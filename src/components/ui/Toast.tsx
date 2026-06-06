'use client'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'
interface ToastAccion { label: string; onClick: () => void }

interface Toast {
  id: string
  type: ToastType
  message: string
  accion?: ToastAccion
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void
  success: (message: string) => void
  error: (message: string) => void
  warning: (message: string) => void
  info: (message: string) => void
  /** Toast con un botón de acción embebido (p. ej. "Listo. ¿Publicamos? [Publicar]"). Dura más. */
  conAccion: (message: string, accion: ToastAccion, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const cerrar = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), [])

  const addToast = useCallback((message: string, type: ToastType = 'info', accion?: ToastAccion) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, message, accion }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), accion ? 9000 : 4000)
  }, [])

  const value: ToastContextValue = {
    toast: addToast,
    success: (m) => addToast(m, 'success'),
    error: (m) => addToast(m, 'error'),
    warning: (m) => addToast(m, 'warning'),
    info: (m) => addToast(m, 'info'),
    conAccion: (m, accion, type = 'success') => addToast(m, type, accion),
  }

  const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info }
  const colors = {
    success: 'border-[#27AE60]/40 bg-[#27AE60]/10 text-[#27AE60]',
    error: 'border-[#E94560]/40 bg-[#E94560]/10 text-[#E94560]',
    warning: 'border-[#F39C12]/40 bg-[#F39C12]/10 text-[#F39C12]',
    info: 'border-[#4F8EF7]/40 bg-[#4F8EF7]/10 text-[#4F8EF7]',
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
        {toasts.map(t => {
          const Icon = icons[t.type]
          return (
            <div key={t.id} className={cn(
              'flex items-start gap-3 p-4 rounded-xl border animate-slide-up backdrop-blur-sm',
              colors[t.type]
            )}>
              <Icon size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white">{t.message}</p>
                {t.accion && (
                  <button
                    onClick={() => { t.accion!.onClick(); cerrar(t.id) }}
                    className="mt-2 inline-flex items-center h-8 px-3 rounded-lg bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-semibold text-white transition-colors"
                  >
                    {t.accion.label}
                  </button>
                )}
              </div>
              <button onClick={() => cerrar(t.id)}>
                <X size={14} className="text-[#A0A0B8]" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
