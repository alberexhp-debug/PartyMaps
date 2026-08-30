'use client'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { JUEGOS } from '@/lib/torneos/sample'
import { rankingTorneum, rankingPlataforma, plataformaDe, topePuntos, PAISES, paisDe, type FilaRankingTorneum } from '@/lib/torneos/puntos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { useT, conParams } from '@/lib/i18n'
import { RangoChip } from '@/components/todh/RangoChip'
import { GameIcon } from '@/components/todh/GameIcon'
import { CrewTag } from '@/components/todh/CrewTag'
import { CountUp } from '@/components/ui/CountUp'
import { cn } from '@/lib/utils'
import { Globe, MapPin, Crown, ChevronUp, ChevronDown, Minus, Trophy, CalendarClock, Check, X } from 'lucide-react'

// RANKING TORNEUM: solo puntúan los torneos jugados en Torneum (nunca start.gg
// u otras plataformas — así no hay desajustes con sus puntuaciones).
// Ejes: juego × modalidad (presencial/online) × ámbito (tu país / mundial).
// Tu país lo eliges al registrarte: puntúas para él juegues donde juegues, así
// un visitante de fuera puede jugar cualquier torneo sin romper ningún ranking.
// El Circuito (oficiales + Super Majors) tiene tabla propia en /circuito.

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

type Ambito = 'pais' | 'mundial' | 'circuito'
type Modalidad = 'presencial' | 'online'

