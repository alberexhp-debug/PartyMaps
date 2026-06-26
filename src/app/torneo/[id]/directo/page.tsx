'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, JUEGOS, bracketDe } from '@/lib/torneos/sample'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { ArrowLeft, Radio, Send, ListTree, Eye, Play } from 'lucide-react'

const CHAT0 = [
  { u: 'Kaze', m: 'GGs en cuartos 🔥', mio: false, color: '#E63E54' },
  { u: 'Sora', m: 'Vamos con el siguiente, setup 3', mio: false, color: '#4F8EF7' },
  { u: 'Cast', m: '¡Empieza la semi en el escenario principal!', mio: false, color: '#9B5DE5' },
]

export default function DirectoPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = getTorneo(id)
  const juego = t ? JUEGOS[t.juego] : JUEGOS.smash
  const rondas = bracketDe(id)
  const [chat, setChat] = useState(CHAT0)
  const [msg, setMsg] = useState('')

  function enviar() {
    if (!msg.trim()) return
    setChat(c => [...c, { u: 'Tú', m: msg.trim(), mio: true, color: '#B6FF3A' }])
    setMsg('')
  }

  if (!t) {
    return <div className="min-h-screen flex items-center justify-center text-white">Torneo no encontrado</div>
  }

  return (
    <div className="relative min-h-screen pb-4 max-w-xl lg:max-w-5xl mx-auto">
      {/* Reproductor */}
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full flex flex-col items-center justify-center gap-2">
          <button className="h-16 w-16 rounded-full bg-white/10 border border-white/25 flex items-center justify-center hover:scale-110 transition-transform"><Play size={26} className="text-white ml-1" /></button>
          <p className="text-sm text-white/80">Emisión en directo · YouTube / Twitch</p>
        </div>
        <button onClick={() => router.back()} aria-label="Volver" className="absolute top-4 left-4 h-10 w-10 rounded-xl bg-black/40 backdrop-blur flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        <span className="absolute top-4 right-4 badge-live">Live</span>
        {t.viendo && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[11px] font-mono-num text-white bg-black/55 px-2 py-1 rounded-md"><Eye size={11} /> {t.viendo}</span>}
      </div>

      {/* Info */}
      <div className="px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#FF6076] font-bold uppercase tracking-wide"><Radio size={11} className="animate-pulse-heat" /> En directo</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white text-display leading-tight">{t.nombre}</h1>

        {/* Combate actual */}
        <div className="mt-3 card-premium p-3.5">
          <p className="eyebrow eyebrow-muted mb-2">Combate en el escenario</p>
          <div className="flex items-center justify-between">
            <div className="text-center flex-1">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[#0A0A0F] font-black text-lg" style={{ background: '#E63E54' }}>S</span>
              <p className="mt-1.5 text-sm font-bold text-white">Sora</p>
            </div>
            <div className="px-4 text-center">
              <p className="text-3xl font-bold text-score text-white">1<span className="text-[#6B6B85] mx-1">-</span>1</p>
              <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wide">Semifinal · Bo5</p>
            </div>
            <div className="text-center flex-1">
              <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[#0A0A0F] font-black text-lg" style={{ background: '#4F8EF7' }}>R</span>
              <p className="mt-1.5 text-sm font-bold text-white">Rei</p>
            </div>
          </div>
        </div>

        {/* Bracket lateral (acceso) */}
        <Link href={`/torneo/${id}/bracket`} className="mt-3 flex items-center justify-between card-premium card-int p-3.5">
          <span className="inline-flex items-center gap-2 text-white font-semibold text-sm"><ListTree size={17} className="text-[#9B82FF]" /> Ver bracket completo</span>
          <span className="text-[#8B8BA8]">{rondas.reduce((a, r) => a + r.matches.length, 0)} combates ›</span>
        </Link>

        {/* Chat */}
        <div className="mt-4">
          <p className="eyebrow eyebrow-muted mb-2">Chat del directo</p>
          <div className="card-premium p-3 space-y-2.5 max-h-72 overflow-y-auto">
            {chat.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#0A0A0F] font-black text-xs shrink-0" style={{ background: c.color }}>{c.u[0]}</span>
                <div className="min-w-0">
                  <span className="text-[12px] font-bold" style={{ color: c.color }}>{c.u}</span>
                  <span className="text-[13px] text-[#D4D4E4] ml-2">{c.m}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar() }}
              placeholder="Escribe en el chat…"
              className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 outline-none" />
            <button onClick={enviar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center shrink-0"><Send size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
