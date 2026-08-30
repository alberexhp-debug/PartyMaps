'use client'
import { useState } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { ArrowLeft, Check, Crown } from 'lucide-react'
import { useT, conParams } from '@/lib/i18n'

// Tiers de usuario (reunión 5-jul): se pagan (4,99/7,99/9,99) o se regalan por
// rango alto. Desbloquean torneos tier, perfil destacado y ofertas de locales.
// Las ventajas son CLAVES i18n (F9): se traducen con tr() al pintarlas.
export const TIERS_USUARIO = [
  { id: 'Oro' as const, precio: 4.99, color: '#E0BE63', regaloRango: 'A', ventajas: ['tier.vOro1', 'tier.vOro2', 'tier.vOro3'] as const },
  { id: 'Platino' as const, precio: 7.99, color: '#67E8F9', regaloRango: 'A+', ventajas: ['tier.vPlat1', 'tier.vPlat2', 'tier.vPlat3'] as const },
  { id: 'Diamante' as const, precio: 9.99, color: '#A78BFA', regaloRango: 'S', ventajas: ['tier.vDia1', 'tier.vDia2', 'tier.vDia3'] as const },
]
const ORDEN: Record<string, number> = { Oro: 1, Platino: 2, Diamante: 3 }

export function tieneAcceso(tierUsuario: string | null, requerido: string): boolean {
  if (!tierUsuario) return false
  return (ORDEN[tierUsuario] || 0) >= (ORDEN[requerido] || 99)
}

export function TierSheet({ requerido, onClose }: { requerido?: string; onClose: () => void }) {
  const { t: tr } = useT()
  const tierActual = useDemoStore(s => s.tierUsuario)
  const suscribir = useDemoStore(s => s.suscribirTier)
  const [ok, setOk] = useState<string | null>(null)

  const elegir = (t: 'Oro' | 'Platino' | 'Diamante') => {
    suscribir(t)
    setOk(t)
    setTimeout(onClose, 1600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto p-5">
        {ok ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={26} className="text-[#B6FF3A]" /></div>
            <p className="text-lg font-bold text-white text-display">{conParams(tr('ntf.tierT'), { tier: ok })}</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">{tr('tier.okSub')}</p>
          </div>
        ) : (
          <>
            {/* Botón Atrás (sección 6.7): devuelve al perfil sin elegir tier */}
            <div className="flex items-center gap-2.5">
              <button onClick={onClose} aria-label={tr('comun.atras')}
                className="h-9 w-9 -ml-1 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center text-[#B8B8CC] hover:text-white transition-colors shrink-0">
                <ArrowLeft size={17} />
              </button>
              <p className="text-lg font-bold text-white text-display flex items-center gap-2"><Crown size={18} className="text-[#E0BE63]" /> {tr('tier.titulo')}</p>
            </div>
            <p className="mt-1 text-[13px] text-[#B8B8CC]">
              {requerido ? <>{tr('tier.pide')} <strong className="text-white">tier {requerido}</strong>. </> : null}
              {tr('tier.intro')}
            </p>
            <div className="mt-4 space-y-2">
              {TIERS_USUARIO.map(t => {
                const activo = tierActual === t.id
                const destacado = requerido === t.id
                return (
                  <div key={t.id} className={`rounded-2xl border p-3.5 ${destacado ? 'bg-white/[0.06]' : 'bg-white/[0.03]'}`}
                    style={{ borderColor: destacado || activo ? `${t.color}66` : 'rgba(255,255,255,0.08)' }}>
                    <div className="flex items-center gap-2">
                      <span className="font-black text-display text-[15px]" style={{ color: t.color }}>{t.id}</span>
                      {activo && <span className="text-[10px] font-bold text-[#B6FF3A] inline-flex items-center gap-1"><Check size={11} /> {tr('tier.activo')}</span>}
                      <span className="ml-auto text-white font-bold font-mono-num">{t.precio.toFixed(2).replace('.', ',')}€<span className="text-[11px] text-[#8B8BA8] font-semibold">{tr('tier.mes')}</span></span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {t.ventajas.map(v => <li key={v} className="text-[12px] text-[#B8B8CC] flex items-center gap-1.5"><span className="w-1 h-1 rounded-full" style={{ background: t.color }} /> {tr(v)}</li>)}
                    </ul>
                    <div className="mt-2.5 flex items-center gap-2">
                      <button onClick={() => elegir(t.id)} disabled={activo}
                        className="flex-1 h-10 rounded-xl font-bold text-[13px] disabled:opacity-40"
                        style={{ background: t.color, color: '#0A0A0F' }}>
                        {activo ? tr('tier.actual') : `${tr('tier.activar')} ${t.id}`}
                      </button>
                      <span className="text-[10px] text-[#8B8BA8] leading-tight w-24">{tr('tier.gratisRango')} <strong style={{ color: t.color }}>{t.regaloRango}</strong></span>
                    </div>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-center text-[10px] text-[#6E6E85]">{tr('tier.demoNota')}</p>
          </>
        )}
      </div>
    </div>
  )
}
