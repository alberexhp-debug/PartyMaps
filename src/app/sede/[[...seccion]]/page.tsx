'use client'
import { useState } from 'react'
import Link from 'next/link'
import { AnimatedValue } from '@/components/ui/CountUp'
import { useParams, useRouter } from 'next/navigation'
import { LOCALES, ORGANIZADORES, organizadorEfectivo, JUEGOS, type Mesa, type MesaForma, type MesaTipo } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useLocalId } from '@/lib/stores/useDemoStore'
import { MiniLocal } from '@/components/todh/MiniLocal'
import { useT, type ClaveI18n } from '@/lib/i18n'
import { QrCode } from 'lucide-react'
import { MapaMesas, PisoTabs, pisosDe, mesasDePiso, nombrePiso } from '@/components/todh/MapaMesas'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { DisponibilidadSede, resumenDispo } from '@/components/todh/DispoSede'
import {
  LogOut, Monitor, Wallet, Star, CalendarClock, Check, X, ChevronRight,
  Users, Trophy, Trash2, Inbox, CalendarDays,
} from 'lucide-react'

const FORMAS: { id: MesaForma; clave: ClaveI18n }[] = [
  { id: 'cuadrada', clave: 'sede.formaCuadrada' }, { id: 'redonda', clave: 'sede.formaRedonda' }, { id: 'alargada', clave: 'sede.formaAlargada' },
]
const TIPOS: { id: MesaTipo; clave: ClaveI18n }[] = [
  { id: 'consola', clave: 'sede.tipoConsola' }, { id: 'pc', clave: 'sede.tipoPc' }, { id: 'mesa', clave: 'sede.tipoMesa' },
  { id: 'arcade', clave: 'sede.tipoArcade' }, { id: 'stream', clave: 'sede.tipoStream' },
]

type Setup = { n: number; tipo: string; estado: 'libre' | 'ocupado'; stream?: boolean }
const SETUPS: Setup[] = [
  { n: 1, tipo: 'Consola', estado: 'ocupado' }, { n: 2, tipo: 'Consola', estado: 'ocupado' },
  { n: 3, tipo: 'PC', estado: 'libre' }, { n: 4, tipo: 'PC', estado: 'ocupado' },
  { n: 5, tipo: 'Stream', estado: 'ocupado', stream: true }, { n: 6, tipo: 'Consola', estado: 'libre' },
]

// Cada apartado del panel es una RUTA (/sede, /sede/plano…): así el menú
// lateral de la app los muestra directamente, como las herramientas de un TO.
// La puerta de sesión y el shell (rail + barra inferior) viven en el layout.
type Seccion = 'resumen' | 'solicitudes' | 'plano' | 'dispo' | 'torneos'
const SECCIONES: { id: Seccion; clave: ClaveI18n; ruta: string }[] = [
  { id: 'resumen', clave: 'sede.secResumen', ruta: '/sede' },
  { id: 'solicitudes', clave: 'sede.secSolicitudes', ruta: '/sede/solicitudes' },
  { id: 'plano', clave: 'sede.secPlano', ruta: '/sede/plano' },
  { id: 'dispo', clave: 'sede.secDispo', ruta: '/sede/disponibilidad' },
  { id: 'torneos', clave: 'sede.secTorneos', ruta: '/sede/torneos' },
]
const SECCION_POR_URL: Record<string, Seccion> = {
  solicitudes: 'solicitudes', plano: 'plano', disponibilidad: 'dispo', torneos: 'torneos',
}

