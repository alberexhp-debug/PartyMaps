'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, JUEGOS, bracketDe, rankingPorJuego } from '@/lib/torneos/sample'
import { construirRondas, nombreRonda, boDeRonda, type MatchB } from '@/lib/torneos/bracket'
import { useDemoStore, resolverSeeds, type BoDesde } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { useT } from '@/lib/i18n'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameBadge, GameIcon } from '@/components/todh/GameIcon'
import { VideoEmbed } from '@/components/todh/VideoEmbed'
import { CronoSet } from '@/components/todh/CronoSet'
import { ArrowLeft, Radio, Send, ListTree, Eye, Play, Crown } from '@/components/todh/iconosTorneum'

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

// Color estable por autor para el chat real (mismo abecedario visual que el falso)
const PALETA_CHAT = ['#E63E54', '#4F8EF7', '#9B5DE5', '#F4912B', '#2EC4B6', '#FFD166']
const colorDeAutor = (n: string) =>
  n === 'Tú' ? '#B6FF3A' : PALETA_CHAT[[...n].reduce((a, c) => a + c.charCodeAt(0), 0) % PALETA_CHAT.length]

// Qué enseña el escenario cuando el bracket es real
type Escenario =
  | { tipo: 'combate'; a: string; b: string; sa: number; sb: number; ronda: string; inicio?: number }
  | { tipo: 'fin'; campeon: string }
  | { tipo: 'espera' }

