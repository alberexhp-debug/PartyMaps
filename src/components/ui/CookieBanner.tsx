'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, Settings, X } from 'lucide-react'
import { Button } from './Button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'pm_cookie_consent_v1'

export interface CookieConsent {
  esenciales: true
  analiticas: boolean
  marketing: boolean
  v: number
  fecha: string
}

/**
 * Recupera el consentimiento guardado. Devuelve null si el usuario aún no decidió.
 * Llamable desde otros módulos para condicionar carga de analytics/scripts.
 */
export function getCookieConsent(): CookieConsent | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as CookieConsent
  } catch {
    return null
  }
}

function guardar(consent: CookieConsent) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(consent))
  window.dispatchEvent(new CustomEvent('pm:cookie-consent', { detail: consent }))
}

export function CookieBanner() {
  const [mostrar, setMostrar] = useState(false)
  const [detalles, setDetalles] = useState(false)
  const [analiticas, setAnaliticas] = useState(true)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    setMostrar(getCookieConsent() === null)
  }, [])

  const aceptarTodo = () => {
    guardar({ esenciales: true, analiticas: true, marketing: true, v: 1, fecha: new Date().toISOString() })
    setMostrar(false)
  }

  const rechazarOpcionales = () => {
    guardar({ esenciales: true, analiticas: false, marketing: false, v: 1, fecha: new Date().toISOString() })
    setMostrar(false)
  }

  const guardarPersonalizado = () => {
    guardar({ esenciales: true, analiticas, marketing, v: 1, fecha: new Date().toISOString() })
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    {/* z-40: SIEMPRE por debajo de los modales (z-50). Con z-50 quedaba ENCIMA
        del onboarding tapando sus botones: la primera visita se quedaba sin
        clics posibles (pantalla "secuestrada"). */}
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:p-4 animate-slide-up safe-bottom pointer-events-none">
      <div className="relative max-w-2xl mx-auto glass-strong rounded-2xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.7)] pointer-events-auto">
        <button
          onClick={rechazarOpcionales}
          aria-label="Cerrar"
          className="absolute top-3 right-3 w-8 h-8 rounded-lg text-[#A0A0B8] hover:text-white hover:bg-white/8 flex items-center justify-center transition-colors"
        >
          <X size={16} />
        </button>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B6FF3A]/15 border border-[#B6FF3A]/30 flex items-center justify-center shrink-0">
              <Cookie size={18} className="text-[#B6FF3A]" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold text-[#B6FF3A] uppercase tracking-[0.2em]">Privacidad</p>
              <h2 className="text-lg font-bold text-white text-display tracking-tight mt-0.5">Usamos cookies para que esto funcione</h2>
              <p className="text-sm text-[#A0A0B8] mt-1.5 leading-relaxed">
                Las esenciales hacen funcionar la sesión y el mapa. Las analíticas nos ayudan a mejorar.
                Las de marketing son para personalizar promos. Puedes elegir qué aceptas.
                Más info en nuestra <Link href="/privacidad" className="text-[#B6FF3A] underline-offset-2 hover:underline">Política de privacidad</Link>.
              </p>
            </div>
          </div>

          {detalles && (
            <div className="mt-4 space-y-2.5">
              <ToggleRow
                label="Esenciales"
                hint="Imprescindibles para iniciar sesión, recordar tus preferencias y proteger la app."
                value={true}
                fijo
              />
              <ToggleRow
                label="Analíticas"
                hint="Nos ayudan a entender qué pantallas se usan más. No te identifican."
                value={analiticas}
                onChange={setAnaliticas}
              />
              <ToggleRow
                label="Marketing"
                hint="Permiten personalizar promos de locales en función de tus intereses."
                value={marketing}
                onChange={setMarketing}
              />
            </div>
          )}

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            {!detalles ? (
              <>
                <Button fullWidth size="md" onClick={aceptarTodo}>
                  Aceptar todo
                </Button>
                <Button fullWidth size="md" variant="glass" onClick={rechazarOpcionales}>
                  Solo esenciales
                </Button>
                <Button size="md" variant="ghost" onClick={() => setDetalles(true)} className="sm:w-auto">
                  <Settings size={15} /> Personalizar
                </Button>
              </>
            ) : (
              <>
                <Button fullWidth size="md" onClick={guardarPersonalizado}>
                  Guardar selección
                </Button>
                <Button size="md" variant="ghost" onClick={() => setDetalles(false)} className="sm:w-auto">
                  Volver
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, hint, value, onChange, fijo }: {
  label: string; hint: string; value: boolean; onChange?: (v: boolean) => void; fijo?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 bg-white/4 border border-white/8 rounded-xl">
      <div className="flex-1">
        <p className="text-sm font-semibold text-white">{label}</p>
        <p className="text-xs text-[#A0A0B8] leading-snug mt-0.5">{hint}</p>
      </div>
      <button
        onClick={() => !fijo && onChange?.(!value)}
        disabled={fijo}
        className={cn(
          'w-11 h-6 rounded-full transition-colors relative shrink-0',
          fijo ? 'bg-[#27AE60] cursor-not-allowed' : value ? 'bg-[#B6FF3A]' : 'bg-white/12'
        )}
        aria-label={`${label} ${value ? 'activado' : 'desactivado'}`}
      >
        <span className={cn(
          'absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all',
          value ? 'left-[22px]' : 'left-0.5'
        )} />
      </button>
    </div>
  )
}
