'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { JUEGOS, JUEGOS_LIST, rankingPorJuego } from '@/lib/torneos/sample'
import { PersonajeIcon } from '@/components/todh/PersonajeChip'
import { ArrowLeft, Trophy, CalendarClock, MapPin, Ticket, Crown, ChevronRight } from 'lucide-react'

// Página del CIRCUITO OFICIAL TOURNEUM: los torneos que organiza la propia app
// dos veces al año. Su ranking no es por país ni global: puntúan solo quienes
// juegan los oficiales de cada split.

const HITOS = [
  { fecha: 'Feb — Jun', titulo: 'Split 1 · fase regular', desc: 'Los oficiales de primavera reparten puntos del circuito.', done: true },
  { fecha: '14 jun', titulo: 'Final Split 1 · Madrid', desc: 'Top 16 presencial en Gamba Esports. Campeón: Kaze (Smash).', done: true },
  { fecha: 'Jul — Nov', titulo: 'Split 2 · fase regular', desc: 'En curso: cada oficial reparte puntos hasta noviembre.', done: false },
  { fecha: '13 dic', titulo: 'Final Split 2 · por anunciar', desc: 'Top 16 del ranking Tourneum. Sede por anunciar.', done: false },
]

export default function CircuitoPage() {
  const router = useRouter()
  const [juego, setJuego] = useState('smash')
  const j = JUEGOS[juego]
  const top = rankingPorJuego(juego).slice(0, 5).map(p => ({ ...p, puntos: Math.max(0, Math.round((p.rating - 1600) * 1.4)) }))

  return (
    <div className="relative min-h-screen pb-12 overflow-hidden">
      {/* Hero dorado */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[36rem] h-[36rem] rounded-full blur-[130px] opacity-[0.14]" style={{ background: '#E0BE63' }} />
        </div>
        <div className="relative px-5 pt-6 safe-top max-w-3xl mx-auto">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <div className="mt-5 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#E0BE63]/15 text-[#E0BE63]"><Trophy size={20} /></span>
            <p className="eyebrow" style={{ color: '#E0BE63' }}>Circuito oficial</p>
          </div>
          <h1 className="mt-3 text-[34px] leading-[1.05] font-black text-white text-display tracking-tight">Tourneum<br /><span className="text-[#E0BE63]">Split 2 · 2026</span></h1>
          <p className="mt-3 text-sm text-[#B8B8CC] leading-relaxed max-w-md">
            Dos veces al año, la app organiza sus propios torneos oficiales. Su ranking no va por países ni es global: <span className="text-white font-semibold">solo puntúan quienes los juegan</span>. El top 16 de cada split disputa la final presencial.
          </p>
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-[#E0BE63]/12 text-[#E0BE63] border border-[#E0BE63]/40"><CalendarClock size={13} /> Próximo oficial: 13 dic</span>
            <span className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-bold bg-white/5 text-[#B8B8CC] border border-white/10"><MapPin size={13} /> Final: sede por anunciar</span>
          </div>
        </div>
      </div>

      <div className="px-5 mt-7 max-w-3xl mx-auto lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start">
        {/* Calendario del circuito */}
        <div>
          <p className="eyebrow eyebrow-muted mb-3">Calendario 2026</p>
          <div className="space-y-0">
            {HITOS.map((h, i) => (
              <div key={h.titulo} className="relative flex gap-3.5 pb-5">
                {i < HITOS.length - 1 && <span className="absolute left-[9px] top-6 bottom-0 w-px bg-white/10" />}
                <span className={`mt-1 h-[19px] w-[19px] rounded-full border-2 shrink-0 flex items-center justify-center ${h.done ? 'bg-[#E0BE63] border-[#E0BE63]' : 'bg-[#12151d] border-[#E0BE63]/50'}`}>
                  {h.done && <Crown size={10} className="text-[#0A0A0F]" />}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: h.done ? '#8B8BA8' : '#E0BE63' }}>{h.fecha}</p>
                  <p className={`text-sm font-bold ${h.done ? 'text-[#B8B8CC]' : 'text-white'}`}>{h.titulo}</p>
                  <p className="text-[12px] text-[#8B8BA8]">{h.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Clasificación del split por juego */}
        <div>
          <div className="flex items-center justify-between mb-3 mt-6 lg:mt-0">
            <p className="eyebrow eyebrow-muted">Clasificación del split</p>
            <Link href="/ranking" className="text-xs text-[#E0BE63] font-semibold inline-flex items-center gap-0.5">Ranking completo <ChevronRight size={13} /></Link>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-2">
            {JUEGOS_LIST.slice(0, 6).map(g => (
              <button key={g.id} onClick={() => setJuego(g.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={juego === g.id ? { background: `${g.color}26`, color: g.color, borderColor: `${g.color}88` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                {g.corto}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            {top.map((p, i) => (
              <Link key={p.id} href={`/jugador/${encodeURIComponent(p.nombre)}?juego=${juego}`}
                className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8 hover:bg-white/[0.07] transition-colors stagger-item" style={{ ['--delay' as string]: `${i * 45}ms` }}>
                <span className="w-6 text-center text-sm font-bold font-mono-num" style={{ color: i === 0 ? '#E0BE63' : '#8B8BA8' }}>{i + 1}</span>
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-[#0A0A0F] font-black shrink-0" style={{ background: j.color }}>{p.nombre[0]}</span>
                <span className="flex-1 min-w-0 text-sm font-bold text-white truncate inline-flex items-center gap-1.5">{p.nombre} <span className="text-xs">{p.bandera}</span> <PersonajeIcon juegoId={juego} nombre={p.main} px={15} /></span>
                <span className="text-[15px] font-bold text-score" style={{ color: '#E0BE63' }}>{p.puntos}</span>
                <span className="text-[10px] text-[#8B8BA8] uppercase">pts</span>
              </Link>
            ))}
          </div>

          {/* Cómo clasificar */}
          <div className="mt-4 card-premium p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#8B8BA8] font-bold mb-2">Cómo se puntúa</p>
            <ul className="space-y-1.5 text-[13px] text-[#B8B8CC]">
              <li className="flex gap-2"><Ticket size={14} className="text-[#E0BE63] shrink-0 mt-0.5" /> Juega cualquier oficial del split (presencial u online).</li>
              <li className="flex gap-2"><Trophy size={14} className="text-[#E0BE63] shrink-0 mt-0.5" /> Los puntos dependen del puesto y del tamaño del torneo.</li>
              <li className="flex gap-2"><Crown size={14} className="text-[#E0BE63] shrink-0 mt-0.5" /> El top 16 del split disputa la final presencial.</li>
            </ul>
            <Link href="/explorar" className="mt-3 w-full h-11 rounded-xl bg-[#E0BE63] text-[#0A0A0F] text-sm font-bold flex items-center justify-center">Ver torneos y empezar a puntuar</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
