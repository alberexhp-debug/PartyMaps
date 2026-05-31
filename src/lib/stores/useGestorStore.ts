import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Gestor } from '@/types'

interface GestorState {
  gestor: Gestor | null
  isAuthenticated: boolean
  setGestor: (g: Gestor | null) => void
  logout: () => void
}

export const useGestorStore = create<GestorState>()(
  persist(
    (set) => ({
      gestor: null,
      isAuthenticated: false,
      setGestor: (gestor) => set({ gestor, isAuthenticated: !!gestor }),
      logout: () => set({ gestor: null, isAuthenticated: false }),
    }),
    {
      name: 'rumbo-gestor',
      partialize: (state) => ({ gestor: state.gestor }),
    }
  )
)
