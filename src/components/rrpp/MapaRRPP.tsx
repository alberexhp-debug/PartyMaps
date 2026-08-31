'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { supabase } from '@/lib/supabase/client'
import type { Local, TipoLocal } from '@/types'
import { aforoVisible, getLabelTipoLocal, formatearPrecio } from '@/lib/utils'
import { X, MapPin, Check, Clock } from '@/components/todh/iconosTorneum'
import { Handshake, Crosshair } from 'lucide-react'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MADRID_CENTER: [number, number] = [-3.7038, 40.4168]
const SOURCE_ID = 'rrpp-locales'
const HEATMAP_LAYER = 'rrpp-heat'
const HALO_LAYER = 'rrpp-halo'
const CORE_LAYER = 'rrpp-core'
const LABEL_LAYER = 'rrpp-label'

const COLOR_POR_TIPO: Record<TipoLocal | 'otro', string> = {
  discoteca: '#B6FF3A', bar_copas: '#4F8EF7', rooftop: '#9B7BE8',
  sala_conciertos: '#3FB27F', bar_cocteleria: '#D4A84B', otro: '#8B8BA8',
}
const TIPO_COLOR: mapboxgl.Expression = [
  'match', ['get', 'tipo'],
  'discoteca', COLOR_POR_TIPO.discoteca, 'bar_copas', COLOR_POR_TIPO.bar_copas,
  'rooftop', COLOR_POR_TIPO.rooftop, 'sala_conciertos', COLOR_POR_TIPO.sala_conciertos,
  'bar_cocteleria', COLOR_POR_TIPO.bar_cocteleria, COLOR_POR_TIPO.otro,
]

type Estado = 'activa' | 'pendiente' | 'pausada' | 'solicitada' | null

function buildGeoJSON(locales: Local[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: locales.filter(l => l.latitud && l.longitud).map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.longitud, l.latitud] },
      properties: {
        id: l.id, nombre: l.nombre, aforo: aforoVisible(l),
        tipo: l.tipo_local || 'otro',
        destacado: l.tier === 'destacado' || l.tier === 'pro' ? 1 : 0,
        top: l.tier === 'destacado' ? 1 : 0,
      },
    })),
  }
}

export default function MapaRRPP() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [locales, setLocales] = useState<Local[]>([])
  const [loaded, setLoaded] = useState(false)
  const [sel, setSel] = useState<Local | null>(null)
  // estado del RRPP frente a cada local
  const estados = useRef<Map<string, Estado>>(new Map())
  const [tick, setTick] = useState(0) // fuerza refresco del sheet

  const cargarEstados = useCallback(async () => {
    const r = await fetch('/api/rrpp/interes')
    if (!r.ok) return
    const j = await r.json()
    const m = new Map<string, Estado>()
    for (const v of j.venues ?? []) m.set(v.local_id, v.estado)
    for (const s of j.solicitudes ?? []) if (s.estado === 'pendiente' && !m.has(s.local_id)) m.set(s.local_id, 'solicitada')
    estados.current = m
    setTick(t => t + 1)
  }, [])

  const cargarLocales = useCallback(async () => {
    const { data } = await supabase.from('locales').select('*').eq('estado', 'activo').limit(300)
    if (data) setLocales(data as Local[])
  }, [])

  useEffect(() => { cargarLocales(); cargarEstados() }, [cargarLocales, cargarEstados])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    const map = new mapboxgl.Map({
      container: mapContainerRef.current, style: 'mapbox://styles/mapbox/dark-v11',
      center: MADRID_CENTER, zoom: 12.5, attributionControl: false, antialias: true,
    })
    map.on('load', () => {
      try {
        for (const layer of map.getStyle().layers || []) {
          if (layer.type === 'line') { try { map.setPaintProperty(layer.id, 'line-opacity', 0.3) } catch {} }
          if (layer.type === 'fill') { try { map.setPaintProperty(layer.id, 'fill-opacity', 0.5) } catch {} }
        }
      } catch {}
      map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
      map.addLayer({
        id: HEATMAP_LAYER, type: 'heatmap', source: SOURCE_ID, maxzoom: 16,
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aforo'], 0, 0.35, 100, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.9, 14, 2.2],
          'heatmap-color': ['interpolate', ['linear'], ['heatmap-density'],
            0, 'rgba(10,10,24,0)', 0.3, 'rgba(99,102,180,0.12)', 0.6, 'rgba(124,110,200,0.20)', 1, 'rgba(150,140,220,0.28)'],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 14, 42],
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 11, 0.3, 13.5, 0],
        },
      })
      map.addLayer({
        id: HALO_LAYER, type: 'circle', source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            9, ['interpolate', ['linear'], ['get', 'aforo'], 0, 7, 100, 16],
            13, ['interpolate', ['linear'], ['get', 'aforo'], 0, 15, 100, 34],
            16, ['interpolate', ['linear'], ['get', 'aforo'], 0, 24, 100, 56]],
          'circle-color': TIPO_COLOR, 'circle-blur': 1,
          'circle-opacity': ['interpolate', ['linear'], ['get', 'aforo'], 0, 0.16, 50, 0.3, 100, 0.5],
        },
      })
      map.addLayer({
        id: CORE_LAYER, type: 'circle', source: SOURCE_ID,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'],
            9, ['case', ['==', ['get', 'destacado'], 1], 3, 2],
            14, ['case', ['==', ['get', 'destacado'], 1], 5.5, 3.5]],
          'circle-color': TIPO_COLOR, 'circle-opacity': 0.95,
          'circle-stroke-color': '#FFFFFF',
          'circle-stroke-width': ['case', ['==', ['get', 'destacado'], 1], 2, 1],
          'circle-stroke-opacity': ['case', ['==', ['get', 'destacado'], 1], 0.9, 0.5],
        },
      })
      map.addLayer({
        id: LABEL_LAYER, type: 'symbol', source: SOURCE_ID, minzoom: 13,
        layout: {
          'text-field': ['get', 'nombre'],
          'text-font': ['literal', ['Open Sans Semibold', 'Arial Unicode MS Bold']],
          'text-size': 11, 'text-offset': [0, 1.4], 'text-anchor': 'top', 'text-max-width': 8,
        },
        paint: {
          'text-color': '#D7D7E2', 'text-halo-color': 'rgba(6,6,12,0.95)', 'text-halo-width': 1.3,
          'text-opacity': ['interpolate', ['linear'], ['zoom'], 13.3, 0, 14.5, 0, 15.3, 1],
        },
      })
      const setP = () => { map.getCanvas().style.cursor = 'pointer' }
      const unP = () => { map.getCanvas().style.cursor = '' }
      map.on('mouseenter', CORE_LAYER, setP); map.on('mouseleave', CORE_LAYER, unP)
      map.on('mouseenter', HALO_LAYER, setP); map.on('mouseleave', HALO_LAYER, unP)
      map.on('click', (e) => {
        const f = map.queryRenderedFeatures(e.point, { layers: [CORE_LAYER, HALO_LAYER] })
        if (!f.length) { setSel(null); return }
        const id = f[0].properties?.id
        // Buscamos en el último estado de locales (closure-safe vía setter)
        setLocales(prev => { const l = prev.find(x => x.id === id); if (l) { setSel(l); map.flyTo({ center: [l.longitud, l.latitud], zoom: Math.max(map.getZoom(), 14), duration: 500 }) } return prev })
      })
      setLoaded(true)
      cargarLocales()
    })
    mapRef.current = map
    return () => { map.remove(); mapRef.current = null; setLoaded(false) }
  }, [cargarLocales])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loaded) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildGeoJSON(locales))
  }, [locales, loaded])

  const centrar = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation?.getCurrentPosition(
      pos => mapRef.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 14, duration: 700 }),
      () => {},
    )
  }, [])

  return (
    <div className="fixed inset-0 pb-16">
      <div ref={mapContainerRef} className="w-full h-full" />
      <div className="absolute top-0 left-0 right-0 h-24 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(6,6,12,0.85) 0%, transparent 100%)' }} />
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-2.5 safe-top">
        <div className="w-9 h-9 rounded-xl holo-bg flex items-center justify-center shrink-0">
          <span className="text-[10px] font-black text-white">T</span>
        </div>
        <div className="flex-1 glass-strong rounded-xl px-3.5 h-10 flex items-center text-sm text-white font-semibold">
          Descubrir locales
        </div>
        <button onClick={centrar} aria-label="Centrar mapa" className="w-10 h-10 glass-strong rounded-xl flex items-center justify-center text-[#A0A0B8] hover:text-white">
          <Crosshair size={16} />
        </button>
      </div>

      {sel && <SheetLocal key={tick} local={sel} estado={estados.current.get(sel.id) ?? null}
        onClose={() => setSel(null)} onEnviado={cargarEstados} />}
    </div>
  )
}

