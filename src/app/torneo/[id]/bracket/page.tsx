'use client'
import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, JUEGOS, bracketDe, bracketDobleDe, standingsSuizoDe, rankingPorJuego, type MatchSample, type RondaSample, type Jugador } from '@/lib/torneos/sample'
import { MiniPerfil } from '@/components/todh/MiniPerfil'
import { cn } from '@/lib/utils'
import { ArrowLeft, Crown } from 'lucide-react'

export default function BracketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = getTorneo(id)
  const color = t ? JUEGOS[t.juego].color : '#B6FF3A'
  const ranking = t ? rankingPorJuego(t.juego) : []
  const [sel, setSel] = useState<Jugador | null>(null)
  const esDoble = t?.formato === 'Doble eliminación'
  const esTabla = t?.formato === 'Suizo' || t?.formato === 'Round robin'
  const [vista, setVista] = useState<'winners' | 'losers'>('winners')

  const doble = esDoble ? bracketDobleDe(id) : null
  const rondas: RondaSample[] = doble ? (vista === 'winners' ? doble.winners : doble.losers) : bracketDe(id)

  function abrirJugador(nombre: string) {
    if (nombre === '—') return
    const j = ranking.find(r => r.nombre === nombre)
    if (j) setSel(j)
  }

  const labelFormato = esTabla ? 'Clasificación en vivo' : 'Bracket en vivo'

  return (
    <div className="min-h-screen max-w-xl lg:max-w-6xl mx-auto">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0C0E13]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">{labelFormato} · {t?.formato || 'Eliminación'}</p>
          <p className="text-base font-bold text-white truncate">{t?.nombre || 'Torneo'}</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-3">
        {/* Conmutador Winners/Losers */}
        {esDoble && !esTabla && (
          <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
            {([['winners', 'Winners'], ['losers', 'Losers']] as const).map(([k, label]) => (
              <button key={k} onClick={() => setVista(k)}
                className={cn('h-9 rounded-xl text-sm font-bold transition-all', vista === k ? 'bg-white/12 text-white shadow-sm' : 'text-[#8B8BA8] hover:text-white')}>
                {label}
              </button>
            ))}
          </div>
        )}

        <button onClick={() => router.push(`/torneo/${id}/resultados`)} className="w-full flex items-center justify-between rounded-2xl bg-[#E0BE63]/10 border border-[#E0BE63]/30 px-4 py-3 hover:bg-[#E0BE63]/15 transition-colors">
          <span className="inline-flex items-center gap-2 text-[#E0BE63] font-semibold text-sm">🏆 Ver clasificación final y premios</span>
          <span className="text-[#E0BE63] text-lg">›</span>
        </button>
      </div>

      {esTabla
        ? <StandingsSuizo torneoId={id} juego={t!.juego} formato={t!.formato} color={color} onPick={abrirJugador} />
        : <BracketGrid rondas={rondas} color={color} onPick={abrirJugador} />}

      {/* Gran final (doble elim) */}
      {doble && !esTabla && (
        <div className="px-4 pb-6">
          <p className="eyebrow eyebrow-muted mb-2">Gran final</p>
          <div className="max-w-[200px]">
            <MatchCard m={doble.granFinal.matches[0]} color={color} onPick={abrirJugador} />
          </div>
          <p className="mt-2 text-[11px] text-[#8B8BA8]">El que llega de Losers debe ganar dos sets (bracket reset).</p>
        </div>
      )}

      {sel && <MiniPerfil jugador={sel} onClose={() => setSel(null)} />}
    </div>
  )
}

