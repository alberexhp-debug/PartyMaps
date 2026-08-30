'use client'
import { useState } from 'react'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { Flag, Check } from 'lucide-react'
import { useT, conParams } from '@/lib/i18n'

// Botón rojo de Report (reunión 5-jul): el jugador reporta bracket o seeding
// con motivos predefinidos; le llega al TO como "Revisar seeding" accionable.
const MOTIVOS: Record<'bracket' | 'seeding', string[]> = {
  seeding: [
    'Me toca otra vez contra el mismo jugador en ronda 1',
    'Mi rival de primera ronda tiene un nivel muy distinto al mío',
    'Dos jugadores del mismo crew se cruzan de salida',
    'Mi seed no refleja mis últimos resultados',
  ],
  bracket: [
    'Hay un jugador duplicado o que no está inscrito',
    'Falta un jugador con check-in hecho',
    'Un combate está en la ronda equivocada',
    'El bracket no coincide con las plazas del torneo',
  ],
}

export function ReportButton({ torneoId, torneoNombre }: { torneoId: string; torneoNombre: string }) {
  const { t: tr } = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl bg-[#FF6076]/12 border border-[#FF6076]/40 text-[#FF8A9A] text-xs font-bold hover:bg-[#FF6076]/20 transition-colors">
        <Flag size={13} /> {tr('rep.reportar')}
      </button>
      {open && <ReportSheet torneoId={torneoId} torneoNombre={torneoNombre} onClose={() => setOpen(false)} />}
    </>
  )
}

function ReportSheet({ torneoId, torneoNombre, onClose }: { torneoId: string; torneoNombre: string; onClose: () => void }) {
  const { t: tr } = useT()
  const crearReporte = useDemoStore(s => s.crearReporte)
  const [tipo, setTipo] = useState<'seeding' | 'bracket'>('seeding')
  const [motivo, setMotivo] = useState<string | null>(null)
  const [otro, setOtro] = useState('')
  const [mensaje, setMensaje] = useState('')
  const [enviado, setEnviado] = useState(false)

  const enviar = () => {
    const m = motivo === 'otros' ? (otro.trim() || 'Otro motivo') : motivo
    if (!m) return
    crearReporte({ torneoId, torneoNombre, tipo, motivo: m, mensaje: mensaje.trim() || undefined })
    setEnviado(true)
    setTimeout(onClose, 1600)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto p-5">
        {enviado ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={26} className="text-[#B6FF3A]" /></div>
            <p className="text-lg font-bold text-white text-display">{tr('rep.enviado')}</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">{conParams(tr('rep.enviadoSub'), { tipo })}</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-white text-display flex items-center gap-2"><Flag size={17} className="text-[#FF6076]" /> {tr('rep.titulo')}</p>
            <div className="mt-3 grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
              {(['seeding', 'bracket'] as const).map(t => (
                <button key={t} onClick={() => { setTipo(t); setMotivo(null) }}
                  className={`h-10 rounded-xl text-sm font-bold capitalize transition-all ${tipo === t ? 'bg-[#FF6076] text-white' : 'text-[#A0A0B8]'}`}>{t}</button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              {MOTIVOS[tipo].map(m => (
                <button key={m} onClick={() => setMotivo(m)}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${motivo === m ? 'bg-[#FF6076]/12 border-[#FF6076]/50 text-white' : 'bg-white/[0.04] border-white/8 text-[#B8B8CC]'}`}>{m}</button>
              ))}
              <button onClick={() => setMotivo('otros')}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-[13px] font-semibold transition-all ${motivo === 'otros' ? 'bg-[#FF6076]/12 border-[#FF6076]/50 text-white' : 'bg-white/[0.04] border-white/8 text-[#B8B8CC]'}`}>{tr('rep.otros')}</button>
              {motivo === 'otros' && (
                <input value={otro} onChange={e => setOtro(e.target.value)} placeholder={tr('rep.otroPh')}
                  className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#FF6076]/60 outline-none" />
              )}
            </div>
            <textarea value={mensaje} onChange={e => setMensaje(e.target.value)} placeholder={tr('rep.mensajePh')} rows={2}
              className="mt-2 w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#FF6076]/60 outline-none resize-none" />
            <button onClick={enviar} disabled={!motivo}
              className="mt-3 w-full h-12 rounded-xl bg-[#FF6076] text-white font-bold disabled:opacity-40">{tr('rep.enviar')}</button>
            <p className="mt-2 text-center text-[10px] text-[#6E6E85]">{tr('rep.pie')}</p>
          </>
        )}
      </div>
    </div>
  )
}
