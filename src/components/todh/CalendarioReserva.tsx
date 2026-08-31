'use client'
import { useState } from 'react'
import { useDemoStore, useOrgId } from '@/lib/stores/useDemoStore'
import { JUEGOS, JUEGOS_LIST, type Local } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { parseFechaLabel } from '@/components/todh/DispoSede'
import { useT, conParams, mesLargo, diaLetra } from '@/lib/i18n'
import { Check, ChevronLeft, ChevronRight, Clock, CalendarClock, X } from '@/components/todh/iconosTorneum'
import { ArrowLeftRight } from 'lucide-react'
import { GameIcon } from '@/components/todh/GameIcon'

// CALENDARIO DE RESERVAS del local, para organizadores: la vista que se abre al
// «Pedir fecha». Enseña la disponibilidad publicada por la sede (patrón semanal
// − excepciones) y sus reservas; el TO toca un día libre y envía la solicitud
// desde ahí. La petición llega al panel de la sede (aceptar/contraofertar/rechazar).
// FRANJAS y RECURSOS se PERSISTEN tal cual en la solicitud (los lee la sede en
// su panel): se quedan en ES como formato de dato, igual que fechaLabel.
const FRANJAS = ['Tarde (16-21h)', 'Noche (19-24h)', 'Día completo']
const RECURSOS = ['Mesas y sillas', 'Pantallas/monitores', 'Consolas', 'Sonido']

