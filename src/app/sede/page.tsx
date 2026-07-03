'use client'
import { useState } from 'react'
import { AnimatedValue } from '@/components/ui/CountUp'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { TORNEOS_SAMPLE, LOCALES, ORGANIZADORES, JUEGOS, type Mesa, type MesaForma, type MesaTipo } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { MapaMesas } from '@/components/todh/MapaMesas'
import {
  ArrowLeft, Monitor, Wallet, Star, CalendarClock, Check, X, ChevronRight,
  Tv, ShieldCheck, Users, Trophy, Trash2,
} from 'lucide-react'

const FORMAS: { id: MesaForma; label: string }[] = [
  { id: 'cuadrada', label: 'Cuadrada' }, { id: 'redonda', label: 'Redonda' }, { id: 'alargada', label: 'Alargada' },
]
const TIPOS: { id: MesaTipo; label: string }[] = [
  { id: 'consola', label: 'Consola' }, { id: 'pc', label: 'PC' }, { id: 'mesa', label: 'Mesa' },
  { id: 'arcade', label: 'Arcade' }, { id: 'stream', label: 'Stream' },
]

type Setup = { n: number; tipo: string; estado: 'libre' | 'ocupado'; stream?: boolean }
const SETUPS: Setup[] = [
  { n: 1, tipo: 'Consola', estado: 'ocupado' }, { n: 2, tipo: 'Consola', estado: 'ocupado' },
  { n: 3, tipo: 'PC', estado: 'libre' }, { n: 4, tipo: 'PC', estado: 'ocupado' },
  { n: 5, tipo: 'Stream', estado: 'ocupado', stream: true }, { n: 6, tipo: 'Consola', estado: 'libre' },
]

