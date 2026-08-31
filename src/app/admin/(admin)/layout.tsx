'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAdminStore } from '@/lib/stores/useAdminStore'
import { LayoutDashboard, Store, Users, Shield, Star, Settings, LogOut, Megaphone } from '@/components/todh/iconosTorneum'
import { FileText, LifeBuoy } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/locales', icon: Store, label: 'Sedes' },
  { href: '/admin/usuarios', icon: Users, label: 'Jugadores' },
  { href: '/admin/rrpp', icon: Megaphone, label: 'Organizadores' },
  { href: '/admin/soporte', icon: LifeBuoy, label: 'Soporte' },
  { href: '/admin/moderacion', icon: Shield, label: 'Moderación' },
  { href: '/admin/tiers', icon: Star, label: 'Tiers' },
  { href: '/admin/auditoria', icon: FileText, label: 'Auditoría' },
  { href: '/admin/configuracion', icon: Settings, label: 'Config' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, admin, hydrated, logout } = useAdminStore()

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/admin/login')
  }, [hydrated, isAuthenticated, router])

  // La sesión de Supabase es única para los 4 paneles; si entraste a otro panel
  // después, el store del admin persiste pero la sesión real es otra. Realineamos.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !admin?.email) return
    let cancelado = false
    ;(async () => {
      const { supabase } = await import('@/lib/supabase/client')
      const { data, error } = await supabase.auth.getUser()
      if (cancelado || error) return
      const sesion = data.user?.email?.trim().toLowerCase()
      if (sesion !== admin.email.trim().toLowerCase()) {
        logout()
        router.replace('/admin/login')
      }
    })()
    return () => { cancelado = true }
  }, [hydrated, isAuthenticated, admin?.email, logout, router])

  if (!hydrated) return null
  if (!isAuthenticated || !admin) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-60 flex-col fixed left-0 top-0 bottom-0 z-20 glass-strong border-r border-white/8">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#4F8EF7] to-[#7C5CFF] flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white text-display">Admin</p>
              <p className="text-[10px] text-[#A0A0B8] capitalize tracking-wider">{admin.rol?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active ? 'bg-[#4F8EF7]/12 text-[#4F8EF7] font-semibold' : 'text-[#A0A0B8] hover:bg-white/5 hover:text-white'
                )}>
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#4F8EF7] rounded-r-full shadow-[0_0_6px_rgba(79,142,247,0.6)]" />}
                <Icon size={16} strokeWidth={active ? 2.4 : 1.6} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/8 space-y-0.5">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A0A0B8] hover:text-[#B6FF3A] hover:bg-[#B6FF3A]/8 transition-colors">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-60 min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn('relative flex flex-col items-center gap-0.5 py-2 px-2', active ? 'text-[#4F8EF7]' : 'text-[#6B6B85]')}>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#4F8EF7] rounded-full shadow-[0_0_8px_rgba(79,142,247,0.6)]" />
                )}
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