function StandingsSuizo({ torneoId, juego, formato, color, onPick }: { torneoId: string; juego: string; formato: string; color: string; onPick: (n: string) => void }) {
  const { rondaActual, totalRondas, filas } = standingsSuizoDe(juego)
  const esRR = formato === 'Round robin'
  return (
    <div className="px-4 py-4">
      <div className="flex items-center justify-between mb-3">
        <p className="eyebrow eyebrow-muted">Clasificación</p>
        <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-white">
          <span className="dot-live" /> {esRR ? `Jornada ${rondaActual}` : `Ronda ${rondaActual}`} de {totalRondas}
        </span>
      </div>
      {/* Cabecera */}
      <div className="flex items-center gap-3 px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#6B6B85]">
        <span className="w-6 text-center">#</span><span className="flex-1">Jugador</span>
        <span className="w-12 text-center">V-D</span><span className="w-10 text-right">Pts</span><span className="w-12 text-right">OMW%</span>
      </div>
      <div className="space-y-1.5">
        {filas.map((f, i) => {
          const clasifica = i < 8
          return (
            <button key={f.nombre} onClick={() => onPick(f.nombre)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/[0.07] transition-colors text-left">
              <span className="w-6 text-center text-sm font-bold font-mono-num" style={{ color: clasifica ? color : '#8B8BA8' }}>{i + 1}</span>
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[#0A0A0F] font-black shrink-0 text-sm" style={{ background: color }}>{f.nombre[0]}</span>
              <span className="flex-1 min-w-0 text-sm font-bold text-white truncate">{f.nombre} <span className="text-xs">{f.bandera}</span></span>
              <span className="w-12 text-center text-[13px] font-mono-num text-[#B8B8CC]">{f.v}-{f.d}</span>
              <span className="w-10 text-right text-[15px] font-bold text-score" style={{ color }}>{f.puntos}</span>
              <span className="w-12 text-right text-[12px] font-mono-num text-[#8B8BA8]">{f.omw}</span>
            </button>
          )
        })}
      </div>
      <p className="mt-3 text-[11px] text-[#8B8BA8]">
        {esRR
          ? 'Round robin: todos contra todos. Clasificación por victorias → enfrentamiento directo → diferencia de juegos.'
          : 'Suizo: empareja por puntos cada ronda. Desempate por OMW% (rivales) → GW% → OGW%. Top 8 pasa a corte.'}
      </p>
    </div>
  )
}

function BracketGrid({ rondas, color, onPick }: { rondas: RondaSample[]; color: string; onPick: (n: string) => void }) {
  return (
    <div className="overflow-x-auto px-4 py-5 scrollbar-hide">
      <div className="bkt min-w-max min-h-[440px]" style={{ ['--bkt-line' as string]: 'rgba(255,255,255,0.14)' }}>
        {rondas.map((ronda, ri) => (
          <div key={ronda.nombre} className="contents">
            <div className="flex flex-col" style={{ minWidth: 184 }}>
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8] mb-3 px-1 h-4 shrink-0">{ronda.nombre}</p>
              <div className="bkt-round flex-1">
                {ronda.matches.map(m => (
                  <div key={m.id} className="bkt-cell">
                    <div className={cn('w-full', ri > 0 && 'bkt-stub-in')}>
                      <MatchCard m={m} color={color} onPick={onPick} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {ri < rondas.length - 1 && (
              <div className="flex flex-col">
                <div className="h-4 mb-3 shrink-0" />
                <div className="bkt-conn flex-1">
                  {Array.from({ length: rondas[ri + 1].matches.length }).map((_, ci) => (
                    <div key={ci} className="bkt-conn-cell"><div className="bkt-elbow" /></div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function MatchCard({ m, color, onPick }: { m: MatchSample; color: string; onPick: (n: string) => void }) {
  const live = m.estado === 'en-juego'
  const done = m.estado === 'jugado'
  const winA = done && m.ganador === 'a'
  const winB = done && m.ganador === 'b'
  return (
    <div className="w-44 rounded-xl border overflow-hidden bg-[#12121C]" style={{ borderColor: live ? color : 'rgba(255,255,255,0.08)' }}>
      <Row name={m.a} score={m.scoreA} win={winA} champ={winA} onPick={onPick} show={done || live} />
      <div className="h-px bg-white/8" />
      <Row name={m.b} score={m.scoreB} win={winB} champ={winB} onPick={onPick} show={done || live} />
      {live && <div className="text-[9px] text-center font-bold uppercase tracking-wider py-1 flex items-center justify-center gap-1" style={{ color, background: `${color}14` }}><span className="dot-live" style={{ width: 5, height: 5 }} /> En juego · {m.setup}</div>}
      {m.estado === 'pendiente' && <div className="text-[9px] text-center font-semibold uppercase tracking-wider py-1 text-[#6B6B85] bg-white/[0.02]">Por jugar</div>}
    </div>
  )
}

function Row({ name, score, win, champ, show, onPick }: { name: string; score: number | null; win: boolean; champ?: boolean; show: boolean; onPick: (n: string) => void }) {
  const empty = name === '—'
  return (
    <button onClick={() => onPick(name)} disabled={empty}
      className={cn('w-full flex items-center justify-between px-3 py-2.5 transition-colors', win ? 'bg-[#B6FF3A]' : !empty && 'hover:bg-white/5')}>
      <span className={cn('text-sm truncate flex items-center gap-1', win ? 'text-[#0A0A0F] font-bold' : empty ? 'text-[#5A5A70]' : 'text-white font-medium')}>
        {champ && <Crown size={12} className="text-[#0A0A0F]" fill="currentColor" />}{name}
      </span>
      <span className={cn('text-[17px] font-bold text-score ml-2 shrink-0', win ? 'text-[#0A0A0F]' : 'text-[#8B8BA8]')}>{show && !empty && score != null ? score : ''}</span>
    </button>
  )
}
