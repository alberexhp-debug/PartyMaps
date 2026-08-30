'use client'
import { Suspense, useMemo, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { JUEGOS, JUEGOS_LIST, TORNEOS_SAMPLE, rankingPorJuego, plantillaDe, type Jugador } from '@/lib/torneos/sample'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { PersonajeChip } from '@/components/todh/PersonajeChip'
import { CountUp } from '@/components/ui/CountUp'
import { RangoChip } from '@/components/todh/RangoChip'
import { ScoutingPanel } from '@/components/todh/ScoutingSheet'
import { useT } from '@/lib/i18n'
import { ArrowLeft, Star, Swords, TrendingUp, Trophy, UserPlus, Check, Calendar, ChevronRight, Medal, Search } from 'lucide-react'

const TIER_COLOR: Record<string, string> = { Platino: '#67E8F9', Diamante: '#A78BFA', Oro: '#E0BE63' }

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

// Perfil PÚBLICO COMPLETO de un jugador (página, no modal): identidad competitiva
// por juego, récord, mains con icono e historial. Sin datos personales.
export default function JugadorPage() {
  return (
    <Suspense fallback={null}>
      <JugadorContent />
    </Suspense>
  )
}

function JugadorContent() {
  const { t: tr } = useT()
  const { nombre: nombreParam } = useParams<{ nombre: string }>()
  const router = useRouter()
  const params = useSearchParams()
  const nombre = decodeURIComponent(nombreParam)
  const juegoParam = params.get('juego')

  // Busca al jugador en el juego indicado o en todos los pools de muestra
  const jugador: Jugador | undefined = useMemo(() => {
    const buscar = (jid: string) => rankingPorJuego(jid).find(p => p.nombre.toLowerCase() === nombre.toLowerCase())
    if (juegoParam && JUEGOS[juegoParam]) {
      const j = buscar(juegoParam)
      if (j) return j
    }
    for (const j of JUEGOS_LIST) {
      const hit = buscar(j.id)
      if (hit) return hit
    }
    return undefined
  }, [nombre, juegoParam])

  const [amigo, setAmigo] = useState(false)

  if (!jugador) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Trophy size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">Jugador no encontrado</p>
        <Link href="/ranking" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Ir al ranking</Link>
      </div>
    )
  }

  const juego = JUEGOS[jugador.juego]
  const color = avatarColor(jugador.nombre)
  const tierColor = TIER_COLOR[jugador.tier] || '#E0BE63'
  const winrate = Math.round((jugador.victorias / (jugador.victorias + jugador.derrotas)) * 100)
  const puesto = rankingPorJuego(jugador.juego).findIndex(p => p.id === jugador.id) + 1
  // Historial de muestra: torneos recientes de su juego con puestos deterministas
  const historial = TORNEOS_SAMPLE.filter(t => t.juego === jugador.juego).slice(0, 4).map((t, i) => ({
    t, puesto: ['1º', 'Top 4', '2º', 'Top 8'][(i + jugador.nombre.length) % 4],
  }))
  const racha = ['V', 'V', 'D', 'V', 'V', 'V', 'D', 'V'].slice(0, 8 - (jugador.nombre.length % 3))

  return (
    <div className="relative min-h-screen pb-12 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Banner con keyart del juego */}
      <div className="relative h-36 lg:h-44 overflow-hidden lg:rounded-b-3xl">
        <GameKeyart juegoId={jugador.juego} label={false} className="absolute inset-0" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, rgba(8,8,15,0.15) 30%, #0D0F15 96%)' }} />
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="relative px-5 -mt-12">
        <div className="flex items-end gap-4">
          <span className="inline-flex items-center justify-center rounded-3xl font-black text-[#0A0A0F] border-4 border-[#0D0F15] shrink-0" style={{ width: 92, height: 92, background: color, fontSize: 38 }}>{jugador.nombre[0]}</span>
          <button onClick={() => setAmigo(v => !v)}
            className={`ml-auto mb-1.5 h-10 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition-all ${amigo ? 'bg-white/8 text-white border border-white/15' : 'bg-[#B6FF3A] text-[#0A0A0F]'}`}>
            {amigo ? <><Check size={15} /> {tr('mp.solicitudEnviada')}</> : <><UserPlus size={15} /> {tr('mp.anadirAmigo')}</>}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-white text-display tracking-tight">{jugador.nombre} <span className="text-lg">{jugador.bandera}</span></h1>
          <RangoChip rating={jugador.rating} size="md" />
          <span className="inline-flex items-center px-2 h-6 rounded-full text-[11px] font-bold border" style={{ color: tierColor, borderColor: `${tierColor}55`, background: `${tierColor}1A` }}>{jugador.tier}</span>
          {jugador.online && <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-bold bg-[#2ED47A]/12 text-[#2ED47A] border border-[#2ED47A]/35"><span className="w-1.5 h-1.5 rounded-full bg-[#2ED47A]" /> {tr('mp.enLinea')}</span>}
        </div>
        <p className="text-sm text-[#8B8BA8]">{jugador.handle} · #{puesto} {tr('logros.de')} <GameIcon juegoId={jugador.juego} size={13} /> {juego.corto} {tr('jg.enEspana')}</p>

        {/* Escritorio: identidad izquierda + historial derecha */}
        <div className="lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start">
        <div>
        {/* Rating grande */}
        <div className="mt-4 card-premium ring-grad p-4 relative overflow-hidden">
          <GameKeyart juegoId={jugador.juego} label={false} className="absolute inset-x-0 top-0 h-full opacity-15" />
          <div className="relative flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8B8BA8] font-bold"><GameIcon juegoId={jugador.juego} size={12} /> Rating {juego.corto}</p>
              <p className="text-[46px] font-bold text-score leading-none mt-1" style={{ color: juego.color }}><CountUp value={jugador.rating} duration={1000} /></p>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-bold">{plantillaDe(jugador.juego).labelMain}</p>
              <div className="mt-1"><PersonajeChip juegoId={jugador.juego} nombre={jugador.main} size="md" /></div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          <Stat icon={<Swords size={14} className="text-[#B6FF3A]" />} label={tr('mp.record')} value={`${jugador.victorias}-${jugador.derrotas}`} />
          <Stat icon={<TrendingUp size={14} className="text-[#4F8EF7]" />} label={tr('mp.winrate')} value={`${winrate}%`} />
          <Stat icon={<Star size={14} className="text-[#E0BE63]" />} label={tr('mp.mejorPuesto')} value={
            <span className="inline-flex items-center gap-1">
              {jugador.mejorPuesto.startsWith('🥇') && <Medal size={12} className="text-[#E0BE63]" aria-hidden="true" />}
              {jugador.mejorPuesto.startsWith('🥈') && <Medal size={12} className="text-[#B8C4D4]" aria-hidden="true" />}
              {jugador.mejorPuesto.replace('🥇 ', '').replace('🥈 ', '')}
            </span>
          } />
        </div>

        {/* Racha */}
        <div className="mt-3 card-premium px-3.5 py-3 flex items-center gap-2">
          <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{tr('mp.racha')}</span>
          <div className="flex items-center gap-1">
            {racha.map((r, i) => (
              <span key={i} className={`w-6 h-6 rounded-md inline-flex items-center justify-center text-[11px] font-black font-mono-num ${r === 'V' ? 'bg-[#2ED47A]/18 text-[#2ED47A]' : 'bg-[#FF6B6B]/18 text-[#FF6B6B]'}`}>{r}</span>
            ))}
          </div>
          <span className="ml-auto text-[11px] text-[#8B8BA8] font-mono-num">{jugador.torneosJugados} torneos</span>
        </div>
        </div>

        <div>
        {/* Historial reciente */}
        <p className="eyebrow eyebrow-muted mt-5 lg:mt-4 mb-2">{tr('mp.historial')}</p>
        <div className="card-premium overflow-hidden divide-y divide-white/5">
          {historial.map(({ t, puesto: pu }) => (
            <Link key={t.id} href={`/torneo/${t.id}/resultados`} className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors">
              <span className="w-1 h-9 rounded-full shrink-0" style={{ background: juego.color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{t.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><Calendar size={10} /> {t.fechaLabel}</p>
              </div>
              <span className="text-sm font-bold text-[#E0BE63] shrink-0 inline-flex items-center gap-1">
                {pu === '1º' && <Medal size={13} className="text-[#E0BE63]" aria-hidden="true" />}
                {pu === '2º' && <Medal size={13} className="text-[#B8C4D4]" aria-hidden="true" />}
                {pu}
              </span>
              <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
            </Link>
          ))}
        </div>
        </div>
        </div>

        {/* Scouting v1: bloque «Estudiar» del perfil público. El historial ya
            está arriba (sinHistorial); los muros por tier los pone el panel. */}
        <div className="mt-6">
          <p className="eyebrow eyebrow-muted mb-2 flex items-center gap-1.5"><Search size={12} className="text-[#67E8F9]" /> {tr('sc.titulo')}</p>
          <ScoutingPanel nombre={jugador.nombre} juego={jugador.juego} sinHistorial />
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
      {icon}
      <span className="text-base font-bold text-white font-mono-num leading-none">{value}</span>
      <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider">{label}</span>
    </div>
  )
}
