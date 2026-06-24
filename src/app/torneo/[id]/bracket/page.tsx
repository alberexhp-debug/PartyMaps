'use client'
import { useParams, useRouter } from 'next/navigation'
import { TORNEOS_SAMPLE, JUEGOS } from '@/lib/torneos/sample'
import { cn } from '@/lib/utils'
import { ArrowLeft } from 'lucide-react'

type M = { a: string; b: string; sa: number; sb: number; done: boolean }

const CUARTOS: M[] = [
  { a: 'Kaze', b: 'Nox', sa: 2, sb: 0, done: true },
  { a: 'Lumi', b: 'Vito', sa: 1, sb: 2, done: true },
  { a: 'Sora', b: 'Drako', sa: 2, sb: 1, done: true },
  { a: 'Bel', b: 'Ren', sa: 0, sb: 2, done: true },
]
const SEMIS: M[] = [
  { a: 'Kaze', b: 'Vito', sa: 2, sb: 1, done: true },
  { a: 'Sora', b: 'Ren', sa: 1, sb: 1, done: false },
]
const FINAL: M[] = [
  { a: 'Kaze', b: '—', sa: 0, sb: 0, done: false },
]

export default function BracketPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = TORNEOS_SAMPLE.find(x => x.id === id)
  const color = t ? JUEGOS[t.juego].color : '#B6FF3A'
  const cols: [string, M[]][] = [['Cuartos', CUARTOS], ['Semifinales', SEMIS], ['Final', FINAL]]

  return (
    <div className="min-h-screen">
      <div className="flex items-center gap-3 px-4 pt-5 pb-3 safe-top sticky top-0 z-10 bg-[#0C0E13]/92 backdrop-blur-md border-b border-white/6">
        <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white shrink-0"><ArrowLeft size={18} /></button>
        <div className="min-w-0">
          <p className="text-[11px] text-[#8B8BA8] uppercase tracking-wider font-semibold">Bracket en vivo · Doble eliminación</p>
          <p className="text-base font-bold text-white truncate">{t?.nombre || 'Torneo'}</p>
        </div>
      </div>

      <div className="px-4 pt-4">
        <button onClick={() => router.push(`/torneo/${id}/resultados`)} className="w-full flex items-center justify-between rounded-2xl bg-[#E0BE63]/10 border border-[#E0BE63]/30 px-4 py-3 hover:bg-[#E0BE63]/15 transition-colors">
          <span className="inline-flex items-center gap-2 text-[#E0BE63] font-semibold text-sm">🏆 Ver clasificación final y premios</span>
          <span className="text-[#E0BE63] text-lg">›</span>
        </button>
      </div>

      <div className="overflow-x-auto px-4 py-6">
        <div className="flex gap-7 min-w-max">
          {cols.map(([titulo, matches]) => (
            <div key={titulo} className="flex flex-col min-h-[440px]">
              <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8B8BA8] mb-4 px-1">{titulo}</p>
              <div className="flex-1 flex flex-col justify-around gap-4">
                {matches.map((m, i) => <MatchCard key={i} m={m} color={color} />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function MatchCard({ m, color }: { m: M; color: string }) {
  const winA = m.done && m.sa > m.sb
  const winB = m.done && m.sb > m.sa
  const live = !m.done && m.a !== '—' && m.b !== '—'
  return (
    <div className="w-44 rounded-xl border overflow-hidden bg-[#12121C]" style={{ borderColor: live ? color : 'rgba(255,255,255,0.08)' }}>
      <Row name={m.a} score={m.sa} win={winA} show={m.done} />
      <div className="h-px bg-white/8" />
      <Row name={m.b} score={m.sb} win={winB} show={m.done} />
      {live && <div className="text-[9px] text-center font-bold uppercase tracking-wider py-1" style={{ color, background: `${color}14` }}>● En juego</div>}
    </div>
  )
}

function Row({ name, score, win, show }: { name: string; score: number; win: boolean; show: boolean }) {
  const empty = name === '—'
  return (
    <div className={cn('flex items-center justify-between px-3 py-2.5', win && 'bg-[#B6FF3A]')}>
      <span className={cn('text-sm truncate', win ? 'text-[#0A0A0F] font-bold' : empty ? 'text-[#5A5A70]' : 'text-white font-medium')}>{name}</span>
      <span className={cn('text-sm font-bold text-numeric ml-2 shrink-0', win ? 'text-[#0A0A0F]' : 'text-[#8B8BA8]')}>{show && !empty ? score : ''}</span>
    </div>
  )
}
