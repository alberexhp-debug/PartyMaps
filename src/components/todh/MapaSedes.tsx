'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { LOCALES, JUEGOS, JUEGOS_LIST, type Local } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { MiniLocal } from '@/components/todh/MiniLocal'
import { X, Star, Ruler, Monitor, Users, Wallet, Check, CalendarClock, Eye, Clock } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Mapa de SEDES del panel del TO: enseña TODOS los locales dados de alta en la
// app (también los que aún no publican torneos, invisibles para el jugador) para
// contactar y pedirles fecha. El del jugador solo enseña locales con torneos.

type Filtro = 'todas' | 'con-torneos' | 'disponibles'
const FRANJAS = ['Tarde (16-21h)', 'Noche (19-24h)', 'Día completo']

export default function MapaSedes() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const [filtro, setFiltro] = useState<Filtro>('todas')
  const [sel, setSel] = useState<string | null>(null)

  // Nº de torneos activos por local (para diferenciar sedes con/sin torneos)
  const torneosPorLocal = useMemo(() => {
    const m: Record<string, number> = {}
    for (const t of torneosEfectivos(creados, editados, cancelados)) if (t.localId && !t.online) m[t.localId] = (m[t.localId] ?? 0) + 1
    return m
  }, [creados, editados, cancelados])

  const locales = useMemo(() => Object.values(LOCALES).filter(l => {
    const n = torneosPorLocal[l.id] ?? 0
    return filtro === 'todas' ? true : filtro === 'con-torneos' ? n > 0 : n === 0
  }), [filtro, torneosPorLocal])

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.708, 40.418],
      zoom: 11.8,
      attributionControl: false,
    })
    mapRef.current = map
    map.on('load', () => map.resize())
    const t1 = setTimeout(() => map.resize(), 120)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)
    return () => { clearTimeout(t1); ro.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  // Un pin por sede, clavado a su coordenada; las disponibles llevan aro lima discontinuo.
  const markersRef = useRef<mapboxgl.Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    for (const l of locales) {
      const n = torneosPorLocal[l.id] ?? 0
      const activo = l.id === sel
      const el = document.createElement('button')
      el.setAttribute('aria-label', `${l.nombre} · ${n ? `${n} torneos` : 'disponible'}`)
      el.style.cssText = `width:46px;height:54px;cursor:pointer;background:none;border:none;padding:0;z-index:${activo ? 5 : 1};`
      const wrap = document.createElement('span')
      wrap.style.cssText = 'position:absolute;inset:0;transform-origin:50% 100%;'
      const tail = document.createElement('span')
      tail.style.cssText = `position:absolute;left:50%;bottom:2px;width:12px;height:12px;background:linear-gradient(135deg,#171A24,#0D0F15);border-right:2px solid ${l.color};border-bottom:2px solid ${l.color};transform:translateX(-50%) rotate(45deg);border-radius:0 0 3px 0;`
      wrap.appendChild(tail)
      const body = document.createElement('span')
      body.style.cssText = `position:absolute;top:0;left:3px;width:40px;height:40px;border-radius:50%;background:radial-gradient(120% 120% at 32% 24%, #232634 0%, #0D0F15 72%);border:2px solid ${l.color};box-shadow:0 8px 18px rgba(0,0,0,.5), 0 0 0 ${activo ? 5 : 3}px ${l.color}${activo ? '33' : '1F'};display:flex;align-items:center;justify-content:center;transition:transform .16s cubic-bezier(.34,1.56,.64,1);transform:scale(${activo ? 1.12 : 1});`
      const inner = document.createElement('span')
      inner.textContent = l.nombre[0]
      inner.style.cssText = `font-size:17px;line-height:1;font-weight:900;color:${l.color};text-shadow:0 1px 2px rgba(0,0,0,.55);`
      body.appendChild(inner)
      if (n > 0) {
        const badge = document.createElement('span')
        badge.textContent = String(n)
        badge.style.cssText = 'position:absolute;top:-5px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#B6FF3A;color:#0A0A0F;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #0D0F15;'
        body.appendChild(badge)
      } else {
        // Sede disponible (sin torneos): aro lima discontinuo = oportunidad para el TO
        const ring = document.createElement('span')
        ring.style.cssText = 'position:absolute;top:-6px;left:-6px;width:52px;height:52px;border-radius:50%;border:2px dashed #B6FF3A99;pointer-events:none;'
        body.appendChild(ring)
      }
      wrap.appendChild(body)
      el.appendChild(wrap)
      el.onclick = (e) => { e.stopPropagation(); setSel(l.id); map.flyTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 13.5), offset: [0, -150] }) }
      markersRef.current.push(new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([l.lng, l.lat]).addTo(map))
    }
  }, [locales, sel, torneosPorLocal])

  const localSel = sel ? LOCALES[sel] : null

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" onClick={() => setSel(null)} />

      {/* Filtros */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
          {([['todas', 'Todas'], ['con-torneos', 'Con torneos'], ['disponibles', 'Disponibles']] as const).map(([k, label]) => (
            <button key={k} onClick={() => setFiltro(k)}
              className={`px-3 h-8 rounded-full text-xs font-bold transition-all ${filtro === k ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-[#B8B8CC]'}`}>
              {label}{k === 'disponibles' && filtro !== k ? ` · ${Object.values(LOCALES).filter(l => !(torneosPorLocal[l.id] ?? 0)).length}` : ''}
            </button>
          ))}
          <span className="glass-strong rounded-full px-3 h-8 inline-flex items-center gap-1.5 text-[10px] text-[#8B8BA8] font-semibold">
            <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#B6FF3A]" /> disponible · sin torneos aún
          </span>
        </div>
      </div>

      {localSel && <SedeSheet local={localSel} nTorneos={torneosPorLocal[localSel.id] ?? 0} onClose={() => setSel(null)} />}
    </div>
  )
}

