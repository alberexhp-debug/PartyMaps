'use client'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { JUEGOS, rankingPorJuego, type Jugador } from '@/lib/torneos/sample'
import { JUEGOS_CON_STARTGG } from '@/lib/torneos/startgg'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { RangoChip } from '@/components/todh/RangoChip'
import { rangoDe, puntosPorVictoria, multiplicadorProfundidad } from '@/lib/torneos/rangos'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/lib/utils'
import { Globe, MapPin, Crown, ChevronUp, ChevronDown, Minus, Trophy, CalendarClock } from 'lucide-react'

const TIER_COLOR: Record<string, string> = { Platino: '#67E8F9', Diamante: '#A78BFA', Oro: '#E0BE63' }

// Ranking REAL vía start.gg: todos los juegos con presencia allí (España
// primero; cae a Global si la escena local no da para tabla). Magic y CoD no
// viven en start.gg y mantienen la muestra de la demo.
type JugadorReal = { nombre: string; puntos: number; torneos: number; mejor: number; rating: number }
type RankingRealData = { ambito: 'es' | 'global'; nTorneos: number; dias: number; jugadores: JugadorReal[] }

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

function Avatar({ name, size = 44, ring }: { name: string; size?: number; ring?: string }) {
  return (
    <span className="inline-flex items-center justify-center rounded-full font-black text-[#0A0A0F] shrink-0"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.4, boxShadow: ring ? `0 0 0 2px #141822, 0 0 0 4px ${ring}` : undefined }}>
      {name[0]}
    </span>
  )
}

function Tendencia({ n }: { n: number }) {
  if (n === 0) return <span className="inline-flex items-center text-[#6B6B85]"><Minus size={13} /></span>
  if (n > 0) return <span className="inline-flex items-center gap-0.5 text-[#2ED47A] text-[11px] font-bold"><ChevronUp size={13} />{n}</span>
  return <span className="inline-flex items-center gap-0.5 text-[#FF6B6B] text-[11px] font-bold"><ChevronDown size={13} />{Math.abs(n)}</span>
}

// Rankings como start.gg de verdad: ESPAÑA (countryCode ES), MUNDIAL (global)
// —ambos agregados de resultados reales— y el CIRCUITO TOURNEUM (la competición
// propia de la app, 2 splits al año; demo hasta que ruede el backend).
type Vista = 'es' | 'global' | 'tourneum'
const VISTAS: { id: Vista; icon: typeof Trophy }[] = [
  { id: 'es', icon: MapPin },
  { id: 'global', icon: Globe },
  { id: 'tourneum', icon: Trophy },
]
// Solo juegos con resultados reales en start.gg (Magic/CoD no viven allí y
// quedan fuera del ranking hasta que haya fuente oficial de puntuaciones).
const JUEGOS_RANKING = ['smash', 'tekken', 'sf6', 'pokemon', 'tft', 'valorant', 'lol']

