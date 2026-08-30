'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { CountUp } from '@/components/ui/CountUp'
import { ArrowLeft, Check, Share2, Zap, Ticket, Trophy, ChevronUp } from 'lucide-react'

// Landing de preregistro del lanzamiento (plan §4.2): lista de espera viral —
// tu posición es visible y compartir tu enlace te sube puestos. Beneficios de
// Fundador al convertir. En demo todo es local (sin backend).
export default function PreregistroPage() {
  const { unido, pos, compartidos } = useDemoStore(s => s.preregistro)
  const unirse = useDemoStore(s => s.unirsePreregistro)
  const compartir = useDemoStore(s => s.compartirPreregistro)
  const [email, setEmail] = useState('')
  const [copiado, setCopiado] = useState(false)
  const enLista = 1284 + compartidos * 3

  const compartirLink = async () => {
    compartir()
    try {
      const url = 'https://torneum.app/preregistro?r=ALBERT-3F7'
      if (navigator.share) await navigator.share({ title: 'Torneum — sé fundador', url })
      else { await navigator.clipboard.writeText(url); setCopiado(true); setTimeout(() => setCopiado(false), 1800) }
    } catch { /* cancelado */ }
  }

  return (
    <div className="min-h-screen bg-[#0C0E13] text-white overflow-hidden relative">
      {/* Halo */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[720px] h-[520px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(182,255,58,0.16), transparent 70%)' }} />

      <div className="relative max-w-lg mx-auto px-5 pb-16 safe-top">
        <div className="pt-6 flex items-center justify-between">
          <Link href="/inicio" className="h-10 w-10 rounded-xl bg-white/6 border border-white/10 flex items-center justify-center"><ArrowLeft size={18} /></Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-[#B6FF3A] text-[#0A0A0F] font-black text-display">T</span>
            <span className="font-black tracking-[0.18em] text-sm">TORNEUM</span>
          </div>
          <span className="w-10" />
        </div>

        <div className="mt-10 text-center">
          <span className="inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-black uppercase tracking-wider bg-[#B6FF3A]/12 text-[#B6FF3A] border border-[#B6FF3A]/40"><Zap size={12} /> Lanzamiento en Madrid</span>
          <h1 className="mt-4 text-4xl font-bold text-display tracking-tight leading-[1.05]">Sé <span className="text-[#B6FF3A]">fundador</span> de tu circuito</h1>
          <p className="mt-3 text-[15px] text-[#B8B8CC] max-w-sm mx-auto">Torneos presenciales de Smash, Magic, Pokémon, TFT, racing y más. Los primeros entran antes y con ventajas para siempre.</p>
        </div>

        {!unido ? (
          <form className="mt-8" onSubmit={e => { e.preventDefault(); if (email.includes('@')) unirse() }}>
            <div className="flex gap-2">
              <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="tu@email.com"
                className="flex-1 h-13 px-4 h-[52px] bg-white/6 border border-white/12 rounded-2xl text-white placeholder:text-[#7B7B92] focus:border-[#B6FF3A]/60 focus:ring-2 focus:ring-[#B6FF3A]/20 outline-none" />
              <button type="submit" className="h-[52px] px-5 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold shrink-0 shadow-[0_10px_30px_-8px_rgba(182,255,58,0.5)]">Unirme</button>
            </div>
            <p className="mt-2 text-center text-[11px] text-[#6E6E85]"><span className="font-mono-num text-[#B8B8CC]">{enLista.toLocaleString('es-ES')}</span> personas ya están en la lista</p>
          </form>
        ) : (
          <div className="mt-8 card-premium ring-grad p-5 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-40 h-40 rounded-full bg-[#B6FF3A]/10 blur-2xl" />
            <p className="relative inline-flex items-center gap-1.5 text-[12px] font-bold text-[#B6FF3A]"><Check size={14} /> Estás en la lista</p>
            <p className="relative mt-2 text-[11px] uppercase tracking-[0.2em] text-[#8B8BA8] font-bold">Tu posición</p>
            <p className="relative text-[64px] leading-none font-bold text-score text-white mt-1">#<CountUp value={pos} duration={800} /></p>
            {compartidos > 0 && <p className="relative mt-1 text-[12px] text-[#B6FF3A] font-semibold inline-flex items-center gap-1"><ChevronUp size={14} /> Has subido {compartidos * 47} puestos compartiendo</p>}
            <button onClick={compartirLink}
              className="relative mt-4 w-full h-12 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold flex items-center justify-center gap-2">
              <Share2 size={16} /> {copiado ? '¡Enlace copiado!' : 'Comparte y sube puestos'}
            </button>
            <p className="relative mt-2 text-[11px] text-[#8B8BA8]">Cada amigo que se une con tu enlace te sube en la cola.</p>
          </div>
        )}

        {/* Ventajas de fundador */}
        <p className="mt-9 eyebrow text-center">Ventajas de fundador · para siempre</p>
        <div className="mt-3 space-y-2">
          {[
            { icon: Zap, titulo: 'Insignia Fundador', desc: 'Numerada y permanente en tu perfil. Solo para la lista de espera.' },
            { icon: Ticket, titulo: '0% de comisión en tus 3 primeras inscripciones', desc: 'Estrenas la app sin comisión Torneum.' },
            { icon: Trophy, titulo: 'Sorteo del GP de racing de lanzamiento', desc: 'Plazas para el evento inaugural entre los 500 primeros.' },
          ].map(({ icon: Icon, titulo, desc }) => (
            <div key={titulo} className="flex items-start gap-3 card-premium p-3.5">
              <span className="h-10 w-10 rounded-xl bg-[#B6FF3A]/12 border border-[#B6FF3A]/30 flex items-center justify-center shrink-0"><Icon size={17} className="text-[#B6FF3A]" /></span>
              <div>
                <p className="text-sm font-bold text-white">{titulo}</p>
                <p className="text-[12px] text-[#A0A0B8] mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-[12px] text-[#6E6E85]">¿Quieres ver cómo será? <Link href="/explorar" className="text-[#B6FF3A] font-semibold">Explora la demo →</Link></p>
      </div>
    </div>
  )
}
