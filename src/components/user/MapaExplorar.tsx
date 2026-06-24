'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapStore } from '@/lib/stores/useMapStore'
import { supabase } from '@/lib/supabase/client'
import { LocalConAforo, TipoLocal } from '@/types'
import { getTemperaturaAforo, aforoVisible } from '@/lib/utils'
import { estadoDeLocal } from '@/lib/estado-local'
import { LocalBottomSheet } from './LocalBottomSheet'
import { FiltrosMapa } from './FiltrosMapa'
import { BuscadorLocales } from './BuscadorLocales'
import { Search, SlidersHorizontal, Crosshair, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MADRID_CENTER: [number, number] = [-3.7038, 40.4168]
const SOURCE_ID = 'pm-locales'
const HEATMAP_LAYER = 'pm-locales-heat'

// Capas GL de los locales
const HALO_LAYER = 'pm-locales-halo'
const CORE_LAYER = 'pm-locales-core'
const LABEL_LAYER = 'pm-locales-label'

// El TIPO de local define el color del punto (categórico, legible de un vistazo).
// El AFORO no usa tono: se expresa con el tamaño y la opacidad del halo, para no
// saturar el mapa de colores. Paleta sobria, armónica sobre el mapa oscuro.
const COLOR_POR_TIPO: Record<TipoLocal | 'otro', string> = {
  discoteca:       '#B6FF3A',  // rosa marca — baile
  bar_copas:       '#4F8EF7',  // azul — copas
  rooftop:         '#9B7BE8',  // violeta — rooftop
  sala_conciertos: '#3FB27F',  // verde — directo
  bar_cocteleria:  '#D4A84B',  // dorado — coctelería
  otro:            '#8B8BA8',  // gris
}

const TIPO_COLOR: mapboxgl.Expression = [
  'match', ['get', 'tipo'],
  'discoteca',       COLOR_POR_TIPO.discoteca,
  'bar_copas',       COLOR_POR_TIPO.bar_copas,
  'rooftop',         COLOR_POR_TIPO.rooftop,
  'sala_conciertos', COLOR_POR_TIPO.sala_conciertos,
  'bar_cocteleria',  COLOR_POR_TIPO.bar_cocteleria,
  COLOR_POR_TIPO.otro,
]

function buildGeoJSON(locales: LocalConAforo[], ahora: Date): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: locales.map(l => {
      // Estado de apertura calculado en cliente (hora local = Madrid).
      const est = estadoDeLocal(l, ahora)
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [l.longitud, l.latitud] },
        properties: {
          id:     l.id,
          nombre: l.nombre,
          aforo:  aforoVisible(l),
          tipo:   l.tipo_local || 'otro',
          tier:   l.tier || 'visibility',
          // Punto algo mayor para cualquier plan de pago (pro/destacado).
          destacado: l.tier === 'destacado' || l.tier === 'pro' ? 1 : 0,
          // Nombre resaltado solo para el plan de visibilidad premium (destacado).
          top: l.tier === 'destacado' ? 1 : 0,
          // Estado de apertura (opacidad/badge) y hora si "abre pronto".
          estado: est.estado,
          abre: est.estado === 'abre_pronto' ? (est.horaRelevante ?? '') : '',
        },
      }
    }),
  }
}

