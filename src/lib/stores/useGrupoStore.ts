import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GrupoMiembro } from '@/types'

interface GrupoState {
  miembro: GrupoMiembro | null
  isAuthenticated: boolean
  /** false hasta que zustand rehidrata localStorage (evita logout al refrescar). */
  hydrated: boolean
  setMiembro: (m: GrupoMiembro | null) => void
  logout: () => void
}

export const useGrupoStore = create<GrupoState>()(
  persist(
    (set) => ({
      miembro: null,
      isAuthenticated: false,
      hydrated: false,
      setMiembro: (miembro) => set({ miembro, isAuthenticated: !!miembro }),
      logout: () => set({ miembro: null, isAuthenticated: false }),
    }),
    {
      name: 'rumbo-grupo',
      partialize: (state) => ({ miembro: state.miembro }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.miembro
          state.hydrated = true
        }
      },
    }
  )
)
