'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAdminStore } from '@/lib/stores/useAdminStore'
import {
  LayoutDashboard, Store, Users, Shield, Star,
  Settings, LogOut, FileText,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/admin/locales', icon: Store, label: 'Locales' },
  { href: '/admin/usuarios', icon: Users, label: 'Usuarios' },
  { href: '/admin/moderacion', icon: Shield, label: 'Moderación' },
  { href: '/admin/tiers', icon: Star, label: 'Tiers' },
  { href: '/admin/auditoria', icon: FileText, label: 'Auditoría' },
  { href: '/admin/configuracion', icon: Settings, label: 'Config' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, admin, logout } = useAdminStore()

  useEffect(() => {
    if (!isAuthenticated) router.push('/admin/login')
  }, [isAuthenticated, router])

  if (!isAuthenticated || !admin) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/admin/login')
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-56 flex-col fixed left-0 top-0 bottom-0 bg-[#1A1A2E] border-r border-[#2A2A3E] z-20">
        <div className="p-4 border-b border-[#2A2A3E]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4F8EF7] rounded-lg flex items-center justify-center">
              <Shield size={16} className="text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Admin Panel</p>
              <p className="text-[10px] text-[#505065] capitalize">{admin.rol?.replace('_', ' ')}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  active ? 'bg-[#4F8EF7]/10 text-[#4F8EF7] font-semibold' : 'text-[#A0A0B8] hover:bg-[#0D0D1A] hover:text-white'
                )}>
                <Icon size={16} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-[#2A2A3E]">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#505065] hover:text-red-400 hover:bg-red-400/10">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-56 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-[#1A1A2E] border-t border-[#2A2A3E] md:hidden">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn('flex flex-col items-center gap-0.5 py-2 px-2', active ? 'text-[#4F8EF7]' : 'text-[#505065]')}>
                <Icon size={20} strokeWidth={active ? 2.5 : 1.5} />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
