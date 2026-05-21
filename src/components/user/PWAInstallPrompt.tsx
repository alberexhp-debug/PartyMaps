'use client'
import { useEffect, useState } from 'react'
import { Download, Share, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const STORAGE_KEY = 'fv2_pwa_install_dismissed'
const DISMISS_DAYS = 7

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)
  const [showAndroidPrompt, setShowAndroidPrompt] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    // Si ya está instalado en pantalla de inicio, no mostrar
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    if (isStandalone) return

    // Comprobar si el usuario lo desestimó recientemente
    const dismissed = localStorage.getItem(STORAGE_KEY)
    if (dismissed) {
      const fecha = parseInt(dismissed, 10)
      const diasPasados = (Date.now() - fecha) / (1000 * 60 * 60 * 24)
      if (diasPasados < DISMISS_DAYS) return
    }

    const ua = navigator.userAgent
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as Window & { MSStream?: unknown }).MSStream
    const isSafari = /Safari/i.test(ua) && !/CriOS|FxiOS/i.test(ua)

    if (isIOS && isSafari) {
      // Mostrar tooltip iOS después de unos segundos
      const t = setTimeout(() => setShowIOSInstructions(true), 4000)
      return () => clearTimeout(t)
    }

    // Android / Chrome
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowAndroidPrompt(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, Date.now().toString())
    setShowIOSInstructions(false)
    setShowAndroidPrompt(false)
  }

  const instalarAndroid = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === 'accepted') {
      setDeferredPrompt(null)
    }
    setShowAndroidPrompt(false)
  }

  if (showAndroidPrompt) {
    return (
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 animate-in slide-in-from-bottom">
        <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#E94560]/20 rounded-xl flex items-center justify-center shrink-0">
              <Download size={20} className="text-[#E94560]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Instala Fourvenues</p>
              <p className="text-xs text-[#A0A0B8] mt-0.5">
                Acceso rápido desde tu pantalla de inicio y notificaciones.
              </p>
              <div className="flex gap-2 mt-3">
                <Button size="sm" onClick={instalarAndroid}>
                  <Download size={13} /> Instalar
                </Button>
                <button onClick={dismiss} className="text-xs text-[#505065] px-3">
                  Ahora no
                </button>
              </div>
            </div>
            <button onClick={dismiss} className="text-[#505065] -mt-1">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (showIOSInstructions) {
    return (
      <div className="fixed inset-x-0 bottom-24 z-40 px-4 animate-in slide-in-from-bottom">
        <div className="bg-[#1A1A2E] border border-[#2A2A3E] rounded-2xl p-4 shadow-2xl">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-[#4F8EF7]/20 rounded-xl flex items-center justify-center shrink-0">
              <Share size={20} className="text-[#4F8EF7]" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-white text-sm">Añade Fourvenues a tu pantalla</p>
              <p className="text-xs text-[#A0A0B8] mt-1 leading-relaxed">
                Pulsa <Share size={11} className="inline mb-0.5" /> abajo en Safari y luego{' '}
                <span className="inline-flex items-center gap-1">
                  <Plus size={11} className="inline" /> &laquo;Añadir a inicio&raquo;
                </span>.
                Las notificaciones solo funcionan instalada.
              </p>
              <button onClick={dismiss} className="text-xs text-[#E94560] mt-3">
                Entendido
              </button>
            </div>
            <button onClick={dismiss} className="text-[#505065] -mt-1">
              <X size={18} />
            </button>
          </div>
        </div>
      </div>
    )
  }

  return null
}
