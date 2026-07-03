'use client'
import { useState } from 'react'
import type { TorneoSample, Juego } from '@/lib/torneos/sample'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { X, CreditCard, Check, ShieldCheck, Clock } from 'lucide-react'

type Props = {
  torneo: TorneoSample
  juego: Juego
  comisionPct: number
  comisionImporte: number
  total: number
  completo: boolean
  onClose: () => void
  onConfirm: () => void
}

// Hoja de checkout en una sola pantalla (mínima fricción). En demo simula el pago.
export function InscripcionSheet({ torneo, juego, comisionPct, comisionImporte, total, completo, onClose, onConfirm }: Props) {
  const [fase, setFase] = useState<'resumen' | 'pagando' | 'ok'>('resumen')
  const gratis = total === 0
  const waitlist = completo

  function pagar() {
    if (gratis || waitlist) { finalizar(); return }
    setFase('pagando')
    setTimeout(() => setFase('ok'), 1100)
    setTimeout(finalizar, 2000)
  }
  function finalizar() { onConfirm() }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={fase === 'resumen' ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-[#141822] border-t border-white/10 rounded-t-3xl pb-6 animate-slide-up-sm max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#141822] pt-3 pb-2 px-5 flex items-center justify-between z-10">
          <span className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15" />
          <p className="text-[15px] font-bold text-white mt-2">{waitlist ? 'Lista de espera' : 'Inscripción'}</p>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
        </div>

        {fase === 'ok' ? (
          <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={32} className="text-[#B6FF3A]" /></div>
            <p className="text-xl font-bold text-white text-display">{waitlist ? '¡En lista de espera!' : '¡Estás dentro!'}</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">{waitlist ? 'Te avisaremos si se libera una plaza.' : 'Tu entrada con QR ya está en tu cartera.'}</p>
          </div>
        ) : (
          <div className="px-5">
            {/* Torneo */}
            <div className="flex items-center gap-3 card-premium p-3">
              <GameKeyart juegoId={torneo.juego} label={false} className="w-14 h-14 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{torneo.nombre}</p>
                <p className="text-xs text-[#8B8BA8]">{juego.corto} · {torneo.fechaLabel}</p>
              </div>
            </div>

            {/* Desglose */}
            {!waitlist && (
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-[#B8B8CC]">Inscripción</span><span className="text-white font-mono-num">{torneo.precio === 0 ? 'Gratis' : `${torneo.precio.toFixed(2)}€`}</span></div>
                {comisionImporte > 0 && (
                  <div className="flex justify-between text-sm"><span className="text-[#B8B8CC]">Comisión TODH ({comisionPct}%)</span><span className="text-white font-mono-num">{comisionImporte.toFixed(2)}€</span></div>
                )}
                <div className="h-px bg-white/8 my-1" />
                <div className="flex justify-between"><span className="text-white font-bold">Total</span><span className="text-[#B6FF3A] font-bold text-lg font-mono-num">{gratis ? 'Gratis' : `${total.toFixed(2)}€`}</span></div>
              </div>
            )}

            {/* Método de pago */}
            {!gratis && !waitlist && (
              <button className="mt-4 w-full card-premium p-3.5 flex items-center gap-3 text-left">
                <span className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center"><CreditCard size={17} className="text-[#B6FF3A]" /></span>
                <span className="flex-1"><span className="block text-sm font-semibold text-white">Visa ·· 4242</span><span className="block text-xs text-[#8B8BA8]">Método guardado</span></span>
                <span className="text-xs text-[#B6FF3A] font-semibold">Cambiar</span>
              </button>
            )}

            {/* Nota */}
            <div className="mt-4 flex items-start gap-2 text-[12px] text-[#8B8BA8]">
              {waitlist
                ? <><Clock size={14} className="text-[#FF8A5C] shrink-0 mt-0.5" /> Sin pago ahora. Si entras, te cobramos y confirmamos.</>
                : <><ShieldCheck size={14} className="text-[#B6FF3A] shrink-0 mt-0.5" /> Reembolso del 100% si el torneo se cancela. Pago seguro vía Stripe.</>}
            </div>

            {/* CTA */}
            <button onClick={pagar} disabled={fase === 'pagando'}
              className="mt-5 w-full py-4 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
              {fase === 'pagando' ? <><span className="h-4 w-4 border-2 border-[#0A0A0F]/40 border-t-[#0A0A0F] rounded-full animate-spin" /> Procesando…</>
                : waitlist ? 'Apuntarme a la lista de espera'
                : gratis ? 'Confirmar inscripción'
                : `Pagar ${total.toFixed(2)}€`}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#6E6E85]">Modo demo · no se realiza ningún cobro real.</p>
          </div>
        )}
      </div>
    </div>
  )
}
