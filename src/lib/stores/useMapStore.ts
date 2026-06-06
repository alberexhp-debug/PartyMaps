import { create } from 'zustand'
import { FiltrosMapa, LocalConAforo } from '@/types'

interface MapState {
  locales: LocalConAforo[]
  localSeleccionado: LocalConAforo | null
  filtros: FiltrosMapa
  mapLoaded: boolean
  showPlanes: boolean
  setLocales: (l: LocalConAforo[]) => void
  setLocalSeleccionado: (l: LocalConAforo | null) => void
  setFiltros: (f: Partial<FiltrosMapa>) => void
  clearFiltros: () => void
  setMapLoaded: (v: boolean) => void
  setShowPlanes: (v: boolean) => void
}

const filtrosDefault: FiltrosMapa = {
  tipos: [],
  musica: [],
  precio_min: undefined,
  precio_max: undefined,
  solo_con_evento: false,
  solo_con_planes: false,
  solo_abiertos: false,
}

export const useMapStore = create<MapState>((set) => ({
  locales: [],
  localSeleccionado: null,
  filtros: filtrosDefault,
  mapLoaded: false,
  showPlanes: false,
  setLocales: (locales) => set({ locales }),
  setLocalSeleccionado: (localSeleccionado) => set({ localSeleccionado }),
  setFiltros: (f) => set((state) => ({ filtros: { ...state.filtros, ...f } })),
  clearFiltros: () => set({ filtros: filtrosDefault }),
  setMapLoaded: (mapLoaded) => set({ mapLoaded }),
  setShowPlanes: (showPlanes) => set({ showPlanes }),
}))
