'use client'
import Link from 'next/link'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { TorneoArt } from '@/components/todh/GameKeyart'
import { GameIcon } from '@/components/todh/GameIcon'
import { JUEGOS } from '@/lib/torneos/sample'
import { useT } from '@/lib/i18n'
import { Radio, CalendarClock, ChevronRight, Ticket } from 'lucide-react'

// LIVE: tus salas de torneo en tiempo real. Un recuadro por torneo INSCRITO;
// la sala se abre cuando el organizador la activa (directo o bracket generado),
// pero los detalles y las reglas se pueden ver antes de empezar.
export default function LivePage() {
  const { t: tr } = useT()
  const inscritos = useDemoStore(s => s.inscritos)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const gestion = useDemoStore(s => s.gestion)
  const mios = torneosEfectivos(creados, editados, cancelados).filter(t => inscritos.includes(t.id))

  return (
    <div className="relative min-h-screen pb-24 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <div className="px-5 lg:px-8 pt-6 safe-top">
        <p className="eyebrow mb-2">{tr('lv.eyebrow')}</p>
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight text-display text-white inline-flex items-center gap-3">
          Live <span className="dot-live" />
        </h1>
        <p className="mt-2 text-sm text-[#8B8BA8] max-w-prose">{tr('lv.sub')}</p>
      </div>

      <div className="px-5 lg:px-8 mt-5">
        {mios.length === 0 ? (
          <div className="card-premium p-6 text-center">
            <Ticket size={28} className="mx-auto text-[#8B8BA8]" />
            <p className="mt-2 text-sm font-bold text-white">{tr('lv.sinInscrito')}</p>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('lv.sinInscritoSub')}</p>
            <Link href="/explorar" className="mt-4 inline-flex h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold items-center">{tr('inicio.explorar')}</Link>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {mios.map(t => {
              const abierta = !!t.enDirecto || !!gestion[t.id]?.generado
              const j = JUEGOS[t.juego]
              return (
                <Link key={t.id} href={`/live/${t.id}`} className="ring-grad card-premium card-int relative overflow-hidden rounded-2xl">
                  <div className="relative h-24">
                    <TorneoArt t={t} className="absolute inset-0" />
                    <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 20%, #141822 98%)' }} />
                    <span className={`absolute top-2.5 left-2.5 inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-black uppercase tracking-wider ${abierta ? 'bg-[#E63E54] text-white' : 'bg-black/50 text-[#9FC2FF] border border-[#4F8EF7]/40'}`}>
                      {abierta ? <><Radio size={10} className="animate-pulse-heat" /> {tr('lv.salaAbierta')}</> : <><CalendarClock size={10} /> {tr('lv.abreConTorneo')}</>}
                    </span>
                  </div>
                  <div className="p-3.5">
                    <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                    <p className="mt-0.5 text-[11px] text-[#8B8BA8]"><GameIcon juegoId={t.juego} size={12} /> {j?.corto} · {t.fechaLabel} · {t.online ? 'Online' : t.local}</p>
                    <p className={`mt-2 text-[12px] font-bold inline-flex items-center gap-1 ${abierta ? 'text-[#B6FF3A]' : 'text-[#8B8BA8]'}`}>
                      {abierta ? tr('lv.entrarSala') : tr('lv.verDetalles')} <ChevronRight size={13} />
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
