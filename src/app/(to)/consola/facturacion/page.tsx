'use client'
import { organizadorEfectivo } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { CabeceraConsola } from '@/components/todh/CabeceraConsola'
import { Wallet, ShieldCheck } from '@/components/todh/iconosTorneum'
import { CreditCard } from 'lucide-react'

// Facturación del TO: qué generan sus torneos (bruto = inscritos × precio, el
// mismo cálculo que el KPI de la consola) y la parte de suscripción/pago.
// Todo demo: sin cobros reales — los botones de pago no operan.
export default function FacturacionTOPage() {
  const { t: tr } = useT()
  const orgId = useOrgId()
  const org = organizadorEfectivo(orgId)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  // Solo los vivos generan ingresos (mismo criterio que el KPI de la consola)
  const vivos = torneosEfectivos(creados, editados, cancelados)
    .filter(t => t.organizadorId === org.id)
  const ingresos = vivos.reduce((a, t) => a + t.inscritos * t.precio, 0)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <CabeceraConsola titulo={tr('cm.facturacion')} sub={tr('fx.demo')} />

      <div className="px-5 lg:px-0">
        {/* (a) Ingresos por torneo */}
        <p className="eyebrow eyebrow-muted mt-5 mb-2.5">{tr('fx.ingresos')}</p>
        <div className="card-premium overflow-hidden">
          {vivos.map(t => {
            // Demo: un torneo en marcha (hoy / en directo) ya tiene sus
            // inscripciones cobradas; los futuros se liquidan al celebrarse.
            const cobrado = t.esHoy || t.enDirecto
            const bruto = t.inscritos * t.precio
            return (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3 border-b border-white/6 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{t.nombre}</p>
                  <p className="text-[11px] text-[#8B8BA8] font-mono-num">
                    {t.fechaLabel} · {t.precio === 0 ? tr('torneo.gratis') : `${t.inscritos}×${t.precio}€`}
                  </p>
                </div>
                <span className="text-sm font-bold text-white font-mono-num shrink-0">{bruto}€</span>
                <span className={`shrink-0 inline-flex items-center px-2 h-6 rounded-full text-[10px] font-bold ${cobrado ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'bg-white/6 text-[#A0A0B8]'}`}>
                  {cobrado ? tr('fx.cobrado') : tr('sd.pendiente')}
                </span>
              </div>
            )
          })}
          {/* Total del mes: el mismo número que el KPI de la consola */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#E0BE63]/[0.06]">
            <Wallet size={15} className="text-[#E0BE63] shrink-0" />
            <p className="flex-1 text-sm font-bold text-white">{tr('to.ingresosMes')}</p>
            <span className="text-base font-bold text-[#E0BE63] font-mono-num">{ingresos}€</span>
          </div>
        </div>

        {/* (b) Suscripción y método de pago (decorativo, como en la inscripción) */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('fx.suscripcion')}</p>
        <div className="card-premium p-4">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
              <ShieldCheck size={18} className="text-[#E0BE63]" />
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{tr('fx.plan')}</p>
              <p className="text-[11px] text-[#8B8BA8]">{tr('fx.planDesc')}</p>
            </div>
          </div>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3">
            <CreditCard size={18} className="text-[#8B8BA8] shrink-0" />
            <span className="flex-1">
              <span className="block text-sm font-semibold text-white">Visa ·· 4242</span>
              <span className="block text-xs text-[#8B8BA8]">{tr('fx.metodoGuardado')}</span>
            </span>
            <button disabled title={tr('fx.demo')}
              className="h-8 px-3 rounded-lg border border-white/10 text-[12px] font-bold text-[#8B8BA8] opacity-50 cursor-not-allowed">
              {tr('ranking.cambiar')}
            </button>
          </div>
          <button disabled title={tr('fx.demo')}
            className="mt-3 w-full h-11 rounded-xl border border-[#E0BE63]/30 text-[#E0BE63] text-sm font-bold opacity-50 cursor-not-allowed">
            {tr('fx.gestionar')}
          </button>
          <p className="mt-2 text-center text-[10px] text-[#6E6E85]">{tr('fx.demo')}</p>
        </div>
      </div>
    </div>
  )
}
