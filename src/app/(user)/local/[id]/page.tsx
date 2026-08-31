'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { getLocal } from '@/lib/torneos/sample'
import { GameIcon } from '@/components/todh/GameIcon'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useEsTO, usePrecioNoche } from '@/lib/stores/useDemoStore'
import { resumenDispo, JuegosPosibles } from '@/components/todh/DispoSede'
import { EQUIPOS_SEDE } from '@/components/todh/PerfilSedeEditor'
import { fondoBanner } from '@/components/todh/bannerPresets'
import { CalendarioReserva } from '@/components/todh/CalendarioReserva'
import { MapaMesas, PisoTabs, pisosDe, mesasDePiso } from '@/components/todh/MapaMesas'
import { useT, conParams } from '@/lib/i18n'
import { ArrowLeft, Star, Users, Wallet, CalendarClock, ChevronRight, Megaphone, Store } from '@/components/todh/iconosTorneum'
import { Ruler, Monitor } from 'lucide-react'

// PÁGINA PÚBLICA DEL LOCAL. Para cualquier jugador: ficha, plano y torneos.
// Para un ORGANIZADOR (esTO), además: tarifa, disponibilidad publicada
// y el CALENDARIO DE RESERVAS — aquí aterriza todo «Pedir fecha» de la app.
export default function LocalPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { t: tr, idioma } = useT()
  const local = getLocal(id)
  const esTO = useEsTO()
  const perfilTO = useDemoStore(s => s.perfilTO)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const mesas = useDemoStore(s => s.mesasSede[id]) ?? local?.mesas ?? []
  const dispo = useDemoStore(s => s.dispoSedes[id])
  // Página personalizada por la sede (mundo): banner, logo, galería, equipos
  const perfilSede = useDemoStore(s => s.perfilesSede[id])
  const precioNoche = usePrecioNoche(id)
  const [pisoVista, setPisoVista] = useState(0)

  if (!local) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-6 text-center">
        <Store size={40} className="text-[#8B8BA8]" />
        <p className="text-lg font-bold text-white">{tr('loc.noEncontrado')}</p>
        <Link href="/mapa" className="px-4 h-10 inline-flex items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-semibold">{tr('loc.verMapa')}</Link>
      </div>
    )
  }

  const torneos = torneosEfectivos(creados, editados, cancelados).filter(t => t.localId === local.id)

  return (
    <div className="relative min-h-screen pb-12 max-w-xl mx-auto lg:max-w-none lg:mx-0">
      {/* Hero del local */}
      <div className="relative h-40 lg:h-52 overflow-hidden lg:rounded-b-3xl">
        <div className="absolute inset-0" data-banner={perfilSede?.banner ? '1' : undefined} style={{ background: perfilSede?.banner ? fondoBanner(perfilSede.banner) : `radial-gradient(120% 140% at 0% 0%, ${local.color} 0%, ${local.color}44 40%, transparent 75%), #0D0F15` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0D0F15)' }} />
        <div className="relative flex items-center px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
        </div>
      </div>

      <div className="relative px-5 lg:px-8 -mt-12">
        <div className="flex items-end gap-4 flex-wrap">
          {perfilSede?.foto
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={perfilSede.foto} alt="" className="rounded-2xl object-cover border-4 border-[#0D0F15] shrink-0" style={{ width: 84, height: 84 }} />
            : <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] border-4 border-[#0D0F15] shrink-0" style={{ width: 84, height: 84, background: local.color, fontSize: 34 }}>{local.nombre[0]}</span>}
          <div className="pb-1 min-w-0 flex-1">
            <h1 className="text-2xl lg:text-3xl font-bold text-white text-display tracking-tight truncate">{local.nombre}</h1>
            <p className="text-sm text-[#8B8BA8]">{local.zona} · {local.ciudad}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-bold text-[#E0BE63] bg-[#E0BE63]/12 border border-[#E0BE63]/40"><Star size={11} className="fill-[#E0BE63]" /> {local.rating} · {local.valoraciones} {tr('ml.resenas')}</span>
          {local.fundador && <span className="inline-flex items-center gap-1 px-2.5 h-7 rounded-full text-[11px] font-black text-[#E0BE63] bg-[#E0BE63]/12 border border-[#E0BE63]/50">⚡ Sede Fundadora</span>}
          {local.tiposSetup.map(ts => (
            <span key={ts} className="px-2.5 h-7 inline-flex items-center rounded-full text-[11px] font-semibold bg-white/6 border border-white/10 text-[#D4D4E4]">{ts}</span>
          ))}
          {/* Consolas y equipo declarados por la sede, con cantidad */}
          {EQUIPOS_SEDE.filter(eq => (perfilSede?.equipos?.[eq.id] ?? 0) > 0).map(eq => (
            <span key={eq.id} className="px-2.5 h-7 inline-flex items-center gap-1 rounded-full text-[11px] font-bold bg-[#B6FF3A]/10 border border-[#B6FF3A]/30 text-[#B6FF3A]">{eq.emoji} {tr(eq.clave)} ×{perfilSede!.equipos![eq.id]}</span>
          ))}
        </div>

        {/* Escritorio: contenido a la izquierda, calendario/reserva a la derecha */}
        <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-12 lg:items-start">
          <div className="space-y-6">
            {/* Espacio del venue (+tarifa para TOs) */}
            <div className={`grid gap-2.5 ${esTO ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-3'}`}>
              <Stat icon={<Ruler size={14} className="text-[#4F8EF7]" />} label={tr('ml.espacio')} value={`${local.m2} m²`} />
              <Stat icon={<Monitor size={14} className="text-[#B6FF3A]" />} label="Setups" value={String(local.setups)} />
              <Stat icon={<Users size={14} className="text-[#9B82FF]" />} label={tr('ml.aforo')} value={String(local.aforo)} />
              {esTO && <Stat icon={<Wallet size={14} className="text-[#E0BE63]" />} label={tr('ml.paraTOs')} value={`${precioNoche}€/${tr('ml.noche')}`} />}
            </div>

            {/* Galería de fotos del local (subidas por la sede) */}
            {(perfilSede?.galeria?.length ?? 0) > 0 && (
              <div>
                <p className="eyebrow eyebrow-muted mb-2.5">{tr('sp.galeria')}</p>
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                  {perfilSede!.galeria!.map((img, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={i} src={img} alt="" className="h-28 rounded-xl object-cover border border-white/10 shrink-0" />
                  ))}
                </div>
              </div>
            )}

            {/* Juegos disponibles para torneos (ajustables por la sede) */}
            <div data-juegos-local>
              <p className="eyebrow eyebrow-muted mb-1">{tr('sp.juegosLocal')}</p>
              <JuegosPosibles dispo={dispo} mesas={mesas} perfil={perfilSede} />
            </div>

            {/* Torneos en esta sede */}
            <div>
              <p className="eyebrow eyebrow-muted mb-2.5">{tr('ml.torneosSede')}</p>
              {torneos.length === 0 ? (
                <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('ml.sinTorneos')}</p>
              ) : (
                <div className="space-y-2">
                  {torneos.map(t => (
                    <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int px-3.5 py-3">
                      <GameIcon juegoId={t.juego} size={32} variant="tile" className="shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                        <p className="text-[11px] text-[#8B8BA8]">{t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></p>
                      </div>
                      {t.enDirecto && <span className="badge-live shrink-0">Live</span>}
                      <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Plano de mesas */}
            <div>
              <p className="eyebrow eyebrow-muted mb-2.5">{tr('ml.plano')} · {mesas.length} {tr('sede.mesas')}</p>
              {pisosDe(mesas) > 1 && <div className="mb-2"><PisoTabs total={pisosDe(mesas)} activo={pisoVista} onPiso={setPisoVista} /></div>}
              <MapaMesas mesas={mesasDePiso(mesas, pisoVista)} />
              <p className="mt-1.5 text-[10px] text-[#8B8BA8]">{tr('ml.planoPie')}</p>
            </div>

          </div>

          {/* Columna derecha: reservar (TO) o hazte TO (jugador) */}
          <aside className="mt-6 lg:mt-0 lg:sticky lg:top-6 space-y-3">
            {dispo?.publicada && (
              <div className="flex items-center gap-2.5 card-premium px-3.5 py-3 border border-[#B6FF3A]/25">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A] shrink-0"><CalendarClock size={16} /></span>
                <div className="min-w-0">
                  <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('ml.disponible')}</p>
                  <p className="text-sm font-bold text-white">{resumenDispo(dispo, idioma)}{esTO ? ` · ${dispo.setups} setups · ${conParams(tr('ml.maxPers'), { n: dispo.aforoMax ?? local.aforo })} · ${dispo.precioNoche}€/${tr('ml.noche')}` : ''}</p>
                  <JuegosPosibles dispo={dispo} mesas={mesas} perfil={perfilSede} />
                  {esTO && dispo.notas && <p className="mt-1.5 text-[11px] text-[#8B8BA8]">📌 {dispo.notas}</p>}
                </div>
              </div>
            )}

            {esTO ? (
              <div>
                <p className="eyebrow eyebrow-muted mb-2.5">{tr('loc.calendarioPide')}</p>
                <CalendarioReserva local={local} />
              </div>
            ) : (
              // El jugador sin rol de TO ve la página pública, no la parte de negocio.
              perfilTO !== 'aprobado' && (
                <Link href="/perfil" className="w-full card-premium card-int p-4 flex items-center gap-3">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/6 text-[#8B8BA8]"><Megaphone size={17} /></span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{tr('ml.hazteTO')}</p>
                    <p className="text-xs text-[#8B8BA8]">{tr('loc.organizadoresVen')}</p>
                  </div>
                  <ChevronRight size={15} className="text-[#6B6B85]" />
                </Link>
              )
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="card-premium px-2 py-3 flex flex-col items-center gap-1">
      {icon}
      <span className="text-base font-bold text-white font-mono-num leading-none">{value}</span>
      <span className="text-[10px] text-[#8B8BA8] uppercase tracking-wider">{label}</span>
    </div>
  )
}
