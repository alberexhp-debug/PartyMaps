'use client'
import { useState } from 'react'
import type { TorneoSample, Juego } from '@/lib/torneos/sample'
import type { Crew } from '@/lib/torneos/crews'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT, conParams } from '@/lib/i18n'
import { fechaLabelTr } from '@/lib/torneos/fechas'
import { X, Check, ShieldCheck, Clock } from '@/components/todh/iconosTorneum'
import { CreditCard } from 'lucide-react'

type Props = {
  torneo: TorneoSample
  juego: Juego
  comisionPct: number
  comisionImporte: number
  total: number
  completo: boolean
  puestoEspera?: number       // puesto que ocuparías en la lista de espera (torneo lleno)
  precioVer?: number | null   // entrada de espectador (null = torneo online, sin espectador)
  modoInicial?: 'jugar' | 'ver'
  crew?: Crew | null          // F6: vas en nombre de esta crew (pago individual igualmente)
  onClose: () => void
  onConfirm: () => void
  onConfirmVer?: () => void
}

// Hoja de checkout en una sola pantalla (mínima fricción). En demo simula el pago.
export function InscripcionSheet({ torneo, juego, comisionPct, comisionImporte, total, completo, puestoEspera, precioVer, modoInicial, crew, onClose, onConfirm, onConfirmVer }: Props) {
  const { t: tr, idioma } = useT()
  const [fase, setFase] = useState<'resumen' | 'pagando' | 'ok'>('resumen')
  const [codigoOpen, setCodigoOpen] = useState(false)
  const [codigo, setCodigo] = useState('')
  const [proAplicado, setProAplicado] = useState(false)
  const conVer = precioVer !== undefined && precioVer !== null && !!onConfirmVer
  const [modo, setModo] = useState<'jugar' | 'ver'>(modoInicial ?? (completo && conVer ? 'ver' : 'jugar'))
  const ver = conVer && modo === 'ver'
  const gratis = proAplicado || (ver ? precioVer === 0 : total === 0)
  const waitlist = completo && !ver

  function pagar() {
    if (gratis || waitlist) { finalizar(); return }
    setFase('pagando')
    // El ALTA se escribe AL INSTANTE (QA 01-09: el «ok» visual salía ~1 s antes
    // que la escritura y recargar en esa ventana perdía la plaza ya «pagada»).
    // La animación de pago es solo teatro; el cierre llega a los 2 s.
    finalizar()
    setTimeout(() => setFase('ok'), 1100)
    setTimeout(onClose, 2000)
  }
  function finalizar() { if (ver) onConfirmVer!(); else onConfirm() }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={fase === 'resumen' ? onClose : undefined} />
      <div className="relative w-full max-w-lg bg-[#141822] border-t border-white/10 rounded-t-3xl pb-6 animate-slide-up-sm max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-[#141822] pt-3 pb-2 px-5 flex items-center justify-between z-10">
          <span className="mx-auto absolute left-1/2 -translate-x-1/2 top-2 w-10 h-1 rounded-full bg-white/15" />
          <p className="text-[15px] font-bold text-white mt-2">{ver ? tr('ntf.espectadorT') : waitlist ? tr('card.listaEspera') : tr('torneo.inscripcion')}</p>
          <button onClick={onClose} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC] mt-1"><X size={16} /></button>
        </div>

        {fase === 'ok' ? (
          <div className="px-5 py-10 flex flex-col items-center text-center gap-3">
            <div className="h-16 w-16 rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={32} className="text-[#B6FF3A]" /></div>
            <p className="text-xl font-bold text-white text-display">{ver ? tr('ins.nosVemos') : waitlist ? tr('ins.enListaOk') : tr('ins.estasDentro')}</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">{ver ? tr('ins.verOk') : waitlist ? conParams(tr('ins.esperaOk'), { puesto: puestoEspera ?? 1 }) : tr('ins.dentroOk')}</p>
          </div>
        ) : (
          <div className="px-5">
            {/* Torneo */}
            <div className="flex items-center gap-3 card-premium p-3">
              <GameKeyart juegoId={torneo.juego} label={false} className="w-14 h-14 rounded-xl shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-white truncate">{torneo.nombre}</p>
                <p className="text-xs text-[#8B8BA8]"><GameIcon juegoId={torneo.juego} size={12} /> {juego.corto} · {fechaLabelTr(torneo.fechaLabel, idioma)}</p>
              </div>
            </div>

            {/* Vas en nombre de tu crew (F6): el pago sigue siendo individual */}
            {crew && !ver && (
              <div className="mt-3 rounded-xl border px-3.5 py-2.5" style={{ borderColor: `${crew.color ?? '#B6FF3A'}55`, background: `${crew.color ?? '#B6FF3A'}12` }}>
                <p className="text-[13px] font-bold text-white">
                  ⚔️ {tr('crew.enNombre')} {crew.nombre} <span style={{ color: crew.color ?? '#B6FF3A' }}>#{crew.tag}</span>
                </p>
                <p className="mt-0.5 text-[11px] text-[#B8B8CC]">{tr('crew.confirmaAcudes')}</p>
              </div>
            )}

            {/* Jugar o ver (doble entrada del plan de lanzamiento) */}
            {conVer && (
              <div className="mt-4 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
                <button onClick={() => setModo('jugar')}
                  className={`h-11 rounded-xl text-sm font-bold transition-all ${modo === 'jugar' ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#A0A0B8]'}`}>
                  🎮 {tr('ins.jugar')}{completo ? ` · ${tr('ins.lista')}` : total > 0 ? ` · ${total.toFixed(0)}€` : ` · ${tr('torneo.gratis')}`}
                </button>
                <button onClick={() => setModo('ver')}
                  className={`h-11 rounded-xl text-sm font-bold transition-all ${modo === 'ver' ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#A0A0B8]'}`}>
                  👀 {tr('ins.verTab')}{precioVer === 0 ? ` · ${tr('torneo.gratis')}` : ` · ${precioVer}€`}
                </button>
              </div>
            )}

            {/* Desglose */}
            {ver ? (
              <div className="mt-4 space-y-2.5">
                <div className="flex justify-between text-sm"><span className="text-[#B8B8CC]">{tr('ntf.espectadorT')}</span><span className="text-white font-mono-num">{precioVer === 0 ? tr('torneo.gratis') : `${precioVer!.toFixed(2)}€`}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#B8B8CC]">{tr('ins.comisionLbl')}</span><span className="text-[#B6FF3A] font-mono-num">{tr('ins.sinComision')}</span></div>
                <div className="h-px bg-white/8 my-1" />
                <div className="flex justify-between"><span className="text-white font-bold">{tr('ins.total')}</span><span className="text-[#B6FF3A] font-bold text-lg font-mono-num">{precioVer === 0 ? tr('torneo.gratis') : `${precioVer!.toFixed(2)}€`}</span></div>
                <p className="text-[11px] text-[#8B8BA8]">{tr('ins.espectadorNota')}</p>
              </div>
            ) : !waitlist && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between items-baseline"><span className="text-white font-bold">{tr('ins.total')}</span><span className="text-[#B6FF3A] font-bold text-xl font-mono-num">{gratis ? tr('torneo.gratis') : `${total.toFixed(2)}€`}</span></div>
                {comisionImporte > 0 && (
                  <details className="group">
                    <summary className="list-none cursor-pointer text-[11px] text-[#8B8BA8] flex items-center gap-1">{tr('ins.incluyeGestion')} <span className="group-open:rotate-180 transition-transform">▾</span></summary>
                    <div className="mt-1.5 space-y-1 text-[12px] text-[#8B8BA8]">
                      <div className="flex justify-between"><span>{tr('torneo.inscripcion')}</span><span className="font-mono-num">{torneo.precio.toFixed(2)}€</span></div>
                      <div className="flex justify-between"><span>{tr('ins.gestion')} ({comisionPct}%)</span><span className="font-mono-num">{comisionImporte.toFixed(2)}€</span></div>
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Código de invitación pro (reunión 5-jul: los top entran gratis) */}
            {!ver && !waitlist && !proAplicado && (
              <div className="mt-3">
                {codigoOpen ? (
                  <div className="flex gap-2 animate-slide-up-sm">
                    <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="PRO-XXXX"
                      className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm uppercase tracking-wider focus:border-[#B6FF3A]/60 outline-none" />
                    <button onClick={() => { if (codigo.trim().toUpperCase().startsWith('PRO')) setProAplicado(true) }}
                      className="h-10 px-3.5 rounded-xl bg-white/8 border border-white/15 text-white text-xs font-bold">{tr('ins.aplicar')}</button>
                  </div>
                ) : (
                  <button onClick={() => setCodigoOpen(true)} className="text-[11px] text-[#8B8BA8] font-semibold hover:text-white transition-colors">{tr('ins.tienesCodigo')}</button>
                )}
              </div>
            )}
            {proAplicado && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#E0BE63]/10 border border-[#E0BE63]/40 px-3.5 py-2.5">
                <span className="text-base">⭐</span>
                <span className="flex-1 text-[13px] font-bold text-[#E0BE63]">{tr('ins.proAplicada')}</span>
              </div>
            )}

            {/* Método de pago */}
            {!gratis && !waitlist && (
              <button className="mt-4 w-full card-premium p-3.5 flex items-center gap-3 text-left">
                <span className="h-9 w-9 rounded-lg bg-white/8 flex items-center justify-center"><CreditCard size={17} className="text-[#B6FF3A]" /></span>
                <span className="flex-1"><span className="block text-sm font-semibold text-white">Visa ·· 4242</span><span className="block text-xs text-[#8B8BA8]">{tr('fx.metodoGuardado')}</span></span>
                <span className="text-xs text-[#B6FF3A] font-semibold">{tr('ranking.cambiar')}</span>
              </button>
            )}

            {/* Nota */}
            <div className="mt-4 flex items-start gap-2 text-[12px] text-[#8B8BA8]">
              {waitlist
                ? <><Clock size={14} className="text-[#FF8A5C] shrink-0 mt-0.5" /> {tr('ins.waitlistNotaA')} <span className="text-[#FF8A5C] font-bold">{puestoEspera ?? 1}º</span> {tr('ins.waitlistNotaB')}</>
                : <><ShieldCheck size={14} className="text-[#B6FF3A] shrink-0 mt-0.5" /> {tr('ins.reembolsoNota')}</>}
            </div>

            {/* CTA */}
            <button onClick={pagar} disabled={fase === 'pagando'}
              className="mt-5 w-full py-4 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)] active:scale-[0.99] transition-transform disabled:opacity-70 flex items-center justify-center gap-2">
              {fase === 'pagando' ? <><span className="h-4 w-4 border-2 border-[#0A0A0F]/40 border-t-[#0A0A0F] rounded-full animate-spin" /> {tr('ins.procesando')}</>
                : ver ? (precioVer === 0 ? tr('ins.conseguirVer') : conParams(tr('ins.pagarVer'), { p: precioVer!.toFixed(2) }))
                : waitlist ? tr('tf.apuntarmeEspera')
                : gratis ? tr('ins.confirmar')
                : conParams(tr('ins.pagar'), { p: total.toFixed(2) })}
            </button>
            <p className="mt-2 text-center text-[10px] text-[#6E6E85]">{tr('ins.modoDemo')}</p>
          </div>
        )}
      </div>
    </div>
  )
}
