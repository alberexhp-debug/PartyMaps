'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useDemoStore, type DispoSede } from '@/lib/stores/useDemoStore'
import { JUEGOS, JUEGOS_LIST, plantillaDe, type Local, type Mesa, type MesaTipo, type Juego } from '@/lib/torneos/sample'
import { SETUP_LABEL } from '@/lib/torneos/plantillas'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { GameIcon } from '@/components/todh/GameIcon'
import { useT, traducir, conParams, mesCorto, mesLargo, diaCorto, diaLetra, type Idioma, type ClaveI18n } from '@/lib/i18n'
import { Check, ChevronLeft, ChevronRight, ShieldCheck } from '@/components/todh/iconosTorneum'

// Meses en ES SOLO para parsear fechaLabel persistida ('Sáb 28 jun'): es formato
// de dato, no de vista. Los meses/días que se PINTAN salen de i18n (mesCorto…).
const MESES_CORTO = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

// Resumen compacto «Mar y Jue · 18–23h» para la ficha pública y el panel.
// Pura (sin hook): las vistas pasan el idioma activo; por defecto ES.
export function resumenDispo(d: DispoSede, idioma: Idioma = 'es') {
  const ds = [...d.dias].sort((a, b) => a - b).map(i => diaCorto(i, idioma))
  const dias = ds.length === 0 ? traducir('dsp.sinDias', idioma) : ds.length === 7 ? traducir('dsp.todosLosDias', idioma)
    : ds.length === 1 ? ds[0] : `${ds.slice(0, -1).join(', ')}${traducir('dsp.y', idioma)}${ds[ds.length - 1]}`
  const exc = d.excepciones?.length ?? 0
  return `${dias} · ${d.desdeH}–${d.hastaH}h${exc > 0 ? ` · ${exc} ${traducir(exc === 1 ? 'dsp.diaBloqueado' : 'dsp.diasBloqueados', idioma)}` : ''}`
}