export default function SedePage() {
  const router = useRouter()
  const local = LOCALES.gamba
  const torneos = TORNEOS_SAMPLE.filter(t => t.localId === local.id)
  const ingresos = torneos.reduce((a, t) => a + Math.round(t.inscritos * t.precio * 0.3), 0)
  const [solicitudes, setSolicitudes] = useState([
    { id: 's1', org: 'arcade-to', fecha: 'Vie 27 jun · 20-23h', personas: 32, juego: 'tekken' },
    { id: 's2', org: 'respawn-to', fecha: 'Dom 29 jun · 17-21h', personas: 24, juego: 'sf6' },
  ])
  // Peticiones REALES que llegan del mapa de sedes del TO (demo: Lima Esports).
  // Aceptar/rechazar responde al TO con una notificación.
  const solicitudesStore = useDemoStore(s => s.solicitudesSede)
  const resolverSolicitud = useDemoStore(s => s.resolverSolicitudSede)
  const contraofertar = useDemoStore(s => s.contraofertarSede)
  const solicitudesTO = solicitudesStore.filter(x => x.localId === local.id && x.estado === 'pendiente')
  // Contraoferta: la sede propone otra fecha/franja/precio y el TO decide.
  const [coId, setCoId] = useState<string | null>(null)
  const [coFecha, setCoFecha] = useState('')
  const [coFranja, setCoFranja] = useState('Noche (19-24h)')
  const [coPrecio, setCoPrecio] = useState(local.precioNoche)
  const ocupados = SETUPS.filter(s => s.estado === 'ocupado').length
  const [dispoPublicada, setDispoPublicada] = useState(false)

  // Plano de mesas: el local es quien define dónde está cada mesa y cómo es.
  // Se persiste en el store demo y lo leen el TO (modo directo) y el jugador (te toca).
  const mesasStore = useDemoStore(s => s.mesasSede[local.id])
  const setMesasSede = useDemoStore(s => s.setMesasSede)
  const mesas = mesasStore ?? local.mesas
  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const sel = mesas.find(m => m.n === mesaSel) ?? null

  const guardarMesas = (list: Mesa[]) => setMesasSede(local.id, list)
  const addMesa = (x: number, y: number) => {
    const n = mesas.reduce((mx, m) => Math.max(mx, m.n), 0) + 1
    guardarMesas([...mesas, { n, x, y, forma: 'cuadrada', plazas: 2, tipo: 'consola' }])
    setMesaSel(n)
  }
  const editarMesa = (patch: Partial<Mesa>) => {
    if (!sel) return
    // Una alargada en la última columna se saldría del plano: la retraemos.
    const fix = patch.forma === 'alargada' && sel.x >= 7 ? { x: 6 } : {}
    guardarMesas(mesas.map(m => m.n === sel.n ? { ...m, ...patch, ...fix } : m))
  }
  const eliminarMesa = () => {
    if (!sel) return
    guardarMesas(mesas.filter(m => m.n !== sel.n))
    setMesaSel(null)
  }

  return (
    <div className="relative min-h-screen pb-10 max-w-xl lg:max-w-5xl mx-auto">
      <div className="relative h-32 overflow-hidden">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 130% at 0% 0%, ${local.color} 0%, ${local.color}44 32%, transparent 70%), #0D0F15` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0D0F15)' }} />
        <div className="relative flex items-center justify-between px-4 pt-5 safe-top">
          <button onClick={() => router.back()} aria-label="Volver" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><ArrowLeft size={18} /></button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">Panel de la sede · Demo</span>
        </div>
      </div>

      <div className="relative px-5 -mt-9">
        <span className="inline-flex items-center justify-center w-16 h-16 rounded-2xl text-2xl font-black text-[#0A0A0F] border-4 border-[#0D0F15]" style={{ background: local.color }}>{local.nombre[0]}</span>
        <div className="mt-2.5">
          <p className="text-lg font-bold text-white text-display leading-tight">{local.nombre}</p>
          <p className="text-xs text-[#8B8BA8] inline-flex items-center gap-1 mt-0.5"><Star size={11} className="text-[#E0BE63]" /> {local.rating} · {local.zona} · {local.setups} setups</p>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI icon={<Monitor size={16} className="text-[#B6FF3A]" />} value={`${ocupados}/${SETUPS.length}`} label="Setups en uso" />
          <KPI icon={<Trophy size={16} className="text-[#9B82FF]" />} value={String(torneos.length)} label="Torneos este mes" />
          <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value={`${ingresos}€`} label="Ingresos del mes" />
          <KPI icon={<Users size={16} className="text-[#4F8EF7]" />} value={String(ORGANIZADORES ? 3 : 0)} label="TOs de confianza" />
        </div>

        {/* Solicitudes de TOs */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Solicitudes de organizadores</p>
        <div className="space-y-2">
          {solicitudes.length === 0 && solicitudesTO.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">No hay solicitudes pendientes.</p>}
          {solicitudesTO.map(s => {
            const org = ORGANIZADORES.lima
            const j = JUEGOS[s.juego]
            return (
              <div key={s.id} className="card-premium p-3.5 border border-[#B6FF3A]/25">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: org.color }}>{org.nombre[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-1">{org.nombre} <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span> <span className="ml-1 px-1.5 h-5 inline-flex items-center rounded-md bg-[#B6FF3A]/15 text-[#B6FF3A] text-[9px] font-bold uppercase tracking-wide">Nueva</span></p>
                    <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><CalendarClock size={11} /> {s.fecha} · {s.franja} · {s.personas} pers · {j?.corto}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => resolverSolicitud(s.id, 'aceptada', local.nombre)} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold inline-flex items-center justify-center gap-1"><Check size={14} /> Aceptar</button>
                  <button onClick={() => { setCoId(coId === s.id ? null : s.id); setCoFecha(s.fecha); setCoFranja(s.franja) }}
                    className={`flex-1 h-9 rounded-lg text-[12px] font-bold ${coId === s.id ? 'bg-[#FF8A5C]/20 text-[#FF8A5C] border border-[#FF8A5C]/40' : 'bg-white/8 text-white'}`}>Contraofertar</button>
                  <button onClick={() => resolverSolicitud(s.id, 'rechazada', local.nombre)} aria-label="Rechazar" className="h-9 w-9 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><X size={15} /></button>
                </div>
                {coId === s.id && (
                  <div className="mt-2.5 rounded-xl border border-[#FF8A5C]/30 bg-[#FF8A5C]/[0.06] p-3 space-y-2 animate-slide-up-sm">
                    <p className="text-[11px] font-bold text-[#FF8A5C] uppercase tracking-wider">Tu propuesta alternativa</p>
                    <input value={coFecha} onChange={e => setCoFecha(e.target.value)} placeholder="Ej. Dom 13 jul"
                      className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-[#FF8A5C]/60 outline-none" />
                    <div className="flex flex-wrap gap-1.5">
                      {['Tarde (16-21h)', 'Noche (19-24h)', 'Día completo'].map(fr => (
                        <button key={fr} onClick={() => setCoFranja(fr)}
                          className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border ${coFranja === fr ? 'bg-[#FF8A5C]/15 text-[#FF8A5C] border-[#FF8A5C]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{fr}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8B8BA8] font-semibold">Precio/noche</span>
                      <button onClick={() => setCoPrecio(v => Math.max(10, v - 5))} className="h-8 w-8 rounded-lg bg-white/8 text-white">−</button>
                      <span className="w-12 text-center text-sm font-bold text-white font-mono-num">{coPrecio}€</span>
                      <button onClick={() => setCoPrecio(v => v + 5)} className="h-8 w-8 rounded-lg bg-white/8 text-white">+</button>
                      <button onClick={() => { contraofertar(s.id, { fecha: coFecha.trim() || s.fecha, franja: coFranja, precio: coPrecio }, local.nombre); setCoId(null) }}
                        className="ml-auto h-9 px-4 rounded-lg bg-[#FF8A5C] text-[#0A0A0F] text-xs font-bold">Enviar contraoferta</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {solicitudes.map(s => {
            const org = ORGANIZADORES[s.org]
            const j = JUEGOS[s.juego]
            return (
              <div key={s.id} className="card-premium p-3.5">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: org.color }}>{org.nombre[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate flex items-center gap-1">{org.nombre} {org.verificado && <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span>}</p>
                    <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><CalendarClock size={11} /> {s.fecha} · {s.personas} pers · {j.corto}</p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <button onClick={() => setSolicitudes(p => p.filter(x => x.id !== s.id))} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold inline-flex items-center justify-center gap-1"><Check size={14} /> Aceptar</button>
                  <button className="flex-1 h-9 rounded-lg bg-white/8 text-white text-[12px] font-bold">Contraofertar</button>
                  <button onClick={() => setSolicitudes(p => p.filter(x => x.id !== s.id))} aria-label="Rechazar" className="h-9 w-9 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><X size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Plano de la sala: el local coloca y define sus mesas */}
        <div className="mt-6 mb-2.5 flex items-center justify-between">
          <p className="eyebrow eyebrow-muted">Plano de la sala</p>
          <span className="text-[11px] text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{mesas.length}</span> mesas</span>
        </div>
        {/* Escritorio: plano a la izquierda + panel de edición a la derecha */}
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
        <div>
        <MapaMesas
          mesas={mesas}
          seleccionada={mesaSel ?? undefined}
          onPick={m => setMesaSel(s => s === m.n ? null : m.n)}
          onCeldaVacia={addMesa}
        />
        <p className="mt-2 text-[11px] text-[#8B8BA8]">Toca una celda vacía para añadir mesa y una mesa para editarla. Los TOs ven este plano en el modo directo y los jugadores reciben su mesa resaltada.</p>
        </div>

        <div className="lg:sticky lg:top-6">
        {!sel && (
          <div className="hidden lg:flex card-premium p-4 text-sm text-[#8B8BA8] items-center justify-center text-center min-h-24">Selecciona una mesa del plano para editarla.</div>
        )}
        {sel && (
          <div className="mt-3 card-premium p-3.5 animate-slide-up-sm space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-white">Mesa {sel.n}</p>
              <button onClick={eliminarMesa} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#FF6B6B]/12 text-[#FF8A8A] text-[11px] font-bold"><Trash2 size={12} /> Quitar</button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {FORMAS.map(f => (
                <button key={f.id} onClick={() => editarMesa({ forma: f.id })}
                  className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${sel.forma === f.id ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{f.label}</button>
              ))}
              <span className="w-px h-8 bg-white/10 mx-1" />
              {TIPOS.map(tp => (
                <button key={tp.id} onClick={() => editarMesa({ tipo: tp.id })}
                  className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${sel.tipo === tp.id ? 'bg-[#9B82FF]/15 text-[#B9A6FF] border-[#9B82FF]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{tp.label}</button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#8B8BA8] font-semibold">Personas</span>
              <button onClick={() => editarMesa({ plazas: Math.max(1, sel.plazas - 1) })} aria-label="Menos plazas" className="h-8 w-8 rounded-lg bg-white/8 text-white">−</button>
              <span className="w-8 text-center text-sm font-bold text-white font-mono-num">{sel.plazas}</span>
              <button onClick={() => editarMesa({ plazas: sel.plazas + 1 })} aria-label="Más plazas" className="h-8 w-8 rounded-lg bg-white/8 text-white">+</button>
            </div>
          </div>
        )}
        </div>
        </div>{/* fin grid plano+editor */}

        {/* Torneos alojados */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">Torneos alojados</p>
        <div className="space-y-2">
          {torneos.map(t => (
            <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int p-3">
              <span className="w-1 self-stretch rounded-full" style={{ background: JUEGOS[t.juego].color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
                <p className="text-[11px] text-[#8B8BA8]">{t.fechaLabel} · {ORGANIZADORES[t.organizadorId!]?.nombre}</p>
              </div>
              <ChevronRight size={16} className="text-[#6B6B85]" />
            </Link>
          ))}
        </div>

        {/* Lista de confianza */}
        <p className="eyebrow eyebrow-muted mt-6 mb-2.5">TOs de confianza</p>
        <div className="card-premium p-3.5 space-y-2.5">
          {[ORGANIZADORES.lima, ORGANIZADORES['dragon-to']].map(o => (
            <div key={o.id} className="flex items-center gap-3">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm shrink-0" style={{ background: o.color }}>{o.nombre[0]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate flex items-center gap-1">{o.nombre} {o.verificado && <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span>}</p>
                <p className="text-[11px] text-[#8B8BA8]"><Star size={9} className="inline text-[#E0BE63]" /> {o.rating} · {o.torneosOrg} torneos · reserva directa</p>
              </div>
              <span className="text-[10px] text-[#B6FF3A] font-bold uppercase tracking-wide">Confianza</span>
            </div>
          ))}
          <button className="w-full mt-1 h-9 rounded-lg border border-dashed border-white/15 text-[#B8B8CC] text-xs font-semibold">+ Añadir organizador de confianza</button>
        </div>

        {/* Disponibilidad */}
        <button onClick={() => setDispoPublicada(v => !v)}
          className={`mt-6 w-full card-premium card-int p-4 flex items-center gap-3 text-left transition-colors ${dispoPublicada ? 'border border-[#B6FF3A]/40 bg-[#B6FF3A]/[0.06]' : ''}`}>
          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${dispoPublicada ? 'bg-[#B6FF3A]/25 text-[#B6FF3A]' : 'bg-[#B6FF3A]/15 text-[#B6FF3A]'}`}>{dispoPublicada ? <Check size={18} /> : <ShieldCheck size={18} />}</span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">{dispoPublicada ? 'Disponibilidad publicada' : 'Publica tu disponibilidad'}</p>
            <p className="text-xs text-[#8B8BA8]">{dispoPublicada ? 'Mar y Jue 18-23h · 8 setups · 60€/noche. Visible para los TOs.' : 'Horario recurrente + precio. Los TOs de confianza reservan directo.'}</p>
          </div>
          {!dispoPublicada && <ChevronRight size={18} className="text-[#6B6B85]" />}
        </button>
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