export default function RankingPage() {
  const favoritos = useDemoStore(s => s.juegosFavoritos)
  const juegosCustom = useDemoStore(s => s.juegosCustom)
  const ocultos = useDemoStore(s => s.juegosOcultos)
  // Catálogo vivo: altas del admin dentro, desactivados fuera
  const juegosLista = useMemo(() => Object.values(JUEGOS).filter(j => !ocultos.includes(j.id)), [juegosCustom, ocultos])
  const pais = useDemoStore(s => s.paisJugador)
  const setPais = useDemoStore(s => s.setPaisJugador)
  const { t: tr } = useT()
  const [ambito, setAmbito] = useState<Ambito>('pais')
  const [modalidad, setModalidad] = useState<Modalidad>('presencial')
  // Fuente: puntuación OFICIAL Torneum (país/mundial/circuito, lo de siempre) o
  // la de la PLATAFORMA de referencia del juego (start.gg, RK9…), solo consulta.
  const [fuente, setFuente] = useState<'torneum' | 'plataforma'>('torneum')
  // Abre por tu juego principal salvo elección manual (derivado, sin efecto)
  const [juegoSel, setJuegoSel] = useState<string | null>(null)
  const juego = juegoSel ?? favoritos[0] ?? 'smash'
  const [comoPuntua, setComoPuntua] = useState(false)
  const [eligePais, setEligePais] = useState(false)

  const p = paisDe(pais)
  const esCircuito = ambito === 'circuito'
  const esPlataforma = fuente === 'plataforma'
  const plataforma = plataformaDe(juego)
  const filas = useMemo(
    () => esPlataforma
      ? rankingPlataforma(juego)
      : rankingTorneum(juego, modalidad, esCircuito ? 'mundial' : ambito, pais),
    [juego, modalidad, ambito, esCircuito, pais, esPlataforma])

  return (
    // El halo de fondo va a TODO el ancho (fuera del contenedor centrado) para
    // que no se vea el corte contra el negro; solo el contenido se centra.
    <div className="relative min-h-screen overflow-hidden pb-24">
      <div className="hero-halo-violet" />
      <div className="lg:max-w-none">

      <div className="relative px-5 pt-6 pb-2 safe-top">
        <p className="eyebrow mb-2">{tr('ranking.eyebrow')}</p>
        <div className="flex items-end justify-between gap-3">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">{tr('ranking.titulo')}</h1>
          <button onClick={() => setComoPuntua(true)} className="mb-1 h-8 px-3 rounded-full bg-white/6 border border-white/12 text-[11px] font-bold text-[#B8B8CC] hover:text-white transition-colors shrink-0">{tr('rk.comoPuntua')}</button>
        </div>
      </div>

      {/* Fuente: puntuación oficial Torneum o la de la plataforma del juego */}
      <div className="relative px-4 mt-3">
        <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 max-w-md">
          <button onClick={() => setFuente('torneum')}
            className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
              !esPlataforma ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8] hover:text-white')}>
            <Trophy size={14} /> Torneum
          </button>
          <button onClick={() => setFuente('plataforma')}
            className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
              esPlataforma ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
            <Globe size={14} /> {plataforma.nombre}
          </button>
        </div>
      </div>

      {/* Banner de la plataforma externa (solo consulta, nunca puntúa aquí) */}
      {esPlataforma && (
        <div className="relative px-4 mt-3">
          <div className="rounded-2xl border px-4 py-3 flex items-center gap-3" style={{ borderColor: `${plataforma.color}45`, background: `${plataforma.color}0F` }}>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl font-black text-[#0A0A0F] shrink-0" style={{ background: plataforma.color }}>{plataforma.nombre[0].toUpperCase()}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{plataforma.etiqueta}</p>
              <p className="text-[11px] text-[#8B8BA8]">{tr('rk2.externaPre')} {plataforma.nombre} {tr('rk2.externaPara')} <GameIcon juegoId={juego} size={12} /> {JUEGOS[juego]?.nombre ?? juego} {tr('rk2.externaPost')}</p>
            </div>
          </div>
        </div>
      )}

      {/* Ámbito: tu país, el mundo o el circuito oficial (solo fuente Torneum) */}
      {!esPlataforma && (
      <div className="relative px-4 mt-3">
        <div className="grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1 max-w-md">
          <button onClick={() => setAmbito('pais')}
            className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
              ambito === 'pais' ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
            <MapPin size={14} /> {p.nombre}
          </button>
          <button onClick={() => setAmbito('mundial')}
            className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
              ambito === 'mundial' ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
            <Globe size={14} /> {tr('ranking.mundial')}
          </button>
          <button onClick={() => setAmbito('circuito')}
            className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-all',
              ambito === 'circuito' ? 'bg-[#E0BE63]/20 text-[#E0BE63] shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
            <Trophy size={14} /> {tr('rk2.circuito')}
          </button>
        </div>

        {/* Modalidad: presencial y online son rankings separados */}
        {!esCircuito && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-white/5 p-1 w-56">
              {(['presencial', 'online'] as Modalidad[]).map(m => (
                <button key={m} onClick={() => setModalidad(m)}
                  className={cn('h-8 rounded-lg text-[12px] font-bold transition-all',
                    modalidad === m ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8] hover:text-white')}>
                  {m === 'presencial' ? tr('ranking.presencial') : tr('ranking.online')}
                </button>
              ))}
            </div>
            {ambito === 'pais' && (
              <button onClick={() => setEligePais(true)} className="text-[11px] text-[#8B8BA8] font-semibold hover:text-white transition-colors">
                {p.bandera} {tr('ranking.compitesPor')} {p.nombre} · <span className="text-[#B6FF3A]">{tr('ranking.cambiar')}</span>
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {/* Circuito oficial: oficiales + Super Majors, sin país (mundial por diseño) */}
      {esCircuito && !esPlataforma && (
        <div className="relative px-4 mt-3">
          <Link href="/circuito" className="rounded-2xl border border-[#E0BE63]/35 bg-[#E0BE63]/[0.07] px-4 py-3 flex items-center gap-3 hover:bg-[#E0BE63]/[0.12] transition-colors">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0BE63]/15 text-[#E0BE63] shrink-0"><Trophy size={18} /></span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-white">{tr('inicio.circuito')}</p>
              <p className="text-[11px] text-[#D8C48A]">{tr('rk2.circuitoSub')}</p>
              <p className="mt-1 text-[11px] font-bold text-[#E0BE63] inline-flex items-center gap-1"><CalendarClock size={11} /> {tr('rk2.proximoSM')}</p>
            </div>
          </Link>
        </div>
      )}

      {/* Chips de juego: todos los del catálogo (todos puntúan en Torneum) */}
      <div className="relative px-4 mt-3">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          {juegosLista.map(j => {
            const activo = juego === j.id
            return (
              <button key={j.id} onClick={() => setJuegoSel(j.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={activo
                  ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` }
                  : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                <GameIcon juegoId={j.id} size={13} /> {j.corto}
              </button>
            )
          })}
        </div>
      </div>

      <TablaRanking key={`${fuente}-${juego}-${modalidad}-${ambito}-${pais}`} filas={filas}
        ambitoLabel={esPlataforma ? plataforma.nombre : esCircuito ? tr('rk2.circuito') : ambito === 'pais' ? p.nombre : tr('ranking.mundial')}
        mundial={esPlataforma || ambito !== 'pais'}
        juego={juego} conTags={!esPlataforma}
        fuente={esPlataforma ? `${tr('rk2.fuenteDe')} ${plataforma.nombre}` : tr('rk2.fuenteTorneum')} />

      {/* Tu hueco: sin torneos Torneum jugados aún no hay fila propia */}
      {!esPlataforma && (
      <div className="relative px-4 mt-3 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
        <div className="rounded-2xl bg-[#B6FF3A]/8 border border-dashed border-[#B6FF3A]/35 px-4 py-3 flex items-center gap-3">
          <p className="flex-1 text-[12px] text-[#B8B8CC]">{tr('ranking.sinFila')}</p>
          <Link href="/explorar" className="h-9 px-3.5 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold flex items-center shrink-0">{tr('ranking.verTorneos')}</Link>
        </div>
      </div>
      )}

      {/* Selector de país (elegido al registrarte; aquí se corrige) */}
      {eligePais && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setEligePais(false)} />
          <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[80vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <p className="text-lg font-bold text-white text-display">{tr('ranking.tuPais')}</p>
              <button onClick={() => setEligePais(false)} aria-label="Cerrar" className="h-8 w-8 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={15} /></button>
            </div>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('ranking.tuPaisTexto')}</p>
            <div className="mt-3 space-y-1">
              {PAISES.map(x => (
                <button key={x.id} onClick={() => { setPais(x.id); setEligePais(false) }}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-sm font-semibold transition-colors',
                    x.id === pais ? 'bg-[#B6FF3A]/12 text-white' : 'text-[#B8B8CC] hover:bg-white/5')}>
                  <span className="text-lg">{x.bandera}</span> <span className="flex-1">{x.nombre}</span>
                  {x.id === pais && <Check size={15} className="text-[#B6FF3A]" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Explicador del sistema de puntuación Torneum */}
      {comoPuntua && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setComoPuntua(false)} />
          <div className="relative w-full max-w-md bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop max-h-[86vh] overflow-y-auto p-5">
            <p className="text-lg font-bold text-white text-display">{tr('pts.titulo')}</p>
            <p className="mt-1 text-[13px] text-[#B8B8CC]">{tr('pts.intro')}</p>
            <div className="mt-3 space-y-1.5 text-[13px]">
              {([
                ['🏷️', tr('pts.categoria'), tr('pts.categoriaV')],
                ['💶', tr('pts.inscripcion'), tr('pts.inscripcionV')],
                ['🏆', tr('pts.bote'), tr('pts.boteV')],
                ['👥', tr('pts.aforo'), tr('pts.aforoV')],
                ['📡', tr('pts.online'), tr('pts.onlineV')],
                ['🥇', tr('pts.puesto'), tr('pts.puestoV')],
                ['🌍', tr('pts.pais'), tr('pts.paisV')],
                ['⭐', tr('pts.supermajor'), tr('pts.supermajorV')],
              ] as const).map(([e, t, v]) => (
                <div key={t} className="flex items-center gap-2.5 rounded-xl bg-white/[0.04] border border-white/8 px-3 py-2">
                  <span>{e}</span>
                  <span className="flex-1 text-white font-semibold">{t}</span>
                  <span className="text-[11px] text-[#B6FF3A] font-bold font-mono-num text-right max-w-[45%]">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 rounded-xl bg-[#E0BE63]/10 border border-[#E0BE63]/30 px-3 py-2 text-[11px] text-[#E8DCB0]">
              {tr('pts.ejemplo')} <span className="font-bold text-white">{topePuntos({ precio: 15, bote: 2500, plazas: 256, categoria: 'oficial' })} pts</span>.
            </p>
            <p className="mt-2 text-[11px] text-[#8B8BA8]">{tr('pts.pie')}</p>
            <button onClick={() => setComoPuntua(false)} className="mt-4 w-full h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-bold">{tr('rk.ok')}</button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

// Podio + tabla + mini-perfil + cara a cara. `fuente` etiqueta de dónde salen
// los puntos (ranking Torneum o la plataforma externa del juego). `conTags`
// (F6): el tag de crew (#NOCT) va SOLO en la vista Torneum, nunca en la de la
// plataforma externa (el conmutador start.gg no se toca).
function TablaRanking({ filas, ambitoLabel, mundial, juego, conTags = false, fuente = 'ranking Torneum' }: { filas: FilaRankingTorneum[]; ambitoLabel: string; mundial: boolean; juego: string; conTags?: boolean; fuente?: string }) {
  const { t: tr } = useT()
  const top3 = filas.slice(0, 3)
  const resto = filas.slice(3)
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const orden = [2, 1, 3]
  const alturas = [88, 116, 70]
  const medallas = ['#C0C7D1', '#E0BE63', '#CD7F45']
  const [sel, setSel] = useState<{ f: FilaRankingTorneum; puesto: number } | null>(null)
  // Cara a cara: elige un jugador desde su mini-perfil y toca al rival
  const [vsBase, setVsBase] = useState<FilaRankingTorneum | null>(null)
  const [vsPair, setVsPair] = useState<{ a: FilaRankingTorneum; b: FilaRankingTorneum } | null>(null)
  const tocar = (f: FilaRankingTorneum, puesto: number) => {
    if (vsBase && vsBase.id !== f.id) { setVsPair({ a: vsBase, b: f }); setVsBase(null) }
    else setSel({ f, puesto })
  }
  const puestoDe = (x: FilaRankingTorneum) => filas.findIndex(f => f.id === x.id) + 1

  return (
    <>
      {vsBase && (
        <div className="relative px-4 mt-3 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
          <div className="flex items-center gap-2 rounded-xl border border-[#B6FF3A]/40 bg-[#B6FF3A]/10 px-3 py-2 animate-slide-up-sm">
            <span>⚔️</span>
            <p className="flex-1 text-[11px] font-bold text-white">{conParams(tr('rk2.comparando'), { nombre: vsBase.nombre })}</p>
            <button onClick={() => setVsBase(null)} className="text-[10px] text-[#8B8BA8] font-semibold hover:text-white">{tr('adm.cancelar')}</button>
          </div>
        </div>
      )}

      {/* Podio */}
      <div className="relative px-4 mt-5 flex items-end justify-center gap-3 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
        {podio.map((f, i) => {
          const first = i === 1
          return (
            <button key={f.id} onClick={() => tocar(f, orden[i])} className="flex flex-col items-center stagger-item" style={{ width: 96, ['--delay' as string]: `${i * 80}ms` }}>
              <div className="relative">
                {first && <div className="absolute -inset-2.5 rounded-full blur-xl opacity-50 bg-[#E0BE63]" />}
                <div className="relative rounded-full p-[2.5px]" style={{ background: first ? 'linear-gradient(135deg, #E0BE63, #B6FF3A)' : `${medallas[i]}55` }}>
                  <Avatar name={f.nombre} size={first ? 66 : 50} />
                </div>
                {first && <Crown size={22} className="absolute -top-4 left-1/2 -translate-x-1/2 text-[#E0BE63]" fill="#E0BE63" />}
              </div>
              <p className="mt-2 text-sm font-bold text-white truncate max-w-full">{f.nombre} {mundial && f.bandera} {conTags && <CrewTag nombre={f.nombre} juego={juego} />}</p>
              <p className="text-[15px] font-bold text-score" style={{ color: first ? '#E0BE63' : '#B6FF3A' }}><CountUp value={f.puntos} duration={1000} /> <span className="text-[10px] text-[#8B8BA8]">pts</span></p>
              <div className="mt-0.5 flex justify-center"><RangoChip rating={f.rating} /></div>
              <p className="mt-0.5 text-[10px] text-[#8B8BA8] font-mono-num">{f.torneos} {tr('hist.torneos')}</p>
              <div className="mt-2 w-full rounded-t-xl flex items-start justify-center pt-1.5 ring-grad relative overflow-hidden"
                style={{ height: alturas[i], background: `linear-gradient(180deg, ${medallas[i]}2E, ${medallas[i]}08)`, borderTop: `2px solid ${medallas[i]}` }}>
                <span className="text-3xl font-bold text-score" style={{ color: medallas[i] }}>{orden[i]}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Tabla */}
      <div className="relative px-4 mt-4 space-y-1.5 max-w-2xl mx-auto lg:max-w-none lg:mx-0">
        {resto.map((f, i) => (
          <button key={f.id} onClick={() => tocar(f, i + 4)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-colors text-left stagger-item bg-white/4 border-white/8 hover:bg-white/[0.07]"
            style={{ ['--delay' as string]: `${Math.min(i, 12) * 40}ms` }}>
            <span className="w-6 text-center text-sm font-bold font-mono-num text-[#8B8BA8]">{i + 4}</span>
            <Avatar name={f.nombre} size={38} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{f.nombre} {mundial && <span className="text-xs">{f.bandera}</span>} {conTags && <CrewTag nombre={f.nombre} juego={juego} />}</p>
              <p className="text-[11px] text-[#8B8BA8] font-mono-num">{f.torneos} {f.torneos === 1 ? tr('exp.torneoSing') : tr('exp.torneoPlur')} · {tr('rk2.mejor')} {f.mejor}º</p>
            </div>
            <Tendencia n={f.tendencia} />
            <RangoChip rating={f.rating} />
            <span className="text-sm font-bold text-white font-mono-num w-14 text-right">{f.puntos} <span className="text-[10px] text-[#8B8BA8] font-semibold">pts</span></span>
          </button>
        ))}
      </div>

      {/* Mini-perfil */}
      {sel && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={() => setSel(null)} />
          <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
            <div className="flex items-center gap-3">
              <Avatar name={sel.f.nombre} size={54} />
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-white text-display truncate">{sel.f.nombre} <span className="text-sm">{sel.f.bandera}</span></p>
                <p className="text-[11px] text-[#8B8BA8]">#{sel.puesto} · {ambitoLabel} · {fuente}</p>
              </div>
              <RangoChip rating={sel.f.rating} size="md" />
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[[String(sel.f.puntos), tr('rk2.puntos')], [String(sel.f.torneos), sel.f.torneos === 1 ? tr('rk2.torneoSingCap') : tr('rk2.torneosCap')], [`${sel.f.mejor}º`, tr('mp.mejorPuesto')]].map(([v, l]) => (
                <div key={l} className="card-premium px-2 py-3 text-center">
                  <p className="text-xl font-bold text-white font-mono-num leading-none">{v}</p>
                  <p className="mt-1.5 text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold">{l}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => { setVsBase(sel.f); setSel(null) }}
                className="flex-1 h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">{tr('rk2.compararCon')}</button>
              <button onClick={() => setSel(null)} className="h-11 px-4 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">{tr('sede.cerrar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* Cara a cara */}
      {vsPair && (() => {
        const { a, b } = vsPair
        const metricas: { label: string; va: number; vb: number; menorGana?: boolean; fmt?: (n: number) => string }[] = [
          { label: tr('rk2.puntos'), va: a.puntos, vb: b.puntos },
          { label: tr('rk2.torneosCap'), va: a.torneos, vb: b.torneos },
          { label: tr('mp.mejorPuesto'), va: a.mejor, vb: b.mejor, menorGana: true, fmt: n => `${n}º` },
        ]
        const ganadas = metricas.filter(m => (m.menorGana ? m.va < m.vb : m.va > m.vb)).length
        const perdidas = metricas.filter(m => (m.menorGana ? m.va > m.vb : m.va < m.vb)).length
        const veredicto = ganadas > perdidas ? conParams(tr('rk2.domina'), { nombre: a.nombre, marcador: `${ganadas}-${perdidas}` })
          : perdidas > ganadas ? conParams(tr('rk2.domina'), { nombre: b.nombre, marcador: `${perdidas}-${ganadas}` })
          : tr('rk2.empate')
        return (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={() => setVsPair(null)} />
            <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
              <p className="text-center text-[11px] uppercase tracking-[0.16em] text-[#8B8BA8] font-bold mb-3">{tr('rk2.caraACara')} · {ambitoLabel}</p>
              <div className="flex items-center justify-between gap-3">
                {[a, b].map(x => (
                  <div key={x.id} className="flex-1 flex flex-col items-center min-w-0">
                    <Avatar name={x.nombre} size={52} />
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
              <p className="mt-1 text-center text-[10px] text-[#8B8BA8]">{tr('rk2.h2hNota')}</p>
              <button onClick={() => setVsPair(null)} className="mt-4 w-full h-11 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">{tr('sede.cerrar')}</button>
            </div>
          </div>
        )
      })()}
    </>
  )
}