// Clave ISO 'YYYY-MM-DD' de un día del calendario (para las excepciones).
function isoDe(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Los datos de muestra guardan fechas como etiqueta ('Hoy · 18:00', 'Sáb 28 jun').
// Exportada: también la usa el calendario de reservas del local (CalendarioReserva).
export function parseFechaLabel(label: string, hoy: Date): Date | null {
  const l = label.toLowerCase()
  if (l.startsWith('hoy')) return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  if (l.startsWith('mañana')) return new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 1)
  const m = l.match(/(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/)
  if (!m) return null
  return new Date(hoy.getFullYear(), MESES_CORTO.indexOf(m[2]), parseInt(m[1], 10))
}

type Reserva = { fecha: Date; titulo: string; color: string }

// ── Mesas, material y juegos posibles ────────────────────────────────────────
const TIPO_MESA_CLAVE: Record<MesaTipo, ClaveI18n> = {
  consola: 'dsp.tipoConsola', pc: 'dsp.tipoPc', mesa: 'dsp.tipoMesa', arcade: 'dsp.tipoArcade', stream: 'dsp.tipoStream',
}
const TIPO_MESA_EMOJI: Record<MesaTipo, string> = {
  consola: '🎮', pc: '🖥️', mesa: '🪑', arcade: '🕹️', stream: '📹',
}

// Material extra que la sede puede ofrecer (informativo para el TO; los juegos
// se derivan de las MESAS, que ya implican su equipamiento).
export const MATERIAL_SEDE: { id: string; clave: ClaveI18n; emoji: string }[] = [
  { id: 'monitores', clave: 'dsp.matMonitores', emoji: '🖥️' },
  { id: 'consolas', clave: 'dsp.matConsolas', emoji: '🎮' },
  { id: 'mandos', clave: 'dsp.matMandos', emoji: '🕹️' },
  { id: 'tapetes', clave: 'dsp.matTapetes', emoji: '🃏' },
  { id: 'stream', clave: 'dsp.matStream', emoji: '📹' },
  { id: 'proyector', clave: 'dsp.matProyector', emoji: '📽️' },
  { id: 'sonido', clave: 'dsp.matSonido', emoji: '🔊' },
]

// Oferta de mesas por tipo: valor LIBRE de la sede (el plano solo aporta el
// valor inicial). Se listan siempre los cinco tipos.
export function mesasOfrecidas(dispo: DispoSede | undefined, mesas: Mesa[]): { tipo: MesaTipo; total: number; ofrecidas: number }[] {
  const orden: MesaTipo[] = ['consola', 'pc', 'mesa', 'arcade', 'stream']
  return orden.map(tipo => {
    const total = mesas.filter(m => m.tipo === tipo).length
    return { tipo, total, ofrecidas: dispo?.mesasDispo?.[tipo] ?? total }
  })
}

// Juegos sugeridos por las mesas ofrecidas (la plantilla de cada juego dice
// qué setups necesita). Es el punto de partida; la sede tiene la última palabra.
export function juegosSugeridos(dispo: DispoSede | undefined, mesas: Mesa[]): Juego[] {
  const oferta = mesasOfrecidas(dispo, mesas)
  const hay = (t: string) => oferta.some(x => x.tipo === t && x.ofrecidas > 0)
  return JUEGOS_LIST.filter(j => plantillaDe(j.id).setups.some(hay))
}

// Juegos que se pueden jugar en la sede: manda la selección manual de la sede
// (`juegosSel`); sin ella, la sugerencia por mesas. Lo ven los TOs en la ficha.
export function juegosJugables(dispo: DispoSede | undefined, mesas: Mesa[]): Juego[] {
  if (dispo?.juegosSel) return JUEGOS_LIST.filter(j => dispo.juegosSel!.includes(j.id))
  return juegosSugeridos(dispo, mesas)
}

// Juegos jugables EFECTIVOS (31-08): sobre los jugables (selección de la sede
// o sugerencia por mesas), la página de la sede puede AÑADIR juegos a mano
// (juegosExtra) y QUITAR otros (juegosQuitados). Sin perfil → jugables tal cual.
export function juegosJugablesEfectivos(
  dispo: DispoSede | undefined, mesas: Mesa[],
  perfil?: { juegosExtra?: string[]; juegosQuitados?: string[] },
): Juego[] {
  const base = juegosJugables(dispo, mesas)
  const extra = JUEGOS_LIST.filter(j => perfil?.juegosExtra?.includes(j.id) && !base.some(b => b.id === j.id))
  const quitados = new Set(perfil?.juegosQuitados ?? [])
  return [...base, ...extra].filter(j => !quitados.has(j.id))
}

// Chips de juegos jugables para las fichas públicas (solo los activos), con el
// arte oficial de cada juego (keyart) en vez de emojis.
export function JuegosPosibles({ dispo, mesas, perfil }: { dispo: DispoSede | undefined; mesas: Mesa[]; perfil?: { juegosExtra?: string[]; juegosQuitados?: string[] } }) {
  const juegos = juegosJugablesEfectivos(dispo, mesas, perfil)
  if (juegos.length === 0) return null
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {juegos.map(j => (
        <span key={j.id} className="inline-flex items-center gap-1.5 h-6 pl-0.5 pr-2 rounded-md text-[10px] font-bold" style={{ background: `${j.color}14`, color: j.color }}>
          <GameIcon juegoId={j.id} size={20} variant="tile" />
          {j.corto}
        </span>
      ))}
    </div>
  )
}

const dispoPorDefecto = (local: Local): DispoSede => ({
  dias: [1, 3], desdeH: 18, hastaH: 23, setups: local.setups, precioNoche: local.precioNoche,
  aforoMax: local.aforo, publicada: false,
})

