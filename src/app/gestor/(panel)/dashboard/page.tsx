'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { Store, Megaphone, Tag, Ticket, Wallet, ChevronRight } from 'lucide-react'

type Resumen = {
  locales_total: number; locales_activos: number; rrpp_activos: number; incentivo_pct: number
  comision_generada_mes?: number; incentivo_ganado_mes?: number
}

export default function GestorDashboardPage() {
  const gestor = useGestorStore(s => s.gestor)
  const [resumen, setResumen] = useState<Resumen | null>(null)

  useEffect(() => {
    fetch('/api/gestor/resumen').then(r => r.ok ? r.json() : null).then(setResumen).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Tu cartera</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">
          Hola, {gestor?.nombre?.split(' ')[0] || 'Gestor'}
        </h1>
        <p className="text-[#A0A0B8] mt-1.5">Da de alta locales y RRPP, y gestiona sus comisiones.</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Locales activos" valor={resumen ? String(resumen.locales_activos) : '—'} icon={Store} />
        <Kpi label="RRPP activos" valor={resumen ? String(resumen.rrpp_activos) : '—'} icon={Megaphone} />
        <Kpi label="Tu incentivo" valor={`${gestor?.incentivo_pct ?? 0}%`} icon={Wallet} accent />
      </div>

      {/* Comisión generada por la cartera este mes + lo que se lleva el gestor */}
      <div className="card-premium p-4 flex items-center justify-between">
        <div>
          <p className="text-[11px] text-[#8B8BA8]">Comisión generada (este mes)</p>
          <p className="text-2xl font-bold text-white text-numeric mt-0.5">
            {resumen ? `${(resumen.comision_generada_mes ?? 0).toFixed(2)} €` : '—'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-[#8B8BA8]">Tu incentivo</p>
          <p className="text-2xl font-bold text-[#E94560] text-numeric mt-0.5">
            {resumen ? `${(resumen.incentivo_ganado_mes ?? 0).toFixed(2)} €` : '—'}
          </p>
        </div>
      </div>

      <div>
        <p className="eyebrow mb-3">Secciones</p>
        <div className="space-y-2">
          <SeccionLink
            href="/gestor/locales"
            icon={Store}
            titulo="Locales"
            desc="Tu cartera de locales y dar de alta nuevos"
            badge={resumen && resumen.locales_total > 0 ? `${resumen.locales_total} en cartera` : 'Empezar'}
          />
          <SeccionLink href="/gestor/rrpp" icon={Megaphone} titulo="RRPP" desc="Vincular RRPP a tus locales y fijar el %" badge={resumen && resumen.rrpp_activos > 0 ? `${resumen.rrpp_activos} activos` : 'Gestionar'} />
          <SeccionProximo icon={Tag} titulo="Códigos de descuento" desc="Crear códigos pactados con los locales" />
          <SeccionProximo icon={Ticket} titulo="Entradas gratis" desc="Generar entradas gratis (según el plan del local)" />
        </div>
        <p className="text-xs text-[#6B6B85] mt-3">
          Las secciones restantes se irán activando.
        </p>
      </div>
    </div>
  )
}

function Kpi({ label, valor, icon: Icon, accent }: { label: string; valor: string; icon: React.ElementType; accent?: boolean }) {
  return (
    <div className="card-premium p-3">
      <Icon size={16} className={accent ? 'text-[#E94560]' : 'text-[#7C5CFF]'} />
      <p className="text-2xl font-bold text-white text-numeric mt-2">{valor}</p>
      <p className="text-[11px] text-[#8B8BA8] mt-0.5">{label}</p>
    </div>
  )
}

function SeccionLink({ href, icon: Icon, titulo, desc, badge }: { href: string; icon: React.ElementType; titulo: string; desc: string; badge?: string | null }) {
  return (
    <Link href={href} className="group flex items-center gap-3.5 rounded-2xl glass px-4 py-3.5 transition-colors hover:bg-white/[0.07]">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF] border border-white/10">
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-xs text-[#8B8BA8]">{desc}</p>
      </div>
      {badge && <span className="text-[10px] font-semibold text-[#9B82FF]">{badge}</span>}
      <ChevronRight size={16} className="text-[#6B6B85] transition-transform group-hover:translate-x-0.5" />
    </Link>
  )
}

function SeccionProximo({ icon: Icon, titulo, desc }: { icon: React.ElementType; titulo: string; desc: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl glass px-4 py-3.5 opacity-60">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-[#8B8BA8] border border-white/10">
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-white">{titulo}</p>
        <p className="text-xs text-[#8B8BA8]">{desc}</p>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-[#6B6B85]">Próximamente</span>
    </div>
  )
}
