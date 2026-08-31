'use client'
import Link from 'next/link'
import { useDemoStore, useEsTO, usePrecioNoche } from '@/lib/stores/useDemoStore'
import { useT, conParams } from '@/lib/i18n'
import { MapaMesas, PisoTabs, pisosDe, mesasDePiso } from '@/components/todh/MapaMesas'
import { type Local } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { GameIcon } from '@/components/todh/GameIcon'
import { resumenDispo, JuegosPosibles } from '@/components/todh/DispoSede'
import { EQUIPOS_SEDE } from '@/components/todh/PerfilSedeEditor'
import { fondoBanner } from '@/components/todh/bannerPresets'
import { X, Star, Users, Wallet, CalendarClock, ChevronRight, Megaphone } from '@/components/todh/iconosTorneum'
import { Ruler, Monitor } from 'lucide-react'
import { useState } from 'react'

// Mini-ficha pública de la sede (modal), simétrica al MiniPerfil de jugador.
// Se abre al pinchar la sede en la ficha de torneo o en el mapa: espacio, setups,
// tarifa para TOs y torneos activos en ese local.
export function MiniLocal({ local, onClose }: { local: Local; onClose: () => void }) {
  const { t: tr, idioma } = useT()
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  // Plano real de la sede: si la sede lo editó en su panel, manda su versión
  const mesas = useDemoStore(s => s.mesasSede[local.id]) ?? local.mesas
  // El CTA de pedir fecha es cosa de organizadores: el jugador ve otra cosa
  const perfilTO = useDemoStore(s => s.perfilTO)
  const esTO = useEsTO()
  // Disponibilidad publicada por la sede desde su panel: visible en su ficha
  const dispo = useDemoStore(s => s.dispoSedes[local.id])
  // Página personalizada por la sede: banner, logo, galería y equipos
  const perfilSede = useDemoStore(s => s.perfilesSede[local.id])
  // Precio unificado: dispo publicada > ficha del admin > tarifa de muestra
  const precioNoche = usePrecioNoche(local.id)
  const [pisoVista, setPisoVista] = useState(0)
  const torneos = torneosEfectivos(creados, editados, cancelados)
    .filter(t => t.localId === local.id)
    .slice(0, 3)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      {/* En PC la ficha se abre ANCHA y a dos columnas (antes era una columna
          vertical estrecha); en móvil sigue siendo una hoja deslizante. */}
      <div className="relative w-full max-w-sm sm:max-w-md lg:max-w-3xl bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl overflow-hidden animate-slide-up-sm sm:animate-pop max-h-[88vh] overflow-y-auto">
        <div className="relative h-24" data-banner={perfilSede?.banner ? '1' : undefined} style={{ background: perfilSede?.banner ? fondoBanner(perfilSede.banner) : `radial-gradient(120% 140% at 0% 0%, ${local.color} 0%, ${local.color}55 40%, transparent 75%), #0E1119` }}>
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/30 flex items-center justify-center text-white"><X size={16} /></button>
        </div>
        <div className="px-5 lg:px-6 pb-6 -mt-10">
          <div className="flex items-end gap-3">
            {perfilSede?.foto
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={perfilSede.foto} alt="" className="rounded-2xl object-cover border-4 border-[#141822]" style={{ width: 72, height: 72 }} />
              : <span className="inline-flex items-center justify-center rounded-2xl font-black text-[#0A0A0F] border-4 border-[#141822]" style={{ width: 72, height: 72, background: local.color, fontSize: 30 }}>{local.nombre[0]}</span>}
            <div className="pb-1 min-w-0 flex-1">
              <p className="text-lg font-bold text-white text-display leading-tight truncate">{local.nombre}</p>
              <p className="text-xs text-[#8B8BA8]">{local.zona} · {local.ciudad}</p>
            </div>
            <Link href={`/local/${local.id}`} className="hidden sm:inline-flex mb-1 h-9 px-3.5 items-center gap-1 rounded-xl bg-white/8 border border-white/15 text-white text-[12px] font-bold hover:bg-white/12 transition-colors shrink-0">
              {tr('ml.verPagina')} <ChevronRight size={13} />
            </Link>
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

          {/* Galería subida por la sede (tira compacta) */}
          {(perfilSede?.galeria?.length ?? 0) > 0 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {perfilSede!.galeria!.map((img, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={img} alt="" className="h-20 rounded-lg object-cover border border-white/10 shrink-0" />
              ))}
            </div>
          )}

          <div className="lg:grid lg:grid-cols-2 lg:gap-x-8 lg:items-start">
          <div>
          {/* Espacio del venue */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            <Stat icon={<Ruler size={14} className="text-[#4F8EF7]" />} label={tr('ml.espacio')} value={`${local.m2} m²`} />
            <Stat icon={<Monitor size={14} className="text-[#B6FF3A]" />} label="Setups" value={String(local.setups)} />
            <Stat icon={<Users size={14} className="text-[#9B82FF]" />} label={tr('ml.aforo')} value={String(local.aforo)} />
          </div>

          {/* Disponibilidad publicada por la sede (días + horario; el precio es dato de TO) */}
          {dispo?.publicada && (
            <div className="mt-3 flex items-center gap-2.5 card-premium px-3.5 py-3 border border-[#B6FF3A]/25">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A] shrink-0"><CalendarClock size={16} /></span>
              <div className="min-w-0">
                <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('ml.disponible')}</p>
                <p className="text-sm font-bold text-white">{resumenDispo(dispo, idioma)}{esTO ? ` · ${dispo.setups} setups · ${conParams(tr('ml.maxPers'), { n: dispo.aforoMax ?? local.aforo })} · ${dispo.precioNoche}€/${tr('ml.noche')}` : ''}</p>
                <JuegosPosibles dispo={dispo} mesas={mesas} perfil={perfilSede} />
                {esTO && dispo.notas && <p className="mt-1.5 text-[11px] text-[#8B8BA8]">📌 {dispo.notas}</p>}
              </div>
            </div>
          )}

          {/* Tarifa de alquiler: SOLO en modo TO (dato de negocio, no de jugador) */}
          {esTO && (
            <div className="mt-3 flex items-center justify-between card-premium px-3.5 py-3 border border-[#B6FF3A]/25">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><Wallet size={16} /></span>
                <div>
                  <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider">{tr('ml.paraTOs')}</p>
                  <p className="text-sm font-bold text-white">{tr('ml.desde')} <span className="text-[#B6FF3A] font-mono-num">{precioNoche}€</span>/{tr('ml.noche')} · {mesas.length} mesas</p>
                </div>
              </div>
            </div>
          )}

          {/* Torneos activos en esta sede */}
          {torneos.length > 0 && (
            <div className="mt-4">
              <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider mb-2">{tr('ml.torneosSede')}</p>
              <div className="space-y-1.5">
                {torneos.map(t => (
                  <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-2.5 card-premium card-int px-3 py-2.5">
                    <GameIcon juegoId={t.juego} size={28} variant="tile" className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-white truncate">{t.nombre}</p>
                      <p className="text-[11px] text-[#8B8BA8]">{t.fechaLabel} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></p>
                    </div>
                    {t.enDirecto && <span className="badge-live shrink-0">Live</span>}
                    <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Pedir fecha abre el CALENDARIO DEL LOCAL (su página, apartado de
              reservas): la solicitud le llega a la sede a su panel. El jugador
              sin rol de TO ve cómo conseguirlo. */}
          {esTO ? (
            <Link href={`/local/${local.id}`} className="mt-4 w-full h-12 rounded-xl font-bold flex items-center justify-center gap-2 bg-[#B6FF3A] text-[#0A0A0F]">
              <CalendarClock size={16} /> {tr('ml.pedirFecha')} · calendario del local
            </Link>
          ) : perfilTO !== 'aprobado' ? (
            <Link href="/perfil" className="mt-4 w-full h-11 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-2 bg-white/5 border border-white/10 text-[#B8B8CC] hover:text-white transition-colors">
              <Megaphone size={14} /> {tr('ml.hazteTO')}
            </Link>
          ) : null}
          <Link href={`/local/${local.id}`} className="sm:hidden mt-2 w-full h-10 rounded-xl font-semibold text-[13px] flex items-center justify-center gap-1 bg-white/5 border border-white/10 text-[#B8B8CC]">
            {tr('ml.verPaginaLocal')} <ChevronRight size={13} />
          </Link>
          </div>{/* fin columna A */}

          <div>
          {/* Plano de mesas de la sede (lo ven jugadores y TOs), por pisos */}
          <div className="mt-4">
            <p className="text-xs text-[#8B8BA8] font-semibold uppercase tracking-wider mb-2">{tr('ml.plano')} · {mesas.length} mesas</p>
            {pisosDe(mesas) > 1 && <div className="mb-2"><PisoTabs total={pisosDe(mesas)} activo={pisoVista} onPiso={setPisoVista} /></div>}
            <MapaMesas mesas={mesasDePiso(mesas, pisoVista)} />
            <p className="mt-1.5 text-[10px] text-[#8B8BA8]">{tr('ml.planoPie')}</p>
          </div>

          </div>{/* fin columna B */}
          </div>{/* fin grid escritorio */}
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
