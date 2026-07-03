'use client'
import { useParams, useRouter } from 'next/navigation'
import { getTorneo, STANDINGS_SAMPLE } from '@/lib/torneos/sample'
import { ArrowLeft, Crown, Trophy } from 'lucide-react'

const STANDINGS = STANDINGS_SAMPLE

function avatarColor(name: string) {
  const c = ['#E63E54', '#F4912B', '#4F8EF7', '#9B5DE5', '#2EC4B6', '#B6FF3A']
  let h = 0
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return c[h % c.length]
}

export default function ResultadosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const t = getTorneo(id)
  const bote = t?.bote || 0
  const premios = [Math.round(bote * 0.7), Math.round(bote * 0.2), Math.round(bote * 0.1)]
  const medallas = ['#E0BE63', '#C0C7D1', '#CD7F45']

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-3xl mx-auto">
      <div className="relative h-28" style={{ background: 'linear-gradient(135deg, rgba(224,190,99,0.35), #10131B 75%)' }}>
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="px-5 -mt-6">
        <p className="eyebrow eyebrow-muted">Clasificación final</p>
        <h1 className="text-2xl font-bold text-white text-display tracking-tight">{t?.nombre || 'Torneo'}</h1>

        {/* Campeón */}
        <div className="mt-5 card-premium p-5 text-center relative overflow-hidden">
          <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-40 h-40 rounded-full bg-[#E0BE63]/20 blur-3xl" />
          <Crown size={26} className="mx-auto text-[#E0BE63] mb-1" fill="#E0BE63" />
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#E0BE63] font-bold">Campeón</p>
          <div className="relative mt-3 flex flex-col items-center">
            <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-black text-[#0A0A0F] ring-4 ring-[#E0BE63]/40" style={{ background: avatarColor(STANDINGS[0]) }}>{STANDINGS[0][0]}</span>
            <p className="mt-3 text-2xl font-bold text-white text-display">{STANDINGS[0]}</p>
            {bote > 0 && <p className="mt-1 text-lg font-bold text-[#E0BE63] text-numeric">{premios[0]}€</p>}
          </div>
        </div>

        {/* Podio 2-3 */}
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="card-premium p-4 text-center">
              <span className="inline-flex items-center justify-center w-14 h-14 rounded-xl text-xl font-black text-[#0A0A0F] mx-auto" style={{ background: avatarColor(STANDINGS[i]) }}>{STANDINGS[i][0]}</span>
              <p className="mt-2 text-sm font-bold text-white">{STANDINGS[i]}</p>
              <p className="text-[11px] font-bold" style={{ color: medallas[i] }}>{i + 1}º puesto</p>
              {bote > 0 && <p className="text-sm font-bold text-white text-numeric mt-0.5">{premios[i]}€</p>}
            </div>
          ))}
        </div>

        {/* Reparto */}
        {bote > 0 && (
          <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/4 border border-white/8 px-4 py-3">
            <span className="text-sm text-[#B8B8CC]">Bote repartido (70/20/10)</span>
            <span className="text-base font-bold text-[#E0BE63] text-numeric">{bote}€</span>
          </div>
        )}

        {/* Standings */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Clasificación completa</p>
        <div className="space-y-1.5">
          {STANDINGS.map((n, i) => (
            <div key={n} className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/4 border border-white/8">
              <span className="w-6 text-center text-sm font-bold text-numeric" style={{ color: i < 3 ? medallas[i] : '#8B8BA8' }}>{i + 1}</span>
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-black text-[#0A0A0F] shrink-0" style={{ background: avatarColor(n) }}>{n[0]}</span>
              <span className="flex-1 text-sm font-bold text-white">{n}</span>
              {i < 3 && bote > 0 && <span className="text-sm font-bold text-[#E0BE63] text-numeric">{premios[i]}€</span>}
              {i === 0 && <Trophy size={15} className="text-[#E0BE63]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
