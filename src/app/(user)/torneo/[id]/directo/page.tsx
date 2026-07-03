'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, JUEGOS, bracketDe } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { VideoEmbed } from '@/components/todh/VideoEmbed'
import { ArrowLeft, Radio, Send, ListTree, Eye, Play } from 'lucide-react'

const CHAT0 = [
  { u: 'Kaze', m: 'GGs en cuartos 🔥', mio: false, color: '#E63E54' },
  { u: 'Sora', m: 'Vamos con el siguiente, mesa 3', mio: false, color: '#4F8EF7' },
  { u: 'Cast', m: '¡Empieza la semi en el escenario principal!', mio: false, color: '#9B5DE5' },
]

// Mensajes de ambiente que van entrando solos mientras ves el directo
const CHAT_POOL = [
  { u: 'Vega', m: 'Ese edge guard 😱', color: '#F4912B' },
  { u: 'Mist', m: 'Sora lo tiene, confíen', color: '#2EC4B6' },
  { u: 'Drako', m: 'Rei remontando otra vez jaja', color: '#9B5DE5' },
  { u: 'Nyx', m: 'La mesa 2 quedó libre, siguiente combate ya', color: '#4F8EF7' },
  { u: 'Lex', m: 'Clip eso YA 🎬', color: '#E63E54' },
  { u: 'Volt', m: 'Bo5 de infarto', color: '#B6FF3A' },
  { u: 'Cast', m: 'Punto de campeonato…', color: '#9B5DE5' },
]

export default function DirectoPage() {
  const { t: tr } = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const override = useDemoStore(s => s.editados[id])
  const base = getTorneo(id) || creado
  const t = base ? { ...base, ...(override || {}) } : undefined
  const juego = t ? (JUEGOS[t.juego] ?? JUEGOS.smash) : JUEGOS.smash
  const rondas = bracketDe(id)
  const [chat, setChat] = useState(CHAT0)
  const [msg, setMsg] = useState('')
  const [reproduciendo, setReproduciendo] = useState(false)
  const [viendo, setViendo] = useState(t?.viendo || 0)
  const chatRef = useRef<HTMLDivElement>(null)

  // Ambiente: mensajes que entran solos + espectadores que fluctúan
  useEffect(() => {
    let i = 0
    const im = setInterval(() => { setChat(c => [...c, { ...CHAT_POOL[i % CHAT_POOL.length], mio: false }]); i++ }, 5200)
    const iv = setInterval(() => setViendo(v => Math.max(0, v + (Math.random() > 0.42 ? 1 : -1) * Math.ceil(Math.random() * 3))), 2600)
    return () => { clearInterval(im); clearInterval(iv) }
  }, [])
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [chat])

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
      {/* Reproductor: la emisión real (YouTube/Twitch) si el TO pegó la URL;
          si no, la señal de demostración de siempre. */}
      {t.videoUrl ? (
        <div className="relative">
          <VideoEmbed url={t.videoUrl} titulo={`Directo de ${t.nombre}`} />
          <button onClick={() => router.back()} aria-label="Volver" className="absolute top-4 left-4 z-10 h-10 w-10 rounded-xl bg-black/50 backdrop-blur flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="flex items-center justify-between px-4 py-2 bg-black/40 border-b border-white/6">
            <span className="badge-live">Live</span>
            {viendo > 0 && <span className="inline-flex items-center gap-1 text-[11px] font-mono-num text-white"><Eye size={11} /> {viendo} {tr('directo.viendo')}</span>}
          </div>
        </div>
      ) : (
      <div className="relative aspect-video w-full bg-black overflow-hidden">
        <GameKeyart juegoId={t.juego} label={false} className="absolute inset-0 opacity-40" />
        <div className="absolute inset-0 bg-black/30" />
        <div className="relative h-full flex flex-col items-center justify-center gap-2">
          {reproduciendo ? (
            <>
              <span className="inline-flex items-center gap-2 text-[#B6FF3A] text-sm font-semibold"><span className="dot-live" /> Reproduciendo emisión</span>
              <p className="text-xs text-white/55">Señal de demostración · {juego.nombre}</p>
            </>
          ) : (
            <>
              <button onClick={() => setReproduciendo(true)} aria-label="Reproducir emisión" className="h-16 w-16 rounded-full bg-white/10 border border-white/25 flex items-center justify-center hover:scale-110 transition-transform"><Play size={26} className="text-white ml-1" /></button>
              <p className="text-sm text-white/80">Pulsa para ver la emisión en directo</p>
            </>
          )}
        </div>
        <button onClick={() => router.back()} aria-label="Volver" className="absolute top-4 left-4 h-10 w-10 rounded-xl bg-black/40 backdrop-blur flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        <span className="absolute top-4 right-4 badge-live">Live</span>
        {viendo > 0 && <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 text-[11px] font-mono-num text-white bg-black/55 px-2 py-1 rounded-md"><Eye size={11} /> {viendo}</span>}
      </div>
      )}

      {/* Info */}
      <div className="px-4 pt-3 lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
      <div className="lg:min-w-0">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] text-[#FF6076] font-bold uppercase tracking-wide"><Radio size={11} className="animate-pulse-heat" /> En directo</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white text-display leading-tight">{t.nombre}</h1>

        {/* Combate actual */}
        <div className="mt-3 card-premium p-3.5">
          <p className="eyebrow eyebrow-muted mb-2">{tr('directo.combate')}</p>
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
          <span className="inline-flex items-center gap-2 text-white font-semibold text-sm"><ListTree size={17} className="text-[#9B82FF]" /> {tr('directo.verBracket')}</span>
          <span className="text-[#8B8BA8]">{rondas.reduce((a, r) => a + r.matches.length, 0)} combates ›</span>
        </Link>

      </div>
        {/* Chat */}
        <div className="mt-4 lg:mt-0 lg:sticky lg:top-4">
          <p className="eyebrow eyebrow-muted mb-2">{tr('directo.chat')}</p>
          <div ref={chatRef} className="card-premium p-3 space-y-2.5 max-h-72 lg:max-h-[420px] overflow-y-auto">
            {chat.map((c, i) => (
              <div key={i} className="flex items-start gap-2 animate-slide-up-sm">
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
              placeholder={tr('directo.escribe')}
              className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 outline-none" />
            <button onClick={enviar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center shrink-0"><Send size={17} /></button>
          </div>
        </div>
      </div>
    </div>
  )
}
