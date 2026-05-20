'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import {
  LayoutDashboard, Store, Calendar, QrCode, Bell,
  Star, BarChart3, Users, CreditCard, LogOut, Trophy, Target, MessageSquare
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/local-panel/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/local-panel/mi-local', icon: Store, label: 'Mi local' },
  { href: '/local-panel/eventos', icon: Calendar, label: 'Eventos' },
  { href: '/local-panel/scanner', icon: QrCode, label: 'Scanner' },
  { href: '/local-panel/concursos', icon: Trophy, label: 'Concursos' },
  { href: '/local-panel/retos', icon: Target, label: 'Retos' },
  { href: '/local-panel/sugerencias', icon: MessageSquare, label: 'Sugerencias' },
  { href: '/local-panel/notificaciones', icon: Bell, label: 'Notificaciones' },
  { href: '/local-panel/reviews', icon: Star, label: 'Reseñas' },
  { href: '/local-panel/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/local-panel/equipo', icon: Users, label: 'Equipo' },
  { href: '/local-panel/facturacion', icon: CreditCard, label: 'Facturación' },
]

export default function LocalPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, local, trabajador, logout } = useLocalPanelStore()

  useEffect(() => {
    if (!isAuthenticated) router.push('/local-panel/login')
  }, [isAuthenticated, router])

  if (!isAuthenticated || !local) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/local-panel/login')
  }

  return (
    <div className="min-h-screen bg-[#0D0D1A] flex">
      {/* Sidebar — oculto en móvil, visible en md+ */}
      <aside className="hidden md:flex w-60 flex-col fixed left-0 top-0 bottom-0 bg-[#1A1A2E] border-r border-[#2A2A3E] z-20">
        {/* Local info */}
        <div className="p-4 border-b border-[#2A2A3E]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#2A2A3E]">
              <img src={local.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{local.nombre}</p>
              <p className="text-xs text-[#505065] truncate">{trabajador?.nombre}</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                  active
                    ? 'bg-[#E94560]/10 text-[#E94560] font-semibold'
                    : 'text-[#A0A0B8] hover:bg-[#0D0D1A] hover:text-white'
                )}
              >
                <Icon size={18} strokeWidth={active ? 2.5 : 1.5} />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-[#2A2A3E]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#505065] hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 md:ml-60 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav — first 5 items */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 bg-[#1A1A2E] border-t border-[#2A2A3E] md:hidden">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-col items-center gap-0.5 py-2 px-2',
                  active ? 'text-[#E94560]' : 'text-[#505065]'
                )}
              >
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
