import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Gestor } from '@/types'

interface GestorState {
  gestor: Gestor | null
  isAuthenticated: boolean
  /** false hasta que zustand rehidrata localStorage. Evita redirigir a login
   *  antes de saber si hay sesión persistida (bug de logout al refrescar). */
  hydrated: boolean
  setGestor: (g: Gestor | null) => void
  logout: () => void
}

export const useGestorStore = create<GestorState>()(
  persist(
    (set) => ({
      gestor: null,
      isAuthenticated: false,
      hydrated: false,
      setGestor: (gestor) => set({ gestor, isAuthenticated: !!gestor }),
      logout: () => set({ gestor: null, isAuthenticated: false }),
    }),
    {
      name: 'rumbo-gestor',
      partialize: (state) => ({ gestor: state.gestor }),
      // Al rehidratar: recomputar isAuthenticated desde el gestor persistido
      // y marcar hydrated. partialize NO guarda isAuthenticated, así que sin
      // esto siempre quedaría en false tras un refresh.
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.gestor
          state.hydrated = true
        }
      },
    }
  )
)
