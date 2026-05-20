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
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-[#0D0D1A]/95 backdrop-blur-md border-t border-[#2A2A3E] safe-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== '/explorar' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-all min-w-[56px]',
                active ? 'text-[#E94560]' : 'text-[#505065]'
              )}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.5} />
              <span className={cn('text-[10px] font-medium', active ? 'text-[#E94560]' : 'text-[#505065]')}>
                {label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
