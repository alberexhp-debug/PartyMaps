'use client'
import { useEffect } from 'react'
// (sin cliente Supabase: proyecto retirado — ver nota de abajo)
import { useAuthStore } from '@/lib/stores/useAuthStore'
import type { Usuario } from '@/types'

// ───────────────────────────────────────────────────────────────────────────
// MODO DEMO (login desactivado temporalmente, jun-2026): sin sesión navegamos
// como INVITADO para poder ver toda la app sin muros de login.
// Para REACTIVAR el login: volver a `setUsuario(null)` en las dos ramas `else`
// de abajo y quitar el fallback `?? INVITADO`.
// ───────────────────────────────────────────────────────────────────────────
const INVITADO = {
  id: '00000000-0000-0000-0000-000000000000',
  nombre: 'Invitado',
  fecha_nacimiento: '2000-01-01',
  telefono_verificado: false,
  reputacion_num_valoraciones: 0,
  estado_cuenta: 'activo',
  prefs_notificaciones: {},
  auth_provider: 'ninguno',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
} as unknown as Usuario

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUsuario } = useAuthStore()

  // El proyecto Supabase de Rumbo YA NO EXISTE: llamar a getSession() aquí
  // hacía que los navegadores con sesión guardada pelearan con reintentos
  // contra un host muerto en cada carga. La demo navega SIEMPRE como Invitado
  // y no toca Supabase. Al montar el backend nuevo, restaurar el flujo de
  // sesión (getSession + onAuthStateChange + fetchUsuario) de git.
  useEffect(() => {
    setUsuario(INVITADO)
  }, [setUsuario])

  return <>{children}</>
}
