import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Usuario } from '@/types'

interface AuthState {
  usuario: Usuario | null
  isLoading: boolean
  isAuthenticated: boolean
  setUsuario: (u: Usuario | null) => void
  setLoading: (v: boolean) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      usuario: null,
      isLoading: true,
      isAuthenticated: false,
      setUsuario: (usuario) => set({ usuario, isAuthenticated: !!usuario, isLoading: false }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () => set({ usuario: null, isAuthenticated: false }),
    }),
    {
      name: 'fv-auth',
      partialize: (state) => ({ usuario: state.usuario }),
    }
  )
)
