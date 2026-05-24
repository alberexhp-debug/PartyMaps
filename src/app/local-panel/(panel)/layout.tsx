'use client'
import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import {
  LayoutDashboard, Store, Calendar, QrCode, Bell,
  Star, BarChart3, Users, CreditCard, LogOut, Trophy, Target, MessageSquare,
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
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="hidden md:flex w-64 flex-col fixed left-0 top-0 bottom-0 z-20 glass-strong border-r border-white/8">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 border border-white/10 ring-1 ring-[#E94560]/30">
              <img src={local.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate text-display">{local.nombre}</p>
              <p className="text-xs text-[#A0A0B8] truncate">{trabajador?.nombre}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active
                    ? 'bg-[#E94560]/12 text-[#E94560] font-semibold'
                    : 'text-[#A0A0B8] hover:bg-white/5 hover:text-white'
                )}
              >
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#E94560] rounded-r-full shadow-[0_0_6px_rgba(233,69,96,0.6)]" />}
                <Icon size={18} strokeWidth={active ? 2.4 : 1.6} />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="p-3 border-t border-white/8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A0A0B8] hover:text-[#E94560] hover:bg-[#E94560]/8 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 px-2',
                  active ? 'text-[#E94560]' : 'text-[#6B6B85]'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E94560] rounded-full shadow-[0_0_8px_rgba(233,69,96,0.6)]" />
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
