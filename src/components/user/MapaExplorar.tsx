'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useMapStore } from '@/lib/stores/useMapStore'
import { supabase } from '@/lib/supabase/client'
import { LocalConAforo } from '@/types'
import { getColorTemperatura, getTemperaturaAforo } from '@/lib/utils'
import { LocalBottomSheet } from './LocalBottomSheet'
import { FiltrosMapa } from './FiltrosMapa'
import { BuscadorLocales } from './BuscadorLocales'
import { Search, SlidersHorizontal, Crosshair, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'

mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

const MADRID_CENTER: [number, number] = [-3.7038, 40.4168]

export default function MapaExplorar() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map())
  const { locales, localSeleccionado, setLocales, setLocalSeleccionado, setMapLoaded, filtros, showPlanes, setShowPlanes } = useMapStore()
  const [showFiltros, setShowFiltros] = useState(false)
  const [showBuscador, setShowBuscador] = useState(false)
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const filtrosActivos = filtros.tipos.length > 0 || filtros.musica.length > 0 || filtros.solo_con_evento || filtros.solo_con_planes

  // Cargar locales desde Supabase
  const cargarLocales = useCallback(async () => {
    const { data, error } = await supabase
      .from('locales')
      .select('*, eventos!inner(id, nombre, estado, fecha_inicio)')
      .eq('estado', 'activo')
      .limit(200)

    if (error) {
      // Fallback: cargar sin eventos
      const { data: localesSolos } = await supabase
        .from('locales')
        .select('*')
        .eq('estado', 'activo')
        .limit(200)

      if (localesSolos) {
        const conAforo: LocalConAforo[] = localesSolos.map(l => ({
          ...l,
          temperatura: getTemperaturaAforo(l.aforo_estimado_porcentaje || 0),
        }))
        setLocales(conAforo)
      }
      return
    }

    if (data) {
      const conAforo: LocalConAforo[] = data.map((l: LocalConAforo & { eventos?: { id: string; nombre: string; estado: string }[] }) => ({
        ...l,
        temperatura: getTemperaturaAforo(l.aforo_estimado_porcentaje || 0),
        evento_activo: l.eventos?.find((e: { estado: string }) => e.estado === 'publicado') as import('@/types').Evento | undefined,
      }))
      setLocales(conAforo)
    }
  }, [setLocales])

  // Inicializar mapa
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: MADRID_CENTER,
      zoom: 13,
      pitch: 0,
      attributionControl: false,
    })

    map.on('load', () => {
      setMapLoaded(true)
      cargarLocales()

      // Personalizar el estilo del mapa para que encaje con la app
      map.setPaintProperty('background', 'background-color', '#0D0D1A')
    })

    map.on('click', () => setLocalSeleccionado(null))

    mapRef.current = map

    return () => { map.remove(); mapRef.current = null }
  }, [setMapLoaded, setLocalSeleccionado, cargarLocales])

  // Actualizar marcadores cuando cambian los locales
  useEffect(() => {
    const map = mapRef.current
    if (!map || locales.length === 0) return

    // Filtrar locales según filtros activos
    let localesFiltrados = locales
    if (filtros.tipos.length > 0) localesFiltrados = localesFiltrados.filter(l => filtros.tipos.includes(l.tipo_local))
    if (filtros.musica.length > 0) localesFiltrados = localesFiltrados.filter(l => l.musica?.some(m => filtros.musica.includes(m)))
    if (filtros.solo_con_evento) localesFiltrados = localesFiltrados.filter(l => l.evento_activo)
    if (filtros.precio_min !== undefined) localesFiltrados = localesFiltrados.filter(l => (l.precio_entrada_min || 0) >= filtros.precio_min!)
    if (filtros.precio_max !== undefined) localesFiltrados = localesFiltrados.filter(l => (l.precio_entrada_min || 0) <= filtros.precio_max!)

    // Eliminar marcadores que ya no aplican
    markersRef.current.forEach((marker, id) => {
      if (!localesFiltrados.find(l => l.id === id)) {
        marker.remove()
        markersRef.current.delete(id)
      }
    })

    // Crear/actualizar marcadores
    localesFiltrados.forEach(local => {
      if (markersRef.current.has(local.id)) return

      const el = document.createElement('div')
      el.className = 'fv-marker'
      const color = getColorTemperatura(local.temperatura)
      const isCaliente = local.temperatura === 'caliente'
      const isDestacado = local.tier === 'destacado'

      el.innerHTML = `
        <div style="
          display:flex; align-items:center; gap:5px; padding:5px 10px;
          background:${isDestacado ? '#1A1A2E' : '#0D0D1A'};
          border:1.5px solid ${isDestacado ? color : color + '60'};
          border-radius:20px; cursor:pointer; white-space:nowrap;
          box-shadow:0 2px 12px ${color}40;
          ${isDestacado ? 'transform:scale(1.1);' : ''}
          ${isCaliente ? 'animation:pulse-heat 2s ease-in-out infinite;' : ''}
        ">
          <div style="
            width:8px; height:8px; border-radius:50%; background:${color};
            flex-shrink:0;
            ${isCaliente ? 'box-shadow:0 0 6px ' + color + ';' : ''}
          "></div>
          <span style="color:white; font-size:12px; font-weight:600; font-family:Inter,sans-serif;">
            ${local.nombre.length > 18 ? local.nombre.slice(0, 18) + '…' : local.nombre}
          </span>
          ${local.evento_activo ? '<span style="font-size:9px; color:#F39C12;">★</span>' : ''}
        </div>
      `

      el.addEventListener('click', (e) => {
        e.stopPropagation()
        setLocalSeleccionado(local)
        map.flyTo({ center: [local.longitud, local.latitud], zoom: Math.max(map.getZoom(), 14), duration: 600 })
      })

      const marker = new mapboxgl.Marker({ element: el, anchor: 'center' })
        .setLngLat([local.longitud, local.latitud])
        .addTo(map)

      markersRef.current.set(local.id, marker)
    })
  }, [locales, filtros, setLocalSeleccionado])

  const centrarEnUsuario = useCallback(() => {
    if (!mapRef.current) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords: [number, number] = [pos.coords.longitude, pos.coords.latitude]
        setUserLocation(coords)
        mapRef.current?.flyTo({ center: coords, zoom: 15, duration: 800 })
      },
      () => mapRef.current?.flyTo({ center: MADRID_CENTER, zoom: 13, duration: 800 })
    )
  }, [])

  return (
    <div className="fixed inset-0 pb-20">
      {/* Mapa */}
      <div ref={mapContainerRef} className="w-full h-full" />

      {/* Barra superior */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 flex items-center gap-2.5 safe-top">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl holo-bg flex items-center justify-center shadow-[0_6px_18px_-4px_rgba(124,92,255,0.6)] flex-shrink-0">
          <span className="text-xs font-black text-white tracking-tight">PM</span>
        </div>

        {/* Buscador */}
        <button
          onClick={() => setShowBuscador(true)}
          className="flex-1 flex items-center gap-2 h-10 glass-strong rounded-xl px-3.5 text-sm text-[#A0A0B8] hover:text-white transition-colors"
        >
          <Search size={15} />
          <span>Buscar local...</span>
        </button>

        {/* Botón filtros */}
        <button
          onClick={() => setShowFiltros(true)}
          className={cn(
            'relative w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
            filtrosActivos
              ? 'bg-[#E94560] text-white shadow-[0_6px_18px_-4px_rgba(233,69,96,0.55)]'
              : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <SlidersHorizontal size={16} />
          {filtrosActivos && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-white rounded-full shadow" />
          )}
        </button>
      </div>

      {/* Chips de filtros activos */}
      {filtrosActivos && (
        <div className="absolute top-20 left-0 right-0 z-10 px-4 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filtros.tipos.map(t => (
            <span key={t} className="shrink-0 px-3 py-1 bg-[#E94560] text-white text-xs rounded-full font-medium shadow-[0_4px_12px_-4px_rgba(233,69,96,0.55)]">{t}</span>
          ))}
          {filtros.solo_con_evento && (
            <span className="shrink-0 px-3 py-1 bg-[#F39C12] text-white text-xs rounded-full font-medium">Con evento</span>
          )}
        </div>
      )}

      {/* Controles mapa */}
      <div className="absolute right-4 bottom-28 z-10 flex flex-col gap-2">
        <button
          onClick={centrarEnUsuario}
          className="w-11 h-11 glass-strong rounded-xl flex items-center justify-center text-[#A0A0B8] hover:text-white transition-colors"
        >
          <Crosshair size={18} />
        </button>
        <button
          onClick={() => setShowPlanes(!showPlanes)}
          className={cn(
            'w-11 h-11 rounded-xl flex items-center justify-center transition-all',
            showPlanes
              ? 'bg-[#4F8EF7] text-white shadow-[0_6px_18px_-4px_rgba(79,142,247,0.55)]'
              : 'glass-strong text-[#A0A0B8] hover:text-white'
          )}
        >
          <Layers size={18} />
        </button>
      </div>

      {/* Leyenda temperatura */}
      <div className="absolute bottom-24 left-4 z-10 glass-strong rounded-2xl px-3 py-2.5 space-y-1.5">
        {[
          { color: '#4F8EF7', label: 'Tranquilo' },
          { color: '#F39C12', label: 'Animado' },
          { color: '#E94560', label: 'Lleno' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_6px_currentColor]" style={{ background: color, color }} />
            <span className="text-[10px] font-medium text-[#A0A0B8] tracking-wide">{label}</span>
          </div>
        ))}
      </div>

      {/* Bottom sheet del local seleccionado */}
      {localSeleccionado && (
        <LocalBottomSheet local={localSeleccionado} onClose={() => setLocalSeleccionado(null)} />
      )}

      {/* Panel de filtros */}
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
