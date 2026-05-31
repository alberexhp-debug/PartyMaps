'use client'
import { useEffect, useMemo, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import {
  LayoutDashboard, Settings, Calendar, Bell,
  Star, BarChart3, Users, CreditCard, LogOut, MessageSquare,
  Beer, Gauge, MoreHorizontal, X, LayoutGrid, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLES_PERMISOS, ROL_LABEL, homeDeRol, type ZonaPanel } from '@/lib/permisosLocal'

type NavItem = { zona: ZonaPanel; href: string; icon: React.ElementType; label: string }
type NavGroup = { titulo: string; items: NavItem[] }

const NAV_GROUPS: NavGroup[] = [
  {
    titulo: 'Inicio',
    items: [
      { zona: 'dashboard', href: '/local-panel/dashboard', icon: LayoutDashboard, label: 'Resumen' },
    ],
  },
  {
    titulo: 'La noche',
    items: [
      { zona: 'scanner',     href: '/local-panel/scanner',     icon: Gauge, label: 'Aforo & Puerta' },
      { zona: 'pedidos-bar', href: '/local-panel/pedidos-bar', icon: Beer,  label: 'Barra' },
      { zona: 'sala',        href: '/local-panel/sala',        icon: LayoutGrid, label: 'Sala & Mesas' },
    ],
  },
  {
    titulo: 'Crecimiento',
    items: [
      { zona: 'eventos',        href: '/local-panel/eventos',        icon: Calendar,    label: 'Eventos' },
      { zona: 'rrpp',           href: '/local-panel/rrpp',           icon: Sparkles,    label: 'RRPP' },
      { zona: 'notificaciones', href: '/local-panel/notificaciones', icon: Bell,        label: 'Notificaciones' },
    ],
  },
  {
    titulo: 'Audiencia',
    items: [
      { zona: 'analytics',   href: '/local-panel/analytics',   icon: BarChart3,     label: 'Analítica' },
      { zona: 'reviews',     href: '/local-panel/reviews',     icon: Star,          label: 'Reseñas' },
      { zona: 'sugerencias', href: '/local-panel/sugerencias', icon: MessageSquare, label: 'Sugerencias' },
    ],
  },
  {
    titulo: 'Negocio',
    items: [
      { zona: 'facturacion',   href: '/local-panel/facturacion',   icon: CreditCard, label: 'Facturación' },
      { zona: 'equipo',        href: '/local-panel/equipo',        icon: Users,      label: 'Equipo' },
      { zona: 'configuracion', href: '/local-panel/configuracion', icon: Settings,   label: 'Configuración' },
    ],
  },
]

function zonaActual(pathname: string): ZonaPanel | null {
  const m = pathname.match(/^\/local-panel\/([^/]+)/)
  return m ? (m[1] as ZonaPanel) : null
}

export default function LocalPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, local, trabajador, logout } = useLocalPanelStore()
  const rol = trabajador?.rol
  const [showMas, setShowMas] = useState(false)

  // Grupos filtrados por permisos del rol (se ocultan grupos vacíos)
  const grupos = useMemo<NavGroup[]>(() => {
    if (!rol) return []
    const permitidas = ROLES_PERMISOS[rol]
    return NAV_GROUPS
      .map(g => ({ ...g, items: g.items.filter(it => permitidas.includes(it.zona)) }))
      .filter(g => g.items.length > 0)
  }, [rol])

  // Lista plana en orden de grupo (para la barra inferior móvil)
  const itemsPlanos = useMemo(() => grupos.flatMap(g => g.items), [grupos])

  useEffect(() => {
    if (!isAuthenticated) { router.push('/local-panel/login'); return }
    if (!rol) return
    const zona = zonaActual(pathname)
    if (zona && !ROLES_PERMISOS[rol].includes(zona)) {
      router.replace(`/local-panel/${homeDeRol(rol)}`)
    }
  }, [isAuthenticated, rol, pathname, router])

  useEffect(() => { setShowMas(false) }, [pathname])

  if (!isAuthenticated || !local || !rol) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/local-panel/login')
  }

  const esActivo = (href: string) => pathname === href || pathname.startsWith(href + '/')

  // En móvil mostramos hasta 4 accesos directos; si hay más, el 5º es "Más"
  const directosMovil = itemsPlanos.length <= 5 ? itemsPlanos : itemsPlanos.slice(0, 4)
  const hayMas = itemsPlanos.length > 5

  return (
    <div className="min-h-screen flex">
      {/* ───────────── Sidebar (escritorio) ───────────── */}
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

        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-hide">
          {grupos.map(grupo => (
            <div key={grupo.titulo}>
              {/* El grupo "Inicio" no necesita encabezado */}
              {grupo.titulo !== 'Inicio' && (
                <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6B85]">{grupo.titulo}</p>
              )}
              <div className="space-y-0.5">
                {grupo.items.map(({ href, icon: Icon, label }) => {
                  const active = esActivo(href)
                  return (
                    <Link key={href} href={href}
                      className={cn(
                        'group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                        active ? 'bg-[#E94560]/12 text-[#E94560] font-semibold' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
                      )}>
                      {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#E94560] rounded-r-full shadow-[0_0_6px_rgba(233,69,96,0.6)]" />}
                      <Icon size={18} strokeWidth={active ? 2.4 : 1.6} />
                      {label}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-white/8">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#B8B8CC] hover:text-[#E94560] hover:bg-[#E94560]/8 transition-colors">
            <LogOut size={18} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen pb-20 md:pb-0">
        {children}
      </main>

      {/* ───────────── Barra inferior (móvil) ───────────── */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {directosMovil.map(({ href, icon: Icon, label }) => {
            const active = esActivo(href)
            return (
              <Link key={href} href={href} aria-label={label} aria-current={active ? 'page' : undefined}
                className={cn('relative flex flex-col items-center gap-0.5 py-2 px-2', active ? 'text-[#E94560]' : 'text-[#8B8BA8]')}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E94560] rounded-full shadow-[0_0_8px_rgba(233,69,96,0.6)]" />}
                <Icon size={20} strokeWidth={active ? 2.4 : 1.75} />
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            )
          })}
          {hayMas && (
            <button onClick={() => setShowMas(true)} aria-label="Más secciones"
              className={cn('flex flex-col items-center gap-0.5 py-2 px-2', showMas ? 'text-[#E94560]' : 'text-[#8B8BA8]')}>
              <MoreHorizontal size={20} strokeWidth={1.75} />
              <span className="text-[9px] font-medium">Más</span>
            </button>
          )}
          {!hayMas && itemsPlanos.length <= 2 && (
            <button onClick={handleLogout} aria-label="Cerrar sesión"
              className="flex flex-col items-center gap-0.5 py-2 px-2 text-[#8B8BA8]">
              <LogOut size={20} strokeWidth={1.75} />
              <span className="text-[9px] font-medium">Salir</span>
            </button>
          )}
        </div>
      </nav>

      {/* ───────────── Sheet "Más" (móvil) ───────────── */}
      {showMas && (
        <div className="fixed inset-0 z-50 md:hidden flex items-end animate-fade-in" onClick={() => setShowMas(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full glass-strong rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slide-up safe-bottom"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <p className="text-display font-bold text-white">Todas las secciones</p>
              <button onClick={() => setShowMas(false)} className="p-1.5 text-[#8B8BA8] hover:text-white"><X size={20} /></button>
            </div>
            <div className="px-4 pb-4 space-y-4">
              {grupos.map(grupo => (
                <div key={grupo.titulo}>
                  <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6B85]">{grupo.titulo}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {grupo.items.map(({ href, icon: Icon, label }) => {
                      const active = esActivo(href)
                      return (
                        <Link key={href} href={href}
                          className={cn('flex flex-col items-center gap-1.5 p-3 rounded-2xl border text-center',
                            active ? 'bg-[#E94560]/12 border-[#E94560]/30 text-[#E94560]' : 'bg-white/[0.03] border-white/[0.07] text-[#B8B8CC]')}>
                          <Icon size={20} strokeWidth={active ? 2.4 : 1.7} />
                          <span className="text-[11px] font-medium leading-tight">{label}</span>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
              <button onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-2xl border border-white/10 text-sm text-[#B8B8CC] hover:text-[#E94560] hover:border-[#E94560]/30 transition-colors">
                <LogOut size={17} /> Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
