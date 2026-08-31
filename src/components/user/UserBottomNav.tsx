'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Map, Compass, Trophy, User, LayoutDashboard, Radio, Inbox, LayoutGrid, CalendarDays, MessagesSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDemoStore, useEsTO } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'

import { useT, type ClaveI18n } from '@/lib/i18n'

// Paquete Chat (30-08): Entradas sale del nav (la ruta sigue viva, se llega
// desde la fila Entradas del perfil) y entra Chat → /amigos.
const tabs: { href: string; icon: typeof Compass; label: ClaveI18n }[] = [
  { href: '/explorar', icon: Compass,        label: 'nav.explorar' },
  { href: '/mapa',     icon: Map,            label: 'nav.mapa' },
  { href: '/ranking',  icon: Trophy,         label: 'nav.ranking' },
  { href: '/amigos',   icon: MessagesSquare, label: 'nav.chat' },
  { href: '/perfil',   icon: User,           label: 'nav.perfil' },
]

export function UserBottomNav() {
  const pathname = usePathname()
  const { t } = useT()
  // En móvil el TO también necesita llegar a sus herramientas: sexta pestaña
  // Consola (antes solo existía el rail de escritorio y el acceso por perfil).
  const esTO = useEsTO()
  const esSede = useSesionStore(s => s.sesion?.rol === 'local')
  // La pestaña Perfil lleva TU foto (propia, emoji de avatar o inicial), no un
  // icono: es tu hub personal.
  const avatarEmoji = useDemoStore(s => s.avatarEmoji)
  const fotoPerfil = useDemoStore(s => s.fotoPerfil)
  const inicial = useSesionStore(s => (s.sesion?.nombre?.trim()?.[0] || 'T').toUpperCase())
  // Badge de Chat: solicitudes de amistad pendientes (del pool y, con el
  // mundo compartido, también las que llegan de otras cuentas demo).
  const emailSesion = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  const pendAmistad = useDemoStore(s =>
    s.solicitudesAmistad.length +
    (emailSesion ? s.amistadesCuentas.filter(a => a.a === emailSesion && a.estado === 'pendiente').length : 0))

  // La sede navega directa a sus apartados (sin Explorar/Mapa); es SOLO sede,
  // sin capa de organizador.
  const items: { href: string; icon: typeof Compass; texto: string; to?: boolean; badge?: number }[] = esSede
    ? [
        { href: '/sede', icon: LayoutDashboard, texto: 'Resumen' },
        { href: '/sede/solicitudes', icon: Inbox, texto: 'Solicitudes' },
        { href: '/sede/plano', icon: LayoutGrid, texto: 'Plano' },
        { href: '/sede/disponibilidad', icon: CalendarDays, texto: 'Agenda' },
        { href: '/sede/torneos', icon: Trophy, texto: 'Torneos' },
      ]
    : (() => {
        // Live entre Mapa y Ranking (mismo orden que el rail de escritorio)
        const base = tabs.map(x => ({ href: x.href, icon: x.icon, texto: t(x.label), ...(x.href === '/amigos' ? { badge: pendAmistad } : {}) }))
        base.splice(2, 0, { href: '/live', icon: Radio, texto: t('nav.live') })
        return [...base, ...(esTO ? [{ href: '/consola', icon: LayoutDashboard, texto: t('nav.consola'), to: true }] : [])]
      })()

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 safe-bottom">
      <div className="absolute inset-0 bg-gradient-to-t from-[#0D0F15] via-[#0D0F15]/95 to-[#0D0F15]/0 pointer-events-none" />
      <div className="relative glass-strong border-t border-white/8 mx-auto">
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
          {items.map(({ href, icon: Icon, texto, to, badge }) => {
            // /sede (Resumen) solo activo en exacto: sus subrutas tienen pestaña propia
            const active = href === '/sede' ? pathname === '/sede' : pathname === href || pathname.startsWith(href + '/')
            const acento = to ? '#E0BE63' : '#B6FF3A'
            const esPerfil = href === '/perfil'
            return (
              <Link
                key={href}
                href={href}
                aria-label={texto}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'relative flex flex-col items-center gap-0.5 py-2 px-2 rounded-xl transition-all min-w-[52px]',
                  active ? '' : 'text-[#8B8BA8] hover:text-white'
                )}
                style={active ? { color: acento } : undefined}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full" style={{ background: acento, boxShadow: `0 0 8px ${acento}99` }} />
                )}
                {esPerfil ? (
                  <span className={cn('flex h-[22px] w-[22px] items-center justify-center rounded-full overflow-hidden text-[12px] leading-none', (fotoPerfil || avatarEmoji) ? 'bg-white/10' : 'bg-[#B6FF3A] text-[#0A0A0F] font-black')}
                    style={active ? { boxShadow: `0 0 0 2px ${acento}` } : { boxShadow: '0 0 0 1px rgba(255,255,255,0.25)' }}>
                    {fotoPerfil
                      /* eslint-disable-next-line @next/next/no-img-element */
                      ? <img src={fotoPerfil} alt="" className="h-full w-full object-cover" />
                      : (avatarEmoji ?? inicial)}
                  </span>
                ) : (
                  <span className="relative inline-flex">
                    <Icon size={22} strokeWidth={active ? 2.4 : 1.75} />
                    {badge != null && badge > 0 && (
                      <span className="absolute -top-1 -right-2 min-w-[14px] h-[14px] px-0.5 rounded-full bg-[#FF3D71] text-white text-[8px] font-bold flex items-center justify-center font-mono-num">{badge}</span>
                    )}
                  </span>
                )}
                <span className="text-[10px] font-medium tracking-wide text-current">
                  {texto}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
