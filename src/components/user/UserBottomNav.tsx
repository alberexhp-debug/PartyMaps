'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Users, Ticket, Bell, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/explorar', icon: Map, label: 'Explorar' },
  { href: '/planes', icon: Users, label: 'Planes' },
  { href: '/entradas', icon: Ticket, label: 'Entradas' },
  { href: '/suscritos', icon: Bell, label: 'Suscritos' },
  { href: '/perfil', icon: User, label: 'Perfil' },
]

export function UserBottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 safe-bottom">
      <div className="absolute inset-0 bg-gradient-to-t from-[#08080F] via-[#08080F]/95 to-[#08080F]/0 pointer-events-none" />
      <div className="relative glass-strong border-t border-white/8 mx-auto">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {tabs.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || (href !== '/explorar' && pathname.startsWith(href))
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 px-3 rounded-xl transition-all min-w-[56px]',
                  active ? 'text-[#E94560]' : 'text-[#6B6B85] hover:text-white'
                )}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#E94560] rounded-full shadow-[0_0_8px_rgba(233,69,96,0.6)]" />
                )}
                <Icon size={22} strokeWidth={active ? 2.4 : 1.75} />
                <span className={cn('text-[10px] font-medium tracking-wide', active ? 'text-[#E94560]' : 'text-current')}>
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