export default function RankingPage() {
  const favoritos = useDemoStore(s => s.juegosFavoritos)
  const { t: tr } = useT()
  const [vista, setVista] = useState<Vista>('es')
  const [juego, setJuego] = useState('smash')
  const [juegoTocado, setJuegoTocado] = useState(false)
  // Abre por tu juego principal (si tiene ranking real), salvo elección manual
  useEffect(() => {
    if (!juegoTocado && favoritos[0] && JUEGOS_RANKING.includes(favoritos[0])) setJuego(favoritos[0])
  }, [favoritos, juegoTocado])
  const [sel, setSel] = useState<{ j: Jugador; puesto: number } | null>(null)
  const [comoPuntua, setComoPuntua] = useState(false)
  const esTourneum = vista === 'tourneum'

  // Datos reales cacheados por juego+ámbito. undefined = cargando · null = error/vacío
  const [real, setReal] = useState<Record<string, RankingRealData | null>>({})
  const claveReal = `${juego}:${vista}`
  useEffect(() => {
    if (esTourneum || real[claveReal] !== undefined) return
    let vivo = true
    fetch(`/api/startgg/ranking?juego=${juego}&ambito=${vista}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo) setReal(p => ({ ...p, [claveReal]: d && (d.jugadores?.length ?? 0) >= 4 ? d : null })) })
      .catch(() => { if (vivo) setReal(p => ({ ...p, [claveReal]: null })) })
    return () => { vivo = false }
  }, [claveReal, juego, vista, esTourneum, real])
  const cargandoReal = !esTourneum && real[claveReal] === undefined
  const datosReales = esTourneum ? null : (real[claveReal] ?? null)

  // Circuito Tourneum (demo): solo quienes juegan los oficiales del split
  const listaTourneum = useMemo(() =>
    rankingPorJuego(juego).slice(0, 10).map(j => ({ ...j, rating: Math.max(0, Math.round((j.rating - 1600) * 1.4)) })),
    [juego])
  const top3 = listaTourneum.slice(0, 3)
  const resto = listaTourneum.slice(3)
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const alturas = [88, 116, 70]
  const medallas = ['#C0C7D1', '#E0BE63', '#CD7F45']

  return (
    // El halo de fondo va a TODO el ancho (fuera del contenedor centrado) para
    // que no se vea el corte contra el negro; solo el contenido se centra.
    <div className="relative min-h-screen overflow-hidden pb-24">
      <div className="hero-halo-violet" />
      <div className="lg:max-w-4xl lg:mx-auto">

      <div className="relative px-5 pt-6 pb-2 safe-top">
        <p className="eyebrow mb-2">{tr('ranking.eyebrow')}</p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{tr('ranking.titulo')}</h1>
          <button onClick={() => setComoPuntua(true)} className="mb-1 h-8 px-3 rounded-full bg-white/6 border border-white/12 text-[11px] font-bold text-[#B8B8CC] hover:text-white transition-colors shrink-0">{tr('rk.comoPuntua')}</button>
        </div>
      </div>

      {/* Ámbito, como en start.gg: país, global o el circuito propio */}
      <div className="relative px-4 mt-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 max-w-md">
          {VISTAS.map(({ id, icon: Icon }) => (
            <button key={id} onClick={() => setVista(id)}
              className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
                vista === id ? (id === 'tourneum' ? 'bg-[#E0BE63]/20 text-[#E0BE63] shadow-sm' : 'bg-white/12 text-white shadow-sm') : 'text-[#8B8BA8] hover:text-white')}>
              <Icon size={14} /> {id === 'es' ? tr('ranking.espana') : id === 'global' ? tr('ranking.mundial') : 'Circuito'}
            </button>
          ))}
        </div>
      </div>

      {/* Circuito oficial (Tourneum): sin país/global — puntúas jugando los oficiales */}
      {esTourneum && (
        <div className="relative px-4 mt-3">
          <Link href="/circuito" className="rounded-2xl border border-[#E0BE63]/35 bg-[#E0BE63]/[0.07] px-4 py-3 flex items-center gap-3 hover:bg-[#E0BE63]/[0.12] transition-colors">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0BE63]/15 text-[#E0BE63] shrink-0"><Trophy size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">Circuito oficial Tourneum · Split 2 · 2026</p>
              <p className="text-[11px] text-[#D8C48A]">Se disputa 2 veces al año en los torneos oficiales de la app. Puntúan solo sus participantes — sin ámbito por país ni global.</p>
              <p className="mt-1 text-[11px] font-bold text-[#E0BE63] inline-flex items-center gap-1"><CalendarClock size={11} /> Próximo oficial: 13 dic 2026 · ver el circuito ›</p>
            </div>
          </Link>
        </div>
      )}

      {/* Chips de juego: solo los que tienen resultados reales en start.gg */}
      <div className="relative px-4 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {JUEGOS_RANKING.map(id => JUEGOS[id]).filter(Boolean).map(j => {
            const activo = juego === j.id
            return (
              <button key={j.id} onClick={() => { setJuegoTocado(true); setJuego(j.id) }}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={activo
                  ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </button>
            )
          })}
        </div>
      </div>

      {!esTourneum ? (
        cargandoReal ? (
          <div className="relative px-4 mt-6 max-w-2xl lg:max-w-4xl mx-auto">
            <div className="card-premium p-5 flex items-center gap-3 text-sm text-[#8B8BA8]">
              <span className="h-4 w-4 border-2 border-white/20 border-t-[#6E9BFF] rounded-full animate-spin" />
              Leyendo resultados reales de start.gg…
            </div>
          </div>
        ) : datosReales ? (
          <BloqueRankingReal key={`real-${claveReal}`} datos={datosReales} />
        ) : (
          <div className="relative px-4 mt-6 max-w-2xl lg:max-w-4xl mx-auto">
            <div className="card-premium p-6 text-center">
              <p className="text-sm font-bold text-white">Aún no hay tabla {vista === 'es' ? 'de España' : 'mundial'} para {JUEGOS[juego]?.corto ?? juego}</p>
              <p className="mt-1 text-[12px] text-[#8B8BA8]">
                {vista === 'es'
                  ? 'La escena española de este juego todavía publica pocos resultados en start.gg.'
                  : 'start.gg no devuelve suficientes resultados recientes de este juego.'}
              </p>
              {vista === 'es' && (
                <button onClick={() => setVista('global')} className="mt-3 h-10 px-4 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">
                  Ver ranking mundial
                </button>
              )}
            </div>
          </div>
        )
      ) : (
      <>
      {/* Podio del circuito (demo hasta que ruede el backend) */}
      <div key={`tourneum-${juego}`} className="relative px-4 mt-5 flex items-end justify-center gap-3 max-w-2xl lg:max-w-4xl mx-auto">
        {podio.map((p, i) => {
          const first = i === 1
          const jColor = JUEGOS[juego].color
          const puesto = first ? 1 : i === 0 ? 2 : 3
          return (
            <button key={p.id} onClick={() => setSel({ j: p, puesto })} className="flex flex-col items-center stagger-item" style={{ width: 96, ['--delay' as string]: `${i * 80}ms` }}>
              <div className="relative">
                {first && <div className="absolute -inset-2.5 rounded-full blur-xl opacity-50" style={{ background: jColor }} />}
                <div className="relative rounded-full p-[2.5px]" style={{ background: first ? `linear-gradient(135deg, #E0BE63, ${jColor})` : `${medallas[i]}55` }}>
                  <Avatar name={p.nombre} size={first ? 66 : 50} />
                </div>
                {first && <Crown size={22} className="absolute -top-4 left-1/2 -translate-x-1/2 text-[#E0BE63]" fill="#E0BE63" />}
              </div>
              <p className="mt-2 text-sm font-bold text-white truncate max-w-full">{p.nombre} {p.bandera}</p>
              <p className="text-[15px] font-bold text-score" style={{ color: first ? '#E0BE63' : '#B6FF3A' }}><CountUp value={p.rating} duration={1000} /></p>
              <div className="mt-0.5 flex justify-center"><RangoChip rating={p.rating} /></div>
              <div className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-1.5 ring-grad relative overflow-hidden"
                style={{ height: alturas[i], background: `linear-gradient(180deg, ${medallas[i]}2E, ${medallas[i]}08)`, borderTop: `2px solid ${medallas[i]}` }}>
                <span className="text-3xl font-bold text-score" style={{ color: medallas[i] }}>{puesto}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabla del circuito */}
      <div key={`t-tourneum-${juego}`} className="relative px-4 mt-4 space-y-1.5 pb-28 max-w-2xl lg:max-w-4xl mx-auto">
        {resto.map((p, i) => {
          const puesto = i + 4
          return (
            <button key={p.id} onClick={() => setSel({ j: p, puesto })}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors text-left stagger-item bg-white/4 border-white/8 hover:bg-white/[0.07]"
              style={{ ['--delay' as string]: `${Math.min(i, 12) * 40}ms` }}>
              <span className="w-6 text-center text-sm font-bold font-mono-num text-[#8B8BA8]">{puesto}</span>
              <Avatar name={p.nombre} size={38} ring={TIER_COLOR[p.tier]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.nombre} <span className="text-xs">{p.bandera}</span></p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num flex items-center gap-1">{p.victorias}V · {p.derrotas}D · <PersonajeChip juegoId={p.juego} nombre={p.main} /></p>
              </div>
              <Tendencia n={p.tendencia} />
              <RangoChip rating={p.rating} />
              <span className="text-sm font-bold text-white font-mono-num w-12 text-right">{p.rating}</span>
            </button>
          )
        })}
      </div>

      </>
      )}

      {sel && <MiniPerfil jugador={sel.j} puesto={sel.puesto} onClose={() => setSel(null)} />}

      {/* Explicador del sistema competitivo (reunión 5-jul) */}
      {comoPuntua && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setComoPuntua(false)} />
          <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[86vh] overflow-y-auto p-5">
            <p className="text-lg font-bold text-white text-display">{tr('rk.titulo')}</p>
            <p className="mt-1 text-[13px] text-[#B8B8CC]">{tr('rk.intro')}</p>
            <div className="mt-3 space-y-1.5 text-[13px]">
              {[
                ['⚔️', tr('rk.mismo'), '+25 pts'],
                ['🔥', tr('rk.superior'), '+60–200'],
                ['🧊', tr('rk.inferior'), '+5–12'],
                ['📉', tr('rk.perder'), tr('rk.perderV')],
                ['🎯', tr('rk.marcador'), tr('rk.marcadorV')],
                ['🏆', tr('rk.profundidad'), tr('rk.profundidadV')],
                ['⭐', tr('rk.tier'), tr('rk.tierV')],
                ['🆓', tr('rk.gratis'), tr('rk.gratisV')],
                ['⏳', tr('rk.decay'), tr('rk.decayV')],
              ].map(([e, t, v]) => (
                <div key={t as string} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2">
                  <span>{e}</span>
                  <span className="flex-1 text-white font-semibold">{t}</span>
                  <span className="text-[11px] text-[#B6FF3A] font-bold font-mono-num text-right">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[#8B8BA8]">{tr('rk.pie')}</p>
            <p className="mt-2 rounded-xl bg-[#6E9BFF]/10 border border-[#6E9BFF]/30 px-3 py-2 text-[11px] text-[#B8C8E8]"><span className="font-bold text-white">Hoy</span>: España y Mundial se calculan agregando resultados reales de start.gg (tamaño del torneo × puesto). El sistema completo de puntos de arriba se estrena con los torneos Tourneum.</p>
            <button onClick={() => setComoPuntua(false)} className="mt-4 w-full h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold">{tr('rk.ok')}</button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Ranking REAL: agregado de los standings de los torneos de España en start.gg
// (últimos 120 días). Mismo lenguaje visual que la demo; puntúa por tamaño de
// torneo y puesto. «Tú» aún no apareces: se estrena con tu primer Tourneum.
function BloqueRankingReal({ datos }: { datos: RankingRealData }) {
  const top3 = datos.jugadores.slice(0, 3)
  const resto = datos.jugadores.slice(3)
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const orden = [2, 1, 3]
  const alturas = [88, 116, 70]
  const medallas = ['#C0C7D1', '#E0BE63', '#CD7F45']
  // Tag vinculado: si estás en la lista real, la app te reconoce («ese soy yo»)
  const tag = useDemoStore(s => s.tagStartgg)
  const vincular = useDemoStore(s => s.vincularStartgg)
  const [tagInput, setTagInput] = useState('')
  const [selReal, setSelReal] = useState<{ p: JugadorReal; puesto: number } | null>(null)
  const [compartido, setCompartido] = useState(false)
  // Cara a cara: elige un jugador desde su mini-perfil y toca al rival
  const [vsBase, setVsBase] = useState<JugadorReal | null>(null)
  const [vsPair, setVsPair] = useState<{ a: JugadorReal; b: JugadorReal } | null>(null)
  const tocarJugador = (p: JugadorReal, puesto: number) => {
    if (vsBase && vsBase.nombre !== p.nombre) { setVsPair({ a: vsBase, b: p }); setVsBase(null) }
    else setSelReal({ p, puesto })
  }
  const esYo = (nombre: string) => !!tag && nombre.toLowerCase() === tag.toLowerCase()
  const miIdx = tag ? datos.jugadores.findIndex(p => esYo(p.nombre)) : -1
  const miFila = miIdx >= 0 ? datos.jugadores[miIdx] : null

  // Lo que la comunidad comparte: tu puesto, con retador incluido
  const compartirPuesto = async () => {
    if (!miFila) return
    const texto = `🏆 Voy #${miIdx + 1} de ${datos.ambito === 'es' ? 'España' : 'el mundo'} con ${miFila.puntos} pts (${miFila.torneos} ${miFila.torneos === 1 ? 'torneo' : 'torneos'}). ¿Me alcanzas? party-maps-hojy.vercel.app/ranking`
    try {
      if (navigator.share) await navigator.share({ text: texto })
      else { await navigator.clipboard.writeText(texto); setCompartido(true); setTimeout(() => setCompartido(false), 1800) }
    } catch { /* cancelado */ }
  }

  return (
    <>
      {/* Fuente de los datos, sin letra pequeña */}
      <div className="relative px-4 mt-4 max-w-2xl lg:max-w-4xl mx-auto">
        <div className="flex items-center gap-2 rounded-xl border border-[#6E9BFF]/30 bg-[#6E9BFF]/[0.07] px-3 py-2">
          <span className="dot-live" />
          <p className="flex-1 text-[11px] font-semibold text-[#B8C8E8]">Resultados reales · start.gg {datos.ambito === 'es' ? 'España' : 'Global'} · <span className="font-mono-num">{datos.nTorneos}</span> torneos en {datos.dias} días</p>
        </div>
        {vsBase && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/10 px-3 py-2 animate-slide-up-sm">
            <span>⚔️</span>
            <p className="flex-1 text-[11px] font-bold text-white">Comparando a {vsBase.nombre} — toca a su rival</p>
            <button onClick={() => setVsBase(null)} className="text-[10px] text-[#8B8BA8] font-semibold hover:text-white">Cancelar</button>
          </div>
        )}
      </div>

      {/* Podio real */}
      <div className="relative px-4 mt-5 flex items-end justify-center gap-3 max-w-2xl lg:max-w-4xl mx-auto">
        {podio.map((p, i) => {
          const first = i === 1
          return (
            <button key={p.nombre} onClick={() => tocarJugador(p, orden[i])} className="flex flex-col items-center stagger-item" style={{ width: 96, ['--delay' as string]: `${i * 80}ms` }}>
              <div className="relative">
                {first && <div className="absolute -inset-2.5 rounded-full blur-xl opacity-50 bg-[#E0BE63]" />}
                <div className="relative rounded-full p-[2.5px]" style={{ background: first ? 'linear-gradient(135deg, #E0BE63, #6E9BFF)' : `${medallas[i]}55` }}>
                  <Avatar name={p.nombre} size={first ? 66 : 50} />
                </div>
                {first && <Crown size={22} className="absolute -top-4 left-1/2 -translate-x-1/2 text-[#E0BE63]" fill="#E0BE63" />}
              </div>
              <p className="mt-2 text-sm font-bold text-white truncate max-w-full">{p.nombre}{esYo(p.nombre) && <span className="ml-1 text-[10px] font-black uppercase text-[#B6FF3A]">· tú</span>}</p>
              <p className="text-[15px] font-bold text-score" style={{ color: first ? '#E0BE63' : '#B6FF3A' }}><CountUp value={p.puntos} duration={1000} /> <span className="text-[10px] text-[#8B8BA8]">pts</span></p>
              <div className="mt-0.5 flex justify-center"><RangoChip rating={p.rating} /></div>
              <p className="mt-0.5 text-[10px] text-[#8B8BA8] font-mono-num">{p.torneos} torneos</p>
              <div className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-1.5 ring-grad relative overflow-hidden"
                style={{ height: alturas[i], background: `linear-gradient(180deg, ${medallas[i]}2E, ${medallas[i]}08)`, borderTop: `2px solid ${medallas[i]}` }}>
                <span className="text-3xl font-bold text-score" style={{ color: medallas[i] }}>{orden[i]}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabla real */}
      <div className="relative px-4 mt-4 space-y-1.5 pb-8 max-w-2xl lg:max-w-4xl mx-auto">
        {resto.map((p, i) => {
          const yo = esYo(p.nombre)
          return (
            <button key={p.nombre} onClick={() => tocarJugador(p, i + 4)}
              className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border stagger-item text-left transition-colors', yo ? 'bg-[#B6FF3A]/10 border-[#B6FF3A]/40' : 'bg-white/4 border-white/8 hover:bg-white/[0.07]')} style={{ ['--delay' as string]: `${Math.min(i, 12) * 40}ms` }}>
              <span className={cn('w-6 text-center text-sm font-bold font-mono-num', yo ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]')}>{i + 4}</span>
              <Avatar name={p.nombre} size={38} ring={yo ? '#B6FF3A' : undefined} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{p.nombre}{yo && <span className="ml-1.5 text-[10px] font-black uppercase text-[#B6FF3A]">tú</span>}</p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num">{p.torneos} {p.torneos === 1 ? 'torneo' : 'torneos'} · mejor: {p.mejor}º</p>
              </div>
              <RangoChip rating={p.rating} />
              <span className="text-sm font-bold text-white font-mono-num w-12 text-right">{p.puntos} <span className="text-[10px] text-[#8B8BA8] font-semibold">pts</span></span>
            </button>
          )
        })}

        {/* Tu identidad en el ranking real: vincula tu tag de start.gg */}
        {miFila ? (
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-[#B6FF3A]/10 border border-[#B6FF3A]/40">
            <span className="w-6 text-center text-sm font-bold text-[#B6FF3A] font-mono-num">{miIdx + 1}</span>
            <Avatar name={miFila.nombre} size={38} ring="#B6FF3A" />
            <p className="flex-1 text-[12px] text-[#B8B8CC]"><span className="text-white font-bold">Ese eres tú</span> · {miFila.puntos} pts reales con {miFila.torneos} {miFila.torneos === 1 ? 'torneo' : 'torneos'}. Al llegar el backend, este historial siembra tu rating.</p>
            <span className="flex flex-col items-end gap-1 shrink-0">
              <button onClick={compartirPuesto} className="h-8 px-3 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[11px] font-bold">
                {compartido ? '¡Copiado!' : 'Compartir 🔥'}
              </button>
              <button onClick={() => vincular(null)} className="text-[10px] text-[#8B8BA8] font-semibold hover:text-white">Desvincular</button>
            </span>
          </div>
        ) : tag ? (
          <div className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/10">
            <Avatar name={tag} size={38} ring="#8B8BA8" />
            <p className="flex-1 text-[12px] text-[#B8B8CC]">Vinculado como <span className="text-white font-bold">{tag}</span> — sin top 16 en {datos.ambito === 'es' ? 'España' : 'la escena global'} estos {datos.dias} días. Tu puesto se estrena con tu próximo torneo.</p>
            <button onClick={() => vincular(null)} className="text-[10px] text-[#8B8BA8] font-semibold hover:text-white shrink-0">Desvincular</button>
          </div>
        ) : (
          <div className="mt-3 rounded-2xl bg-[#B6FF3A]/8 border border-dashed border-[#B6FF3A]/35 px-3 py-2.5">
            <p className="text-[12px] text-[#B8B8CC] mb-2">¿Estás en esta lista? <span className="text-white font-semibold">Vincula tu tag de start.gg</span> y la app te reconoce.</p>
            <form className="flex gap-2" onSubmit={e => { e.preventDefault(); if (tagInput.trim()) { vincular(tagInput.trim()); setTagInput('') } }}>
              <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Tu tag (ej. Sisqui)"
                className="flex-1 h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-sm focus:border-[#B6FF3A]/60 outline-none" />
              <button type="submit" disabled={!tagInput.trim()} className="h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold disabled:opacity-40">Vincular</button>
            </form>
          </div>
        )}
      </div>

      {/* Mini-perfil del jugador REAL: sus números agregados de start.gg */}
      {selReal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={() => setSelReal(null)} />
          <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
            <div className="flex items-center gap-3">
              <Avatar name={selReal.p.nombre} size={54} ring={esYo(selReal.p.nombre) ? '#B6FF3A' : undefined} />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white text-display truncate">{selReal.p.nombre}{esYo(selReal.p.nombre) && <span className="ml-1.5 text-[11px] font-black uppercase text-[#B6FF3A]">tú</span>}</p>
                <p className="text-[11px] text-[#8B8BA8]">#{selReal.puesto} · {datos.ambito === 'es' ? 'España' : 'Mundial'} · resultados reales de start.gg</p>
              </div>
              <RangoChip rating={selReal.p.rating} size="md" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[[String(selReal.p.puntos), 'Puntos'], [String(selReal.p.torneos), selReal.p.torneos === 1 ? 'Torneo' : 'Torneos'], [`${selReal.p.mejor}º`, 'Mejor puesto']].map(([v, l]) => (
                <div key={l} className="card-premium px-2 py-3 text-center">
                  <p className="text-xl font-bold text-white font-mono-num leading-none">{v}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{l}</p>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-[#8B8BA8]">Agregado de {datos.nTorneos} torneos ({datos.dias} días). Su perfil completo llegará cuando juegue en Tourneum.</p>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setVsBase(selReal.p); setSelReal(null) }}
                className="flex-1 h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">⚔️ Comparar con…</button>
              <button onClick={() => setSelReal(null)} className="h-11 px-4 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Cara a cara: dos jugadores reales, métrica a métrica */}
      {vsPair && (() => {
        const { a, b } = vsPair
        const puestoDe = (x: JugadorReal) => datos.jugadores.findIndex(p => p.nombre === x.nombre) + 1
        const metricas: { label: string; va: number; vb: number; menorGana?: boolean; fmt?: (n: number) => string }[] = [
          { label: 'Puntos', va: a.puntos, vb: b.puntos },
          { label: 'Torneos', va: a.torneos, vb: b.torneos },
          { label: 'Mejor puesto', va: a.mejor, vb: b.mejor, menorGana: true, fmt: n => `${n}º` },
        ]
        const ganadas = metricas.filter(m => (m.menorGana ? m.va < m.vb : m.va > m.vb)).length
        const perdidas = metricas.filter(m => (m.menorGana ? m.va > m.vb : m.va < m.vb)).length
        const veredicto = ganadas > perdidas ? `${a.nombre} domina ${ganadas}-${perdidas}` : perdidas > ganadas ? `${b.nombre} domina ${perdidas}-${ganadas}` : 'Empate técnico — que lo decida el bracket'
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={() => setVsPair(null)} />
            <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
              <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[#8B8BA8] font-bold mb-3">⚔️ Cara a cara · {datos.ambito === 'es' ? 'España' : 'Mundial'}</p>
              <div className="flex items-center justify-between gap-3">
                {[a, b].map(x => (
                  <div key={x.nombre} className="flex-1 flex flex-col items-center min-w-0">
                    <Avatar name={x.nombre} size={52} ring={esYo(x.nombre) ? '#B6FF3A' : undefined} />
                    <p className="mt-1.5 text-sm font-bold text-white truncate max-w-full">{x.nombre}</p>
                    <p className="text-[10px] text-[#8B8BA8] font-mono-num">#{puestoDe(x)}</p>
                    <div className="mt-1"><RangoChip rating={x.rating} /></div>
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1.5">
                {metricas.map(m => {
                  const gA = m.menorGana ? m.va < m.vb : m.va > m.vb
                  const gB = m.menorGana ? m.vb < m.va : m.vb > m.va
                  const f = m.fmt ?? ((n: number) => String(n))
                  return (
                    <div key={m.label} className="flex items-center gap-2 rounded-xl bg-white/4 border border-white/8 px-3 py-2">
                      <span className={cn('w-14 text-left text-sm font-bold font-mono-num', gA ? 'text-[#B6FF3A]' : 'text-white')}>{f(m.va)}</span>
                      <span className="flex-1 text-center text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{m.label}</span>
                      <span className={cn('w-14 text-right text-sm font-bold font-mono-num', gB ? 'text-[#B6FF3A]' : 'text-white')}>{f(m.vb)}</span>
                    </div>
                  )
                })}
              </div>
              <p className="mt-3 text-center text-[12px] font-bold text-[#E0BE63]">{veredicto}</p>
              <p className="mt-1 text-center text-[10px] text-[#8B8BA8]">Con resultados reales de start.gg ({datos.dias} días). El H2H set a set llegará con los torneos Tourneum.</p>
              <button onClick={() => setVsPair(null)} className="mt-4 w-full h-11 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">Cerrar</button>
            </div>
          </div>
        )
      })()}
    </>
  )
}
