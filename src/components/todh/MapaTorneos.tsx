'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { LOCALES, JUEGOS, getLocal, type TorneoSample, type Local } from '@/lib/torneos/sample'
import { torneosEfectivos } from '@/lib/torneos/efectivos'
import { useDemoStore, useEsTO } from '@/lib/stores/useDemoStore'
import { TorneoArt } from '@/components/todh/GameKeyart'
import { useT } from '@/lib/i18n'
import { MiniLocal } from '@/components/todh/MiniLocal'
import { GameIcon } from '@/components/todh/GameIcon'

// Torneos REALES de España (start.gg) pintados en el mapa con sus coordenadas.
const JUEGOS_SGG = ['smash', 'sf6', 'tekken'] as const
type TorneoReal = {
  juego: string; nombre: string; url: string; ciudad: string; sede: string
  fecha: number | null; asistentes: number; lat: number; lng: number
}
import { Calendar, Users, X, Star, ChevronRight } from '@/components/todh/iconosTorneum'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// UN PIN POR LOCAL, clavado a su coordenada exacta (como el mapa de Rumbo): nada
// de separar torneos con offsets, que hacían que los pines "flotaran" sobre calles
// distintas según el zoom. Los torneos del local se listan en la hoja inferior.

export default function MapaTorneos() {
  const { t: tr } = useT()
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const creados = useDemoStore(s => s.creados)
  const editados = useDemoStore(s => s.editados)
  const cancelados = useDemoStore(s => s.cancelados)
  const ocultos = useDemoStore(s => s.juegosOcultos)
  const [juego, setJuego] = useState<string | null>(null)
  const [selLocal, setSelLocal] = useState<string | null>(null)
  // Con rol de TO, el mapa enseña además la capa de organizador (sedes
  // disponibles sin torneos y condiciones de alquiler).
  const esTO = useEsTO()
  const [reales, setReales] = useState<TorneoReal[]>([])
  const [selReal, setSelReal] = useState<TorneoReal | null>(null)

  // Próximos reales de España (start.gg) con coordenadas, los 3 juegos a la vez
  useEffect(() => {
    let vivo = true
    Promise.all(JUEGOS_SGG.map(j =>
      fetch(`/api/startgg/proximos?juego=${j}`)
        .then(r => (r.ok ? r.json() : null))
        .then(d => (d?.torneos ?? []).map((t: Omit<TorneoReal, 'juego'>) => ({ ...t, juego: j })))
        .catch(() => [])
    )).then(listas => {
      if (vivo) setReales(listas.flat().filter((t: TorneoReal) => t.lat != null && t.lng != null))
    })
    return () => { vivo = false }
  }, [])
  const realesVisibles = useMemo(() => (juego ? reales.filter(r => r.juego === juego) : reales), [reales, juego])

  // Torneos presenciales agrupados por local
  const porLocal = useMemo(() => {
    const filtrados = torneosEfectivos(creados, editados, cancelados).filter(t => t.localId && !t.online && !ocultos.includes(t.juego) && (!juego || t.juego === juego))
    const grupos = new Map<string, TorneoSample[]>()
    for (const t of filtrados) {
      if (!LOCALES[t.localId!]) continue
      grupos.set(t.localId!, [...(grupos.get(t.localId!) ?? []), t])
    }
    return grupos
  }, [creados, editados, cancelados, juego, ocultos])
  const nTorneos = useMemo(() => [...porLocal.values()].reduce((a, ts) => a + ts.length, 0), [porLocal])


  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: [-3.703, 40.432],
      zoom: 12.2,
      attributionControl: false,
    })
    mapRef.current = map
    // El contenedor puede medir 0px en el primer frame → forzar resize cuando ya tiene tamaño.
    map.on('load', () => map.resize())
    const t1 = setTimeout(() => map.resize(), 120)
    const t2 = setTimeout(() => map.resize(), 500)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)
    return () => { clearTimeout(t1); clearTimeout(t2); ro.disconnect(); map.remove(); mapRef.current = null }
  }, [])

  // Marcadores: uno por local, en su coordenada exacta
  const markersRef = useRef<mapboxgl.Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    for (const [localId, torneos] of porLocal) {
      const l = LOCALES[localId]
      const sel = localId === selLocal
      const live = torneos.some(t => t.enDirecto)
      // Medallón del LOCAL: aro de su color, inicial dentro, contador de torneos.
      const el = document.createElement('button')
      el.className = 'todh-pin'
      el.setAttribute('aria-label', `${l.nombre} · ${torneos.length} torneos`)
      el.style.cssText = `width:46px;height:54px;cursor:pointer;background:none;border:none;padding:0;z-index:${sel ? 5 : 1};`

      const wrap = document.createElement('span')
      wrap.style.cssText = 'position:absolute;inset:0;transform-origin:50% 100%;'

      const tail = document.createElement('span')
      tail.style.cssText = `position:absolute;left:50%;bottom:2px;width:12px;height:12px;background:linear-gradient(135deg,#171A24,#0D0F15);border-right:2px solid ${l.color};border-bottom:2px solid ${l.color};transform:translateX(-50%) rotate(45deg);border-radius:0 0 3px 0;`
      wrap.appendChild(tail)

      const body = document.createElement('span')
      body.style.cssText = `position:absolute;top:0;left:3px;width:40px;height:40px;border-radius:50%;background:radial-gradient(120% 120% at 32% 24%, #232634 0%, #0D0F15 72%);border:2px solid ${l.color};box-shadow:0 8px 18px rgba(0,0,0,.5), 0 0 0 ${sel ? 5 : 3}px ${l.color}${sel ? '33' : '1F'}, inset 0 1px 0 rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;transition:transform .16s cubic-bezier(.34,1.56,.64,1);transform:scale(${sel ? 1.12 : 1});`
      const inner = document.createElement('span')
      inner.textContent = l.nombre[0]
      inner.style.cssText = `font-size:17px;line-height:1;font-weight:900;color:${l.color};text-shadow:0 1px 2px rgba(0,0,0,.55);`
      body.appendChild(inner)

      if (torneos.length > 1) {
        const badge = document.createElement('span')
        badge.textContent = String(torneos.length)
        badge.style.cssText = `position:absolute;top:-5px;right:-6px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#B6FF3A;color:#0A0A0F;font-size:11px;font-weight:900;display:flex;align-items:center;justify-content:center;border:2px solid #0D0F15;`
        body.appendChild(badge)
      }
      if (live) {
        const ring = document.createElement('span')
        ring.style.cssText = 'position:absolute;top:-4px;left:-4px;width:48px;height:48px;border-radius:50%;border:2px solid #FF3D71;animation:pulse-heat 1.5s ease-in-out infinite;pointer-events:none;'
        body.appendChild(ring)
      }
      wrap.appendChild(body)
      el.appendChild(wrap)
      el.onmouseenter = () => { body.style.transform = 'scale(1.14)' }
      el.onmouseleave = () => { body.style.transform = `scale(${localId === selLocal ? 1.12 : 1})` }
      el.onclick = (e) => { e.stopPropagation(); setSelLocal(localId); map.flyTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 14.5), offset: [0, -140] }) }
      const m = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat([l.lng, l.lat]).addTo(map)
      markersRef.current.push(m)
    }

    // Capa TO: sedes disponibles (sin torneos publicados) con aro discontinuo.
    // El jugador no las ve; al TO le enseñan dónde puede organizar.
    if (esTO) {
      for (const l of Object.values(LOCALES)) {
        if (porLocal.has(l.id)) continue
        const sel = l.id === selLocal
        const el = document.createElement('button')
        el.className = 'todh-pin'
        el.setAttribute('aria-label', `${l.nombre} · sede disponible`)
        el.style.cssText = `width:38px;height:38px;cursor:pointer;background:none;border:none;padding:0;z-index:${sel ? 5 : 1};`
        const body = document.createElement('span')
        body.style.cssText = `position:absolute;inset:0;border-radius:50%;background:radial-gradient(120% 120% at 32% 24%, #1E2230 0%, #0D0F15 75%);border:2px dashed ${l.color};box-shadow:0 6px 14px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s;transform:scale(${sel ? 1.12 : 1});`
        const inner = document.createElement('span')
        inner.textContent = l.nombre[0]
        inner.style.cssText = `font-size:14px;line-height:1;font-weight:900;color:${l.color};opacity:.85;`
        body.appendChild(inner)
        el.appendChild(body)
        el.onmouseenter = () => { body.style.transform = 'scale(1.14)' }
        el.onmouseleave = () => { body.style.transform = `scale(${l.id === selLocal ? 1.12 : 1})` }
        el.onclick = (e) => { e.stopPropagation(); setSelLocal(l.id); map.flyTo({ center: [l.lng, l.lat], zoom: Math.max(map.getZoom(), 14.5), offset: [0, -140] }) }
        const m = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([l.lng, l.lat]).addTo(map)
        markersRef.current.push(m)
      }
    }
  }, [porLocal, selLocal, esTO])

  // Pines de torneos REALES (start.gg): punto pequeño con aro discontinuo azul
  const markersRealesRef = useRef<mapboxgl.Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRealesRef.current.forEach(m => m.remove())
    markersRealesRef.current = []
    for (const t of realesVisibles) {
      const color = JUEGOS[t.juego]?.color ?? '#6E9BFF'
      const el = document.createElement('button')
      el.setAttribute('aria-label', `${t.nombre} (start.gg)`)
      el.style.cssText = 'width:26px;height:26px;cursor:pointer;background:none;border:none;padding:0;'
      const dot = document.createElement('span')
      dot.style.cssText = `position:absolute;inset:0;border-radius:50%;background:radial-gradient(120% 120% at 32% 24%, #1B2540 0%, #0D1220 75%);border:2px dashed #6E9BFF;box-shadow:0 4px 12px rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;transition:transform .15s;`
      const inner = document.createElement('span')
      inner.style.cssText = `width:8px;height:8px;border-radius:50%;background:${color};`
      dot.appendChild(inner)
      el.appendChild(dot)
      el.onmouseenter = () => { dot.style.transform = 'scale(1.25)' }
      el.onmouseleave = () => { dot.style.transform = 'scale(1)' }
      el.onclick = (e) => {
        e.stopPropagation()
        setSelLocal(null)
        setSelReal(t)
        map.flyTo({ center: [t.lng, t.lat], zoom: Math.max(map.getZoom(), 10), offset: [0, -120] })
      }
      const m = new mapboxgl.Marker({ element: el, anchor: 'center' }).setLngLat([t.lng, t.lat]).addTo(map)
      markersRealesRef.current.push(m)
    }
  }, [realesVisibles])

  // Encuadre España: enseña de golpe toda la escena real + los locales demo
  const verEspana = () => {
    const map = mapRef.current
    if (!map || !realesVisibles.length) return
    setSelLocal(null); setSelReal(null)
    const b = new mapboxgl.LngLatBounds()
    realesVisibles.forEach(t => b.extend([t.lng, t.lat]))
    Object.values(LOCALES).forEach(l => b.extend([l.lng, l.lat]))
    map.fitBounds(b, { padding: { top: 140, bottom: 80, left: 40, right: 40 }, maxZoom: 7 })
  }

  const localSel = selLocal ? getLocal(selLocal) : null
  const torneosSel = selLocal ? porLocal.get(selLocal) ?? [] : []

  return (
    <div className="relative w-full overflow-hidden h-[calc(100dvh-4rem)] lg:h-full">
      <div ref={containerRef} className="absolute inset-0 h-full w-full" onClick={() => { setSelLocal(null); setSelReal(null) }} />

      {/* Cabecera */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-5 safe-top pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="glass-strong rounded-2xl px-3.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B6FF3A] font-bold">{esTO ? tr('mt.tituloTO') : tr('mt.titulo')}</p>
            <p className="text-sm font-bold text-white">
              <span className="font-mono-num">{nTorneos}</span> {tr('mt.en')} <span className="font-mono-num">{porLocal.size}</span> {tr('mt.locales')}
              {esTO && <span className="text-[#8B8BA8] font-semibold"> · <span className="font-mono-num">{Object.keys(LOCALES).length - porLocal.size}</span> {tr('mt.sedesLibres')}</span>}
            </p>
          </div>
          {realesVisibles.length > 0 && (
            <button onClick={verEspana} className="glass-strong rounded-2xl px-3.5 py-2 text-left hover:bg-white/10 transition-colors">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[#6E9BFF] font-bold flex items-center gap-1.5"><span className="dot-live" /> start.gg</p>
              <p className="text-sm font-bold text-white"><span className="font-mono-num">{realesVisibles.length}</span> {tr('mt.realesVer')}</p>
            </button>
          )}
        </div>
        {/* Chips de juego */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
          <button onClick={() => setJuego(null)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-bold transition-all ${!juego ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-[#B8B8CC]'}`}>{tr('mt.todos')}</button>
          {Object.values(JUEGOS).filter(j => !ocultos.includes(j.id)).map(j => {
            const on = juego === j.id
            return (
              <button key={j.id} onClick={() => setJuego(on ? null : j.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={on ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` } : { background: 'rgba(12,14,19,0.7)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.1)' }}>
                <GameIcon juegoId={j.id} size={13} /> {j.corto}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hoja inferior: el local seleccionado y sus torneos */}
      {localSel && <LocalSheet local={localSel} torneos={torneosSel} esTO={esTO} onClose={() => setSelLocal(null)} />}
      {selReal && !localSel && <RealSheet t={selReal} onClose={() => setSelReal(null)} />}
    </div>
  )
}

// Hoja de un torneo REAL de start.gg: info esencial + enlace fuera. Es la
// comunidad a captar — todavía no usa Torneum y se dice tal cual.
function RealSheet({ t, onClose }: { t: TorneoReal; onClose: () => void }) {
  const { t: tr, idioma } = useT()
  const j = JUEGOS[t.juego]
  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-slide-up-sm lg:max-w-md">
      <div className="ring-grad card-premium relative overflow-hidden rounded-2xl shadow-2xl border border-[#6E9BFF]/30">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white"><X size={14} /></button>
        <div className="p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${j?.color ?? '#6E9BFF'}1F`, color: j?.color ?? '#6E9BFF', border: `1px solid ${j?.color ?? '#6E9BFF'}44` }}><GameIcon juegoId={t.juego} size={12} color={j?.color ?? '#6E9BFF'} /> {j?.corto ?? t.juego}</span>
            <span className="px-2 h-6 inline-flex items-center rounded-full text-[10px] font-black uppercase tracking-wide bg-[#6E9BFF]/12 text-[#6E9BFF] border border-[#6E9BFF]/40">start.gg</span>
          </div>
          <p className="text-[15px] font-bold text-white leading-snug">{t.nombre}</p>
          <p className="mt-1 text-[12px] text-[#8B8BA8]">
            {t.fecha ? new Date(t.fecha).toLocaleDateString(idioma === 'ja' ? 'ja-JP' : idioma === 'en' ? 'en-GB' : 'es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) : tr('mt.fechaPorAnunciar')}
            {' · '}{t.ciudad || tr('ranking.espana')}{t.sede ? ` · ${t.sede}` : ''} · <span className="font-mono-num text-[#B8B8CC]">{t.asistentes}</span> {tr('sgg.apuntados')}
          </p>
          <a href={t.url} target="_blank" rel="noopener noreferrer"
            className="mt-3 w-full h-11 rounded-xl bg-[#6E9BFF] text-[#0A0A0F] text-sm font-bold flex items-center justify-center gap-1.5">
            {tr('mt.verStartgg')} ↗
          </a>
          <p className="mt-2 text-[10px] text-[#8B8BA8] text-center">{tr('mt.noUsaTorneum')}</p>
        </div>
      </div>
    </div>
  )
}

function LocalSheet({ local, torneos, esTO, onClose }: { local: Local; torneos: TorneoSample[]; esTO: boolean; onClose: () => void }) {
  const { t: tr } = useT()
  const [verSede, setVerSede] = useState(false)
  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-slide-up-sm lg:max-w-md">
      <div className="ring-grad card-premium relative overflow-hidden rounded-2xl shadow-2xl">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-2.5 right-2.5 z-10 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white"><X size={14} /></button>

        {/* Local */}
        <button onClick={() => setVerSede(true)} className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-white/[0.03] transition-colors">
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-[#0A0A0F] font-black text-lg shrink-0" style={{ background: local.color }}>{local.nombre[0]}</span>
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-white truncate">{local.nombre}</p>
            <p className="text-[11px] text-[#8B8BA8]">{local.zona} · {local.setups} setups · <span className="inline-flex items-center gap-0.5 text-[#E0BE63]"><Star size={9} className="fill-[#E0BE63]" /> {local.rating}</span></p>
          </div>
          <span className="text-[11px] font-bold text-[#B6FF3A] shrink-0 mr-6">{tr('mt.verSede')} ›</span>
        </button>

        {/* Condiciones para organizar: SOLO las ve el TO (el jugador, jamás) */}
        {esTO && (
          <div className="mx-3.5 mb-3 flex items-center gap-2 rounded-xl bg-[#B6FF3A]/8 border border-[#B6FF3A]/25 px-3 py-2">
            <p className="flex-1 text-[11px] font-semibold text-[#D4D4E4]">
              {tr('mt.desde')} <span className="text-[#B6FF3A] font-bold font-mono-num">{local.precioNoche}€</span>/{tr('ml.noche')} · {tr('msd.aforo')} <span className="font-mono-num">{local.aforo}</span> · <span className="font-mono-num">{local.m2}</span> m²
            </p>
            <Link href={`/local/${local.id}`} className="shrink-0 h-7 px-2.5 rounded-lg bg-[#B6FF3A] text-[#0A0A0F] text-[11px] font-bold flex items-center">{tr('msd.pedirFecha')}</Link>
          </div>
        )}

        {/* Torneos del local */}
        <div className="border-t border-white/6 max-h-56 overflow-y-auto">
          {torneos.length === 0 && (
            <p className="px-4 py-3 text-[12px] text-[#8B8BA8]">{tr('mt.sinTorneosSede')}</p>
          )}
          {torneos.map(t => {
            const j = JUEGOS[t.juego]
            return (
              <Link key={t.id} href={`/torneo/${t.id}`} className="flex items-stretch gap-0 border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors">
                <TorneoArt t={t} className="w-[64px] shrink-0" />
                <div className="flex-1 min-w-0 px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1 px-1.5 h-5 rounded-full text-[9px] font-bold" style={{ background: `${j?.color}1F`, color: j?.color, border: `1px solid ${j?.color}44` }}><GameIcon juegoId={t.juego} size={10} /> {j?.corto}</span>
                    {t.enDirecto && <span className="badge-live">Live</span>}
                  </div>
                  <p className="mt-0.5 text-[13px] font-bold text-white truncate">{t.nombre}</p>
                  <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[#A0A0B8]">
                    <span className="inline-flex items-center gap-1"><Calendar size={10} className="text-[#B6FF3A]" /> {t.fechaLabel}</span>
                    <span className="inline-flex items-center gap-1"><Users size={10} /> <span className="font-mono-num">{t.inscritos}/{t.plazas}</span></span>
                    <span className="ml-auto font-bold text-white font-mono-num text-[11px]">{t.bote ? `${t.bote}€` : t.precio === 0 ? 'Free' : `${t.precio}€`}</span>
                  </div>
                </div>
                <span className="self-center pr-2 text-[#6B6B85]"><ChevronRight size={15} /></span>
              </Link>
            )
          })}
        </div>
      </div>
      {verSede && <MiniLocal local={local} onClose={() => setVerSede(false)} />}
    </div>
  )
}
