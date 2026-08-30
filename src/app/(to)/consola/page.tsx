'use client'
import Link from 'next/link'
import { AnimatedValue } from '@/components/ui/CountUp'
import { organizadorEfectivo, JUEGOS, LOCALES } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { MENU_CONSOLA } from '@/lib/torneos/consolaMenu'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { useT } from '@/lib/i18n'
import { GameKeyart } from '@/components/todh/GameKeyart'
import { GameIcon, GameChip, GameBadge } from '@/components/todh/GameIcon'
import {
  Plus, Radio, Trophy, Users, Wallet, AlertTriangle, Calendar,
  TrendingUp, ChevronRight, Megaphone, CalendarClock, Check, UserPlus,
} from 'lucide-react'

// Consola del TO: el hub de la capa de organizador. Banda compacta de título,
// las tres acciones del día a día, el menú interno (fuente única en
// consolaMenu.ts), avisos accionables y el pulso de la operación (KPIs,
// próximo torneo, agenda). La identidad del TO vive en /consola/perfil y la
// comunidad en /consola/comunidad — aquí ya no.
export default function ConsolaTOPage() {
  const { t: tr } = useT()
  // Identidad por cuenta: la consola es de QUIEN entra (Lima, una sede que
  // organiza, o un jugador recién aprobado) — nada de asumir «lima».
  const orgId = useOrgId()
  const org = organizadorEfectivo(orgId)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const disputas = useDemoStore(s => s.disputas)
  const plazasPendientes = useDemoStore(s => s.plazasPendientes)
  const solicitudesSede = useDemoStore(s => s.solicitudesSede).filter(x => (x.orgId ?? 'lima') === org.id)
  // El TO ve también sus cancelados (marcados); las métricas solo cuentan los vivos
  const misTorneos = torneosEfectivos(creados, editados, cancelados, { conCancelados: true })
    .filter(t => t.organizadorId === org.id)
  const vivos = misTorneos.filter(t => !cancelados.includes(t.id))
  const proximo = vivos[0]
  const totalInscritos = vivos.reduce((a, t) => a + t.inscritos, 0)
  const ingresos = vivos.reduce((a, t) => a + t.inscritos * t.precio, 0)
  // Agenda unificada: el próximo va destacado y NO se repite en la lista
  const restoAgenda = misTorneos.filter(t => t.id !== proximo?.id)
  const reservas = solicitudesSede.filter(s => s.estado === 'aceptada')
  // Plazas liberadas por cancelaciones (F7): pendientes de que el TO decida
  const conPendientes = misTorneos.filter(t => (plazasPendientes[t.id] ?? 0) > 0)
  const totalPendientes = conPendientes.reduce((a, t) => a + (plazasPendientes[t.id] ?? 0), 0)
  const hayAvisos = disputas.length > 0 || totalPendientes > 0 || solicitudesSede.some(s => s.estado === 'pendiente' || s.estado === 'contraoferta')

  return (
    <div className="relative min-h-screen pb-10 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Banda compacta de título: nada de hero — la identidad está en Perfil */}
      <header className="px-5 lg:px-0 pt-5 lg:pt-0 safe-top">
        <p className="eyebrow eyebrow-gold">{tr('to.panelDe')} · {tr('to.demo')}</p>
        <h1 className="mt-1 text-2xl font-bold text-white text-display tracking-tight">{tr('to.consola')}</h1>
      </header>

      <div className="relative px-5 lg:px-0">
        {/* Acciones rápidas */}
        <p className="eyebrow eyebrow-muted mt-5 mb-2.5">{tr('to.acciones')}</p>
        <div className="grid grid-cols-3 gap-2.5">
          <Accion href="/crear-torneo" icon={<Plus size={20} />} label={tr('to.crearTorneo')} primary />
          <Accion href="/modo-directo" icon={<Radio size={20} />} label={tr('to.modoDirecto')} />
          <Accion href="/mi-pagina" icon={<Megaphone size={20} />} label={tr('to.miPagina')} />
        </div>

        {/* Menú interno de la consola (fuente única: consolaMenu.ts) */}
        {MENU_CONSOLA.map(grupo => (
          <section key={grupo.tituloKey}>
            <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr(grupo.tituloKey)}</p>
            <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2.5 ${grupo.items.length > 2 ? 'lg:grid-cols-3' : ''}`}>
              {grupo.items.map(({ href, icon: Icon, labelKey, descKey }) => (
                <Link key={href} href={href} className="card-premium card-int p-4 flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
                    <Icon size={18} className="text-[#E0BE63]" />
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-bold text-white">{tr(labelKey)}</span>
                    <span className="mt-0.5 block text-[11px] text-[#8B8BA8] leading-snug">{tr(descKey)}</span>
                  </span>
                  <ChevronRight size={16} className="text-[#6B6B85] self-center shrink-0" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        {/* Zona bajo el menú — jerarquía: avisos accionables (lo urgente) primero;
            después el pulso de la operación (KPIs + agenda con el próximo destacado).
            En escritorio, dos columnas: pulso a la izquierda, avisos a la derecha. */}
        <div className="mt-6 lg:grid lg:grid-cols-2 lg:gap-6 lg:items-start lg:max-w-6xl lg:mx-auto">
          {/* Avisos accionables (primero en el DOM: es lo urgente) */}
          <section className={`lg:col-start-2 lg:row-start-1 ${hayAvisos ? '' : 'hidden lg:block'}`}>
            <p className="eyebrow eyebrow-muted mb-2.5">{tr('cx.avisos')}</p>
            <div className="space-y-2.5">
              {disputas.length > 0 && (
                <Link href="/modo-directo" className="flex items-center gap-3 rounded-2xl border border-[#FF6076]/40 bg-[#FF6076]/10 px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6076]/20 text-[#FF6076] shrink-0"><AlertTriangle size={18} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{disputas.length === 1 ? '1 disputa por resolver' : `${disputas.length} disputas por resolver`}</p>
                    <p className="text-xs text-[#FFB3BD]">Entra al modo directo para resolverlas</p>
                  </div>
                  <ChevronRight size={18} className="text-[#FF6076]" />
                </Link>
              )}
              {totalPendientes > 0 && (
                <Link href={`/gestionar/${conPendientes[0].id}`} className="flex items-center gap-3 rounded-2xl border border-[#E0BE63]/45 bg-[#E0BE63]/[0.08] px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#E0BE63]/15 text-[#E0BE63] shrink-0"><UserPlus size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{totalPendientes === 1 ? tr('canc.avisoUna') : `${totalPendientes} ${tr('canc.avisoVarias')}`}</p>
                    <p className="text-xs text-[#D9C58A]">{tr('canc.avisoSub')}</p>
                  </div>
                  <ChevronRight size={16} className="text-[#E0BE63]" />
                </Link>
              )}
              {solicitudesSede.some(s => s.estado === 'pendiente' || s.estado === 'contraoferta') && (
                <Link href="/sedes" className="flex items-center gap-3 rounded-2xl border border-[#FF8A5C]/35 bg-[#FF8A5C]/[0.07] px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF8A5C]/15 text-[#FF8A5C] shrink-0"><CalendarClock size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">
                      {solicitudesSede.filter(s => s.estado === 'contraoferta').length > 0
                        ? `${solicitudesSede.filter(s => s.estado === 'contraoferta').length} contraoferta de sede por responder`
                        : `${solicitudesSede.filter(s => s.estado === 'pendiente').length} solicitud de sede pendiente`}
                    </p>
                    <p className="text-xs text-[#FFC29E]">Revisa el estado en el mapa de sedes.</p>
                  </div>
                  <ChevronRight size={16} className="text-[#FF8A5C]" />
                </Link>
              )}
              {!hayAvisos && (
                <div className="hidden lg:flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/10 text-[#B6FF3A] shrink-0"><Check size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{tr('cx.sinAvisos')}</p>
                    <p className="text-xs text-[#8B8BA8]">{tr('cx.sinAvisosSub')}</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* El pulso: KPIs + agenda (próximo destacado y el resto debajo) */}
          <section className="mt-6 lg:mt-0 lg:col-start-1 lg:row-start-1">
            <p className="eyebrow eyebrow-muted mb-2.5">{tr('cx.resumen')}</p>
            <div className="grid grid-cols-2 gap-3">
              <KPI icon={<Trophy size={16} className="text-[#B6FF3A]" />} value={String(misTorneos.length)} label={tr('to.torneosActivos')} />
              <KPI icon={<Users size={16} className="text-[#9B82FF]" />} value={String(totalInscritos)} label={tr('to.inscritos')} />
              <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value={`${ingresos}€`} label={tr('to.ingresosMes')} />
              <KPI icon={<TrendingUp size={16} className="text-[#4F8EF7]" />} value={`+${Math.round(org.seguidores * 0.04)}`} label={tr('to.nuevosSeguidores')} />
            </div>

            {/* Consola sin torneos ni reservas (TO nuevo): el primer paso es crear uno */}
            {misTorneos.length === 0 && reservas.length === 0 && (
              <div className="card-premium p-6 mt-6 flex flex-col items-center text-center">
                <span className="grid h-12 w-12 place-items-center rounded-2xl" style={{ background: '#E0BE631A', border: '1px solid #E0BE6340' }}>
                  <Trophy size={22} className="text-[#E0BE63]" />
                </span>
                <p className="mt-3 text-[15px] font-bold text-white text-display">{tr('gi.vacio')}</p>
                <p className="mt-1 text-[12px] text-[#8B8BA8] max-w-xs">{tr('gi.vacioTexto')}</p>
                <Link href="/crear-torneo" className="mt-4 inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">
                  <Plus size={15} /> {tr('to.crearTorneo')}
                </Link>
              </div>
            )}

            {/* Agenda unificada: el próximo torneo destacado + el resto, sin duplicar */}
            {(misTorneos.length > 0 || reservas.length > 0) && (
              <>
                <p className="eyebrow eyebrow-muted mt-6 mb-2.5">{tr('to.agenda')}</p>
                {proximo && (
                  <Link href={`/gestionar/${proximo.id}`} className="ring-grad card-premium card-int relative overflow-hidden rounded-2xl flex items-stretch">
                    <GameKeyart juegoId={proximo.juego} className="w-[92px] shrink-0" />
                    <div className="flex-1 p-3.5 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <GameBadge juegoId={proximo.juego} />
                        {proximo.enDirecto && <span className="badge-live">{tr('nav.live')}</span>}
                      </div>
                      <p className="font-bold text-white text-display tracking-tight text-[15px] truncate">{proximo.nombre}</p>
                      <p className="mt-1 text-[11px] text-[#A0A0B8] inline-flex items-center gap-1"><Calendar size={11} className="text-[#B6FF3A]" /> {proximo.fechaLabel}</p>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-white/8 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.round(proximo.inscritos / proximo.plazas * 100)}%`, background: `linear-gradient(90deg, ${JUEGOS[proximo.juego].color}, #C8FF5C)` }} />
                      </div>
                      <p className="mt-1 text-[10px] text-[#8B8BA8] font-mono-num">{proximo.inscritos}/{proximo.plazas} inscritos</p>
                    </div>
                  </Link>
                )}
                <div className="mt-2.5 space-y-2">
                  {restoAgenda.map((t, i) => {
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
                        <p className="text-[11px] text-[#8B8BA8] font-mono-num">{t.local} · {t.inscritos}/{t.plazas}</p>
                      </div>
                      {cancelados.includes(t.id)
                        ? <span className="text-[11px] text-[#FF8A8A] font-semibold shrink-0">{tr('tk.cancelado')}</span>
                        : t.enDirecto ? <span className="badge-live shrink-0">{tr('nav.live')}</span> : <span className="text-[11px] text-[#B6FF3A] font-semibold shrink-0">{tr('to.abierto')}</span>}
                    </Link>
                  )})}
                  {/* Reservas de sede confirmadas (aún sin torneo publicado) */}
                  {reservas.map(s => {
                    const l = LOCALES[s.localId]
                    if (!l) return null
                    return (
                      <Link key={`res-${s.id}`} href="/crear-torneo" className="flex items-center gap-3 card-premium card-int p-3 border border-[#E0BE63]/25">
                        <span className="w-12 shrink-0 text-center">
                          <span className="block text-[11px] font-black uppercase leading-tight text-[#E0BE63]">{s.fecha.split('·')[0].trim().slice(0, 9)}</span>
                          <span className="block text-[10px] text-[#8B8BA8]">{s.franja.split(' ')[0]}</span>
                        </span>
                        <span className="w-1 self-stretch rounded-full bg-[#E0BE63]" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">Reserva confirmada · {l.nombre}</p>
                          <p className="text-[11px] text-[#8B8BA8]">{s.personas} jugadores · <GameChip juegoId={s.juego} size={11} /> · publica el torneo →</p>
                        </div>
                        <span className="text-[11px] text-[#E0BE63] font-semibold shrink-0">{tr('to.sedeLista')}</span>
                      </Link>
                    )
                  })}
                </div>
              </>
            )}
          </section>
        </div>
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
