'use client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { TORNEOS_SAMPLE, JUEGOS, getOrganizador, ORGANIZADORES } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { cn } from '@/lib/utils'
import { ArrowLeft, Star, Users, Trophy, Check, Calendar, Award } from 'lucide-react'

const TIER_COLOR: Record<string, string> = { Platino: '#67E8F9', Diamante: '#A78BFA', Oro: '#E0BE63' }

export default function OrganizadorPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const to = getOrganizador(id) || ORGANIZADORES.lima
  const siguiendo = useDemoStore(s => s.seguidos.includes(to.id))
  const alternarSeguir = useDemoStore(s => s.alternarSeguir)
  const creados = useDemoStore(s => s.creados)
  const sus = [...creados, ...TORNEOS_SAMPLE].filter(t => t.organizadorId === to.id).slice(0, 6)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto">
      <div className="relative h-36 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(125% 130% at 0% 0%, ${to.color} 0%, ${to.color}55 30%, transparent 70%), #0C0E13` }} />
        <div className="absolute inset-0 opacity-[0.14] mix-blend-overlay" style={{ backgroundImage: 'radial-gradient(circle at 25% 25%, #fff .6px, transparent 1.2px), radial-gradient(circle at 75% 65%, #fff .5px, transparent 1px)', backgroundSize: '9px 9px, 13px 13px' }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 45%, #0C0E13)' }} />
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="px-5 -mt-10">
        <div className="flex items-end gap-4">
          <span className="inline-flex items-center justify-center w-20 h-20 rounded-2xl text-3xl font-black text-[#0A0A0F] border-4 border-[#0C0E13] shrink-0" style={{ background: to.color }}>{to.nombre[0]}</span>
          <button onClick={() => alternarSeguir(to.id, to.nombre)}
            className={cn('ml-auto mb-1 h-10 px-5 rounded-xl text-sm font-bold transition-all',
              siguiendo ? 'bg-white/8 text-white border border-white/15' : 'bg-[#B6FF3A] text-[#0A0A0F]')}>
            {siguiendo ? 'Siguiendo ✓' : 'Seguir'}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-white text-display tracking-tight">{to.nombre}</h1>
          {to.verificado && <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#4F8EF7]"><Check size={12} className="text-white" strokeWidth={3} /></span>}
          <span className="inline-flex items-center px-2 h-6 rounded-full text-[11px] font-bold border" style={{ color: TIER_COLOR[to.tier], borderColor: `${TIER_COLOR[to.tier]}55`, background: `${TIER_COLOR[to.tier]}1A` }}>{to.tier}</span>
        </div>
        <p className="text-sm text-[#8B8BA8]">{to.handle} · Organizador · {to.ciudad}</p>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat icon={<Star size={15} className="text-[#E0BE63]" />} value={to.rating.toFixed(1)} label={`${to.valoraciones} valoraciones`} />
          <Stat icon={<Trophy size={15} className="text-[#B6FF3A]" />} value={String(to.torneosOrg)} label="torneos" />
          <Stat icon={<Users size={15} className="text-[#9B82FF]" />} value={to.seguidores.toLocaleString('es')} label="seguidores" />
        </div>

        <p className="mt-4 text-sm text-[#B8B8CC] leading-relaxed">{to.bio}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {to.juegos.map(g => {
            const j = JUEGOS[g]
            return (
              <span key={g} className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold" style={{ background: `${j.color}1F`, color: j.color, border: `1px solid ${j.color}44` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </span>
            )
          })}
        </div>

        {/* Insignias */}
        {to.insignias.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {to.insignias.map(b => (
              <span key={b} className="inline-flex items-center gap-1.5 px-2.5 h-7 rounded-full text-[11px] font-semibold bg-white/5 border border-white/10 text-[#D4D4E4]"><Award size={11} className="text-[#E0BE63]" /> {b}</span>
            ))}
          </div>
        )}

        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Próximos torneos</p>
        <div className="space-y-2.5">
          {sus.length === 0 && <p className="text-sm text-[#8B8BA8]">Sin torneos próximos publicados.</p>}
          {sus.map(t => {
            const j = JUEGOS[t.juego]
            return (
              <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int p-3">
                <span className="w-1 self-stretch rounded-full" style={{ background: j.color }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                  <p className="text-[12px] text-[#8B8BA8] inline-flex items-center gap-1"><Calendar size={11} className="text-[#B6FF3A]" /> {t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></p>
                </div>
                <span className="text-sm font-bold text-white shrink-0 font-mono-num">{t.precio === 0 ? 'Gratis' : `${t.precio}€`}</span>
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
      <p className="text-lg font-bold text-white font-mono-num leading-none">{value}</p>
      <p className="text-[10px] text-[#8B8BA8] mt-1">{label}</p>
    </div>
  )
}