export function DisponibilidadSede({ local }: { local: Local }) {
  const { t: tr, idioma } = useT()
  const guardada = useDemoStore(s => s.dispoSedes[local.id])
  const setDispoSede = useDemoStore(s => s.setDispoSede)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const solicitudes = useDemoStore(s => s.solicitudesSede)

  const dispo = guardada ?? dispoPorDefecto(local)
  const guardar = (patch: Partial<DispoSede>) => setDispoSede(local.id, { ...dispo, ...patch })
  const toggleDia = (i: number) =>
    guardar({ dias: dispo.dias.includes(i) ? dispo.dias.filter(d => d !== i) : [...dispo.dias, i] })

  // Mesas: el plano da el valor inicial; la sede pone libremente lo que ofrece.
  const mesas = useDemoStore(s => s.mesasSede[local.id]) ?? local.mesas
  const oferta = mesasOfrecidas(dispo, mesas)
  const sugeridos = juegosSugeridos(dispo, mesas)
  const juegos = juegosJugables(dispo, mesas)
  const material = dispo.material ?? []
  const totalOfrecidas = oferta.reduce((a, x) => a + x.ofrecidas, 0)
  const cambiarMesas = (tipo: MesaTipo, delta: number) => {
    const fila = oferta.find(x => x.tipo === tipo)
    if (!fila) return
    const v = Math.max(0, Math.min(99, fila.ofrecidas + delta))
    // `setups` (lo que ven los TOs en la ficha) se mantiene = suma de la oferta
    const setups = oferta.reduce((a, x) => a + (x.tipo === tipo ? v : x.ofrecidas), 0)
    guardar({ mesasDispo: { ...(dispo.mesasDispo ?? {}), [tipo]: v }, setups })
  }
  const toggleMaterial = (id: string) =>
    guardar({ material: material.includes(id) ? material.filter(x => x !== id) : [...material, id] })
  // Toca un juego para activarlo o quitarlo; el punto de partida es lo sugerido
  // por las mesas. La selección de la sede tiene la última palabra.
  const toggleJuego = (id: string) => {
    const base = dispo.juegosSel ?? sugeridos.map(j => j.id)
    guardar({ juegosSel: base.includes(id) ? base.filter(x => x !== id) : [...base, id] })
  }

  // Reservas confirmadas del local: torneos alojados + solicitudes de TO aceptadas
  // (sin useMemo manual: el React Compiler del proyecto memoiza por su cuenta)
  const hoy = new Date()
  const reservas: Reserva[] = []
  for (const t of torneosEfectivos(creados, editados, cancelados).filter(t => t.localId === local.id)) {
    const f = parseFechaLabel(t.fechaLabel, hoy)
    if (f) reservas.push({ fecha: f, titulo: t.nombre, color: JUEGOS[t.juego]?.color || '#9B82FF' })
  }
  for (const s of solicitudes.filter(x => x.localId === local.id && x.estado === 'aceptada')) {
    const f = parseFechaLabel(s.contraoferta?.fecha ?? s.fecha, hoy)
    if (f) reservas.push({ fecha: f, titulo: `${tr('dsp.reservaOrganizador')} · ${s.contraoferta?.franja ?? s.franja}`, color: '#FF8A5C' })
  }

  return (
    // Desktop: editor a la izquierda y calendario fijo a la derecha (como Plano).
    <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-6 lg:items-start">
      <div className="space-y-3">
      {/* Editor: días, franja, setups y precio. Publicar lo hace visible en la ficha. */}
      <div className={`card-premium p-4 ${dispo.publicada ? 'border border-[#B6FF3A]/40' : ''}`}>
        <div className="flex items-center gap-3">
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${dispo.publicada ? 'bg-[#B6FF3A]/25 text-[#B6FF3A]' : 'bg-[#B6FF3A]/15 text-[#B6FF3A]'}`}>
            {dispo.publicada ? <Check size={18} /> : <ShieldCheck size={18} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">{dispo.publicada ? tr('dsp.publicada') : tr('dsp.publica')}</p>
            <p className="text-xs text-[#8B8BA8]">{dispo.publicada ? `${resumenDispo(dispo, idioma)} ${tr('dsp.visibleTos')}` : tr('dsp.horarioPrecio')}</p>
          </div>
        </div>

        <div className="mt-3.5 flex items-center gap-1.5">
          {Array.from({ length: 7 }, (_, i) => {
            const on = dispo.dias.includes(i)
            return (
              <button key={i} onClick={() => toggleDia(i)} aria-label={diaCorto(i, idioma)}
                className={`flex-1 h-9 rounded-lg text-[12px] font-bold border transition-all ${on ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#8B8BA8] border-white/10'}`}>{diaLetra(i, idioma)}</button>
            )
          })}
        </div>

        <div className="mt-3.5 grid grid-cols-2 lg:grid-cols-4 gap-x-3 gap-y-3">
          <Stepper label={tr('dsp.desde')} valor={`${dispo.desdeH}:00`}
            onMenos={() => guardar({ desdeH: Math.max(8, dispo.desdeH - 1) })}
            onMas={() => guardar({ desdeH: Math.min(dispo.hastaH - 1, dispo.desdeH + 1) })} />
          <Stepper label={tr('dsp.hasta')} valor={`${dispo.hastaH}:00`}
            onMenos={() => guardar({ hastaH: Math.max(dispo.desdeH + 1, dispo.hastaH - 1) })}
            onMas={() => guardar({ hastaH: Math.min(24, dispo.hastaH + 1) })} />
          <Stepper label={tr('dsp.precioNoche')} valor={`${dispo.precioNoche}€`}
            onMenos={() => guardar({ precioNoche: Math.max(10, dispo.precioNoche - 5) })}
            onMas={() => guardar({ precioNoche: dispo.precioNoche + 5 })} />
          <Stepper label={tr('dsp.aforoMax')} valor={String(dispo.aforoMax ?? local.aforo)}
            onMenos={() => guardar({ aforoMax: Math.max(10, (dispo.aforoMax ?? local.aforo) - 10) })}
            onMas={() => guardar({ aforoMax: Math.min(local.aforo, (dispo.aforoMax ?? local.aforo) + 10) })} />
        </div>

        {/* Nota corta que ve el TO junto a tus condiciones (parking, comida, normas…) */}
        <input value={dispo.notas ?? ''} onChange={e => guardar({ notas: e.target.value })} maxLength={90}
          placeholder={tr('dsp.notaPh')}
          className="mt-3 w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-[12px] placeholder:text-[#6B6B85] focus:border-[#B6FF3A]/50 outline-none" />

        <button onClick={() => guardar({ publicada: !dispo.publicada })} disabled={dispo.dias.length === 0}
          className={`mt-3.5 w-full h-11 rounded-xl text-sm font-bold transition-colors disabled:opacity-40 ${dispo.publicada ? 'bg-white/6 border border-white/15 text-[#B8B8CC]' : 'bg-[#B6FF3A] text-[#0A0A0F]'}`}>
          {dispo.publicada ? tr('dsp.despublicar') : tr('dsp.publicar')}
        </button>
      </div>

      {/* Mesas (valor LIBRE — el plano solo aporta el punto de partida) + material
          extra. La sede pone lo que realmente ofrece, sin topes. */}
      <div className="card-premium p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">{tr('dsp.mesasMaterial')}</p>
          <span className="text-[11px] text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{totalOfrecidas}</span> {tr('dsp.mesasOfrecidas')}</span>
        </div>
        <p className="mt-0.5 text-xs text-[#8B8BA8]">{tr('dsp.ponOferta')} <Link href="/sede/plano" className="text-[#B6FF3A] font-bold">{tr('dsp.tuPlano')}</Link>{tr('dsp.ponOfertaFin')}</p>

        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-2.5">
          {oferta.map(({ tipo, total, ofrecidas }) => (
            <div key={tipo} className={`flex items-center gap-2.5 transition-opacity ${ofrecidas === 0 ? 'opacity-50' : ''}`}>
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-white/5 border border-white/8 text-[15px] shrink-0">{TIPO_MESA_EMOJI[tipo]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold text-white">{tr(TIPO_MESA_CLAVE[tipo])}</p>
                <p className="text-[10px] text-[#6B6B85]">{conParams(tr('dsp.enElPlano'), { n: total })}</p>
              </div>
              <button onClick={() => cambiarMesas(tipo, -1)} aria-label={`Menos ${tr(TIPO_MESA_CLAVE[tipo])}`} className="h-8 w-8 rounded-lg bg-white/8 text-white shrink-0">−</button>
              <span className="w-7 text-center text-sm font-bold text-white font-mono-num">{ofrecidas}</span>
              <button onClick={() => cambiarMesas(tipo, +1)} aria-label={`Más ${tr(TIPO_MESA_CLAVE[tipo])}`} className="h-8 w-8 rounded-lg bg-white/8 text-white shrink-0">+</button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.14em] text-[#6B6B85]">{tr('dsp.materialExtra')}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {MATERIAL_SEDE.map(m => {
            const on = material.includes(m.id)
            return (
              <button key={m.id} onClick={() => toggleMaterial(m.id)} aria-pressed={on}
                className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold border transition-all ${on ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#8B8BA8] border-white/10 hover:text-white'}`}>
                <span className="text-[13px] leading-none">{m.emoji}</span> {tr(m.clave)}
              </button>
            )
          })}
        </div>

      </div>

      {/* Juegos jugables: la sede los ACTIVA o QUITA a mano (vienen premarcados
          según sus mesas). Chips con el arte oficial de cada juego (keyart). */}
      <div className="card-premium p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-white">{tr('dsp.sePuedeJugar')}</p>
          <span className="text-[11px] text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{juegos.length}</span> {conParams(tr('dsp.deJuegos'), { n: JUEGOS_LIST.length })}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {JUEGOS_LIST.map(j => {
            const on = juegos.some(x => x.id === j.id)
            const necesita = plantillaDe(j.id).setups.map(s => SETUP_LABEL[s]).join(' o ')
            return (
              <button key={j.id} onClick={() => toggleJuego(j.id)} aria-pressed={on}
                title={conParams(tr('dsp.sueleNecesitar'), { s: necesita.toLowerCase() })}
                className={`inline-flex items-center gap-1.5 h-8 pl-1 pr-2.5 rounded-lg text-[11px] font-bold border transition-all ${on ? '' : 'opacity-45 grayscale text-[#8B8BA8] border-white/10 bg-white/4 hover:opacity-75'}`}
                style={on ? { background: `${j.color}14`, color: j.color, borderColor: `${j.color}50` } : undefined}>
                <GameIcon juegoId={j.id} size={24} variant="tile" className="shrink-0" />
                {j.corto}
                {on && <Check size={12} className="shrink-0" />}
              </button>
            )
          })}
        </div>
        <p className="mt-2.5 text-[11px] text-[#8B8BA8]">{tr('dsp.tocaJuego')}</p>
      </div>

      </div>

      {/* Excepciones: tocar un día disponible del calendario lo bloquea (cierre
          puntual, evento privado…) sin tocar el patrón semanal. */}
      <div className="mt-3 lg:mt-0 lg:sticky lg:top-6">
        <CalendarioSede dispo={dispo} reservas={reservas}
          onToggleExcepcion={(iso) => {
            const exc = dispo.excepciones ?? []
            guardar({ excepciones: exc.includes(iso) ? exc.filter(x => x !== iso) : [...exc, iso] })
          }} />
      </div>
    </div>
  )
}

