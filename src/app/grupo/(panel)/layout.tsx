'use client'
import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useGrupoStore } from '@/lib/stores/useGrupoStore'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, Store, Users, LogOut, Building, Megaphone } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function GrupoPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, miembro, hydrated, logout } = useGrupoStore()
  const esPropietario = miembro?.rol === 'propietario'

  const navItems = useMemo(() => {
    const base = [
      { href: '/grupo/dashboard', icon: LayoutDashboard, label: 'Resumen' },
      { href: '/grupo/locales', icon: Store, label: 'Locales' },
      { href: '/grupo/rrpp', icon: Megaphone, label: 'RRPP' },
    ]
    if (esPropietario) base.push({ href: '/grupo/equipo', icon: Users, label: 'Equipo' })
    return base
  }, [esPropietario])

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/grupo/login')
  }, [hydrated, isAuthenticated, router])

  // Realineación de sesión (las superficies comparten una sola sesión Supabase).
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !miembro?.email) return
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (cancelado || error) return
      const sesion = data.user?.email?.trim().toLowerCase()
      if (sesion !== miembro.email.trim().toLowerCase()) {
        logout()
        router.replace('/grupo/login')
      }
    })()
    return () => { cancelado = true }
  }, [hydrated, isAuthenticated, miembro?.email, logout, router])

  if (!hydrated) return null
  if (!isAuthenticated || !miembro) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    router.push('/grupo/login')
  }

  const rolLabel = esPropietario ? 'Propietario' : 'Manager'

  return (
    <div className="min-h-screen flex bg-[#0C0E13]">
      <aside className="hidden md:flex w-60 flex-col fixed left-0 top-0 bottom-0 z-20 glass-strong border-r border-white/8">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EF7] to-[#7C5CFF] flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(79,142,247,0.6)]">
              <Building size={16} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#4F8EF7]">{rolLabel}</p>
              <p className="text-sm font-semibold text-white truncate">{miembro.grupo?.nombre || 'Grupo'}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn('relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active ? 'bg-[#4F8EF7]/12 text-[#4F8EF7] font-semibold' : 'text-[#A0A0B8] hover:bg-white/5 hover:text-white')}>
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#4F8EF7] rounded-r-full shadow-[0_0_6px_rgba(79,142,247,0.6)]" />}
                <Icon size={16} strokeWidth={active ? 2.4 : 1.6} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/8">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A0A0B8] hover:text-[#B6FF3A] hover:bg-[#B6FF3A]/8 transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-20 glass-strong border-b border-white/8 safe-top w-full">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#4F8EF7] to-[#7C5CFF] flex items-center justify-center">
              <Building size={15} className="text-white" />
            </div>
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#4F8EF7]">{rolLabel}</p>
              <p className="text-sm font-semibold text-white truncate max-w-[40vw]">{miembro.grupo?.nombre || 'Grupo'}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#B8B8CC] hover:text-[#B6FF3A] transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 md:ml-60 min-h-screen pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {navItems.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn('relative flex flex-col items-center gap-0.5 py-2 px-3', active ? 'text-[#4F8EF7]' : 'text-[#6B6B85]')}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4F8EF7] rounded-full shadow-[0_0_8px_rgba(79,142,247,0.6)]" />}
                <Icon size={20} strokeWidth={active ? 2.4 : 1.75} />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