// Hoja de contacto de la sede: datos clave + pedir fecha (el local responde desde su panel).
function SedeSheet({ local, nTorneos, onClose }: { local: Local; nTorneos: number; onClose: () => void }) {
  const solicitudes = useDemoStore(s => s.solicitudesSede)
  const crearSolicitud = useDemoStore(s => s.crearSolicitudSede)
  const [verFicha, setVerFicha] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  const [fecha, setFecha] = useState('')
  const [franja, setFranja] = useState(FRANJAS[1])
  const [personas, setPersonas] = useState(32)
  const [juego, setJuego] = useState(JUEGOS_LIST[0].id)
  // Recursos que pides al local y reparto propuesto (reunión 5-jul: quien aporta, cobra)
  const RECURSOS = ['Mesas y sillas', 'Pantallas/monitores', 'Consolas', 'Sonido']
  const [recursos, setRecursos] = useState<string[]>(['Mesas y sillas'])
  const [repartoTO, setRepartoTO] = useState(70)
  const mia = solicitudes.find(s => s.localId === local.id && s.estado !== 'rechazada')

  const enviar = () => {
    const fechaLabel = fecha
      ? new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })
      : 'Fecha por concretar'
    crearSolicitud({ localId: local.id, fecha: fechaLabel, franja, personas, juego, recursos, repartoTO }, local.nombre)
    setPidiendo(false)
  }

  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-slide-up-sm lg:max-w-md">
      <div className="ring-grad card-premium relative overflow-hidden rounded-2xl shadow-2xl">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white"><X size={14} /></button>

        <div className="p-3.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black text-lg shrink-0" style={{ background: local.color }}>{local.nombre[0]}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[15px] font-bold text-white truncate">{local.nombre}</p>
              <p className="text-[11px] text-[#8B8BA8]">{local.zona} · <span className="inline-flex items-center gap-0.5 text-[#E0BE63]"><Star size={9} className="fill-[#E0BE63]" /> {local.rating}</span> · {nTorneos > 0
                ? <span className="text-[#B6FF3A] font-semibold">{nTorneos} torneos activos</span>
                : <span className="text-[#B6FF3A] font-semibold">disponible · aún sin torneos</span>}
              </p>
            </div>
          </div>

          <div className="mt-2.5 flex items-center gap-3 flex-wrap text-[11px] text-[#B8B8CC]">
            <span className="inline-flex items-center gap-1"><Ruler size={11} className="text-[#4F8EF7]" /> {local.m2} m²</span>
            <span className="inline-flex items-center gap-1"><Monitor size={11} className="text-[#B6FF3A]" /> {local.setups} setups</span>
            <span className="inline-flex items-center gap-1"><Users size={11} className="text-[#9B82FF]" /> {local.aforo} aforo</span>
            <span className="inline-flex items-center gap-1 font-bold text-white"><Wallet size={11} className="text-[#E0BE63]" /> desde {local.precioNoche}€/noche</span>
          </div>

          {/* Estado de mi solicitud / pedir fecha */}
          {mia ? (
            <div className={`mt-3 flex items-center gap-2 rounded-xl px-3 py-2.5 border ${mia.estado === 'aceptada' ? 'border-[#B6FF3A]/40 bg-[#B6FF3A]/10 text-[#B6FF3A]' : 'border-[#FF8A5C]/40 bg-[#FF8A5C]/10 text-[#FF8A5C]'}`}>
              {mia.estado === 'aceptada' ? <Check size={15} /> : <Clock size={15} />}
              <p className="text-xs font-bold flex-1">
                {mia.estado === 'aceptada' ? `Sede confirmada · ${mia.fecha} · ${mia.franja}`
                  : mia.estado === 'contraoferta' ? `Contraoferta recibida · revísala en Mis solicitudes`
                  : `Solicitud pendiente · ${mia.fecha} · ${mia.franja}`}
              </p>
            </div>
          ) : pidiendo ? (
            <div className="mt-3 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} aria-label="Fecha"
                  className="h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-white text-xs focus:border-[#B6FF3A]/60 outline-none [color-scheme:dark]" />
                <div className="flex items-center h-10 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  <button onClick={() => setPersonas(p => Math.max(8, p - 8))} className="h-full px-3 text-[#B8B8CC]">−</button>
                  <span className="flex-1 text-center text-white text-xs font-bold font-mono-num">{personas} jug.</span>
                  <button onClick={() => setPersonas(p => p + 8)} className="h-full px-3 text-[#B8B8CC]">+</button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FRANJAS.map(fr => (
                  <button key={fr} onClick={() => setFranja(fr)}
                    className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border transition-all ${franja === fr ? 'bg-[#B6FF3A]/15 text-[#B6FF3A] border-[#B6FF3A]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{fr}</button>
                ))}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {JUEGOS_LIST.slice(0, 6).map(j => (
                  <button key={j.id} onClick={() => setJuego(j.id)}
                    className="px-2.5 h-8 rounded-lg text-[11px] font-bold border transition-all"
                    style={juego === j.id ? { background: `${j.color}22`, color: j.color, borderColor: `${j.color}77` } : { background: 'rgba(255,255,255,0.04)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.08)' }}>
                    {j.corto}
                  </button>
                ))}
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[#8B8BA8] font-semibold mb-1">¿Qué pone el local?</p>
                <div className="flex flex-wrap gap-1.5">
                  {RECURSOS.map(r => (
                    <button key={r} onClick={() => setRecursos(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])}
                      className={`px-2.5 h-8 rounded-lg text-[11px] font-bold border transition-all ${recursos.includes(r) ? 'bg-[#4F8EF7]/15 text-[#7FB0FF] border-[#4F8EF7]/50' : 'bg-white/4 text-[#B8B8CC] border-white/10'}`}>{r}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-semibold">
                  <span className="text-[#8B8BA8]">Reparto de entradas propuesto</span>
                  <span className="text-white font-mono-num normal-case">TO {repartoTO}% · Local {100 - repartoTO}%</span>
                </div>
                <input type="range" min={40} max={90} step={5} value={repartoTO} onChange={e => setRepartoTO(Number(e.target.value))}
                  className="mt-1 w-full accent-[#B6FF3A]" aria-label="Reparto para el TO" />
                <p className="text-[10px] text-[#6B6B85]">Cuantos más recursos pongas tú, más % te llevas. El local puede contraofertar.</p>
              </div>
              <div className="flex gap-2">
                <button onClick={enviar} className="flex-1 h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold">Enviar petición</button>
                <button onClick={() => setPidiendo(false)} className="h-10 px-3 rounded-xl bg-white/8 text-[#B8B8CC] text-sm font-semibold">Cancelar</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 flex gap-2">
              <button onClick={() => setPidiendo(true)} className="flex-1 h-10 rounded-xl bg-[#B6FF3A] text-[#0A0A0F] text-sm font-bold inline-flex items-center justify-center gap-1.5">
                <CalendarClock size={15} /> Pedir fecha
              </button>
              <button onClick={() => setVerFicha(true)} className="h-10 px-3.5 rounded-xl bg-white/8 border border-white/10 text-white text-sm font-semibold inline-flex items-center gap-1.5">
                <Eye size={14} /> Ficha
              </button>
            </div>
          )}
          <p className="mt-2 text-[10px] text-[#6B6B85]">La sede recibe tu petición en su panel y te responde con confirmación o contraoferta. Con el juego: {JUEGOS[juego]?.corto}.</p>
        </div>
      </div>
      {verFicha && <MiniLocal local={local} onClose={() => setVerFicha(false)} />}
    </div>
  )
}