export default function MapaExplorar() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const userLocationRef = useRef<mapboxgl.Marker | null>(null)
  const {
    locales, localSeleccionado, setLocales, setLocalSeleccionado,
    setMapLoaded, mapLoaded, filtros, showPlanes, setShowPlanes,
  } = useMapStore()
  const [showFiltros, setShowFiltros] = useState(false)
  const [showBuscador, setShowBuscador] = useState(false)
  // Hora actual: se recalcula cada minuto y al volver la app al primer plano, para que
  // "abre pronto" pase solo a "abierto" a las 00:00 sin recargar (doc 03 §7).
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const tick = () => setAhora(new Date())
    const id = setInterval(tick, 60000)
    const onVisible = () => { if (document.visibilityState === 'visible') tick() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible) }
  }, [])
  const filtrosActivos = filtros.tipos.length > 0 || filtros.musica.length > 0 || filtros.solo_con_evento || filtros.solo_con_planes || filtros.solo_abiertos || filtros.solo_afters

  const cargarLocales = useCallback(async () => {
    let { data, error } = await supabase
      .from('locales')
      .select('*, eventos(id, nombre, estado, fecha_inicio, fecha_fin)')
      .eq('estado', 'activo')
      .limit(300)
    // Si el join a eventos falla (relación/RLS), reintentar sin él para no
    // dejar el mapa vacío.
    if (error) {
      const fallback = await supabase
        .from('locales')
        .select('*')
        .eq('estado', 'activo')
        .limit(300)
      data = fallback.data
      error = fallback.error
    }
    if (error || !data) {
      console.error('[mapa] no se pudieron cargar los locales', error)
      return
    }
    const conAforo: LocalConAforo[] = data.map(l => ({
      ...l,
      temperatura: getTemperaturaAforo(aforoVisible(l)),
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

      // ── HEATMAP (mapa de calor de ambiente) ───────────────
      // Pondera por aforo: los locales más llenos "calientan" más.
      // Domina al alejar; se desvanece al acercar para dejar ver los puntos.
      map.addLayer({
        id: HEATMAP_LAYER,
        type: 'heatmap',
        source: SOURCE_ID,
        maxzoom: 16,
        // Un local cerrado no tiene "ambiente": no aporta al heatmap.
        filter: ['!=', ['get', 'estado'], 'cerrado'],
        paint: {
          'heatmap-weight': ['interpolate', ['linear'], ['get', 'aforo'], 0, 0.35, 100, 1],
          'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 8, 0.9, 14, 2.2],
          // Monocromo y tenue: solo insinúa dónde se concentra el ambiente, sin
          // competir con los colores por tipo de los puntos.
          'heatmap-color': [
            'interpolate', ['linear'], ['heatmap-density'],
            0,   'rgba(10,10,24,0)',
            0.3, 'rgba(99,102,180,0.12)',
            0.6, 'rgba(124,110,200,0.20)',
            1,   'rgba(150,140,220,0.28)',
          ],
          'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 8, 16, 14, 42],
          // Base ambiental muy sutil; se desvanece pronto al acercar para dejar
          // los puntos por tipo completamente limpios.
          'heatmap-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.5, 11, 0.3, 13.5, 0],
        },
      })

      // ── HALO por local — glow difuso, radio/opacidad según aforo ──
      map.addLayer({
        id: HALO_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9,  ['interpolate', ['linear'], ['get', 'aforo'], 0, 7,  100, 16],
            13, ['interpolate', ['linear'], ['get', 'aforo'], 0, 15, 100, 34],
            16, ['interpolate', ['linear'], ['get', 'aforo'], 0, 24, 100, 56],
          ],
          'circle-color': TIPO_COLOR,
          'circle-blur': 1,
          'circle-opacity': ['*',
            // Suelo de glow algo más alto: sin el aro blanco, el glow es lo que separa
            // el punto del mapa oscuro, también en locales tranquilos (§3.2).
            ['interpolate', ['linear'], ['get', 'aforo'], 0, 0.22, 50, 0.34, 100, 0.55],
            ['match', ['get', 'estado'], 'cerrado', 0.3, 'abre_pronto', 0.8, 1],
          ],
        },
      })

      // ── NÚCLEO — punto nítido "luz", borde teñido por aforo ──
      map.addLayer({
        id: CORE_LAYER,
        type: 'circle',
        source: SOURCE_ID,
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['zoom'],
            9,  ['case', ['==', ['get', 'destacado'], 1], 3,   2],
            14, ['case', ['==', ['get', 'destacado'], 1], 5.5, 3.5],
          ],
          'circle-color': TIPO_COLOR,
          // Opacidad = tercera dimensión (sobre color=tipo, tamaño/halo=aforo): el estado.
          'circle-opacity': ['match', ['get', 'estado'],
            'abre_pronto', 0.85,
            'cerrado', 0.38,
            0.95, // abierto / sin_datos
          ],
          // Sin aro blanco (§3.2): el punto recorta por su glow de color (capa HALO),
          // no por un borde duro. Los destacados llevan un finísimo realce del PROPIO
          // tono para resaltar sin volver al "aro blanco"; los demás, sin borde.
          'circle-stroke-color': TIPO_COLOR,
          'circle-stroke-width': ['case', ['==', ['get', 'destacado'], 1], 1.5, 0],
          'circle-stroke-opacity': ['case',
            ['==', ['get', 'estado'], 'cerrado'], 0.25,
            ['==', ['get', 'destacado'], 1], 0.6,
            0,
          ],
        },
      })

      // ── ETIQUETA — sutil. Los locales con plan de visibilidad
      //    (destacado/pro) llevan el nombre en negrita, algo mayor y
      //    aparecen un poco antes al hacer zoom. Sin destacar en exceso.
      map.addLayer({
        id: LABEL_LAYER,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 13,
        layout: {
          // Nombre y, si abre pronto, una 2ª línea ámbar "Abre 00:00" (mismo halo oscuro).
          'text-field': ['case',
            ['==', ['get', 'estado'], 'abre_pronto'],
            ['format',
              ['get', 'nombre'], {},
              ['concat', '\nAbre ', ['get', 'abre']], { 'font-scale': 0.9, 'text-color': '#F39C12' },
            ],
            ['get', 'nombre'],
          ],
          'text-font': [
            'case', ['==', ['get', 'top'], 1],
            ['literal', ['Open Sans Bold', 'Arial Unicode MS Bold']],
            ['literal', ['Open Sans Semibold', 'Arial Unicode MS Bold']],
          ],
          'text-size': ['case', ['==', ['get', 'top'], 1], 12.5, 11],
          'text-offset': [0, 1.4],
          'text-anchor': 'top',
          'text-max-width': 8,
          // Prioriza la colocación de los locales con plan de visibilidad si hay solape.
          'symbol-sort-key': ['case', ['==', ['get', 'top'], 1], 0, 1],
        },
        paint: {
          'text-color': ['case', ['==', ['get', 'top'], 1], '#FFFFFF', '#D7D7E2'],
          'text-halo-color': 'rgba(6,6,12,0.95)',
          'text-halo-width': ['case', ['==', ['get', 'top'], 1], 1.7, 1.3],
          // Los locales con plan de visibilidad aparecen desde z~13.3; el resto desde z~14.5.
          // El zoom debe ir en el interpolate de nivel superior (Mapbox no permite
          // expresiones de zoom anidadas en un 'case'); el 'top' decide el valor en cada parada.
          // El nombre de un local cerrado se atenúa (×0.45). El factor va DENTRO de cada
          // parada del interpolate: Mapbox exige que "zoom" sea el input de nivel superior
          // (no se puede anidar un interpolate de zoom dentro de un "*").
          'text-opacity': ['interpolate', ['linear'], ['zoom'],
            13.3, 0,
            14,   ['*', ['case', ['==', ['get', 'top'], 1], 1, 0], ['match', ['get', 'estado'], 'cerrado', 0.45, 1]],
            14.5, ['*', ['case', ['==', ['get', 'top'], 1], 1, 0], ['match', ['get', 'estado'], 'cerrado', 0.45, 1]],
            15.3, ['match', ['get', 'estado'], 'cerrado', 0.45, 1],
          ],
        },
      })

      // Cursor + click sobre los locales
      const setPointer = () => { map.getCanvas().style.cursor = 'pointer' }
      const unsetPointer = () => { map.getCanvas().style.cursor = '' }
      map.on('mouseenter', CORE_LAYER, setPointer)
      map.on('mouseleave', CORE_LAYER, unsetPointer)
      map.on('mouseenter', HALO_LAYER, setPointer)
      map.on('mouseleave', HALO_LAYER, unsetPointer)

      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: [CORE_LAYER, HALO_LAYER] })
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
        const filtered = applyFiltros(existing, existingFiltros, new Date())
        const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource
        if (src) src.setData(buildGeoJSON(filtered, new Date()))
      }
      cargarLocales()
    })

    mapRef.current = map
    return () => {
      map.remove()
      mapRef.current = null
      // Resetear el flag para que en el próximo montaje el efecto de datos
      // vuelva a dispararse (false→true) y repinte los locales.
      setMapLoaded(false)
    }
  }, [setMapLoaded, setLocalSeleccionado, cargarLocales])

  // ─── Actualizar source cuando cambien locales/filtros ───────────
  // Depende de `mapLoaded`: el flag se activa en el handler `load` justo
  // después de crear la source y las capas, así que cuando este efecto corre
  // con mapLoaded=true la source existe garantizado. Esto evita la antigua
  // condición de carrera (isStyleLoaded + setTimeout) por la que los puntos
  // no aparecían hasta forzar un cambio de filtro.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    const src = map.getSource(SOURCE_ID) as mapboxgl.GeoJSONSource | undefined
    if (src) src.setData(buildGeoJSON(applyFiltros(locales, filtros, ahora), ahora))
  }, [locales, filtros, mapLoaded, ahora])

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
        <div className="w-9 h-9 rounded-xl bg-[#B6FF3A] flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(182, 255, 58,0.6)] flex-shrink-0">
          <span className="text-[10px] font-black text-white tracking-tight">T</span>
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
            filtrosActivos ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'glass-strong text-[#A0A0B8] hover:text-[#0A0A0F]'
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
            <span key={t} className="shrink-0 px-3 py-1 bg-[#B6FF3A] text-[#0A0A0F] text-xs rounded-full font-semibold">{t}</span>
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

      {/* Leyenda por tipo de local — opaca y oculta mientras hay un local abierto */}
      {!localSeleccionado && (
        <div
          className="absolute bottom-28 left-4 z-10 rounded-xl px-3 py-2.5 space-y-1.5 border border-white/10 shadow-[0_12px_28px_-16px_rgba(0,0,0,0.8)]"
          style={{ background: 'rgba(12,12,21,0.94)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}
        >
          <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-[#A0A0B8] mb-1">Tipo</p>
          {[
            { color: COLOR_POR_TIPO.discoteca, label: 'Discoteca' },
            { color: COLOR_POR_TIPO.bar_copas, label: 'Bar de copas' },
            { color: COLOR_POR_TIPO.rooftop, label: 'Rooftop' },
            { color: COLOR_POR_TIPO.sala_conciertos, label: 'Conciertos' },
            { color: COLOR_POR_TIPO.bar_cocteleria, label: 'Coctelería' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <span className="text-[10px] text-white">{label}</span>
            </div>
          ))}
        </div>
      )}

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

function applyFiltros(locales: LocalConAforo[], filtros: ReturnType<typeof useMapStore.getState>['filtros'], ahora: Date) {
  let r = locales
  if (filtros.tipos.length > 0) r = r.filter(l => filtros.tipos.includes(l.tipo_local))
  if (filtros.musica.length > 0) r = r.filter(l => l.musica?.some(m => filtros.musica.includes(m)))
  if (filtros.solo_con_evento) r = r.filter(l => l.evento_activo)
  if (filtros.precio_min != null) r = r.filter(l => (l.precio_entrada_min || 0) >= filtros.precio_min!)
  if (filtros.precio_max != null) r = r.filter(l => (l.precio_entrada_min || 0) <= filtros.precio_max!)
  if (filtros.solo_abiertos) r = r.filter(l => { const e = estadoDeLocal(l, ahora).estado; return e === 'abierto' || e === 'abre_pronto' })
  if (filtros.solo_afters) r = r.filter(l => l.admite_after && ['abierto', 'abre_pronto'].includes(estadoDeLocal(l, ahora).estado))
  return r
}