export function CalendarioReserva({ local }: { local: Local }) {
  const { t: tr, idioma } = useT()
  const orgId = useOrgId()
  const dispo = useDemoStore(s => s.dispoSedes[local.id])
  const solicitudes = useDemoStore(s => s.solicitudesSede)
  const crearSolicitud = useDemoStore(s => s.crearSolicitudSede)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)

  const hoy = new Date()
  const [vista, setVista] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() })
  const [diaSel, setDiaSel] = useState<Date | null>(null)

  // Mi solicitud viva en esta sede (identidad por cuenta)
  const mia = solicitudes.find(s => s.localId === local.id && (s.orgId ?? 'lima') === orgId && s.estado !== 'rechazada')

  // Reservas confirmadas: torneos alojados + solicitudes aceptadas de cualquier TO
  const reservas: { fecha: Date; titulo: string; color: string }[] = []
  for (const t of torneosEfectivos(creados, editados, cancelados).filter(t => t.localId === local.id)) {
    const f = parseFechaLabel(t.fechaLabel, hoy)
    if (f) reservas.push({ fecha: f, titulo: t.nombre, color: JUEGOS[t.juego]?.color || '#9B82FF' })
  }
  for (const s of solicitudes.filter(x => x.localId === local.id && x.estado === 'aceptada')) {
    const f = parseFechaLabel(s.contraoferta?.fecha ?? s.fecha, hoy)
    if (f) reservas.push({ fecha: f, titulo: `${tr('cal.reservado')} · ${s.franja}`, color: '#FF8A5C' })
  }

  const mover = (delta: number) => setVista(v => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const offset = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7
  const diasMes = new Date(vista.y, vista.m + 1, 0).getDate()
  const iso = (d: number) => `${vista.y}-${String(vista.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const esPasado = (d: number) => new Date(vista.y, vista.m, d, 23, 59) < hoy

  return (
    <div className="space-y-3">
      {/* Estado de mi solicitud en esta sede */}
      {mia && (
        <div className={`flex items-center gap-2.5 rounded-xl px-3.5 py-3 border ${mia.estado === 'aceptada' ? 'border-[#B6FF3A]/40 bg-[#B6FF3A]/10 text-[#B6FF3A]' : 'border-[#FF8A5C]/40 bg-[#FF8A5C]/10 text-[#FF8A5C]'}`}>
          {mia.estado === 'aceptada' ? <Check size={16} /> : mia.estado === 'contraoferta' ? <ArrowLeftRight size={16} /> : <Clock size={16} />}
          <p className="text-xs font-bold flex-1">
            {mia.estado === 'aceptada' ? `${tr('cal.confirmada')} · ${mia.fecha} · ${mia.franja}`
              : mia.estado === 'contraoferta' ? tr('cal.contraoferta')
              : `${tr('cal.pendiente')} · ${mia.fecha} · ${mia.franja}`}
          </p>
        </div>
      )}

      <div className="card-premium p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-white capitalize">{mesLargo(vista.m, idioma)} <span className="text-[#8B8BA8] font-semibold">{vista.y}</span></p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => mover(-1)} aria-label="Mes anterior" className="h-8 w-8 rounded-lg bg-white/6 text-[#B8B8CC] flex items-center justify-center"><ChevronLeft size={15} /></button>
            <button onClick={() => mover(1)} aria-label="Mes siguiente" className="h-8 w-8 rounded-lg bg-white/6 text-[#B8B8CC] flex items-center justify-center"><ChevronRight size={15} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center">
          {Array.from({ length: 7 }, (_, i) => <span key={`d${i}`} className="text-[10px] text-[#6B6B85] font-bold uppercase py-1">{diaLetra(i, idioma)}</span>)}
          {Array.from({ length: offset }).map((_, i) => <span key={`v${i}`} />)}
          {Array.from({ length: diasMes }, (_, i) => i + 1).map(d => {
            const diaSemana = (offset + d - 1) % 7
            const bloqueado = dispo?.excepciones?.includes(iso(d)) ?? false
            // Sin disponibilidad publicada, cualquier día futuro se puede pedir
            // (solicitud abierta); con ella, solo los del patrón semanal.
            const abre = !esPasado(d) && !bloqueado && (dispo?.publicada ? dispo.dias.includes(diaSemana) : true)
            const resDia = reservas.filter(r => r.fecha.getFullYear() === vista.y && r.fecha.getMonth() === vista.m && r.fecha.getDate() === d)
            const sel = diaSel && diaSel.getFullYear() === vista.y && diaSel.getMonth() === vista.m && diaSel.getDate() === d
            const esHoy = vista.y === hoy.getFullYear() && vista.m === hoy.getMonth() && d === hoy.getDate()
            return (
              <button key={d} disabled={!abre} onClick={() => setDiaSel(new Date(vista.y, vista.m, d))}
                title={resDia.map(r => r.titulo).join(' · ') || (abre ? (dispo?.publicada ? conParams(tr('cal.dispoToca'), { desde: dispo.desdeH, hasta: dispo.hastaH }) : tr('cal.tocaPedir')) : undefined)}
                className={`h-10 rounded-lg flex flex-col items-center justify-center text-[12px] font-semibold transition-all
                  ${sel ? 'bg-[#B6FF3A] text-[#0A0A0F]' : abre ? 'bg-[#B6FF3A]/10 text-[#B6FF3A] hover:bg-[#B6FF3A]/20 cursor-pointer' : bloqueado ? 'text-[#FF8A8A] line-through' : 'text-[#5B5B70]'}
                  ${esHoy && !sel ? 'ring-1 ring-white/40' : ''}`}>
                {d}
                {resDia.length > 0 && (
                  <span className="flex gap-0.5 mt-0.5">
                    {resDia.slice(0, 3).map((r, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: sel ? '#0A0A0F' : r.color }} />)}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        <div className="mt-2.5 flex items-center gap-4 flex-wrap text-[10px] text-[#8B8BA8] font-semibold">
          <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#B6FF3A]/30" /> {dispo?.publicada ? conParams(tr('cal.disponibleHoras'), { desde: dispo.desdeH, hasta: dispo.hastaH }) : tr('cal.sePuedeSolicitar')}</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8A5C]" /> {tr('cal.reservado')}</span>
          {!dispo?.publicada && <span className="text-[#8B8BA8]">{tr('cal.sinHorario')}</span>}
        </div>
      </div>

      {diaSel && <FormReserva local={local} fecha={diaSel} maxPersonas={dispo?.aforoMax ?? local.aforo} onCerrar={() => setDiaSel(null)} onEnviada={() => setDiaSel(null)}
        crearSolicitud={(datos) => crearSolicitud({ ...datos, localId: local.id, orgId }, local.nombre)} />}
    </div>
  )
}

// Formulario de solicitud para el día elegido: franja, jugadores, juego,
// recursos y reparto (base JUSTA: 80% local / 20% TO; negociable).
function FormReserva({ local, fecha, maxPersonas, onCerrar, onEnviada, crearSolicitud }: {
  local: Local
  fecha: Date
  maxPersonas: number   // aforo máx publicado por la sede (o el del local)
  onCerrar: () => void
  onEnviada: () => void
  crearSolicitud: (d: { fecha: string; franja: string; personas: number; juego: string; recursos: string[]; repartoTO: number }) => void
}) {
  const { t: tr } = useT()
  const [franja, setFranja] = useState(FRANJAS[1])
  const [personas, setPersonas] = useState(Math.min(32, maxPersonas))
  const [juego, setJuego] = useState(JUEGOS_LIST[0].id)
  const [recursos, setRecursos] = useState<string[]>(['Mesas y sillas'])
  const [repartoTO, setRepartoTO] = useState(20)
  const fechaLabel = fecha.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })

  const enviar = () => {
    crearSolicitud({ fecha: fechaLabel, franja, personas, juego, recursos, repartoTO })
    onEnviada()
  }

  return (
    <div className="card-premium p-4 border border-[#B6FF3A]/30 animate-slide-up-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-bold text-white inline-flex items-center gap-1.5"><CalendarClock size={15} className="text-[#B6FF3A]" /> {tr('cal.pedirEl')} <span className="capitalize text-[#B6FF3A]">{fechaLabel}</span></p>
        <button onClick={onCerrar} aria-label="Cerrar" className="h-7 w-7 rounded-full bg-white/8 flex items-center justify-center text-[#B8B8CC]"><X size={13} /></button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FRANJAS.map(fr => (
          <button key={fr} onClick={() => setFranja(fr)}
            className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border transition-all ${franja === fr ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{fr}</button>
        ))}
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2">
        <div className="flex items-center h-10 bg-white/5 border border-white/10 rounded-xl overflow-hidden" title={conParams(tr('cal.aforoMaxSede'), { n: maxPersonas })}>
          <button onClick={() => setPersonas(p => Math.max(8, p - 8))} className="h-full px-3 text-[#B8B8CC]">−</button>
          <span className="flex-1 text-center text-white text-xs font-bold font-mono-num">{personas} {tr('cal.jug')} <span className="text-[#6B6B85]">/ {maxPersonas}</span></span>
          <button onClick={() => setPersonas(p => Math.min(maxPersonas, p + 8))} className="h-full px-3 text-[#B8B8CC]">+</button>
        </div>
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide">
          {JUEGOS_LIST.slice(0, 5).map(j => (
            <button key={j.id} onClick={() => setJuego(j.id)}
              className="shrink-0 px-2 h-8 rounded-lg text-[11px] font-bold border transition-all"
              style={juego === j.id ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
              <GameIcon juegoId={j.id} size={12} /> {j.corto}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">
        <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1">{tr('cal.quePone')}</p>
        <div className="flex flex-wrap gap-1.5">
          {RECURSOS.map(r => (
            <button key={r} onClick={() => setRecursos(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
              className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border transition-all ${recursos.includes(r) ? 'bg-[#4F8EF7]/15 text-[#7FB0FF] border-[#4F8EF7]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{r}</button>
          ))}
        </div>
      </div>

      <div className="mt-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
          <span className="text-[#8B8BA8]">{tr('cal.reparto')}</span>
          <span className="text-white font-mono-num normal-case">{conParams(tr('cal.repartoLocalTO'), { local: 100 - repartoTO, to: repartoTO })}</span>
        </div>
        <input type="range" min={5} max={50} step={5} value={repartoTO} onChange={e => setRepartoTO(Number(e.target.value))}
          className="mt-1 w-full accent-[#B6FF3A]" aria-label="Reparto para el TO" />
        <p className="text-[10px] text-[#6B6B85]">{tr('cal.repartoNota')}</p>
      </div>

      <button onClick={enviar} className="mt-3 w-full h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">
        {conParams(tr('cal.enviarA'), { nombre: local.nombre })}
      </button>
      <p className="mt-1.5 text-center text-[10px] text-[#6B6B85]">{tr('cal.sedeResponde')}</p>
    </div>
  )
}
