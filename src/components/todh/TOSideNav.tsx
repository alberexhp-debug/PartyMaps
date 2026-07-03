'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Plus, Radio, Megaphone, ArrowLeft, Trophy, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getOrganizador } from '@/lib/torneos/sample'
import { useDemoStore } from '@/lib/stores/useDemoStore'

// Rail lateral del PANEL DEL TO (escritorio). Los jugadores no crean torneos:
// todo lo de organizar vive aquí, separado de la app de jugador.
const tabs = [
  { href: '/consola', icon: LayoutDashboard, label: 'Resumen', match: ['/consola', '/gestionar'] },
  { href: '/crear-torneo', icon: Plus, label: 'Crear torneo', match: ['/crear-torneo'] },
  { href: '/modo-directo', icon: Radio, label: 'Modo directo', match: ['/modo-directo'] },
  { href: '/sedes', icon: MapPin, label: 'Sedes', match: ['/sedes'] },
  { href: '/mi-pagina', icon: Megaphone, label: 'Mi página pública', match: ['/mi-pagina'] },
]

export function TOSideNav() {
  const pathname = usePathname()
  const org = getOrganizador('lima')!
  const creados = useDemoStore(s => s.creados.length)

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[244px] flex-col border-r border-white/8 bg-[#0D0F15] px-4 py-6">
      <Link href="/consola" className="flex items-center gap-2.5 px-2 mb-2">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F]"><Trophy size={18} /></span>
        <span className="min-w-0">
          <span className="block text-[15px] font-black text-white text-display tracking-tight leading-tight">Consola TO</span>
          <span className="block text-[10px] uppercase tracking-[0.16em] text-[#B6FF3A] font-bold">TODH</span>
        </span>
      </Link>

      {/* Organizador activo */}
      <div className="mt-3 mb-4 flex items-center gap-2.5 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg font-black text-sm text-[#0A0A0F] shrink-0" style={{ background: org.color }}>{org.nombre[0]}</span>
        <div className="min-w-0">
          <p className="text-[13px] font-bold text-white truncate">{org.nombre}</p>
          <p className="text-[10px] text-[#8B8BA8]">★ {org.rating} · {org.torneosOrg + creados} torneos</p>
        </div>
      </div>

      <nav className="flex flex-col gap-1">
        {tabs.map(({ href, icon: Icon, label, match }) => {
          const active = pathname === href || match.some(m => pathname.startsWith(m))
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

      <Link href="/explorar" className="mt-auto flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm text-[#8B8BA8] hover:text-white hover:bg-white/5 transition-colors">
        <ArrowLeft size={15} /> Volver a la app
      </Link>
      <div className="mt-3 px-2 text-[11px] text-[#6B6B82]">
        <p className="font-semibold text-[#8B8BA8]">Panel del organizador</p>
        <p>Demo sin login</p>
      </div>
    </aside>
  )
}
