'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { User, Megaphone, Check, Clock, ChevronRight } from 'lucide-react'

// Perfil dual (reunión 5-jul): como convertir una cuenta de Instagram en cuenta
// de empresa — cualquier usuario puede hacerse TO desde su perfil. El TO siempre
// conserva su perfil de jugador; la gestión vive en su propio panel.
export function PerfilDualCard() {
  const estado = useDemoStore(s => s.perfilTO)
  const [alta, setAlta] = useState(false)

  return (
    <div className="card-premium p-1.5 flex gap-1.5">
      <div className="flex-1 rounded-xl bg-[#B6FF3A]/10 border border-[#B6FF3A]/35 px-3 py-2.5 flex items-center gap-2.5">
        <span className="h-8 w-8 rounded-lg bg-[#B6FF3A]/15 flex items-center justify-center"><User size={15} className="text-[#B6FF3A]" /></span>
        <div className="min-w-0">
          <p className="text-[12px] font-bold text-white leading-tight">Jugador</p>
          <p className="text-[10px] text-[#8B8BA8]">Perfil activo</p>
        </div>
      </div>

      {estado === 'aprobado' ? (
        <Link href="/consola" className="flex-1 rounded-xl bg-white/[0.04] border border-white/10 px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors">
          <span className="h-8 w-8 rounded-lg bg-white/8 flex items-center justify-center"><Megaphone size={15} className="text-[#B8B8CC]" /></span>
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-white leading-tight">Organizador</p>
            <p className="text-[10px] text-[#B6FF3A] font-semibold">Ir a la consola</p>
          </div>
          <ChevronRight size={14} className="text-[#6B6B85]" />
        </Link>
      ) : estado === 'pendiente' ? (
        <div className="flex-1 rounded-xl bg-white/[0.04] border border-[#E0BE63]/35 px-3 py-2.5 flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-lg bg-[#E0BE63]/12 flex items-center justify-center"><Clock size={15} className="text-[#E0BE63]" /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white leading-tight">Organizador</p>
            <p className="text-[10px] text-[#E0BE63] font-semibold">Solicitud en revisión…</p>
          </div>
        </div>
      ) : (
        <button onClick={() => setAlta(true)} className="flex-1 rounded-xl bg-white/[0.04] border border-dashed border-white/20 px-3 py-2.5 flex items-center gap-2.5 hover:bg-white/[0.08] transition-colors text-left">
          <span className="h-8 w-8 rounded-lg bg-white/8 flex items-center justify-center"><Megaphone size={15} className="text-[#8B8BA8]" /></span>
          <div className="min-w-0">
            <p className="text-[12px] font-bold text-white leading-tight">¿Organizas?</p>
            <p className="text-[10px] text-[#8B8BA8]">Hazte TO gratis</p>
          </div>
        </button>
      )}

      {alta && <AltaTOSheet onClose={() => setAlta(false)} />}
    </div>
  )
}

function AltaTOSheet({ onClose }: { onClose: () => void }) {
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
            <p className="text-lg font-bold text-white text-display">Solicitud enviada</p>
            <p className="text-sm text-[#B8B8CC] max-w-xs">Revisamos tu experiencia y te contactamos para una breve entrevista. Mientras, sigues jugando con tu perfil de siempre.</p>
          </div>
        ) : (
          <>
            <p className="text-lg font-bold text-white text-display">Conviértete en organizador</p>
            <p className="mt-1 text-[13px] text-[#B8B8CC]">Tu perfil de jugador no cambia: añadimos el panel de organización. Para poder <strong className="text-white">cobrar inscripciones</strong> verificamos tu experiencia con una entrevista corta.</p>
            <label className="block mt-4 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">¿Qué juegos organizas o quieres organizar?</label>
            <div className="flex flex-wrap gap-1.5">
              {JUEGOS_LIST.map(j => {
                const on = juegos.includes(j.id)
                return (
                  <button key={j.id} onClick={() => setJuegos(prev => on ? prev.filter(x => x !== j.id) : [...prev, j.id])}
                    className="px-2.5 h-8 rounded-full text-[12px] font-bold border transition-all"
                    style={on ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,.05)', color: '#9A9AAE', borderColor: 'transparent' }}>
                    {j.corto}
                  </button>
                )
              })}
            </div>
            <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">¿Has organizado antes? Cuéntanos</label>
            <textarea value={exp} onChange={e => setExp(e.target.value)} rows={2} placeholder="Semanales en mi tienda, torneos del insti, ligas de Discord…"
              className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none resize-none" />
            <label className="block mt-3 text-[11px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1.5">Enlace a algún torneo tuyo (opcional)</label>
            <input value={torneos} onChange={e => setTorneos(e.target.value)} placeholder="start.gg/…, challonge.com/…"
              className="w-full h-11 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
            <button onClick={enviar} disabled={juegos.length === 0}
              className="mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold disabled:opacity-40">Enviar solicitud</button>
            <p className="mt-2 text-center text-[10px] text-[#6E6E85]">Los locales tienen su propio alta y heredan todas las funciones de TO.</p>
          </>
        )}
      </div>
    </div>
  )
}
