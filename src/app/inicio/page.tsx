'use client'
import Link from 'next/link'
import { TORNEOS_SAMPLE, JUEGOS } from '@/lib/torneos/sample'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { ArrowRight, Trophy, MapPin, Calendar } from 'lucide-react'

const PASOS = [
  { Ic: MapPin, t: 'Descubre', d: 'Torneos de tu juego cerca de ti, en el mapa o el feed.' },
  { Ic: Calendar, t: 'Inscríbete', d: 'Apúntate y paga desde la app. Check-in con QR.' },
  { Ic: Trophy, t: 'Compite', d: 'Bracket en vivo, reporta tu resultado y sube en el ranking.' },
]

export default function InicioPage() {
  const live = TORNEOS_SAMPLE.filter(t => t.enDirecto).length

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero */}
      <div className="relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-32 w-[40rem] h-[40rem] rounded-full blur-[140px] opacity-[0.16]" style={{ background: '#B6FF3A' }} />
          <div className="absolute top-32 -right-44 w-[32rem] h-[32rem] rounded-full blur-[150px] opacity-[0.10]" style={{ background: '#7C5CFF' }} />
        </div>

        <div className="relative px-6 pt-16 pb-10 safe-top max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2.5 mb-9">
            <span className="w-10 h-10 rounded-xl bg-[#B6FF3A] flex items-center justify-center text-[#0A0A0F] text-base font-black text-display">T</span>
            <span className="text-xl font-black text-display uppercase tracking-[0.22em] text-white">Tourneum</span>
          </div>

          {live > 0 && (
            <Link href="/explorar" className="badge-live mb-6">{live} en directo ahora</Link>
          )}

          <h1 className="text-[40px] sm:text-[52px] leading-[1.04] font-black text-white text-display tracking-tight">
            Tu circuito de torneos,<br />
            <span className="text-[#B6FF3A]">en una sola app</span>
          </h1>
          <p className="mt-5 text-lg text-[#B8B8CC] max-w-md mx-auto leading-relaxed">
            Descubre, inscríbete y compite en torneos presenciales de Smash, Magic, Pokémon y más. Bracket en vivo, ranking y comunidad.
          </p>

          <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/explorar" className="h-14 px-8 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold text-[15px] glow-lime active:scale-[0.98] transition-transform">
              Explorar torneos <ArrowRight size={18} />
            </Link>
            <Link href="/consola" className="h-14 px-8 inline-flex items-center justify-center gap-2 rounded-2xl glass-strong text-white font-bold text-[15px] hover:bg-white/10 transition-colors">
              Soy organizador
            </Link>
          </div>
          <Link href="/sede" className="mt-3 inline-block text-sm text-[#8B8BA8] hover:text-white transition-colors">¿Tienes un local? <span className="text-[#B6FF3A] font-semibold">Abre el panel de tu sede →</span></Link>
        </div>
      </div>

      {/* Juegos */}
      <div className="relative px-6 max-w-3xl mx-auto">
        <p className="eyebrow eyebrow-muted text-center mb-4">Juegos en Tourneum</p>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {Object.values(JUEGOS).map(j => (
            <Link key={j.id} href="/explorar" className="relative h-20 rounded-2xl overflow-hidden ring-grad hover:-translate-y-0.5 transition-transform">
              <GameKeyart juegoId={j.id} label={false} className="absolute inset-0" />
              <span className="absolute inset-0 flex items-center justify-center text-white font-black text-display text-[13px] tracking-tight px-1 text-center" style={{ textShadow: '0 2px 8px rgba(0,0,0,.65)' }}>{j.corto}</span>
            </Link>
          ))}
        </div>

      {/* Circuito oficial Tourneum */}
      <div className="px-5 mt-8 max-w-2xl mx-auto">
        <Link href="/circuito" className="flex items-center gap-3 rounded-2xl border border-[#E0BE63]/35 bg-[#E0BE63]/[0.07] px-4 py-3.5 hover:bg-[#E0BE63]/[0.12] transition-colors">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0BE63]/15 text-[#E0BE63] shrink-0 text-xl">🏆</span>
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold text-white">Circuito oficial Tourneum · Split 2 · 2026</span>
            <span className="block text-[11px] text-[#D8C48A]">2 veces al año · clasifícate jugando los oficiales · próximo: 13 dic</span>
          </span>
          <span className="text-[#E0BE63]">›</span>
        </Link>
      </div>
      </div>

      {/* Cómo funciona */}
      <div className="relative px-6 max-w-2xl mx-auto mt-14">
        <h2 className="text-2xl font-bold text-white text-display text-center mb-6">Cómo funciona</h2>
        <div className="space-y-3">
          {PASOS.map(({ Ic, t, d }, i) => (
            <div key={i} className="flex items-center gap-4 card-premium p-4">
              <span className="w-11 h-11 rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A] flex items-center justify-center shrink-0"><Ic size={20} /></span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-white">{t}</p>
                <p className="text-sm text-[#A0A0B8]">{d}</p>
              </div>
              <span className="text-3xl font-black text-white/[0.08] font-mono-num">{i + 1}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA final */}
      <div className="relative px-6 max-w-2xl mx-auto mt-14 mb-14 text-center">
        <div className="card-premium ring-grad p-8 relative overflow-hidden">
          <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full blur-3xl opacity-20" style={{ background: '#B6FF3A' }} />
          <h2 className="relative text-2xl font-bold text-white text-display">¿Listo para competir?</h2>
          <p className="relative text-[#B8B8CC] mt-2">Entra y encuentra tu próximo torneo.</p>
          <Link href="/explorar" className="relative mt-6 h-14 px-8 inline-flex items-center gap-2 rounded-2xl bg-[#B6FF3A] text-[#0A0A0F] font-bold glow-lime active:scale-[0.98] transition-transform">
            Explorar torneos <ArrowRight size={18} />
          </Link>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-[#6B6B85]">
          <span className="uppercase tracking-[0.18em]">Paneles demo:</span>
          <Link href="/consola" className="hover:text-[#B6FF3A]">Organizador</Link>
          <span>·</span>
          <Link href="/sede" className="hover:text-[#B6FF3A]">Local</Link>
          <span>·</span>
          <Link href="/admin-demo" className="hover:text-[#B6FF3A]">Admin</Link>
        </div>
        <p className="text-[10px] text-[#6B6B85] uppercase tracking-[0.2em] mt-4">© Tourneum · Que gane el mejor</p>
      </div>
    </div>
  )
}
