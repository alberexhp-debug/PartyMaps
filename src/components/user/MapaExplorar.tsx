'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapStore } from '@/lib/stores/useMapStore'
import { supabase } from '@/lib/supabase/client'
import { LocalConAforo, TipoLocal } from '@/types'
import { getTemperaturaAforo } from '@/lib/utils'
import { LocalBottomSheet } from './LocalBottomSheet'
import { FiltrosMapa } from './FiltrosMapa'
import { BuscadorLocales } from './BuscadorLocales'
import { Search, SlidersHorizontal, Crosshair, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MADRID_CENTER: [number, number] = [-3.7038, 40.4168]
const SOURCE_ID = 'pm-locales'
const GLOW_LAYER = 'pm-locales-glow'
const CIRCLE_LAYER = 'pm-locales-circle'
const LABEL_LAYER = 'pm-locales-label'

// Colores por tipo de local
const COLOR_POR_TIPO: Record<TipoLocal | 'otro', string> = {
  discoteca:       '#E94560',  // rosa — baile
  bar_copas:       '#4F8EF7',  // azul — chill
  rooftop:         '#7C5CFF',  // violeta — premium
  sala_conciertos: '#27AE60',  // verde — música en vivo
  bar_cocteleria:  '#D4A84B',  // dorado — cócteles
  otro:            '#8B8BA8',  // gris
}

// Match expression Mapbox GL para asignar color por tipo
const tipoColorMatch: mapboxgl.Expression = [
  'match', ['get', 'tipo'],
  'discoteca',       COLOR_POR_TIPO.discoteca,
  'bar_copas',       COLOR_POR_TIPO.bar_copas,
  'rooftop',         COLOR_POR_TIPO.rooftop,
  'sala_conciertos', COLOR_POR_TIPO.sala_conciertos,
  'bar_cocteleria',  COLOR_POR_TIPO.bar_cocteleria,
  COLOR_POR_TIPO.otro,
]

function buildGeoJSON(locales: LocalConAforo[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: locales.map(l => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [l.longitud, l.latitud] },
      properties: {
        id:     l.id,
        nombre: l.nombre,
        aforo:  l.aforo_estimado_porcentaje || 0,
        tipo:   l.tipo_local || 'otro',
        tier:   l.tier || 'visibility',
        destacado: l.tier === 'destacado' || l.tier === 'pro' ? 1 : 0,
      },
    })),
  }
}

