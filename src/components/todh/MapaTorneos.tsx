'use client'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { TORNEOS_SAMPLE, LOCALES, JUEGOS, getTorneo, type TorneoSample } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'
import { TorneoArt } from '@/components/todh/GameKeyart'
import { Calendar, Users, X, Radio } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// Pequeño desplazamiento determinista para separar varios torneos en el mismo local.
function jitter(localId: string, i: number): [number, number] {
  const l = LOCALES[localId]
  if (!l) return [-3.7038, 40.4262]
  const a = (i % 4) * (Math.PI / 2) + (i * 0.7)
  const r = i === 0 ? 0 : 0.0016 + (i % 3) * 0.0009
  return [l.lng + Math.cos(a) * r, l.lat + Math.sin(a) * r]
}

export default function MapaTorneos() {
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const creados = useDemoStore(s => s.creados)
  const [juego, setJuego] = useState<string | null>(null)
  const [selId, setSelId] = useState<string | null>(null)

  const presenciales = useMemo(
    () => [...creados, ...TORNEOS_SAMPLE].filter(t => t.localId && !t.online && (!juego || t.juego === juego)),
    [creados, juego],
  )
  const sel = selId ? getTorneo(selId) || creados.find(c => c.id === selId) : null

  // Los pines quedan anclados a su coordenada y ESCALAN con el zoom (pequeños al
  // alejar, grandes al acercar), en vez de tener tamaño fijo de pantalla. Se escala
  // un wrapper interno con origen en la punta para no pisar el translate de Mapbox.
  const wrapsRef = useRef<HTMLSpanElement[]>([])
  const applyZoom = useCallback(() => {
    const map = mapRef.current
    if (!map) return
    const z = map.getZoom()
    const s = Math.max(0.5, Math.min(1.2, 0.55 + (z - 10) * 0.16))
    wrapsRef.current.forEach(w => { w.style.transform = `scale(${s})` })
  }, [])

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
    map.on('load', () => { map.resize(); applyZoom() })
    map.on('zoom', applyZoom)
    const t1 = setTimeout(() => map.resize(), 120)
    const t2 = setTimeout(() => map.resize(), 500)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)
    return () => { clearTimeout(t1); clearTimeout(t2); ro.disconnect(); map.remove(); mapRef.current = null }
  }, [applyZoom])

  // Marcadores
  const markersRef = useRef<mapboxgl.Marker[]>([])
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    wrapsRef.current = []
    presenciales.forEach((t, i) => {
      const j = JUEGOS[t.juego]
      const sel = t.id === selId
      // Medallón circular tipo "moneda": fondo glass oscuro, aro del color del juego,
      // emoji del juego centrado, punta inferior limpia. Más elegante que la gota plana.
      const el = document.createElement('button')
      el.className = 'todh-pin'
      el.style.cssText = `position:relative;width:42px;height:50px;cursor:pointer;background:none;border:none;padding:0;z-index:${sel ? 5 : 1};`

      // Wrapper que escala con el zoom (origen en la punta, que es el ancla real).
      const wrap = document.createElement('span')
      wrap.style.cssText = 'position:absolute;inset:0;transform-origin:50% 100%;transition:transform .12s ease-out;'

      // Punta inferior (tip): rombo recortado que apunta a la coordenada.
      const tail = document.createElement('span')
      tail.style.cssText = `position:absolute;left:50%;bottom:2px;width:12px;height:12px;background:linear-gradient(135deg,#171A24,#0C0E13);border-right:2px solid ${j.color};border-bottom:2px solid ${j.color};transform:translateX(-50%) rotate(45deg);border-radius:0 0 3px 0;`
      wrap.appendChild(tail)

      // Cuerpo: círculo glass con aro del color del juego + halo suave.
      const body = document.createElement('span')
      body.style.cssText = `position:absolute;top:0;left:1px;width:40px;height:40px;border-radius:50%;background:radial-gradient(120% 120% at 32% 24%, #232634 0%, #0C0E13 72%);border:2px solid ${j.color};box-shadow:0 8px 18px rgba(0,0,0,.5), 0 0 0 ${sel ? 5 : 3}px ${j.color}${sel ? '33' : '1F'}, inset 0 1px 0 rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;transition:transform .16s cubic-bezier(.34,1.56,.64,1);transform:scale(${sel ? 1.12 : 1});`
      const inner = document.createElement('span')
      inner.textContent = j.emoji || j.corto[0]
      inner.style.cssText = 'font-size:19px;line-height:1;filter:drop-shadow(0 1px 2px rgba(0,0,0,.55));'
      body.appendChild(inner)

      if (t.enDirecto) {
        const ring = document.createElement('span')
        ring.style.cssText = 'position:absolute;top:-4px;left:-3px;width:46px;height:46px;border-radius:50%;border:2px solid #FF3D71;animation:pulse-heat 1.5s ease-in-out infinite;pointer-events:none;'
        body.appendChild(ring)
      }
      wrap.appendChild(body)
      el.appendChild(wrap)
      wrapsRef.current.push(wrap)
      el.onmouseenter = () => { body.style.transform = 'scale(1.14)' }
      el.onmouseleave = () => { body.style.transform = `scale(${t.id === selId ? 1.12 : 1})` }
      el.onclick = (e) => { e.stopPropagation(); setSelId(t.id); map.flyTo({ center: jitter(t.localId!, i), zoom: 13.5, offset: [0, -120] }) }
      const m = new mapboxgl.Marker({ element: el, anchor: 'bottom' }).setLngLat(jitter(t.localId!, i)).addTo(map)
      markersRef.current.push(m)
    })
    applyZoom()
  }, [presenciales, selId, applyZoom])

  return (
    <div className="relative w-full overflow-hidden" style={{ height: 'calc(100dvh - 4rem)' }}>
      <div ref={containerRef} className="absolute inset-0 h-full w-full" onClick={() => setSelId(null)} />

      {/* Cabecera */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-5 safe-top pointer-events-none">
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="glass-strong rounded-2xl px-3.5 py-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#B6FF3A] font-bold">Mapa de torneos</p>
            <p className="text-sm font-bold text-white"><span className="font-mono-num">{presenciales.length}</span> cerca de ti</p>
          </div>
        </div>
        {/* Chips de juego */}
        <div className="mt-3 flex items-center gap-2 overflow-x-auto scrollbar-hide pointer-events-auto pb-1">
          <button onClick={() => setJuego(null)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-bold transition-all ${!juego ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-[#B8B8CC]'}`}>Todos</button>
          {Object.values(JUEGOS).map(j => {
            const on = juego === j.id
            return (
              <button key={j.id} onClick={() => setJuego(on ? null : j.id)}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition-all border"
                style={on ? { background: `${j.color}26`, color: j.color, borderColor: `${j.color}88` } : { background: 'rgba(12,14,19,0.7)', color: '#B8B8CC', borderColor: 'rgba(255,255,255,0.1)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: j.color }} /> {j.corto}
              </button>
            )
          })}
        </div>
      </div>

      {/* Hoja inferior con el torneo seleccionado */}
      {sel && <MapSheet t={sel} onClose={() => setSelId(null)} />}
    </div>
  )
}

function MapSheet({ t, onClose }: { t: TorneoSample; onClose: () => void }) {
  const juego = JUEGOS[t.juego]
  return (
    <div className="absolute bottom-4 left-3 right-3 z-20 animate-slide-up-sm">
      <div className="ring-grad card-premium relative overflow-hidden rounded-2xl flex items-stretch shadow-2xl">
        <button onClick={onClose} aria-label="Cerrar" className="absolute top-2 right-2 z-10 h-7 w-7 rounded-full bg-black/40 flex items-center justify-center text-white"><X size={14} /></button>
        <TorneoArt t={t} className="w-[84px] shrink-0" />
        <Link href={`/torneo/${t.id}`} className="flex-1 p-3.5 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2 h-6 rounded-full text-[10px] font-bold" style={{ background: `${juego.color}1F`, color: juego.color, border: `1px solid ${juego.color}44` }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: juego.color }} /> {juego.corto}
            </span>
            {t.enDirecto && <span className="badge-live">Live</span>}
          </div>
          <p className="font-bold text-white text-display tracking-tight text-[15px] leading-snug truncate pr-6">{t.nombre}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-[#A0A0B8]">
            <span className="inline-flex items-center gap-1 text-white"><Calendar size={11} className="text-[#B6FF3A]" /> {t.fechaLabel}</span>
            <span className="text-[#3A3A4A]">·</span>
            <span className="truncate">{t.local}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="inline-flex items-center gap-1 text-[11px] text-[#8B8BA8]"><Users size={10} /> <span className="font-mono-num text-[#B8B8CC]">{t.inscritos}/{t.plazas}</span></span>
            <span className="text-[13px] font-bold text-white font-mono-num">{t.bote ? `${t.bote}€` : t.precio === 0 ? 'Free' : `${t.precio}€`}</span>
          </div>
        </Link>
      </div>
    </div>
  )
}
