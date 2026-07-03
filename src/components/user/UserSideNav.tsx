'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Compass, Trophy, Ticket, User, Search, Bell } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemoStore } from '@/lib/stores/useDemoStore'

const tabs = [
  { href: '/explorar', icon: Compass, label: 'Explorar' },
  { href: '/mapa',     icon: Map,     label: 'Mapa' },
  { href: '/ranking',  icon: Trophy,  label: 'Ranking' },
  { href: '/entradas', icon: Ticket,  label: 'Entradas' },
  { href: '/perfil',   icon: User,    label: 'Perfil' },
]

// Rail lateral fijo para escritorio (≥ lg). En móvil/tablet se usa UserBottomNav.
export function UserSideNav() {
  const pathname = usePathname()
  const noLeidas = useDemoStore(s => s.notificaciones.filter(n => !n.leida).length)
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[244px] flex-col border-r border-white/8 bg-[#0D0F15] px-4 py-6">
      <Link href="/explorar" className="flex items-center gap-2.5 px-2 mb-7">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-black text-lg text-display">T</span>
        <span className="text-[19px] font-black text-white text-display tracking-tight">Tourneum</span>
      </Link>

      <Link href="/buscar" className="flex items-center gap-2.5 px-3 h-10 mb-2 rounded-xl border border-white/10 text-[#8B8BA8] hover:text-white hover:border-white/20 transition-colors text-sm">
        <Search size={16} /> Buscar
      </Link>

      <Link href="/notificaciones" className={cn(
        'flex items-center gap-2.5 px-3 h-10 mb-2 rounded-xl text-sm font-semibold transition-colors',
        pathname === '/notificaciones' ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
      )}>
        <span className="relative inline-flex">
          <Bell size={16} />
          {noLeidas > 0 && <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#FF3D71] text-white text-[9px] font-bold flex items-center justify-center font-mono-num">{noLeidas}</span>}
        </span>
        Notificaciones
      </Link>

      <nav className="flex flex-col gap-1 mt-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 h-11 rounded-xl text-[15px] font-semibold transition-colors',
                active ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
              )}>
              <Icon size={20} strokeWidth={active ? 2.4 : 1.9} /> {label}
            </Link>
          )
        })}
      </nav>

      {/* Los jugadores NO crean torneos: organizar vive en la consola del TO */}
      <Link href="/consola"
        className="mt-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-white/12 text-[12px] text-[#8B8BA8] hover:text-white hover:border-white/25 transition-colors">
        <Trophy size={15} className="shrink-0 text-[#B6FF3A]" />
        <span>¿Organizas torneos?<br /><span className="font-bold text-[#B8B8CC]">Abre tu consola de TO</span></span>
      </Link>

      <div className="mt-4 px-2 text-[11px] text-[#6B6B82]">
        <p className="font-semibold text-[#8B8BA8]">Tourneum</p>
        <p>Tu circuito de torneos</p>
      </div>
    </aside>
  )
}