// Calendario mensual: días de disponibilidad recurrente + reservas confirmadas.
// Con `onToggleExcepcion`, tocar un día disponible lo bloquea/desbloquea.
function CalendarioSede({ dispo, reservas, onToggleExcepcion }: { dispo: DispoSede; reservas: Reserva[]; onToggleExcepcion?: (iso: string) => void }) {
  const { t: tr, idioma } = useT()
  const hoy = new Date()
  const [vista, setVista] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() })
  const mover = (delta: number) => setVista(v => {
    const d = new Date(v.y, v.m + delta, 1)
    return { y: d.getFullYear(), m: d.getMonth() }
  })
  const offset = (new Date(vista.y, vista.m, 1).getDay() + 6) % 7
  const diasMes = new Date(vista.y, vista.m + 1, 0).getDate()
  const enMes = (r: Reserva) => r.fecha.getFullYear() === vista.y && r.fecha.getMonth() === vista.m
  const delMes = reservas.filter(enMes).sort((a, b) => a.fecha.getDate() - b.fecha.getDate())

  return (
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
          const iso = isoDe(vista.y, vista.m, d)
          const bloqueado = dispo.excepciones?.includes(iso) ?? false
          const disponible = dispo.dias.includes(diaSemana) && !bloqueado
          const resDia = reservas.filter(r => enMes(r) && r.fecha.getDate() === d)
          const esHoy = vista.y === hoy.getFullYear() && vista.m === hoy.getMonth() && d === hoy.getDate()
          const editable = !!onToggleExcepcion && (dispo.dias.includes(diaSemana) || bloqueado)
          const Celda = editable ? 'button' : 'span'
          return (
            <Celda key={d} onClick={editable ? () => onToggleExcepcion(iso) : undefined}
              title={bloqueado ? tr('dsp.bloqueadoToca') : resDia.map(r => r.titulo).join(' · ') || (disponible ? conParams(tr('dsp.dispoTocaBloquear'), { desde: dispo.desdeH, hasta: dispo.hastaH }) : undefined)}
              className={`h-9 rounded-lg flex flex-col items-center justify-center text-[12px] font-semibold transition-colors ${bloqueado ? 'bg-[#FF6076]/10 text-[#FF8A8A] line-through' : disponible ? 'bg-[#B6FF3A]/10 text-[#B6FF3A]' : 'text-[#8B8BA8]'} ${esHoy ? 'ring-1 ring-white/40' : ''} ${editable ? 'cursor-pointer hover:ring-1 hover:ring-white/25' : ''}`}>
              {d}
              {resDia.length > 0 && (
                <span className="flex gap-0.5 mt-0.5">
                  {resDia.slice(0, 3).map((r, i) => <span key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: r.color }} />)}
                </span>
              )}
            </Celda>
          )
        })}
      </div>

      <div className="mt-2.5 flex items-center gap-4 flex-wrap text-[10px] text-[#8B8BA8] font-semibold">
        <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#B6FF3A]/30" /> {tr('dsp.disponible')}{dispo.publicada ? '' : tr('dsp.sinPublicar')}</span>
        <span className="inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#FF8A5C]" /> {tr('dsp.reserva')}</span>
        {onToggleExcepcion && <span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded bg-[#FF6076]/30" /> {tr('dsp.bloqueadoLeyenda')}</span>}
      </div>

      {delMes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/8 space-y-1.5">
          {delMes.map((r, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="w-1 h-7 rounded-full shrink-0" style={{ background: r.color }} />
              <p className="flex-1 min-w-0 text-[12px] font-semibold text-white truncate">{r.titulo}</p>
              <span className="text-[11px] text-[#8B8BA8] font-mono-num shrink-0">{r.fecha.getDate()} {mesCorto(r.fecha.getMonth(), idioma)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Etiqueta encima y control debajo: en móvil dos columnas sin apreturas y en
// desktop los cuatro caben en una fila sin estirar el − y el + a los extremos.
function Stepper({ label, valor, onMenos, onMas }: { label: string; valor: string; onMenos: () => void; onMas: () => void }) {
  return (
    <div>
      <span className="block text-[10px] uppercase tracking-wider text-[#8B8BA8] font-bold mb-1">{label}</span>
      <div className="flex items-center gap-1.5">
        <button onClick={onMenos} aria-label={`Menos ${label}`} className="h-8 w-8 rounded-lg bg-white/8 text-white shrink-0">−</button>
        <span className="flex-1 text-center text-[13px] font-bold text-white font-mono-num whitespace-nowrap">{valor}</span>
        <button onClick={onMas} aria-label={`Más ${label}`} className="h-8 w-8 rounded-lg bg-white/8 text-white shrink-0">+</button>
      </div>
    </div>
  )
}
