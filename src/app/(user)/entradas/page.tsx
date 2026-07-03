'use client'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { JUEGOS, TORNEOS_SAMPLE, getTorneo, type TorneoSample } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { TicketModal } from '@/components/todh/TicketModal'
import { QrCode, Calendar, MapPin, Trophy } from 'lucide-react'

type Insc = { t: TorneoSample; estado: 'proximo' | 'jugado'; puesto?: string }
const pick = (id: string) => TORNEOS_SAMPLE.find(x => x.id === id)!
// Próximos por defecto (demo) + historial jugado
const DEFAULT_PROXIMOS = ['t4']
const HISTORIAL: Insc[] = [
  { t: pick('t8'), estado: 'jugado', puesto: 'Top 4' },
  { t: pick('t5'), estado: 'jugado', puesto: '9º' },
]

export default function EntradasPage() {
  const [tab, setTab] = useState<'proximos' | 'historial'>('proximos')
  const [ticket, setTicket] = useState<TorneoSample | null>(null)
  const inscritos = useDemoStore(s => s.inscritos)

  const proximos: Insc[] = useMemo(() => {
    const ids = Array.from(new Set([...inscritos, ...DEFAULT_PROXIMOS]))
    return ids.map(id => getTorneo(id)).filter(Boolean).map(t => ({ t: t!, estado: 'proximo' as const }))
  }, [inscritos])

  const lista = tab === 'proximos' ? proximos : HISTORIAL

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-halo-rose" />

      <div className="relative px-5 pt-6 safe-top">
        <p className="eyebrow mb-2">Tu cartera</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white">Mis torneos</h1>
        <p className="text-[#A0A0B8] mt-2 text-sm">
          <span className="text-white font-bold font-mono-num">{proximos.length}</span> {proximos.length === 1 ? 'inscripción activa' : 'inscripciones activas'}
        </p>

        <div className="flex gap-1 glass-subtle rounded-2xl p-1 mt-5 sm:max-w-sm">
          {(['proximos', 'historial'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={cn('flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all',
                tab === t ? 'bg-[#B6FF3A] text-[#0A0A0F] shadow-[0_6px_20px_-4px_rgba(182,255,58,0.6)]' : 'text-[#A0A0B8] hover:text-white')}>
              {t === 'proximos' ? `Próximos · ${proximos.length}` : `Historial · ${HISTORIAL.length}`}
            </button>
          ))}
        </div>
      </div>

      <div className="relative p-4 mt-2">
        {lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-center px-6">
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center"><Trophy size={28} className="text-[#8B8BA8]" /></div>
            <p className="text-white text-xl font-bold text-display">{tab === 'proximos' ? 'Sin inscripciones' : 'Sin historial'}</p>
            <p className="text-[#A0A0B8] text-sm max-w-xs">
              {tab === 'proximos' ? 'Inscríbete en un torneo y aparecerá aquí con tu entrada (QR).' : 'Aquí verás los torneos que ya has jugado.'}
            </p>
            {tab === 'proximos' && <Link href="/explorar" className="mt-1 px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">Explorar torneos</Link>}
          </div>
        ) : (
          <div key={tab} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {lista.map((i, idx) => (
              <div key={i.t.id + i.estado} className="stagger-item" style={{ ['--delay' as string]: `${idx * 60}ms` }}>
                <TicketCard insc={i} onQr={() => setTicket(i.t)} />
              </div>
            ))}
          </div>
        )}
      </div>

      {ticket && <TicketModal torneo={ticket} onClose={() => setTicket(null)} />}
    </div>
  )
}

function TicketCard({ insc, onQr }: { insc: Insc; onQr: () => void }) {
  const { t, estado, puesto } = insc
  const juego = JUEGOS[t.juego]
  return (
    <div className="ring-grad card-premium relative overflow-hidden rounded-2xl flex items-stretch">
      <Link href={`/torneo/${t.id}`} className="flex items-stretch flex-1 min-w-0 card-int">
        <GameKeyart juegoId={t.juego} className="w-[72px] shrink-0" />
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
            </span>
            {estado === 'jugado' && puesto && <span className="ml-auto text-[11px] font-bold text-[#E0BE63]">🏆 {puesto}</span>}
          </div>
          <p className="font-bold text-white text-display tracking-tight leading-snug truncate">{t.nombre}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-[#A0A0B8]">
            <span className="inline-flex items-center gap-1"><Calendar size={12} className="text-[#B6FF3A]" /> {t.fechaLabel}</span>
            <span className="inline-flex items-center gap-1 min-w-0"><MapPin size={12} className="shrink-0" /> <span className="truncate">{t.local}</span></span>
          </div>
        </div>
      </Link>
      <button onClick={onQr} aria-label="Ver entrada QR"
        className="flex flex-col items-center justify-center px-4 border-l border-dashed border-white/12 shrink-0 hover:bg-white/5 transition-colors">
        {estado === 'proximo' ? (
          <>
            <QrCode size={30} className="text-white" />
            <span className="text-[9px] text-[#B6FF3A] font-bold uppercase tracking-wider mt-1">Entrada</span>
          </>
        ) : (
          <span className="text-[10px] text-[#6B6B85] font-semibold uppercase tracking-wider">Jugado</span>
        )}
      </button>
    </div>
  )
}