function SheetLocal({ local, estado, onClose, onEnviado }: {
  local: Local; estado: Estado; onClose: () => void; onEnviado: () => void
}) {
  const [enviando, setEnviando] = useState(false)
  const [hecho, setHecho] = useState(estado === 'solicitada')
  const yaTrabajan = estado === 'activa'
  const img = local.imagenes?.[0]

  async function interesar() {
    setEnviando(true)
    const r = await fetch('/api/rrpp/interes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ local_id: local.id }),
    })
    setEnviando(false)
    if (r.ok) { setHecho(true); onEnviado() }
  }

  return (
    <div className="absolute inset-x-0 bottom-16 z-20 p-3" onClick={e => e.stopPropagation()}>
      <div className="mx-auto max-w-md rounded-3xl overflow-hidden glass-strong border border-white/10 animate-slide-up">
        <div className="relative h-28">
          {img
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={img} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full holo-bg opacity-60" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#12161F] to-transparent" />
          <button onClick={onClose} aria-label="Cerrar" className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white"><X size={16} /></button>
          <div className="absolute bottom-2 left-3 right-3">
            <p className="text-white text-display text-lg font-bold truncate">{local.nombre}</p>
            <p className="text-[#B8B8CC] text-xs flex items-center gap-1"><MapPin size={11} /> {getLabelTipoLocal(local.tipo_local)} · {local.ciudad}</p>
          </div>
        </div>
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-4 text-xs text-[#B8B8CC]">
            <span>Entrada: <b className="text-white">{local.precio_entrada_min ? formatearPrecio(local.precio_entrada_min) : 'Gratis'}</b></span>
            <span>Aforo: <b className="text-white">{aforoVisible(local)}%</b></span>
          </div>
          {local.descripcion && <p className="text-sm text-[#A0A0B8] line-clamp-2">{local.descripcion}</p>}
          {yaTrabajan ? (
            <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-emerald-400/15 text-emerald-300 text-sm font-semibold">
              <Check size={16} /> Ya trabajáis juntos
            </div>
          ) : hecho ? (
            <div className="flex items-center justify-center gap-2 h-11 rounded-xl bg-white/8 text-[#B8B8CC] text-sm font-semibold">
              <Clock size={16} /> Interés enviado — el local lo verá en su panel
            </div>
          ) : (
            <button onClick={interesar} disabled={enviando}
              className="w-full h-11 rounded-xl btn-primary inline-flex items-center justify-center gap-2 text-sm font-semibold disabled:opacity-50">
              <Handshake size={16} /> {enviando ? 'Enviando…' : 'Me interesa trabajar contigo'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
