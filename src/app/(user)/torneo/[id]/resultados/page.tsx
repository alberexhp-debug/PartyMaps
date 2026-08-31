'use client'
import { useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, organizadorEfectivo, rankingPorJuego, JUEGOS, STANDINGS_SAMPLE, HISTORIAL_USUARIO, type Jugador } from '@/lib/torneos/sample'
import { construirRondas, standingsDe } from '@/lib/torneos/bracket'
import { useDemoStore, resolverSeeds } from '@/lib/stores/useDemoStore'
import { useT, conParams } from '@/lib/i18n'
import Link from 'next/link'
import { ArrowLeft, Crown, Trophy, Star, Check, ShieldCheck, Radio } from 'lucide-react'
import { CountUp } from '@/components/ui/CountUp'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { GameIcon } from '@/components/todh/GameIcon'
import { VideoEmbed } from '@/components/todh/VideoEmbed'
import { MisSetsVOD } from '@/components/todh/MisSetsVOD'

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

export default function ResultadosPage() {
  const { t: tr, idioma } = useT()
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const creado = useDemoStore(s => s.creados.find(c => c.id === id))
  const gestion = useDemoStore(s => s.gestion[id])
  const perfilesCuentas = useDemoStore(s => s.perfilesCuentas)
  // Ediciones del TO (p.ej. el vodUrlFinal pegado al cerrar el directo) aplican
  // también aquí: antes esta página leía el sample sin overrides.
  const override = useDemoStore(s => s.editados[id])
  const base = getTorneo(id) || creado
  const t = base ? { ...base, ...(override || {}) } : undefined
  const bote = t?.bote || 0

  // ── VODs N1 ──
  // Entrada del historial del usuario CON sets en esta edición (clave por
  // entrada, no por torneoId: dos ediciones comparten t1 y solo una lleva VOD).
  const entradaConSets = HISTORIAL_USUARIO.find(h => h.torneoId === id && !!h.misSets?.length)
  // El VOD definitivo del TO manda sobre videoUrl (que puede ser el canal del
  // directo, muerto al día siguiente); el vodUrl sembrado de la entrada, de red.
  const vodSrc = t?.vodUrlFinal || t?.videoUrl || entradaConSets?.vodUrl
  // Salto activo: re-monta el VideoEmbed con `key` para arrancar en el minuto.
  const [tSeg, setTSeg] = useState<number | null>(null)

  // Clasificación REAL si el TO cerró la final en /gestionar; si no, la de muestra.
  const standingsReales = useMemo<string[] | null>(() => {
    if (!t || !gestion?.generado) return null
    const seeds = resolverSeeds(gestion.seeds ?? [], rankingPorJuego(t.juego), t.juego, perfilesCuentas)
    const st = standingsDe(construirRondas(seeds, gestion.winners ?? {}))
    return st.length ? st.map(p => p.nombre) : null
  }, [t, gestion, perfilesCuentas])
  const real = !!standingsReales
  const STANDINGS = standingsReales ?? STANDINGS_SAMPLE
  // Main de cada jugador (para el icono de personaje en la clasificación)
  const poolJuego = useMemo(() => (t ? rankingPorJuego(t.juego) : []), [t])
  const mainDe = (nombre: string) => poolJuego.find(p => p.nombre === nombre)?.main
  const premios = [Math.round(bote * 0.7), Math.round(bote * 0.2), Math.round(bote * 0.1)]
  const medallas = ['#E0BE63', '#C0C7D1', '#CD7F45']

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <div className="relative h-28" style={{ background: 'linear-gradient(135deg, rgba(224,190,99,0.35), #10131B 75%)' }}>
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="relative px-5 -mt-6">
        <p className="eyebrow eyebrow-muted">{tr('res.clasifFinal')}</p>
        <h1 className="text-2xl font-bold text-white text-display tracking-tight">{t?.nombre || tr('rk2.torneoSingCap')}</h1>
        {real && (
          <p className="mt-1.5 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#B6FF3A]"><ShieldCheck size={13} /> {tr('res.oficiales')}</p>
        )}

        {/* Detalles del torneo: quien llega desde el historial de un jugador ve
            el contexto completo del evento, no solo el podio. */}
        {t && (
          <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-2">
            {[
              ['juego', tr('res.lblJuego'), JUEGOS[t.juego]?.nombre ?? t.juego],
              ['fecha', tr('adm.fecha'), t.fechaLabel],
              ['sede', tr('mesa.sede'), t.online ? 'Online' : t.local],
              ['formato', tr('torneo.formato'), t.formato],
            ].map(([k, l, v]) => (
              <div key={k} className="card-premium px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{l}</p>
                <p className="text-[13px] font-bold text-white truncate">{k === 'juego' && <GameIcon juegoId={t.juego} size={13} className="mr-1.5" />}{v}</p>
              </div>
            ))}
          </div>
        )}

        {/* Campeón */}
        <div className="mt-5 card-premium p-5 text-center relative overflow-hidden animate-slide-up-sm">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-[#E0BE63]/20 blur-3xl" />
          <Crown size={26} className="mx-auto text-[#E0BE63] mb-1" fill="#E0BE63" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#E0BE63] font-bold">{tr('res.campeon')}</p>
          <div className="relative mt-3 flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-black text-[#0A0A0F] ring-4 ring-[#E0BE63]/40 animate-pop" style={{ background: avatarColor(STANDINGS[0]), boxShadow: '0 0 40px -6px rgba(224,190,99,.55)' }}>{STANDINGS[0][0]}</span>
            <p className="mt-3 text-2xl font-bold text-white text-display">{STANDINGS[0]}</p>
            {bote > 0 && <p className="mt-1 text-lg font-bold text-[#E0BE63] text-numeric"><CountUp value={premios[0]} suffix="€" duration={1200} /></p>}
          </div>
        </div>

        {/* Podio 2-3 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="card-premium p-4 text-center stagger-item" style={{ ['--delay' as string]: `${150 + i * 90}ms` }}>
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl text-xl font-black text-[#0A0A0F] mx-auto" style={{ background: avatarColor(STANDINGS[i]) }}>{STANDINGS[i][0]}</span>
              <p className="mt-2 text-sm font-bold text-white">{STANDINGS[i]}</p>
              <p className="text-[11px] font-bold" style={{ color: medallas[i] }}>{idioma === 'en' ? (i === 1 ? '2nd place' : '3rd place') : idioma === 'ja' ? `${i + 1}位` : `${i + 1}º puesto`}</p>
              {bote > 0 && <p className="text-sm font-bold text-white text-numeric mt-0.5">{premios[i]}€</p>}
            </div>
          ))}
        </div>

        {/* Reparto */}
        {bote > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/4 border border-white/8 px-4 py-3">
            <span className="text-sm text-[#B8B8CC]">{tr('res.boteRepartido')}</span>
            <span className="text-base font-bold text-[#E0BE63] text-numeric">{bote}€</span>
          </div>
        )}

        {/* Standings */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('res.clasifCompleta')}</p>
        <div className="space-y-1.5">
          {STANDINGS.map((n, i) => (
            <div key={n} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 10) * 50}ms` }}>
              <span className="w-6 text-center text-sm font-bold text-numeric" style={{ color: i < 3 ? medallas[i] : '#8B8BA8' }}>{i + 1}</span>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-black text-[#0A0A0F] shrink-0" style={{ background: avatarColor(n) }}>{n[0]}</span>
              <span className="flex-1 text-sm font-bold text-white inline-flex items-center gap-1.5">{n} {t && <PersonajeIcon juegoId={t.juego} nombre={mainDe(n)} px={16} />}</span>
              {i < 3 && bote > 0 && <span className="text-sm font-bold text-[#E0BE63] text-numeric">{premios[i]}€</span>}
              {i === 0 && <Trophy size={15} className="text-[#E0BE63]" />}
            </div>
          ))}
        </div>

        {/* La emisión que hubo en ese momento (VOD del directo). VODs N1: el
            `key` re-monta el player al pulsar «ver mi set» y arranca en el
            minuto del set (tSeg), sin navegar a ningún sitio. */}
        {vodSrc && (
          <div className="mt-6">
            <p className="eyebrow eyebrow-muted mb-2 flex items-center gap-2"><Radio size={12} className="text-[#E63E54]" /> {tr('res.asiSeVivio')}</p>
            <VideoEmbed key={tSeg ?? 'inicio'} url={vodSrc} tSeg={tSeg ?? undefined} titulo={t?.nombre} className="rounded-2xl border border-white/10" />
            {entradaConSets && (
              <div className="mt-4">
                <p className="eyebrow eyebrow-muted mb-2">{tr('vod.tusSets')}</p>
                <MisSetsVOD vodUrl={vodSrc} sets={entradaConSets.misSets!} onVer={seg => setTSeg(seg)} />
              </div>
            )}
          </div>
        )}

        {/* Ficha completa del torneo, a un toque */}
        {t && (
          <Link href={`/torneo/${t.id}`} className="mt-4 flex items-center justify-between card-premium card-int p-3.5">
            <span className="text-sm font-semibold text-white">{tr('res.verFichaCompleta')}</span>
            <span className="text-[#8B8BA8] text-lg">›</span>
          </Link>
        )}

        {/* Valoración post-torneo del organizador */}
        {t?.organizadorId && <ValorarTO orgId={t.organizadorId} torneoId={t.id} />}
      </div>
    </div>
  )
}

// Al acabar el torneo, el jugador valora al TO (alimenta su rating e insignias).
// PERSISTE en el store por torneo: no se pierde al recargar ni se vota dos veces.
function ValorarTO({ orgId, torneoId }: { orgId: string; torneoId: string }) {
  const { t: tr } = useT()
  const org = organizadorEfectivo(orgId)
  const valorar = useDemoStore(s => s.valorarOrganizador)
  const guardada = useDemoStore(s => s.valoracionesTO[torneoId])
  const [stars, setStars] = useState(0)
  const enviada = !!guardada

  const enviar = () => {
    if (!stars || enviada) return
    valorar(torneoId, org.nombre, stars)
  }

  return (
    <div className="mt-6 card-premium p-4">
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: org.color }}>{org.nombre[0]}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{conParams(tr('res.queTalCon'), { nombre: org.nombre })}</p>
          <p className="text-[11px] text-[#8B8BA8]">{conParams(tr('res.valoracionAlimenta'), { rating: org.rating })}</p>
        </div>
      </div>
      {enviada ? (
        <div className="mt-3 h-11 rounded-xl bg-[#B6FF3A]/12 border border-[#B6FF3A]/35 text-[#B6FF3A] text-sm font-bold flex items-center justify-center gap-2">
          <Check size={15} /> {tr('res.valoracionEnviada')} · {guardada}★
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} onClick={() => setStars(n)} aria-label={`${n} estrellas`} className="p-1">
                <Star size={24} className={n <= stars ? 'text-[#E0BE63] fill-[#E0BE63]' : 'text-[#4A4A5E]'} />
              </button>
            ))}
          </div>
          <button onClick={enviar} disabled={!stars}
            className="ml-auto h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold disabled:opacity-40">{tr('res.enviar')}</button>
        </div>
      )}
    </div>
  )
}