export default function DirectoPage() {
  const { t: tr, idioma } = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const override = useDemoStore(s => s.editados[id])
  const t = useMemo(() => {
    const base = getTorneo(id) || creado
    return base ? { ...base, ...(override || {}) } : undefined
  }, [id, creado, override])
  const juego = t ? (JUEGOS[t.juego] ?? JUEGOS.smash) : JUEGOS.smash
  const rondas = bracketDe(id)
  const [chat, setChat] = useState(CHAT0)
  const [msg, setMsg] = useState('')
  const [reproduciendo, setReproduciendo] = useState(false)
  const [viendo, setViendo] = useState(t?.viendo || 0)
  const chatRef = useRef<HTMLDivElement>(null)
  // La sala live es de jugadores y espectadores: una sede no entra (ni por URL).
  const esSede = useSesionStore(s => s.sesion?.rol === 'local')
  useEffect(() => { if (esSede) router.replace(`/torneo/${id}`) }, [esSede, id, router])

  // Bracket OFICIAL (QA 01-09): si el TO generó el cuadro, la emisión pública
  // deja la maqueta y enseña el torneo de verdad: combate del escenario,
  // contador de combates y chat compartido del torneo.
  const gestion = useDemoStore(s => s.gestion[id])
  const perfilesCuentas = useDemoStore(s => s.perfilesCuentas)
  const setsEnJuego = useDemoStore(s => s.setsEnJuego[id])
  const real = !!gestion?.generado
  const vivo = useMemo<{ combates: number; escenario: Escenario } | null>(() => {
    if (!real || !t) return null
    const seeds = resolverSeeds(gestion!.seeds ?? [], rankingPorJuego(t.juego), t.juego, perfilesCuentas)
    const rb = construirRondas(seeds, gestion!.winners ?? {})
    const puntos = gestion!.puntos ?? {}
    const bo = gestion!.bo ?? { base: 3, top: 5, desde: 'semis' as BoDesde }
    const combates = rb.reduce((acc, r) => acc + r.filter(m => m.a && m.b).length, 0)
    const final = rb[rb.length - 1]?.[0]
    if (final?.ganador) {
      const campeon = (final.ganador === 'a' ? final.a?.nombre : final.b?.nombre) ?? '—'
      return { combates, escenario: { tipo: 'fin', campeon } }
    }
    // Al escenario sube el set con crono en marcha; si no hay, el primer cruce
    // pendiente con ambos jugadores ya resueltos.
    let pick: { m: MatchB; ri: number } | null = null
    for (let ri = 0; ri < rb.length && !pick; ri++) {
      const m = rb[ri].find(x => !x.ganador && x.a && x.b && !!setsEnJuego?.[x.id])
      if (m) pick = { m, ri }
    }
    for (let ri = 0; ri < rb.length && !pick; ri++) {
      const m = rb[ri].find(x => !x.ganador && x.a && x.b)
      if (m) pick = { m, ri }
    }
    if (!pick) return { combates, escenario: { tipo: 'espera' } }
    const pts = puntos[pick.m.id]
    return {
      combates,
      escenario: {
        tipo: 'combate',
        a: pick.m.a!.nombre, b: pick.m.b!.nombre,
        sa: pts?.a ?? 0, sb: pts?.b ?? 0,
        ronda: `${nombreRonda(rb[pick.ri].length, idioma)} · Bo${boDeRonda(pick.ri, rb.length, bo)}`,
        inicio: setsEnJuego?.[pick.m.id],
      },
    }
  }, [real, t, gestion, perfilesCuentas, setsEnJuego, idioma])

  // Chat REAL del torneo (misma sala que ChatTorneoSheet): mundo compartido,
  // con la moderación del admin aplicada. El ?? va fuera del selector.
  const mensajesTorneo = useDemoStore(s => s.chatsTorneo[id])
  const enviarChatTorneo = useDemoStore(s => s.enviarChat)
  const silenciados = useDemoStore(s => s.moderacionChat[id]?.silenciados) ?? []
  const silenciadoYo = silenciados.includes('Tú')
  const chatVisible = real
    ? (mensajesTorneo ?? []).filter(m => !silenciados.includes(m.autor)).map(m => ({ u: m.autor, m: m.texto, color: colorDeAutor(m.autor) }))
    : chat

  // Ambiente: espectadores que fluctúan siempre; mensajes falsos SOLO en la
  // señal de muestra (con bracket real el chat es el del torneo).
  useEffect(() => {
    const iv = setInterval(() => setViendo(v => Math.max(0, v + (Math.random() > 0.42 ? 1 : -1) * Math.ceil(Math.random() * 3))), 2600)
    if (real) return () => clearInterval(iv)
    let i = 0
    const im = setInterval(() => { setChat(c => [...c, { ...CHAT_POOL[i % CHAT_POOL.length], mio: false }]); i++ }, 5200)
    return () => { clearInterval(im); clearInterval(iv) }
  }, [real])
  useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }) }, [chatVisible.length])

  function enviar() {
    const texto = msg.trim()
    if (!texto) return
    if (real) enviarChatTorneo(id, texto)
    else setChat(c => [...c, { u: 'Tú', m: texto, mio: true, color: '#B6FF3A' }])
    setMsg('')
  }

  if (esSede) return null

  if (!t) {
    return <div className="min-h-screen flex items-center justify-center text-white">{tr('ges.torneoNoEncontrado')}</div>
  }

  const esc = vivo?.escenario

  return (
    <div className="relative min-h-screen pb-4 max-w-xl mx-auto lg:max-w-none lg:mx-0">
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
              <span className="inline-flex items-center gap-2 text-[#B6FF3A] text-sm font-semibold"><span className="dot-live" /> {tr('dir.reproduciendo')}</span>
              <p className="text-xs text-white/55 inline-flex items-center gap-1.5">{tr('dir.senalDemo')} <GameIcon juegoId={t.juego} size={12} /> {juego.nombre}</p>
            </>
          ) : (
            <>
              <button onClick={() => setReproduciendo(true)} aria-label="Reproducir emisión" className="h-16 w-16 rounded-full bg-white/10 border border-white/25 flex items-center justify-center hover:scale-110 transition-transform"><Play size={26} className="text-white ml-1" /></button>
              <p className="text-sm text-white/80">{tr('dir.pulsaVer')}</p>
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
          <GameBadge juegoId={t.juego} />
          <span className="inline-flex items-center gap-1 text-[11px] text-[#FF6076] font-bold uppercase tracking-wide"><Radio size={11} className="animate-pulse-heat" /> {tr('tf.enDirecto')}</span>
        </div>
        <h1 className="mt-2 text-xl font-bold text-white text-display leading-tight">{t.nombre}</h1>

        {/* Combate actual: el REAL si hay bracket oficial; la maqueta solo en
            los torneos de muestra sin cuadro generado. */}
        {esc?.tipo === 'fin' ? (
          <div className="mt-3 card-premium p-3.5 text-center">
            <p className="eyebrow eyebrow-muted mb-2">{tr('dx.finalizado')}</p>
            <p className="text-[11px] text-[#E0BE63] uppercase tracking-wide font-bold inline-flex items-center gap-1.5"><Crown size={13} fill="currentColor" /> {tr('dx.campeon')}</p>
            <p className="mt-1 text-2xl font-bold text-white text-display">{esc.campeon}</p>
            <Link href={`/torneo/${id}/resultados`} className="mt-3 flex items-center justify-between rounded-2xl bg-[#E0BE63]/10 border border-[#E0BE63]/30 px-4 py-3 hover:bg-[#E0BE63]/15 transition-colors">
              <span className="inline-flex items-center gap-2 text-[#E0BE63] font-semibold text-sm">🏆 {tr('dx.verResultados')}</span>
              <span className="text-[#E0BE63] text-lg">›</span>
            </Link>
          </div>
        ) : esc?.tipo === 'espera' ? (
          <div className="mt-3 card-premium p-3.5">
            <p className="eyebrow eyebrow-muted mb-2">{tr('directo.combate')}</p>
            <p className="text-sm text-[#8B8BA8]">{tr('dx.esperaCombate')}</p>
          </div>
        ) : (
          <div className="mt-3 card-premium p-3.5">
            <p className="eyebrow eyebrow-muted mb-2">{tr('directo.combate')}</p>
            <div className="flex items-center justify-between">
              <div className="text-center flex-1 min-w-0">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[#0A0A0F] font-black text-lg" style={{ background: '#E63E54' }}>{(esc?.a ?? 'Sora')[0]}</span>
                <p className="mt-1.5 text-sm font-bold text-white truncate">{esc?.a ?? 'Sora'}</p>
              </div>
              <div className="px-4 text-center">
                <p className="text-3xl font-bold text-score text-white">{esc?.sa ?? 1}<span className="text-[#6B6B85] mx-1">-</span>{esc?.sb ?? 1}</p>
                <p className="text-[10px] text-[#8B8BA8] uppercase tracking-wide">{esc ? esc.ronda : tr('dir.semifinalBo5')}</p>
                {esc?.inicio && <p className="mt-1"><CronoSet inicio={esc.inicio} /></p>}
              </div>
              <div className="text-center flex-1 min-w-0">
                <span className="inline-flex items-center justify-center w-12 h-12 rounded-full text-[#0A0A0F] font-black text-lg" style={{ background: '#4F8EF7' }}>{(esc?.b ?? 'Rei')[0]}</span>
                <p className="mt-1.5 text-sm font-bold text-white truncate">{esc?.b ?? 'Rei'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Bracket lateral (acceso) */}
        <Link href={`/torneo/${id}/bracket`} className="mt-3 flex items-center justify-between card-premium card-int p-3.5">
          <span className="inline-flex items-center gap-2 text-white font-semibold text-sm"><ListTree size={17} className="text-[#9B82FF]" /> {tr('directo.verBracket')}</span>
          <span className="text-[#8B8BA8]">{vivo ? vivo.combates : rondas.reduce((a, r) => a + r.matches.length, 0)} {tr('dir.combates')} ›</span>
        </Link>

      </div>
        {/* Chat */}
        <div className="mt-4 lg:mt-0 lg:sticky lg:top-4">
          <p className="eyebrow eyebrow-muted mb-2">{tr('directo.chat')}</p>
          <div ref={chatRef} className="card-premium p-3 space-y-2.5 max-h-72 lg:max-h-[420px] overflow-y-auto">
            {chatVisible.length === 0 && <p className="text-[13px] text-[#8B8BA8] text-center py-4">{tr('dx.chatVacio')}</p>}
            {chatVisible.map((c, i) => (
              <div key={i} className="flex items-start gap-2 animate-slide-up-sm">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[#0A0A0F] font-black text-xs shrink-0" style={{ background: c.color }}>{c.u[0]}</span>
                <div className="min-w-0">
                  <span className="text-[12px] font-bold" style={{ color: c.color }}>{c.u}</span>
                  <span className="text-[13px] text-[#D4D4E4] ml-2">{c.m}</span>
                </div>
              </div>
            ))}
          </div>
          {real && silenciadoYo ? (
            <p className="mt-2 h-11 rounded-xl bg-[#FF8A5C]/10 border border-[#FF8A5C]/30 text-[#FF8A5C] text-[12px] font-semibold flex items-center justify-center px-3 text-center">{tr('chat.silenciado')}</p>
          ) : (
          <div className="mt-2 flex items-center gap-2">
            <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') enviar() }}
              placeholder={tr('directo.escribe')}
              className="flex-1 h-11 px-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-[#8B8BA8] focus:border-[#B6FF3A]/60 outline-none" />
            <button onClick={enviar} aria-label="Enviar" className="h-11 w-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] flex items-center justify-center shrink-0"><Send size={17} /></button>
          </div>
          )}
        </div>
      </div>
    </div>
  )
}
