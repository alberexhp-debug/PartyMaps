import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Administrador } from '@/types'

interface AdminState {
  admin: Administrador | null
  isAuthenticated: boolean
  setAdmin: (a: Administrador | null) => void
  logout: () => void
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set) => ({
      admin: null,
      isAuthenticated: false,
      setAdmin: (admin) => set({ admin, isAuthenticated: !!admin }),
      logout: () => set({ admin: null, isAuthenticated: false }),
    }),
    {
      name: 'fv-admin',
      partialize: (state) => ({ admin: state.admin }),
    }
  )
)
