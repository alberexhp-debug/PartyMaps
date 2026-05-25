'use client'
import { useEffect, useMemo } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import {
  LayoutDashboard, Settings, Calendar, QrCode, Bell,
  Star, BarChart3, Users, CreditCard, LogOut, Trophy, Target, MessageSquare,
  Beer,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLES_PERMISOS, ROL_LABEL, homeDeRol, type ZonaPanel } from '@/lib/permisosLocal'

const NAV_ITEMS: { zona: ZonaPanel; href: string; icon: React.ElementType; label: string }[] = [
  { zona: 'dashboard',      href: '/local-panel/dashboard',      icon: LayoutDashboard, label: 'Dashboard' },
  { zona: 'eventos',        href: '/local-panel/eventos',        icon: Calendar,        label: 'Eventos' },
  { zona: 'scanner',        href: '/local-panel/scanner',        icon: QrCode,          label: 'Scanner' },
  { zona: 'pedidos-bar',    href: '/local-panel/pedidos-bar',    icon: Beer,            label: 'Bar — Pedidos' },
  { zona: 'concursos',      href: '/local-panel/concursos',      icon: Trophy,          label: 'Concursos' },
  { zona: 'retos',          href: '/local-panel/retos',          icon: Target,          label: 'Retos' },
  { zona: 'sugerencias',    href: '/local-panel/sugerencias',    icon: MessageSquare,   label: 'Sugerencias' },
  { zona: 'notificaciones', href: '/local-panel/notificaciones', icon: Bell,            label: 'Notificaciones' },
  { zona: 'reviews',        href: '/local-panel/reviews',        icon: Star,            label: 'Reseñas' },
  { zona: 'analytics',      href: '/local-panel/analytics',      icon: BarChart3,       label: 'Analytics' },
  { zona: 'equipo',         href: '/local-panel/equipo',         icon: Users,           label: 'Equipo' },
  { zona: 'facturacion',    href: '/local-panel/facturacion',    icon: CreditCard,      label: 'Facturación' },
  { zona: 'configuracion',  href: '/local-panel/configuracion',  icon: Settings,        label: 'Configuración' },
]

/**
 * Devuelve la zona actual a partir del pathname. /local-panel/scanner → 'scanner'.
 */
function zonaActual(pathname: string): ZonaPanel | null {
  const m = pathname.match(/^\/local-panel\/([^/]+)/)
  return m ? (m[1] as ZonaPanel) : null
}

export default function LocalPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, local, trabajador, logout } = useLocalPanelStore()
  const rol = trabajador?.rol

  // Filtrar items del nav según permisos del rol
  const items = useMemo(() => {
    if (!rol) return []
    const permitidas = ROLES_PERMISOS[rol]
    return NAV_ITEMS.filter(it => permitidas.includes(it.zona))
  }, [rol])

  // Guard: redirigir si la zona actual no está permitida para el rol
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/local-panel/login')
      return
    }
    if (!rol) return
    const zona = zonaActual(pathname)
    if (zona && !ROLES_PERMISOS[rol].includes(zona)) {
      router.replace(`/local-panel/${homeDeRol(rol)}`)
    }
  }, [isAuthenticated, rol, pathname, router])

  if (!isAuthenticated || !local || !rol) return null

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
        <Link href={`/local-panel/${homeDeRol(rol)}`} className="p-4 border-b border-white/8 hover:bg-white/[0.03] transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl overflow-hidden bg-white/5 border border-white/10 ring-1 ring-[#E94560]/30">
              <img src={local.imagenes?.[0] || ''} alt="" className="w-full h-full object-cover"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }} />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate text-display">{local.nombre}</p>
              <p className="text-[10px] text-[#E94560] font-bold uppercase tracking-[0.15em] mt-0.5">{ROL_LABEL[rol]}</p>
            </div>
          </div>
          <p className="text-xs text-[#B8B8CC] mt-3 truncate">{trabajador?.nombre}</p>
        </Link>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {items.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active
                    ? 'bg-[#E94560]/12 text-[#E94560] font-semibold'
                    : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white'
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
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#B8B8CC] hover:text-[#E94560] hover:bg-[#E94560]/8 transition-colors"
          >
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen pb-16 md:pb-0">
        {children}
      </main>

      {/* Mobile bottom nav — muestra hasta 5 items (los más usados del rol) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {items.slice(0, 5).map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 px-2',
                  active ? 'text-[#E94560]' : 'text-[#8B8BA8]'
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
          {/* Si solo hay 1 item (puerta, barman), añadimos botón logout en bottom nav */}
          {items.length <= 2 && (
            <button
              onClick={handleLogout}
              aria-label="Cerrar sesión"
              className="flex flex-col items-center gap-0.5 py-2 px-2 text-[#8B8BA8]"
            >
              <LogOut size={20} strokeWidth={1.75} />
              <span className="text-[9px] font-medium">Salir</span>
            </button>
          )}
        </div>
      </nav>
    </div>
  )
}
