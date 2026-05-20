import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Local, UsuarioLocal } from '@/types'

interface LocalPanelState {
  local: Local | null
  trabajador: UsuarioLocal | null
  isAuthenticated: boolean
  setLocal: (l: Local | null) => void
  setTrabajador: (t: UsuarioLocal | null) => void
  logout: () => void
}

export const useLocalPanelStore = create<LocalPanelState>()(
  persist(
    (set) => ({
      local: null,
      trabajador: null,
      isAuthenticated: false,
      setLocal: (local) => set({ local }),
      setTrabajador: (trabajador) => set({ trabajador, isAuthenticated: !!trabajador }),
      logout: () => set({ local: null, trabajador: null, isAuthenticated: false }),
    }),
    {
      name: 'fv-local-panel',
      partialize: (state) => ({ trabajador: state.trabajador, local: state.local }),
    }
  )
)
