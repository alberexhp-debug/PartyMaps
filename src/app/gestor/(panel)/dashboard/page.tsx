'use client'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { Store, Megaphone, Tag, Ticket, Wallet } from 'lucide-react'

export default function GestorDashboardPage() {
  const gestor = useGestorStore(s => s.gestor)

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow mb-2">Tu cartera</p>
        <h1 className="text-3xl font-bold text-white text-display tracking-tight">
          Hola, {gestor?.nombre?.split(' ')[0] || 'Gestor'}
        </h1>
        <p className="text-[#A0A0B8] mt-1.5">Da de alta locales y RRPP, y gestiona sus comisiones.</p>
      </div>

      {/* KPIs (placeholder hasta el motor de atribución) */}
      <div className="grid grid-cols-3 gap-2">
        <Kpi label="Locales activos" valor="—" icon={Store} />
        <Kpi label="RRPP activos" valor="—" icon={Megaphone} />
        <Kpi label="Tu incentivo" valor={`${gestor?.incentivo_pct ?? 0}%`} icon={Wallet} accent />
      </div>

      {/* Secciones del panel (se van construyendo) */}
      <div>
        <p className="eyebrow mb-3">Secciones</p>
        <div className="space-y-2">
          <Seccion icon={Store} titulo="Locales" desc="Tu cartera de locales y dar de alta nuevos" />
          <Seccion icon={Megaphone} titulo="RRPP" desc="Alta de RRPP, vincularlos a locales y fijar el %" />
          <Seccion icon={Tag} titulo="Códigos de descuento" desc="Crear códigos pactados con los locales" />
          <Seccion icon={Ticket} titulo="Entradas gratis" desc="Generar entradas gratis (según el plan del local)" />
        </div>
        <p className="text-xs text-[#6B6B85] mt-3">
          El panel se está construyendo. Estas secciones se irán activando.
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

function Seccion({ icon: Icon, titulo, desc }: { icon: React.ElementType; titulo: string; desc: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-2xl glass px-4 py-3.5 opacity-70">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#7C5CFF]/15 text-[#9B82FF] border border-white/10">
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
