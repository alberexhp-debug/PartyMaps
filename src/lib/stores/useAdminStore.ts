import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Administrador } from '@/types'

interface AdminState {
  admin: Administrador | null
  isAuthenticated: boolean
  /** false hasta que zustand rehidrata localStorage. Evita el logout al refrescar. */
  hydrated: boolean
  setAdmin: (a: Administrador | null) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      hydrated: false,
      setAdmin: (admin) => set({ admin, isAuthenticated: !!admin }),
      logout: () => set({ admin: null, isAuthenticated: false }),
    }),
    {
      name: 'fv-admin',
      partialize: (state) => ({ admin: state.admin }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isAuthenticated = !!state.admin
          state.hydrated = true
        }
      },
    }
  )
)
