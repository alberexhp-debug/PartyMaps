'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapStore } from '@/lib/stores/useMapStore'
import { supabase } from '@/lib/supabase/client'
import { LocalConAforo } from '@/types'
import { getTemperaturaAforo } from '@/lib/utils'
import { LocalBottomSheet } from './LocalBottomSheet'
import { FiltrosMapa } from './FiltrosMapa'
import { BuscadorLocales } from './BuscadorLocales'
import { Search, SlidersHorizontal, Crosshair, Layers, Flame } from 'lucide-react'
import { cn } from '@/lib/utils'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MADRID_CENTER: [number, number] = [-3.7038, 40.4168]
const SOURCE_ID = 'pm-locales'
const HEAT_LAYER = 'pm-locales-heat'
const CIRCLE_LAYER = 'pm-locales-circle'
const GLOW_LAYER = 'pm-locales-glow'
const LABEL_LAYER = 'pm-locales-label'

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
  const [vistaCalor, setVistaCalor] = useState(true)
  const filtrosActivos = filtros.tipos.length > 0 || filtros.musica.length > 0 || filtros.solo_con_evento || filtros.solo_con_planes

  // ─── Cargar locales ──────────────────────────────────────────────
  const cargarLocales = useCallback(async () => {
    const { data } = await supabase
      .from('locales')
      .select('*, eventos(id, nombre, estado, fecha_inicio)')
      .eq('estado', 'activo')
      .limit(200)
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
      zoom: 8.5,            // empezamos lejos para hacer fly-in
      pitch: 0,
      bearing: 0,
      attributionControl: false,
      antialias: true,
    })

    map.on('load', () => {
      // Fly-in solo la primera vez por sesión (evita ser molesto al repetir navegación)
      const yaVistoFlyIn = typeof window !== 'undefined' && sessionStorage.getItem('pm_map_flyin_seen')
      if (!yaVistoFlyIn) {
        sessionStorage.setItem('pm_map_flyin_seen', '1')
        setTimeout(() => {
          map.flyTo({
            center: MADRID_CENTER,
            zoom: 12.5,
            duration: 1400,
            essential: true,
            curve: 1.4,
          })
        }, 100)
      } else {
        map.jumpTo({ center: MADRID_CENTER, zoom: 12.5 })
      }

      // Atenuar fondo del mapa para que destaque la capa de calor
      try {
        map.setPaintProperty('background', 'background-color', '#05050C')
        // Atenuar líneas y agua
        const layers = map.getStyle().layers || []
        for (const layer of layers) {
          if (layer.type === 'line' && 'paint' in layer) {
            try { map.setPaintProperty(layer.id, 'line-opacity', 0.35) } catch {}
          }
        }
      } catch {}

      // Source vacío (lo poblamos después de cargar locales)
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      // ── HEATMAP LAYER (capa de calor) ──────────────────────────
      map.addLayer({
        id: HEAT_LAYER,
        type: 'heatmap',
        source: SOURCE_ID,
        maxzoom: 17,
        paint: {
          // peso = aforo (0-100) → 0-1
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aforo'], 0, 0.1, 50, 0.5, 100, 1],
          // intensidad por zoom
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 2.5],
          // gradient azul → violeta → rosa neón
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,    'rgba(0,0,0,0)',
            0.15, 'rgba(79,142,247,0.35)',
            0.35, 'rgba(124,92,255,0.55)',
            0.55, 'rgba(233,69,96,0.7)',
            0.8,  'rgba(255,61,113,0.85)',
            1,    'rgba(255,143,168,1)',
          ],
          // radio crece con el zoom
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 10, 18, 13, 45, 16, 90],
          // se desvanece al hacer zoom muy alto (cede protagonismo a circulos)
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.9, 16, 0.55, 17, 0.25],
        },
      })

      // ── GLOW (halo bajo el círculo) ────────────────────────────
      map.addLayer({
        id: GLOW_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        minzoom: 12,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 12, 6, 16, 28],
          'circle-color': [
            'match', ['get', 'temperatura'],
            'caliente', '#FF3D71',
            'animado',  '#F39C12',
            /* tranquilo */ '#4F8EF7',
          ],
          'circle-blur': 1.2,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], 12, 0.35, 16, 0.85],
        },
      })

      // ── CÍRCULO principal del local ────────────────────────────
      map.addLayer({
        id: CIRCLE_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        minzoom: 12,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            12, ['case', ['==', ['get', 'tier'], 'destacado'], 5, 3.5],
            16, ['case', ['==', ['get', 'tier'], 'destacado'], 11, 8],
          ],
          'circle-color': [
            'match', ['get', 'temperatura'],
            'caliente', '#FF3D71',
            'animado',  '#FBE08F',
            /* tranquilo */ '#A8D5FF',
          ],
          'circle-stroke-color': '#FAFAFC',
          'circle-stroke-width': 1.5,
          'circle-stroke-opacity': 0.9,
        },
      })

      // ── LABEL con nombre (solo zoom alto) ──────────────────────
      map.addLayer({
        id: LABEL_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 14.5,
        layout: {
          'text-field': ['get', 'nombre'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 11,
          'text-offset': [0, 1.3],
          'text-anchor': 'top',
          'text-letter-spacing': 0.04,
          'text-max-width': 8,
        },
        paint: {
          'text-color': '#FAFAFC',
          'text-halo-color': 'rgba(8,8,15,0.85)',
          'text-halo-width': 1.4,
        },
      })

      // Cursor pointer en hover sobre marcadores
      const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
      const unsetPointer = () => { map.getCanvas().style.cursor = '' }
      map.on('mouseenter', CIRCLE_LAYER, setPointer)
      map.on('mouseleave', CIRCLE_LAYER, unsetPointer)
      map.on('mouseenter', GLOW_LAYER, setPointer)
      map.on('mouseleave', GLOW_LAYER, unsetPointer)

      // Click handler — usa queryRenderedFeatures
      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CIRCLE_LAYER, GLOW_LAYER] })
        if (features.length === 0) { setLocalSeleccionado(null); return }
        const id = features[0].properties?.id
        const local = useMapStore.getState().locales.find(l => l.id === id)
        if (!local) return
        setLocalSeleccionado(local)
        map.flyTo({
          center: [local.longitud, local.latitud],
          zoom: Math.max(map.getZoom(), 14.5),
          duration: 600,
          essential: true,
        })
      }
      map.on('click', handleClick)

      setMapLoaded(true)
      cargarLocales()
    })

    mapRef.current = map
    return () => { map.remove(); mapRef.current = null }
  }, [setMapLoaded, setLocalSeleccionado, cargarLocales])

  // ─── Actualizar source cuando cambien locales/filtros ───────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    let filtrados = locales
    if (filtros.tipos.length > 0) filtrados = filtrados.filter(l => filtros.tipos.includes(l.tipo_local))
    if (filtros.musica.length > 0) filtrados = filtrados.filter(l => l.musica?.some(m => filtros.musica.includes(m)))
    if (filtros.solo_con_evento) filtrados = filtrados.filter(l => l.evento_activo)
    if (filtros.precio_min !== undefined) filtrados = filtrados.filter(l => (l.precio_entrada_min || 0) >= filtros.precio_min!)
    if (filtros.precio_max !== undefined) filtrados = filtrados.filter(l => (l.precio_entrada_min || 0) <= filtros.precio_max!)

    const fc: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: filtrados.map(l => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [l.longitud, l.latitud] },
        properties: {
          id: l.id,
          nombre: l.nombre,
          aforo: l.aforo_estimado_porcentaje || 0,
          temperatura: l.temperatura,
          tier: l.tier || 'basico',
        },
      })),
    }

    const source = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (source) source.setData(fc)
  }, [locales, filtros])

  // ─── Toggle vista calor ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    try {
      const op = vistaCalor ? 'visible' : 'none'
      map.setLayoutProperty(HEAT_LAYER, 'visibility', op)
    } catch {}
  }, [vistaCalor])

  // ─── Centrar en usuario ────────────────────────────────────────
  const centrarEnUsuario = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        // Marker propio (no usa el icono por defecto)
        if (userLocationRef.current) userLocationRef.current.remove()
        const el = document.createElement('div')
        el.className = 'pm-user-marker'
        el.innerHTML = `
          <div style="position:relative;width:18px;height:18px;">
            <div style="position:absolute;inset:0;border-radius:50%;background:#4F8EF7;box-shadow:0 0 0 4px rgba(79,142,247,0.25),0 0 12px rgba(79,142,247,0.8);"></div>
            <div style="position:absolute;inset:-8px;border-radius:50%;background:rgba(79,142,247,0.15);animation:pulse-heat 2.4s ease-in-out infinite;"></div>
          </div>`
        userLocationRef.current = new mapboxgl.Marker({ element: el, anchor: 'center' })
          .setLngLat(coords)
          .addTo(mapRef.current!)
        mapRef.current!.flyTo({ center: coords, zoom: 15, duration: 800 })
      },
      () => mapRef.current?.flyTo({ center: MADRID_CENTER, zoom: 13, duration: 800 }),
    )
  }, [])

  return (
    <div className="fixed inset-0 pb-20">
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Vignette top */}
      <div className="absolute top-0 left-0 right-0 h-28 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(180deg, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.4) 60%, transparent 100%)' }} />
      {/* Vignette bottom */}
      <div className="absolute bottom-20 left-0 right-0 h-32 z-[1] pointer-events-none"
        style={{ background: 'linear-gradient(0deg, rgba(8,8,15,0.85) 0%, rgba(8,8,15,0.3) 50%, transparent 100%)' }} />

      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-2.5 safe-top">
        <div className="w-10 h-10 rounded-xl holo-bg flex items-center justify-center shadow-[0_8px_22px_-6px_rgba(124,92,255,0.7)] flex-shrink-0">
          <span className="text-xs font-black text-white tracking-tight">PM</span>
        </div>

        <button
          onClick={() => setShowBuscador(true)}
          className="flex-1 flex items-center gap-2 h-11 glass-strong rounded-2xl px-3.5 text-sm text-[#A0A0B8] hover:text-white transition-colors"
        >
          <Search size={15} />
          <span>Buscar local…</span>
        </button>

        <button
          onClick={() => setShowFiltros(true)}
          className={cn(
            'relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all flex-shrink-0',
            filtrosActivos
              ? 'bg-[#E94560] text-white shadow-[0_8px_22px_-4px_rgba(233,69,96,0.7)]'
              : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <SlidersHorizontal size={17} />
          {filtrosActivos && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-white rounded-full shadow" />
          )}
        </button>
      </div>

      {/* Chips filtros activos */}
      {filtrosActivos && (
        <div className="absolute top-[72px] left-0 right-0 z-10 px-4 flex gap-2 overflow-x-auto pb-1">
          {filtros.tipos.map(t => (
            <span key={t} className="shrink-0 px-3 py-1 bg-[#E94560] text-white text-xs rounded-full font-semibold shadow-[0_6px_14px_-4px_rgba(233,69,96,0.6)]">{t}</span>
          ))}
          {filtros.solo_con_evento && (
            <span className="shrink-0 px-3 py-1 bg-[#F39C12] text-white text-xs rounded-full font-semibold">Con evento</span>
          )}
        </div>
      )}

      {/* Controles derecha */}
      <div className="absolute right-4 bottom-28 z-10 flex flex-col gap-2">
        <button
          onClick={() => setVistaCalor(v => !v)}
          title={vistaCalor ? 'Ocultar mapa de calor' : 'Mostrar mapa de calor'}
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
            vistaCalor
              ? 'bg-[#E94560] text-white shadow-[0_8px_22px_-4px_rgba(233,69,96,0.7)]'
              : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <Flame size={19} />
        </button>
        <button
          onClick={centrarEnUsuario}
          className="w-12 h-12 glass-strong rounded-2xl flex items-center justify-center text-[#A0A0B8] hover:text-white transition-colors"
        >
          <Crosshair size={19} />
        </button>
        <button
          onClick={() => setShowPlanes(!showPlanes)}
          className={cn(
            'w-12 h-12 rounded-2xl flex items-center justify-center transition-all',
            showPlanes
              ? 'bg-[#4F8EF7] text-white shadow-[0_8px_22px_-4px_rgba(79,142,247,0.7)]'
              : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <Layers size={19} />
        </button>
      </div>

      {/* Leyenda temperatura */}
      <div className="absolute bottom-28 left-4 z-10 glass-strong rounded-2xl px-3 py-2.5 space-y-1.5">
        <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#A0A0B8] mb-1">Aforo</p>
        {[
          { color: '#4F8EF7', label: 'Tranquilo' },
          { color: '#F39C12', label: 'Animado' },
          { color: '#E94560', label: 'Lleno' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
            <span className="text-[10px] font-medium text-white tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom sheet del local */}
      {localSeleccionado && (
        <LocalBottomSheet local={localSeleccionado} onClose={() => setLocalSeleccionado(null)} />
      )}

      {/* Panel filtros */}
      <FiltrosMapa open={showFiltros} onClose={() => setShowFiltros(false)} />

      {/* Buscador */}
      <BuscadorLocales
        open={showBuscador}
        onClose={() => setShowBuscador(false)}
        locales={locales}
        onSelect={(local) => {
          setLocalSeleccionado(local)
          setShowBuscador(false)
          mapRef.current?.flyTo({ center: [local.longitud, local.latitud], zoom: 15, duration: 800 })
        }}
      />
    </div>
  )
}
