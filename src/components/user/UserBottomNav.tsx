'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Compass, Trophy, Ticket, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/explorar', icon: Compass, label: 'Explorar' },
  { href: '/mapa',     icon: Map,     label: 'Mapa' },
  { href: '/ranking',  icon: Trophy,  label: 'Ranking' },
  { href: '/entradas', icon: Ticket,  label: 'Entradas' },
  { href: '/perfil',   icon: User,    label: 'Perfil' },
]

export function UserBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15]/95 to-[#0D0F15]/0 pointer-events-none" />
      <div className="relative glass-strong border-t border-white/8 mx-auto">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px]',
                  active ? 'text-[#B6FF3A]' : 'text-[#8B8BA8] hover:text-white'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#B6FF3A] rounded-full shadow-[0_0_8px_rgba(182, 255, 58,0.6)]" />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 1.75} />
                <span className={cn('text-[10px] font-medium tracking-wide', active ? 'text-[#B6FF3A]' : 'text-current')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
