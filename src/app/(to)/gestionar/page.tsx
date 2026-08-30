'use client'
import Link from 'next/link'
import { organizadorEfectivo } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { CabeceraConsola } from '@/components/todh/CabeceraConsola'
import { GameIcon, GameChip } from '@/components/todh/GameIcon'
import { Trophy, Plus } from 'lucide-react'

// Índice de /gestionar: TODOS los torneos del TO en una lista (la agenda de la
// consola, completa) — cada fila abre su panel de gestión /gestionar/[id].
// Los cancelados se ven marcados, no desaparecen.
export default function GestionarIndexPage() {
  const { t: tr } = useT()
  const orgId = useOrgId()
  const org = organizadorEfectivo(orgId)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const misTorneos = torneosEfectivos(creados, editados, cancelados, { conCancelados: true })
    .filter(t => t.organizadorId === org.id)

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      <CabeceraConsola titulo={tr('cm.torneos')} sub={tr('gi.sub')} />

      <div className="px-5 lg:px-0">
        {misTorneos.length === 0 ? (
          // Sin torneos: el primer paso es crear uno
          <div className="card-premium p-8 mt-5 flex flex-col items-center text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
              <Trophy size={26} className="text-[#E0BE63]" />
            </span>
            <p className="mt-4 text-base font-bold text-white text-display">{tr('gi.vacio')}</p>
            <p className="mt-1 text-[13px] text-[#8B8BA8] max-w-xs">{tr('gi.vacioTexto')}</p>
            <Link href="/crear-torneo" className="mt-5 inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">
              <Plus size={16} /> {tr('to.crearTorneo')}
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-2">
            {misTorneos.map((t, i) => {
              const dia = t.fechaLabel.split('·')[0].trim()
              const hora = (t.fechaLabel.split('·')[1] ?? '').trim()
              return (
                <Link key={t.id} href={`/gestionar/${t.id}`} className="flex items-center gap-3 card-premium card-int p-3 stagger-item" style={{ ['--delay' as string]: `${Math.min(i, 8) * 45}ms` }}>
                  <span className="w-12 shrink-0 text-center">
                    <span className={`block text-[11px] font-black uppercase leading-tight ${t.esHoy ? 'text-[#B6FF3A]' : 'text-white'}`}>{dia}</span>
                    <span className="block text-[10px] text-[#8B8BA8] font-mono-num">{hora}</span>
                  </span>
                  <GameIcon juegoId={t.juego} size={32} variant="tile" className="shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                    <p className="text-[11px] text-[#8B8BA8] font-mono-num"><GameChip juegoId={t.juego} size={11} /> · {t.local} · {t.inscritos}/{t.plazas}</p>
                  </div>
                  {cancelados.includes(t.id)
                    ? <span className="text-[11px] text-[#FF8A8A] font-semibold shrink-0">{tr('tk.cancelado')}</span>
                    : t.enDirecto ? <span className="badge-live shrink-0">{tr('nav.live')}</span> : <span className="text-[11px] text-[#B6FF3A] font-semibold shrink-0">{tr('to.abierto')}</span>}
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
