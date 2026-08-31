'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDemoStore, useEsTO } from '@/lib/stores/useDemoStore'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { GameIcon } from '@/components/todh/GameIcon'
import { Megaphone, Check, Clock, ChevronRight } from 'lucide-react'
import { useT } from '@/lib/i18n'

// Rol de organizador en el perfil. Ya NO hay perfil conmutable ni panel aparte:
// si tu cuenta tiene el rol, el TO navega por la Consola TO (sidebar en
// escritorio, pestaña Consola en móvil) — sin accesos duplicados aquí.
// Si no lo tienes, desde aquí lo solicitas.
export function PerfilDualCard() {
  const { t: tr } = useT()
  const perfilTO = useDemoStore(s => s.perfilTO)
  const esTO = useEsTO()
  const [alta, setAlta] = useState(false)

  // Con el rol activo, la fila lleva al perfil de ORGANIZADOR editable
  // (decisión Albert 30-08: se edita desde Perfil, no desde la consola).
  // No es un shortcut de consola: es identidad, como el resto del apartado.
  if (esTO) {
    return (
      <Link href="/perfil/organizador" className="w-full card-premium p-3.5 flex items-center gap-2.5 hover:bg-white/[0.06] transition-colors">
        <span className="h-8 w-8 rounded-lg bg-[#E0BE63]/12 flex items-center justify-center"><Megaphone size={15} className="text-[#E0BE63]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-white leading-tight">{tr('pfo.titulo')}</p>
          <p className="text-[10px] text-[#8B8BA8]">{tr('pfo.rolCardSub')}</p>
        </div>
        <ChevronRight size={15} className="text-[#8B8BA8]" />
      </Link>
    )
  }

  if (perfilTO === 'pendiente') {
    return (
      <div title="La aprueba el equipo desde su panel de administración"
        className="card-premium p-3.5 flex items-center gap-2.5 border border-[#E0BE63]/35">
        <span className="h-8 w-8 rounded-lg bg-[#E0BE63]/12 flex items-center justify-center"><Clock size={15} className="text-[#E0BE63]" /></span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white leading-tight">{tr('dual.org')}</p>
          <p className="text-[10px] text-[#E0BE63] font-semibold">{tr('dual.revision')}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <button onClick={() => setAlta(true)} className="w-full card-premium p-3.5 flex items-center gap-2.5 border border-dashed border-white/20 hover:bg-white/[0.06] transition-colors text-left">
        <span className="h-8 w-8 rounded-lg bg-white/8 flex items-center justify-center"><Megaphone size={15} className="text-[#8B8BA8]" /></span>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-bold text-white leading-tight">{tr('dual.organizas')}</p>
          <p className="text-[10px] text-[#8B8BA8]">{tr('dual.hazte')}</p>
        </div>
        <ChevronRight size={15} className="text-[#8B8BA8]" />
      </button>
      {alta && <AltaTOSheet onClose={() => setAlta(false)} />}
    </>
  )
}

// Exportada: también la usa la puerta de las rutas de TO (grupo `(to)`).
export function AltaTOSheet({ onClose }: { onClose: () => void }) {
  const { t: tr } = useT()
  const solicitar = useDemoStore(s => s.solicitarTO)
  const [exp, setExp] = useState('')
  const [juegos, setJuegos] = useState<string[]>([])
  const [torneos, setTorneos] = useState('')
  const [ok, setOk] = useState(false)

  const enviar = () => {
    solicitar()
    setOk(true)
    setTimeout(onClose, 1800)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto p-5">
        {ok ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <div className="h-14 w-14 rounded-full bg-[#B6FF3A]/15 border border-[#B6FF3A]/40 flex items-center justify-center animate-pop"><Check size={26} className="text-[#B6FF3A]" /></div>
            <p className="text-lg font-bold text-white text-display">{tr('mp.solicitudEnviada')}</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">{tr('dual2.enviadaSub')}</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-white text-display">{tr('dual2.titulo')}</p>
            <p className="mt-1 text-[13px] text-[#B8B8CC]">{tr('dual2.introA')} <strong className="text-white">{tr('dual2.introB')}</strong> {tr('dual2.introC')}</p>
            <label className="block mt-4 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('dual2.lblJuegos')}</label>
            <div className="flex flex-wrap gap-1.5">
              {JUEGOS_LIST.map(j => {
                const on = juegos.includes(j.id)
                return (
                  <button key={j.id} onClick={() => setJuegos(prev => on ? prev.filter(x => x !== j.id) : [...prev, j.id])}
                    className="px-2.5 h-8 rounded-full text-[12px] font-bold border transition-all inline-flex items-center gap-1.5"
                    style={on ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,.05)', color: '#9A9AAE', borderColor: 'transparent' }}>
                    <GameIcon juegoId={j.id} size={13} /> {j.corto}
                  </button>
                )
              })}
            </div>
            <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('dual2.lblExp')}</label>
            <textarea value={exp} onChange={e => setExp(e.target.value)} rows={2} placeholder={tr('dual2.expPh')}
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none resize-none" />
            <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">{tr('dual2.lblEnlace')}</label>
            <input value={torneos} onChange={e => setTorneos(e.target.value)} placeholder="start.gg/…, challonge.com/…"
              className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
            <button onClick={enviar} disabled={juegos.length === 0}
              className="mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">{tr('dual2.enviar')}</button>
            <p className="mt-2 text-center text-[10px] text-[#6E6E85]">{tr('dual2.pie')}</p>
          </>
        )}
      </div>
    </div>
  )
}
