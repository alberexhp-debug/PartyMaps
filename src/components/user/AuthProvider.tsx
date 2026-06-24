'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
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

  useEffect(() => {
    const fetchUsuario = async (authId: string) => {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', authId)
        .single()
      setUsuario(data ?? INVITADO)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUsuario(session.user.id)
      else setUsuario(INVITADO)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUsuario(session.user.id)
      else setUsuario(INVITADO)
    })

    return () => subscription.unsubscribe()
  }, [setUsuario])

  return <>{children}</>
}
