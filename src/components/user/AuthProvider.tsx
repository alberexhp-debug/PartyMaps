'use client'
import { useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuthStore } from '@/lib/stores/useAuthStore'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUsuario, setLoading } = useAuthStore()

  useEffect(() => {
    const fetchUsuario = async (authId: string) => {
      const { data } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_id', authId)
        .single()
      setUsuario(data)
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchUsuario(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchUsuario(session.user.id)
      else setUsuario(null)
    })

    return () => subscription.unsubscribe()
  }, [setUsuario, setLoading])

  return <>{children}</>
}
