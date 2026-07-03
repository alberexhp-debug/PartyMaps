'use client'
import Link from 'next/link'
import { AnimatedValue } from '@/components/ui/CountUp'
import { useRouter } from 'next/navigation'
import { TORNEOS_SAMPLE, ORGANIZADORES, JUEGOS } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { GameKeyart } from '@/components/todh/GameKeyart'
import {
  ArrowLeft, Plus, Radio, Trophy, Users, Wallet, AlertTriangle, Calendar,
  Star, TrendingUp, ChevronRight, Megaphone, Store,
} from 'lucide-react'

export default function ConsolaTOPage() {
  const router = useRouter()
  const org = ORGANIZADORES.lima
  const creados = useDemoStore(s => s.creados)
  const misTorneos = [...creados, ...TORNEOS_SAMPLE.filter(t => t.organizadorId === org.id)]
  const proximo = misTorneos[0]
  const totalInscritos = misTorneos.reduce((a, t) => a + t.inscritos, 0)
  const ingresos = misTorneos.reduce((a, t) => a + t.inscritos * t.precio, 0)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-5xl mx-auto">
      {/* Header */}
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 130% at 0% 0%, ${org.color} 0%, ${org.color}44 32%, transparent 70%), #0D0F15` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0D0F15)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">Consola del TO · Demo</span>
        </div>
      </div>

      <div className="px-5 -mt-9">
        {/* Identidad */}
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black text-[#0A0A0F] border-4 border-[#0D0F15]" style={{ background: org.color }}>{org.nombre[0]}</span>
        <div className="mt-2.5">
          <p className="text-lg font-bold text-white text-display leading-tight">{org.nombre}</p>
          <p className="text-xs text-[#8B8BA8] inline-flex items-center gap-1 mt-0.5"><Star size={11} className="text-[#E0BE63]" /> {org.rating} · {org.tier} · {org.seguidores.toLocaleString('es')} seguidores</p>
        </div>

        {/* Aviso accionable */}
        <Link href="/modo-directo" className="mt-4 flex items-center gap-3 rounded-2xl border border-[#FF6076]/40 bg-[#FF6076]/10 px-4 py-3">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6076]/20 text-[#FF6076] shrink-0"><AlertTriangle size={18} /></span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">1 disputa por resolver</p>
            <p className="text-xs text-[#FFB3BD]">En «{proximo?.nombre}» · entra al modo directo</p>
          </div>
          <ChevronRight size={18} className="text-[#FF6076]" />
        </Link>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Trophy size={16} className="text-[#B6FF3A]" />} value={String(misTorneos.length)} label="Torneos activos" />
          <KPI icon={<Users size={16} className="text-[#9B82FF]" />} value={String(totalInscritos)} label="Inscritos" />
          <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value={`${ingresos}€`} label="Ingresos del mes" />
          <KPI icon={<TrendingUp size={16} className="text-[#4F8EF7]" />} value={`+${Math.round(org.seguidores * 0.04)}`} label="Nuevos seguidores" />
        </div>

        {/* Acciones rápidas */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Acciones</p>
        <div className="grid grid-cols-3 gap-2.5">
          <Accion href="/crear-torneo" icon={<Plus size={20} />} label="Crear torneo" primary />
          <Accion href="/modo-directo" icon={<Radio size={20} />} label="Modo directo" />
          <Accion href={`/organizador/${org.id}`} icon={<Megaphone size={20} />} label="Mi perfil" />
        </div>

        {/* Próximo torneo destacado */}
        {proximo && (
          <>
            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Próximo torneo</p>
            <Link href={`/gestionar/${proximo.id}`} className="block ring-grad card-premium card-int relative overflow-hidden rounded-2xl flex items-stretch">
              <GameKeyart juegoId={proximo.juego} className="w-[92px] shrink-0" />
              <div className="flex-1 p-3.5 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${JUEGOS[proximo.juego].color}1F`, color: JUEGOS[proximo.juego].color, border: `1px solid ${JUEGOS[proximo.juego].color}44` }}>{JUEGOS[proximo.juego].corto}</span>
                  {proximo.enDirecto && <span className="badge-live">Live</span>}
                </div>
                <p className="font-bold text-white text-display tracking-tight text-[15px] truncate">{proximo.nombre}</p>
                <p className="mt-1 text-[11px] text-[#A0A0B8] inline-flex items-center gap-1"><Calendar size={11} className="text-[#B6FF3A]" /> {proximo.fechaLabel}</p>
                <div className="mt-2 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${Math.round(proximo.inscritos / proximo.plazas * 100)}%`, background: `linear-gradient(90deg, ${JUEGOS[proximo.juego].color}, #C8FF5C)` }} />
                </div>
                <p className="mt-1 text-[10px] text-[#8B8BA8] font-mono-num">{proximo.inscritos}/{proximo.plazas} inscritos</p>
              </div>
            </Link>
          </>
        )}

        {/* Mis torneos */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Mis torneos</p>
        <div className="space-y-2">
          {misTorneos.map((t, i) => (
            <Link key={t.id} href={`/gestionar/${t.id}`} className="flex items-center gap-3 card-premium card-int p-3 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 8) * 45}ms` }}>
              <span className="w-1 self-stretch rounded-full" style={{ background: JUEGOS[t.juego].color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8] font-mono-num">{t.fechaLabel} · {t.inscritos}/{t.plazas}</p>
              </div>
              {t.enDirecto ? <span className="badge-live shrink-0">Live</span> : <span className="text-[11px] text-[#B6FF3A] font-semibold shrink-0">Abierto</span>}
            </Link>
          ))}
        </div>

        {/* Comunidad */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Comunidad</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="card-premium p-3.5">
            <Users size={15} className="text-[#9B82FF] mb-1.5" />
            <p className="text-xl font-bold text-white font-mono-num leading-none">{org.seguidores.toLocaleString('es')}</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1">Seguidores</p>
          </div>
          <div className="card-premium p-3.5">
            <Megaphone size={15} className="text-[#B6FF3A] mb-1.5" />
            <p className="text-xl font-bold text-white font-mono-num leading-none">2</p>
            <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1">Grupos</p>
          </div>
        </div>
        <div className="card-premium p-3.5 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-xl">🎮</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Crew de Gamba</p>
            <p className="text-[11px] text-[#8B8BA8]">128 miembros · canal Avisos + General</p>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 h-8 rounded-lg bg-[#B6FF3A]/15 text-[#B6FF3A] text-[12px] font-bold"><Megaphone size={13} /> Difundir</span>
        </div>

        {/* Negociación con sedes */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Buscar sede</p>
        <Link href="/mapa" className="card-premium card-int p-4 flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#4F8EF7]/15 text-[#4F8EF7]"><Store size={18} /></span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">3 sedes con disponibilidad</p>
            <p className="text-xs text-[#8B8BA8]">Reserva directa o envía solicitud para tu próximo torneo</p>
          </div>
          <ChevronRight size={18} className="text-[#6B6B85]" />
        </Link>
      </div>
    </div>
  )
}

function KPI({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="card-premium p-3.5">
      <div className="w-9 h-9 rounded-xl bg-white/5 border border-white/8 flex items-center justify-center mb-2">{icon}</div>
      <AnimatedValue value={value} className="block text-2xl font-bold text-white text-display font-mono-num leading-none" />
      <p className="text-[10px] uppercase tracking-[0.12em] text-[#8B8BA8] font-semibold mt-1.5">{label}</p>
    </div>
  )
}

function Accion({ href, icon, label, primary }: { href: string; icon: React.ReactNode; label: string; primary?: boolean }) {
  return (
    <Link href={href} className={`flex flex-col items-center justify-center gap-2 rounded-2xl py-4 px-2 text-center transition-all ${primary ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'card-premium text-white card-int'}`}>
      {icon}
      <span className="text-[11px] font-bold leading-tight">{label}</span>
    </Link>
  )
}
