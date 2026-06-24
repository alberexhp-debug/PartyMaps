'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { TORNEOS_SAMPLE, JUEGOS } from '@/lib/torneos/sample'
import { cn } from '@/lib/utils'
import { ArrowLeft, Star, Users, Trophy, Check, Calendar } from 'lucide-react'

const TO = {
  nombre: 'Lima Esports',
  rating: 4.8,
  valoraciones: 124,
  torneos: 58,
  seguidores: 1243,
  juegos: ['smash', 'sf6', 'tekken'],
  bio: 'Organizador FGC en Madrid 🎮 Weeklies de Smash y SF6 en Gamba Esports. +50 torneos sin incidencias.',
  color: '#E63E54',
}

export default function OrganizadorPage() {
  const router = useRouter()
  const [siguiendo, setSiguiendo] = useState(false)
  const sus = TORNEOS_SAMPLE.filter(t => TO.juegos.includes(t.juego)).slice(0, 5)

  return (
    <div className="relative min-h-screen pb-10">
      <div className="relative h-32" style={{ background: `linear-gradient(135deg, ${TO.color}40, #0C0C15 75%)` }}>
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="px-5 -mt-10">
        <div className="flex items-end gap-4">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-black text-[#0A0A0F] border-4 border-[#08080F] shrink-0" style={{ background: TO.color }}>{TO.nombre[0]}</span>
          <button onClick={() => setSiguiendo(s => !s)}
            className={cn('ml-auto mb-1 h-10 px-5 rounded-xl text-sm font-bold transition-all',
              siguiendo ? 'bg-white/8 text-white border border-white/15' : 'bg-[#B6FF3A] text-[#0A0A0F]')}>
            {siguiendo ? 'Siguiendo ✓' : 'Seguir'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <h1 className="text-2xl font-bold text-white text-display tracking-tight">{TO.nombre}</h1>
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#4F8EF7]"><Check size={12} className="text-white" strokeWidth={3} /></span>
        </div>
        <p className="text-sm text-[#8B8BA8]">Organizador (TO)</p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat icon={<Star size={15} className="text-[#E0BE63]" />} value={TO.rating.toFixed(1)} label={`${TO.valoraciones} valoraciones`} />
          <Stat icon={<Trophy size={15} className="text-[#B6FF3A]" />} value={String(TO.torneos)} label="torneos" />
          <Stat icon={<Users size={15} className="text-[#9B82FF]" />} value={TO.seguidores.toLocaleString('es')} label="seguidores" />
        </div>

        <p className="mt-4 text-sm text-[#B8B8CC] leading-relaxed">{TO.bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {TO.juegos.map(g => {
            const j = JUEGOS[g]
            return (
              <span key={g} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold" style={{ background: `${j.color}1F`, color: j.color, border: `1px solid ${j.color}44` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </span>
            )
          })}
        </div>

        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Próximos torneos</p>
        <div className="space-y-2.5">
          {sus.map(t => {
            const j = JUEGOS[t.juego]
            return (
              <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium p-3 hover:-translate-y-0.5 transition-transform">
                <span className="w-1 self-stretch rounded-full" style={{ background: j.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                  <p className="text-[12px] text-[#8B8BA8] inline-flex items-center gap-1"><Calendar size={11} className="text-[#B6FF3A]" /> {t.fechaLabel} · {t.inscritos}/{t.plazas}</p>
                </div>
                <span className="text-sm font-bold text-white shrink-0">{t.precio === 0 ? 'Gratis' : `${t.precio}€`}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card-premium p-3 text-center">
      <div className="flex items-center justify-center mb-1">{icon}</div>
      <p className="text-lg font-bold text-white text-numeric leading-none">{value}</p>
      <p className="text-[10px] text-[#8B8BA8] mt-1">{label}</p>
    </div>
  )
}