export default function SedePage() {
  const { t: tr, idioma } = useT()
  const params = useParams<{ seccion?: string[] }>()
  const seccion: Seccion = SECCION_POR_URL[params.seccion?.[0] ?? ''] ?? 'resumen'
  const [scanner, setScanner] = useState(false)
  const [escaneado, setEscaneado] = useState<string | null>(null)
  const router = useRouter()
  const logout = useSesionStore(s => s.logout)
  // Identidad por cuenta: el panel es del local de la SESIÓN (nada de asumir «gamba»).
  const localId = useLocalId()
  const local = LOCALES[localId] ?? LOCALES.gamba
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const torneos = torneosEfectivos(creados, editados, cancelados).filter(t => t.localId === local.id)
  const ingresos = torneos.reduce((a, t) => a + Math.round(t.inscritos * t.precio * 0.3), 0)
  const dispo = useDemoStore(s => s.dispoSedes[local.id])
  // TODAS las solicitudes van por el store (las de muestra vienen sembradas):
  // un único flujo — aceptar/rechazar/contraofertar siempre responde al TO.
  const solicitudesStore = useDemoStore(s => s.solicitudesSede)
  const resolverSolicitud = useDemoStore(s => s.resolverSolicitudSede)
  const contraofertar = useDemoStore(s => s.contraofertarSede)
  const solicitudesTO = solicitudesStore.filter(x => x.localId === local.id && x.estado === 'pendiente')
  const pendientes = solicitudesTO.length
  // TOs de confianza (reserva directa): lista persistida por sede.
  const confianza = useDemoStore(s => s.tosConfianza[local.id]) ?? []
  const agregarConfianza = useDemoStore(s => s.agregarTOConfianza)
  const quitarConfianza = useDemoStore(s => s.quitarTOConfianza)
  const [anadiendoTO, setAnadiendoTO] = useState(false)
  // «Así te ven»: la ficha pública de la sede, la misma que abren jugadores y TOs.
  const [verFicha, setVerFicha] = useState(false)
  // Contraoferta: la sede propone otra fecha/franja/precio y el TO decide.
  const [coId, setCoId] = useState<string | null>(null)
  const [coFecha, setCoFecha] = useState('')
  const [coFranja, setCoFranja] = useState('Noche (19-24h)')
  const [coPrecio, setCoPrecio] = useState(local.precioNoche)
  const ocupados = SETUPS.filter(s => s.estado === 'ocupado').length

  // Plano de mesas: el local es quien define dónde está cada mesa y cómo es.
  const mesasStore = useDemoStore(s => s.mesasSede[local.id])
  const setMesasSede = useDemoStore(s => s.setMesasSede)
  const mesas = mesasStore ?? local.mesas
  const [mesaSel, setMesaSel] = useState<number | null>(null)
  const sel = mesas.find(m => m.n === mesaSel) ?? null
  const [piso, setPiso] = useState(0)
  const [pisosManual, setPisosManual] = useState(0)
  const totalPisos = Math.max(pisosDe(mesas), pisosManual)
  const mesasPiso = mesasDePiso(mesas, piso)

  const guardarMesas = (list: Mesa[]) => setMesasSede(local.id, list)
  const addMesa = (x: number, y: number) => {
    const n = mesas.reduce((mx, m) => Math.max(mx, m.n), 0) + 1
    guardarMesas([...mesas, { n, x, y, forma: 'cuadrada', plazas: 2, tipo: 'consola', ...(piso ? { piso } : {}) }])
    setMesaSel(n)
  }
  const editarMesa = (patch: Partial<Mesa>) => {
    if (!sel) return
    guardarMesas(mesas.map(m => m.n === sel.n ? { ...m, ...patch } : m))
  }
  const eliminarPiso = (p: number) => {
    if (p === 0) return
    const n = mesasDePiso(mesas, p).length
    const aviso = n === 0 ? `${tr('sede.eliminarPre')} ${nombrePiso(p)}?`
      : `${tr('sede.eliminarPre')} ${nombrePiso(p)}? ${n === 1 ? tr('sede.quitaUna') : `${tr('sede.quitaVariasA')} ${n} ${tr('sede.quitaVariasB')}`}`
    if (typeof window !== 'undefined' && !window.confirm(aviso)) return
    guardarMesas(mesas.filter(m => (m.piso ?? 0) !== p).map(m => (m.piso ?? 0) > p ? { ...m, piso: (m.piso ?? 0) - 1 } : m))
    setPisosManual(totalPisos - 1)
    setPiso(p - 1)
    setMesaSel(null)
  }
  const eliminarMesa = () => {
    if (!sel) return
    guardarMesas(mesas.filter(m => m.n !== sel.n))
    setMesaSel(null)
  }

  const abrirScanner = () => { setScanner(true); setEscaneado(null) }
  const cerrarSesion = () => { logout(); router.replace('/login') }
  const abrirContraoferta = (id: string, fecha: string, franja: string) => {
    setCoId(coId === id ? null : id); setCoFecha(fecha); setCoFranja(franja)
  }

  return (
    <div className="relative pb-6">
      {/* Cabecera del panel (el menú de secciones vive en el rail/barra de la app) */}
      <div className="relative h-28 overflow-hidden lg:mx-8 lg:rounded-3xl lg:mt-5">
        <div className="absolute inset-0" style={{ background: `radial-gradient(120% 130% at 0% 0%, ${local.color} 0%, ${local.color}44 32%, transparent 70%), #0D0F15` }} />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to bottom, transparent 40%, #0D0F15)' }} />
        <div className="relative flex items-center gap-2 px-4 pt-5 safe-top">
          <button onClick={cerrarSesion} aria-label="Cerrar sesión" className="h-10 w-10 rounded-xl glass-strong flex items-center justify-center text-white"><LogOut size={16} /></button>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/70 font-bold">{tr('sede.panel')}</span>
          <button onClick={abrirScanner} className="ml-auto h-9 px-3 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-xs font-bold inline-flex items-center gap-1.5"><QrCode size={14} /> {tr('sede.escanear')}</button>
        </div>
      </div>
      <div className="relative px-5 lg:px-8 -mt-8 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-14 h-14 rounded-2xl text-xl font-black text-[#0A0A0F] border-4 border-[#0D0F15]" style={{ background: local.color }}>{local.nombre[0]}</span>
        <div className="pt-4 min-w-0">
          <p className="text-base font-bold text-white text-display leading-tight truncate">{local.nombre}</p>
          <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><Star size={10} className="text-[#E0BE63]" /> {local.rating} · {local.zona} · {local.setups} setups</p>
        </div>
      </div>

      {/* ── Contenido de la sección activa (la elige la ruta) ── */}
      <main className="relative px-5 lg:px-8 pt-5 max-w-xl mx-auto lg:max-w-none lg:mx-0">
        <h1 className="text-2xl font-bold text-white text-display tracking-tight mb-5">{tr((SECCIONES.find(s => s.id === seccion) ?? SECCIONES[0]).clave)}</h1>

        {seccion === 'resumen' && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <KPI icon={<Monitor size={16} className="text-[#B6FF3A]" />} value={`${ocupados}/${SETUPS.length}`} label={tr('sede.setupsUso')} />
              <KPI icon={<Trophy size={16} className="text-[#9B82FF]" />} value={String(torneos.length)} label={tr('sede.torneosMes')} />
              <KPI icon={<Wallet size={16} className="text-[#E0BE63]" />} value={`${ingresos}€`} label={tr('sede.ingresosMes')} />
              <KPI icon={<Users size={16} className="text-[#4F8EF7]" />} value={String(confianza.length)} label={tr('sede.tosConfianza')} />
            </div>

            {pendientes > 0 && (
              <button onClick={() => router.push('/sede/solicitudes')} className="w-full card-premium card-int p-4 flex items-center gap-3 text-left border border-[#B6FF3A]/25">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#B6FF3A]/15 text-[#B6FF3A]"><Inbox size={18} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white">{pendientes} {pendientes === 1 ? tr('sede.solicitudSing') : tr('sede.solicitudPlur')}</p>
                  <p className="text-xs text-[#8B8BA8]">{tr('sede.fechasPedidas')}</p>
                </div>
                <ChevronRight size={16} className="text-[#6B6B85]" />
              </button>
            )}

            <button onClick={() => router.push('/sede/disponibilidad')} className="w-full card-premium card-int p-4 flex items-center gap-3 text-left">
              <span className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${dispo?.publicada ? 'bg-[#B6FF3A]/20 text-[#B6FF3A]' : 'bg-white/6 text-[#8B8BA8]'}`}><CalendarDays size={18} /></span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{dispo?.publicada ? tr('sede.dispoPublicada') : tr('sede.dispoSinPublicar')}</p>
                <p className="text-xs text-[#8B8BA8]">{dispo?.publicada ? `${resumenDispo(dispo, idioma)} ${tr('sede.dispoVisible')}` : tr('sede.publicaHorario')}</p>
              </div>
              <ChevronRight size={16} className="text-[#6B6B85]" />
            </button>

            {/* Espejo: cómo ven tu sede los jugadores y los TOs (los TOs tienen
                su «Mi página»; esta es la contrapartida para la sede). */}
            <button onClick={() => setVerFicha(true)} className="w-full card-premium card-int p-4 flex items-center gap-3 text-left">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#9B82FF]/15 text-[#9B82FF] text-lg">👁</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white">{tr('sede.asiTeVen')}</p>
                <p className="text-xs text-[#8B8BA8]">{tr('sede.fichaPublica')}</p>
              </div>
              <ChevronRight size={16} className="text-[#6B6B85]" />
            </button>

            {torneos.length > 0 && (
              <div>
                <p className="eyebrow eyebrow-muted mb-2.5">{tr('sede.proximos')}</p>
                <div className="space-y-2">
                  {torneos.slice(0, 3).map(t => <FilaTorneo key={t.id} t={t} />)}
                </div>
              </div>
            )}
          </div>
        )}

        {seccion === 'solicitudes' && (
          <div className="space-y-2">
            {solicitudesTO.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('sede.sinSolicitudes')}</p>}
            {solicitudesTO.map(s => {
              const org = organizadorEfectivo(s.orgId ?? 'lima')
              const j = JUEGOS[s.juego]
              return (
                <div key={s.id} className="card-premium p-3.5 border border-[#B6FF3A]/25">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-[#0A0A0F] font-black" style={{ background: org.color }}>{org.nombre[0]}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-white truncate flex items-center gap-1">{org.nombre} <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span> <span className="ml-1 px-1.5 h-5 inline-flex items-center rounded-md bg-[#B6FF3A]/15 text-[#B6FF3A] text-[9px] font-bold uppercase tracking-wide">{tr('sede.nueva')}</span></p>
                      <p className="text-[11px] text-[#8B8BA8] inline-flex items-center gap-1"><CalendarClock size={11} /> {s.fecha} · {s.franja} · {s.personas} {tr('sede.pers')} · {j?.corto}</p>
                      {(s.recursos?.length || s.repartoTO) && (
                        <p className="text-[10px] text-[#7FB0FF] mt-0.5">{s.recursos?.length ? `${tr('sede.pide')} ${s.recursos.join(', ')}` : ''}{s.repartoTO ? ` · ${tr('sede.proponeTO')} ${s.repartoTO}% / ${tr('sede.localPct')} ${100 - s.repartoTO}%` : ''}</p>
                      )}
                    </div>
                  </div>
                  <div className="mt-2.5 flex gap-2">
                    <button onClick={() => resolverSolicitud(s.id, 'aceptada', local.nombre)} className="flex-1 h-9 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[12px] font-bold inline-flex items-center justify-center gap-1"><Check size={14} /> {tr('sede.aceptar')}</button>
                    <button onClick={() => abrirContraoferta(s.id, s.fecha, s.franja)}
                      className={`flex-1 h-9 rounded-lg text-[12px] font-bold ${coId === s.id ? 'bg-[#FF8A5C]/20 text-[#FF8A5C] border border-[#FF8A5C]/40' : 'bg-white/8 text-white'}`}>{tr('sede.contraofertar')}</button>
                    <button onClick={() => resolverSolicitud(s.id, 'rechazada', local.nombre)} aria-label="Rechazar" className="h-9 w-9 rounded-lg bg-white/6 text-[#FF6076] inline-flex items-center justify-center"><X size={15} /></button>
                  </div>
                  {coId === s.id && (
                    <FormContraoferta fecha={coFecha} setFecha={setCoFecha} franja={coFranja} setFranja={setCoFranja} precio={coPrecio} setPrecio={setCoPrecio}
                      onEnviar={() => { contraofertar(s.id, { fecha: coFecha.trim() || s.fecha, franja: coFranja, precio: coPrecio }, local.nombre); setCoId(null) }} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {seccion === 'plano' && (
          <div>
            <div className="mb-2.5 flex items-center justify-between">
              <p className="eyebrow eyebrow-muted lg:hidden">{tr('sede.plano')}</p>
              <span className="text-[11px] text-[#8B8BA8]"><span className="text-white font-bold font-mono-num">{mesas.length}</span> {tr('sede.mesas')}{totalPisos > 1 ? ` · ${totalPisos} ${tr('sede.pisos')}` : ''}</span>
            </div>
            <div className="mb-2.5">
              <PisoTabs total={totalPisos} activo={piso} onPiso={p => { setPiso(p); setMesaSel(null) }}
                onAdd={() => { const nuevo = totalPisos; setPisosManual(totalPisos + 1); setPiso(nuevo); setMesaSel(null) }}
                onRemove={eliminarPiso} />
            </div>
            <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-6 lg:items-start">
              <div>
                <MapaMesas
                  mesas={mesasPiso}
                  seleccionada={mesaSel ?? undefined}
                  onPick={m => setMesaSel(s => s === m.n ? null : m.n)}
                  onCeldaVacia={addMesa}
                  expandible
                  zoomable
                />
                <p className="mt-2 text-[11px] text-[#8B8BA8]">{tr('sede.planoAyudaA')} ({nombrePiso(piso).toLowerCase()}) {tr('sede.planoAyudaB')}</p>
              </div>

              <div className="lg:sticky lg:top-6">
                {!sel && (
                  <div className="hidden lg:flex card-premium p-4 text-sm text-[#8B8BA8] items-center justify-center text-center min-h-24">{tr('sede.selMesa')}</div>
                )}
                {sel && (
                  <div className="mt-3 lg:mt-0 card-premium p-3.5 animate-slide-up-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-bold text-white">{tr('sede.mesaUna')} {sel.n}</p>
                      <button onClick={eliminarMesa} className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg bg-[#FF6B6B]/12 text-[#FF8A8A] text-[11px] font-bold"><Trash2 size={12} /> {tr('sede.quitar')}</button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {FORMAS.map(f => (
                        <button key={f.id} onClick={() => editarMesa({ forma: f.id })}
                          className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${sel.forma === f.id ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{tr(f.clave)}</button>
                      ))}
                      <span className="w-px h-8 bg-white/10 mx-1" />
                      {TIPOS.map(tp => (
                        <button key={tp.id} onClick={() => editarMesa({ tipo: tp.id })}
                          className={`px-2.5 h-8 rounded-lg text-xs font-bold border transition-all ${sel.tipo === tp.id ? 'bg-[#9B82FF]/15 text-[#B9A6FF] border-[#9B82FF]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{tr(tp.clave)}</button>
                      ))}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-[#8B8BA8] font-semibold">{tr('sede.personas')}</span>
                      <button onClick={() => editarMesa({ plazas: Math.max(1, sel.plazas - 1) })} aria-label="Menos plazas" className="h-8 w-8 rounded-lg bg-white/8 text-white">−</button>
                      <span className="w-8 text-center text-sm font-bold text-white font-mono-num">{sel.plazas}</span>
                      <button onClick={() => editarMesa({ plazas: sel.plazas + 1 })} aria-label="Más plazas" className="h-8 w-8 rounded-lg bg-white/8 text-white">+</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {seccion === 'dispo' && <DisponibilidadSede local={local} />}

        {seccion === 'torneos' && (
          <div className="space-y-5">
            <div>
              <p className="eyebrow eyebrow-muted mb-2.5">{tr('sede.torneosAlojados')}</p>
              <div className="space-y-2">
                {torneos.length === 0 && <p className="text-sm text-[#8B8BA8] card-premium p-4 text-center">{tr('sede.sinTorneos')}</p>}
                {torneos.map(t => <FilaTorneo key={t.id} t={t} />)}
              </div>
            </div>

            <div>
              <p className="eyebrow eyebrow-muted mb-2.5">{tr('sede.tosConfianza')}</p>
              <div className="card-premium p-3.5 space-y-2.5">
                {confianza.length === 0 && <p className="text-xs text-[#8B8BA8] text-center py-2">{tr('sede.sinConfianza')}</p>}
                {confianza.map(oid => {
                  const o = organizadorEfectivo(oid)
                  return (
                    <div key={o.id} className="flex items-center gap-3">
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm shrink-0" style={{ background: o.color }}>{o.nombre[0]}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate flex items-center gap-1">{o.nombre} {o.verificado && <span className="inline-flex w-3.5 h-3.5 rounded-full bg-[#4F8EF7] text-white text-[8px] items-center justify-center">✓</span>}</p>
                        <p className="text-[11px] text-[#8B8BA8]"><Star size={9} className="inline text-[#E0BE63]" /> {o.rating} · {o.torneosOrg} {tr('sede.torneosDirecta')}</p>
                      </div>
                      <button onClick={() => quitarConfianza(local.id, o.id)} aria-label={`Quitar a ${o.nombre}`} className="h-8 w-8 rounded-lg bg-white/6 text-[#8B8BA8] hover:text-[#FF8A8A] inline-flex items-center justify-center transition-colors"><X size={13} /></button>
                    </div>
                  )
                })}
                <button onClick={() => setAnadiendoTO(true)} className="w-full mt-1 h-9 rounded-lg border border-dashed border-white/15 text-[#B8B8CC] text-xs font-semibold hover:text-white hover:border-white/30 transition-colors">{tr('sede.anadirConfianza')}</button>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Ficha pública de la sede: el espejo «así te ven» */}
      {verFicha && <MiniLocal local={local} onClose={() => setVerFicha(false)} />}

      {/* Añadir TO de confianza: organizadores de la app que aún no lo son */}
      {anadiendoTO && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={() => setAnadiendoTO(false)} />
          <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5">
            <p className="text-lg font-bold text-white text-display">{tr('sede.confianzaTitulo')}</p>
            <p className="mt-1 text-[12px] text-[#8B8BA8]">{tr('sede.confianzaTexto')}</p>
            <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
              {Object.values(ORGANIZADORES).filter(o => !confianza.includes(o.id)).map(o => (
                <button key={o.id} onClick={() => { agregarConfianza(local.id, o.id, o.nombre, local.nombre); setAnadiendoTO(false) }}
                  className="w-full flex items-center gap-3 card-premium card-int p-3 text-left">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[#0A0A0F] font-black text-sm shrink-0" style={{ background: o.color }}>{o.nombre[0]}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{o.nombre}</p>
                    <p className="text-[11px] text-[#8B8BA8]"><Star size={9} className="inline text-[#E0BE63]" /> {o.rating} · {o.torneosOrg} {tr('sede.torneosN')}</p>
                  </div>
                  <span className="text-[11px] text-[#B6FF3A] font-bold">{tr('sede.anadir')}</span>
                </button>
              ))}
              {Object.values(ORGANIZADORES).filter(o => !confianza.includes(o.id)).length === 0 && (
                <p className="text-center text-sm text-[#8B8BA8] py-4">{tr('sede.todosConfianza')}</p>
              )}
            </div>
            <button onClick={() => setAnadiendoTO(false)} className="mt-3 w-full h-10 rounded-xl bg-white/6 text-[#B8B8CC] text-sm font-semibold">{tr('sede.cerrar')}</button>
          </div>
        </div>
      )}

      {/* Escáner de entradas del local (reunión 5-jul: el local también escanea) */}
      {scanner && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm animate-fade-in" onClick={() => setScanner(false)} />
          <div className="relative w-full max-w-sm bg-[#141822] border-t sm:border border-white/10 rounded-t-3xl sm:rounded-3xl animate-slide-up-sm sm:animate-pop p-5 text-center">
            <p className="text-lg font-bold text-white text-display">{tr('sede.escanerTitulo')}</p>
            {escaneado ? (
              <div className="mt-4 rounded-2xl border border-[#B6FF3A]/45 bg-[#B6FF3A]/10 p-4">
                <p className="text-3xl">✅</p>
                <p className="mt-1 text-[15px] font-bold text-[#B6FF3A]">{tr('sede.entradaValida')}</p>
                <p className="text-[13px] text-white mt-0.5">{escaneado}</p>
                <p className="text-[11px] text-[#8B8BA8] mt-1">{tr('sede.checkinReg')}</p>
              </div>
            ) : (
              <div className="mt-4 mx-auto w-52 h-52 rounded-2xl border-2 border-dashed border-white/20 bg-black/40 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-x-6 h-0.5 bg-[#B6FF3A] animate-pulse" style={{ top: '50%' }} />
                <p className="text-[11px] text-[#8B8BA8]">{tr('sede.apuntaQR')}</p>
              </div>
            )}
            <div className="mt-4 flex gap-2">
              {!escaneado && <button onClick={() => setEscaneado('Kaze · Lima Smash Weekly #42 · Jugador')} className="flex-1 h-11 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">{tr('sede.simular')}</button>}
              {escaneado && <button onClick={() => setEscaneado(null)} className="flex-1 h-11 rounded-xl bg-white/8 border border-white/15 text-white text-sm font-bold">{tr('sede.siguiente')}</button>}
              <button onClick={() => setScanner(false)} className="h-11 px-4 rounded-xl bg-white/6 text-[#B8B8CC] text-sm font-semibold">{tr('sede.cerrar')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Fila compacta de torneo alojado (resumen y sección Torneos). Enlaza a la
// ficha pública: la sede ya puede ver el torneo y su bracket como cualquiera.
function FilaTorneo({ t }: { t: ReturnType<typeof torneosEfectivos>[number] }) {
  const { t: tr } = useT()
  return (
    <Link href={`/torneo/${t.id}`} className="flex items-center gap-3 card-premium card-int p-3">
      <span className="w-1 self-stretch rounded-full" style={{ background: JUEGOS[t.juego]?.color }} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-white truncate">{t.nombre}</p>
        <p className="text-[11px] text-[#8B8BA8]">{t.fechaLabel} · {organizadorEfectivo(t.organizadorId ?? 'lima').nombre} · <span className="font-mono-num">{t.inscritos}/{t.plazas}</span> {tr('sede.inscritos')}</p>
      </div>
      {t.enDirecto && <span className="badge-live shrink-0">Live</span>}
      <ChevronRight size={14} className="text-[#6B6B85] shrink-0" />
    </Link>
  )
}

// Formulario de contraoferta (compartido por las dos listas de solicitudes)
function FormContraoferta({ fecha, setFecha, franja, setFranja, precio, setPrecio, onEnviar }: {
  fecha: string; setFecha: (v: string) => void
  franja: string; setFranja: (v: string) => void
  precio: number; setPrecio: (f: (v: number) => number) => void
  onEnviar: () => void
}) {
  const { t: tr } = useT()
  return (
    <div className="mt-2.5 rounded-xl border border-[#FF8A5C]/30 bg-[#FF8A5C]/[0.06] p-3 space-y-2 animate-slide-up-sm">
      <p className="text-[11px] font-bold text-[#FF8A5C] uppercase tracking-wider">{tr('sede.propAlternativa')}</p>
      <input value={fecha} onChange={e => setFecha(e.target.value)} placeholder={tr('sede.fechaPh')}
        className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-[#FF8A5C]/60 outline-none" />
      <div className="flex flex-wrap gap-1.5">
        {['Tarde (16-21h)', 'Noche (19-24h)', 'Día completo'].map(fr => (
          <button key={fr} onClick={() => setFranja(fr)}
            className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border ${franja === fr ? 'bg-[#FF8A5C]/15 text-[#FF8A5C] border-[#FF8A5C]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{fr}</button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#8B8BA8] font-semibold">{tr('sede.precioNoche')}</span>
        <button onClick={() => setPrecio(v => Math.max(10, v - 5))} className="h-8 w-8 rounded-lg bg-white/8 text-white">−</button>
        <span className="w-12 text-center text-sm font-bold text-white font-mono-num">{precio}€</span>
        <button onClick={() => setPrecio(v => v + 5)} className="h-8 w-8 rounded-lg bg-white/8 text-white">+</button>
        <button onClick={onEnviar} className="ml-auto h-9 px-4 rounded-lg bg-[#FF8A5C] text-[#0A0A0F] text-xs font-bold">{tr('sede.enviarContra')}</button>
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