export default function MapaExplorar() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userLocationRef = useRef<mapboxgl.Marker | null>(null)
  const {
    locales, localSeleccionado, setLocales, setLocalSeleccionado,
    setMapLoaded, filtros, showPlanes, setShowPlanes,
  } = useMapStore()
  const [showFiltros, setShowFiltros] = useState(false)
  const [showBuscador, setShowBuscador] = useState(false)
  const filtrosActivos = filtros.tipos.length > 0 || filtros.musica.length > 0 || filtros.solo_con_evento || filtros.solo_con_planes

  const cargarLocales = useCallback(async () => {
    const { data } = await supabase
      .from('locales')
      .select('*, eventos(id, nombre, estado, fecha_inicio)')
      .eq('estado', 'activo')
      .limit(300)
    if (!data) return
    const conAforo: LocalConAforo[] = data.map(l => ({
      ...l,
      temperatura: getTemperaturaAforo(l.aforo_estimado_porcentaje || 0),
      evento_activo: l.eventos?.find((e: { estado: string }) => e.estado === 'publicado'),
    }))
    setLocales(conAforo)
  }, [setLocales])

  // ─── Inicializar mapa ────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MADRID_CENTER,
      zoom: 12.5,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      antialias: true,
    })

    map.on('load', () => {
      const yaVistoFlyIn = typeof window !== 'undefined' && sessionStorage.getItem('pm_map_flyin_seen')
      if (!yaVistoFlyIn) {
        sessionStorage.setItem('pm_map_flyin_seen', '1')
        map.jumpTo({ center: MADRID_CENTER, zoom: 8.5 })
        setTimeout(() => {
          map.flyTo({ center: MADRID_CENTER, zoom: 12.5, duration: 1400, essential: true, curve: 1.4 })
        }, 100)
      }

      // Atenuar capas base del mapa
      try {
        const layers = map.getStyle().layers || []
        for (const layer of layers) {
          if (layer.type === 'line') { try { map.setPaintProperty(layer.id, 'line-opacity', 0.3) } catch {} }
          if (layer.type === 'fill') { try { map.setPaintProperty(layer.id, 'fill-opacity', 0.5) } catch {} }
        }
      } catch {}

      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // ── GLOW bajo el círculo ──────────────────────────────
      map.addLayer({
        id: GLOW_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            8,  ['case', ['==', ['get', 'destacado'], 1], 10, 6],
            14, ['case', ['==', ['get', 'destacado'], 1], 24, 16],
          ],
          'circle-color': tipoColorMatch,
          'circle-blur': 1.0,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.25, 14, 0.6],
        },
      })

      // ── CÍRCULO principal ─────────────────────────────────
      map.addLayer({
        id: CIRCLE_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            8,  ['case', ['==', ['get', 'destacado'], 1], 5,  3],
            14, ['case', ['==', ['get', 'destacado'], 1], 11, 7],
          ],
          'circle-color': tipoColorMatch,
          'circle-stroke-color': [
            'case', ['==', ['get', 'destacado'], 1], '#FFFFFF', 'rgba(255,255,255,0.6)'
          ],
          'circle-stroke-width': ['case', ['==', ['get', 'destacado'], 1], 2, 1],
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.7, 14, 1],
        },
      })

      // ── LABEL nombre (zoom alto) ──────────────────────────
      map.addLayer({
        id: LABEL_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 14,
        layout: {
          'text-field': ['get', 'nombre'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#FAFAFC',
          'text-halo-color': 'rgba(6,6,12,0.9)',
          'text-halo-width': 1.5,
        },
      })

      // Cursor y click
      const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
      const unsetPointer = () => { map.getCanvas().style.cursor = '' }
      map.on('mouseenter', CIRCLE_LAYER, setPointer)
      map.on('mouseleave', CIRCLE_LAYER, unsetPointer)

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CIRCLE_LAYER, GLOW_LAYER] })
        if (!features.length) { setLocalSeleccionado(null); return }
        const id = features[0].properties?.id
        const local = useMapStore.getState().locales.find(l => l.id === id)
        if (!local) return
        setLocalSeleccionado(local)
        map.flyTo({ center: [local.longitud, local.latitud], zoom: Math.max(map.getZoom(), 14), duration: 500, essential: true })
      })

      setMapLoaded(true)

      // Cargar datos frescos Y también actualizar con lo que ya haya en el store
      const existing = useMapStore.getState().locales
      if (existing.length > 0) {
        const existingFiltros = useMapStore.getState().filtros
        const filtered = applyFiltros(existing, existingFiltros)
        const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
        if (src) src.setData(buildGeoJSON(filtered))
      }
      cargarLocales()
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [setMapLoaded, setLocalSeleccionado, cargarLocales])

  // ─── Actualizar source cuando cambien locales/filtros ───────────
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!map.isStyleLoaded()) {
      // Esperar un tick y reintentar
      const t = setTimeout(() => {
        const m = mapRef.current
        if (!m) return
        const src = m.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
        if (src) src.setData(buildGeoJSON(applyFiltros(locales, filtros)))
      }, 300)
      return () => clearTimeout(t)
    }
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildGeoJSON(applyFiltros(locales, filtros)))
  }, [locales, filtros])

  const centrarEnUsuario = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        if (userLocationRef.current) userLocationRef.current.remove()
        const el = document.createElement('div')
        el.innerHTML = `<div style="position:relative;width:16px;height:16px;"><div style="position:absolute;inset:0;border-radius:50%;background:#4F8EF7;box-shadow:0 0 0 3px rgba(79,142,247,0.3),0 0 10px rgba(79,142,247,0.8);"></div></div>`
        userLocationRef.current = new mapboxgl.Marker({ element: el.firstChild as HTMLElement, anchor: 'center' })
          .setLngLat(coords).addTo(mapRef.current!)
        mapRef.current!.flyTo({ center: coords, zoom: 15, duration: 700 })
      },
      () => mapRef.current?.flyTo({ center: MADRID_CENTER, zoom: 13, duration: 700 }),
    )
  }, [])

  return (
    <div className="fixed inset-0 pb-20">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Vignette top */}
      <div className="absolute top-0 left-0 right-0 h-24 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(6,6,12,0.8) 0%, transparent 100%)' }} />
      {/* Vignette bottom */}
      <div className="absolute bottom-20 left-0 right-0 h-24 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(6,6,12,0.7) 0%, transparent 100%)' }} />

      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-2.5 safe-top">
        <div className="w-9 h-9 rounded-xl bg-[#E94560] flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(233,69,96,0.6)] flex-shrink-0">
          <span className="text-[10px] font-black text-white tracking-tight">PM</span>
        </div>
        <button
          onClick={() => setShowBuscador(true)}
          className="flex-1 flex items-center gap-2 h-10 glass-strong rounded-xl px-3.5 text-sm text-[#A0A0B8] hover:text-white transition-colors"
        >
          <Search size={14} />
          <span>Buscar local…</span>
        </button>
        <button
          onClick={() => setShowFiltros(true)}
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-all shrink-0',
            filtrosActivos ? 'bg-[#E94560] text-white' : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <SlidersHorizontal size={16} />
          {filtrosActivos && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full" />}
        </button>
      </div>

      {/* Chips filtros activos */}
      {filtrosActivos && (
        <div className="absolute top-16 left-0 right-0 z-10 px-4 flex gap-2 overflow-x-auto pb-1">
          {filtros.tipos.map(t => (
            <span key={t} className="shrink-0 px-3 py-1 bg-[#E94560] text-white text-xs rounded-full font-semibold">{t}</span>
          ))}
          {filtros.solo_con_evento && (
            <span className="shrink-0 px-3 py-1 bg-[#F39C12] text-white text-xs rounded-full font-semibold">Con evento</span>
          )}
        </div>
      )}

      {/* Controles derecha */}
      <div className="absolute right-4 bottom-28 z-10 flex flex-col gap-2">
        <button onClick={centrarEnUsuario} className="w-11 h-11 glass-strong rounded-xl flex items-center justify-center text-[#A0A0B8] hover:text-white transition-colors">
          <Crosshair size={18} />
        </button>
        <button
          onClick={() => setShowPlanes(!showPlanes)}
          className={cn('w-11 h-11 rounded-xl flex items-center justify-center transition-all', showPlanes ? 'bg-[#4F8EF7] text-white' : 'glass-strong text-[#A0A0B8] hover:text-white')}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* Leyenda tipos */}
      <div className="absolute bottom-28 left-4 z-10 glass-strong rounded-xl px-3 py-2.5 space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A0A0B8] mb-1">Locales</p>
        {[
          { color: COLOR_POR_TIPO.discoteca,       label: 'Discoteca' },
          { color: COLOR_POR_TIPO.bar_copas,        label: 'Bar copas' },
          { color: COLOR_POR_TIPO.rooftop,          label: 'Rooftop' },
          { color: COLOR_POR_TIPO.sala_conciertos,  label: 'Conciertos' },
          { color: COLOR_POR_TIPO.bar_cocteleria,   label: 'Coctelería' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-[10px] text-white">{label}</span>
          </div>
        ))}
      </div>

      {localSeleccionado && <LocalBottomSheet local={localSeleccionado} onClose={() => setLocalSeleccionado(null)} />}
      <FiltrosMapa open={showFiltros} onClose={() => setShowFiltros(false)} />
      <BuscadorLocales
        open={showBuscador}
        onClose={() => setShowBuscador(false)}
        locales={locales}
        onSelect={(local) => {
          setLocalSeleccionado(local)
          setShowBuscador(false)
          mapRef.current?.flyTo({ center: [local.longitud, local.latitud], zoom: 15, duration: 600 })
        }}
      />
    </div>
  )
}

function applyFiltros(locales: LocalConAforo[], filtros: ReturnType<typeof useMapStore.getState>['filtros']) {
  let r = locales
  if (filtros.tipos.length > 0) r = r.filter(l => filtros.tipos.includes(l.tipo_local))
  if (filtros.musica.length > 0) r = r.filter(l => l.musica?.some(m => filtros.musica.includes(m)))
  if (filtros.solo_con_evento) r = r.filter(l => l.evento_activo)
  if (filtros.precio_min != null) r = r.filter(l => (l.precio_entrada_min || 0) >= filtros.precio_min!)
  if (filtros.precio_max != null) r = r.filter(l => (l.precio_entrada_min || 0) <= filtros.precio_max!)
  return r
}
