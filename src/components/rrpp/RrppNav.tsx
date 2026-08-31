'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Ticket } from '@/components/todh/iconosTorneum'
import { Home, MapPinned, ClipboardList } from 'lucide-react'
import { cn } from '@/lib/utils'

const ITEMS = [
  { href: '/rrpp', icon: Home, label: 'Inicio' },
  { href: '/rrpp/descubrir', icon: MapPinned, label: 'Descubrir' },
  { href: '/rrpp/codigos', icon: Ticket, label: 'Códigos' },
  { href: '/rrpp/listas', icon: ClipboardList, label: 'Listas' },
]

/** Barra inferior del panel RRPP. Solo se muestra con perfil completo. */
export function RrppNav() {
  const pathname = usePathname()
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-white/8 safe-bottom">
      <div className="max-w-md mx-auto flex items-center justify-around h-16">
        {ITEMS.map(({ href, icon: Icon, label }) => {
          const active = href === '/rrpp' ? pathname === '/rrpp' : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={cn('relative flex flex-col items-center gap-0.5 py-2 px-5', active ? 'text-[#B6FF3A]' : 'text-[#6B6B85]')}>
              {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#B6FF3A] rounded-full shadow-[0_0_8px_rgba(182, 255, 58,0.6)]" />}
              <Icon size={20} strokeWidth={active ? 2.4 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
