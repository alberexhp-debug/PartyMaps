'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { supabase } from '@/lib/supabase/client'
import { LogOut } from 'lucide-react'

export default function GestorPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { isAuthenticated, gestor, hydrated, logout } = useGestorStore()

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/gestor/login')
  }, [hydrated, isAuthenticated, router])

  // Verifica que la sesión de Supabase corresponde a este gestor. Las 4
  // superficies comparten una sola sesión; si entraste a otro panel (admin,
  // local...) después, el store del gestor sigue diciendo "gestor" pero la
  // sesión es otra → las APIs del gestor responden "No autorizado". Realineamos.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !gestor?.email) return
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (cancelado || error) return
      const sesion = data.user?.email?.trim().toLowerCase()
      if (sesion !== gestor.email.trim().toLowerCase()) {
        logout()
        router.replace('/gestor/login')
      }
    })()
    return () => { cancelado = true }
  }, [hydrated, isAuthenticated, gestor?.email, logout, router])

  if (!hydrated) return null
  if (!isAuthenticated || !gestor) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/gestor/login')
  }

  return (
    <div className="min-h-screen bg-[#07070D]">
      <header className="sticky top-0 z-20 glass-strong border-b border-white/8 safe-top">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl holo-bg shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
              <span className="text-sm font-black text-white">R</span>
            </div>
            <div className="leading-tight">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#7C5CFF]">RumboGestor</p>
              <p className="text-sm font-semibold text-white truncate max-w-[40vw]">{gestor.nombre}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-sm text-[#B8B8CC] hover:text-[#E94560] transition-colors"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
