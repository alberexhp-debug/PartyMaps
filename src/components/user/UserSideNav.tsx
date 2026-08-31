'use client'
import type { IconoTorneum } from '@/components/todh/iconosTorneum'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Trophy, User, Search, Bell, LayoutDashboard, Radio } from '@/components/todh/iconosTorneum'
import { Map, Compass, Inbox, LayoutGrid, CalendarDays, MessagesSquare } from 'lucide-react'
// (Radio también da icono a la nueva sección Live del jugador)
import { cn } from '@/lib/utils'
import { useDemoStore, useEsTO, useLocalId } from '@/lib/stores/useDemoStore'
import { useSesionStore } from '@/lib/stores/useSesionStore'
import { useT, type ClaveI18n } from '@/lib/i18n'

// Paquete Chat (30-08): la pestaña Entradas sale del nav — su hueco lo ocupa
// Chat (/amigos: amigos, grupos, crews y difusión). La ruta /entradas SIGUE
// existiendo: se llega desde la fila Entradas del perfil.
const tabsJugador: { href: string; icon: IconoTorneum; label: ClaveI18n }[] = [
  { href: '/explorar', icon: Compass,        label: 'nav.explorar' },
  { href: '/mapa',     icon: Map,            label: 'nav.mapa' },
  { href: '/ranking',  icon: Trophy,         label: 'nav.ranking' },
  { href: '/amigos',   icon: MessagesSquare, label: 'nav.chat' },
  { href: '/perfil',   icon: User,           label: 'nav.perfil' },
]

// Sección del TO en el MISMO rail: si tu cuenta tiene el perfil de organizador,
// el menú se expande debajo de lo de jugador con UNA sola entrada — la Consola
// TO — y desde ella se llega a todo (crear, directo, sedes, página, torneos…).
const tabsTO: { href: string; icon: IconoTorneum; label: ClaveI18n; match: string[] }[] = [
  { href: '/consola', icon: LayoutDashboard, label: 'to.consola', match: ['/consola', '/crear-torneo', '/modo-directo', '/sedes', '/mi-pagina', '/gestionar'] },
]

// Rail lateral fijo para escritorio (≥ lg). En móvil/tablet se usa UserBottomNav.
export function UserSideNav() {
  const pathname = usePathname()
  const noLeidas = useDemoStore(s => s.notificaciones.filter(n => !n.leida && !s.descartadas.includes(n.id)).length)
  const idioma = useDemoStore(s => s.idioma)
  const setIdioma = useDemoStore(s => s.setIdioma)
  const esTO = useEsTO()
  // Una SEDE usa el mismo shell con SU menú: sus apartados de panel en vez de
  // las pestañas de jugador (entradas/perfil no aplican). Sin capa de TO.
  const esSede = useSesionStore(s => s.sesion?.rol === 'local')
  // La entrada Perfil lleva tu foto (propia, emoji o inicial): es tu hub personal.
  const avatarEmoji = useDemoStore(s => s.avatarEmoji)
  const fotoPerfil = useDemoStore(s => s.fotoPerfil)
  const inicial = useSesionStore(s => (s.sesion?.nombre?.trim()?.[0] || 'T').toUpperCase())
  // Badge de Chat: solicitudes de amistad pendientes de responder (del pool
  // y, con el mundo compartido, las de otras cuentas demo).
  const emailSesion = useSesionStore(s => s.sesion?.email?.toLowerCase() ?? null)
  const pendAmistad = useDemoStore(s =>
    s.solicitudesAmistad.length +
    (emailSesion ? s.amistadesCuentas.filter(a => a.a === emailSesion && a.estado === 'pendiente').length : 0))
  const { t } = useT()
  // Solicitudes pendientes de la sede: badge en su menú (como las notis)
  const localId = useLocalId()
  const pendientesSede = useDemoStore(s => esSede ? s.solicitudesSede.filter(x => x.localId === localId && x.estado === 'pendiente').length : 0)
  // La sede ya no concentra todo en «Mi sede»: sus apartados salen directos en
  // el menú (sin Explorar/Mapa, que no necesita) y debajo su capa de organizador.
  const itemsPrimarios: { href: string; icon: IconoTorneum; texto: string; badge?: number }[] = esSede
    ? [
        { href: '/sede', icon: LayoutDashboard, texto: t('sede.secResumen') },
        { href: '/sede/solicitudes', icon: Inbox, texto: t('sede.secSolicitudes'), badge: pendientesSede },
        { href: '/sede/plano', icon: LayoutGrid, texto: t('sede.secPlano') },
        { href: '/sede/disponibilidad', icon: CalendarDays, texto: t('sede.secDispo') },
        { href: '/sede/torneos', icon: Trophy, texto: t('sede.secTorneos') },
      ]
    : (() => {
        // Live va entre Mapa y Ranking: tus salas de torneo en tiempo real.
        const items: { href: string; icon: IconoTorneum; texto: string; badge?: number }[] =
          tabsJugador.map(x => ({ href: x.href, icon: x.icon, texto: t(x.label), ...(x.href === '/amigos' ? { badge: pendAmistad } : {}) }))
        items.splice(2, 0, { href: '/live', icon: Radio, texto: t('nav.live') })
        return items
      })()
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-[244px] flex-col border-r border-white/8 bg-[#0D0F15] px-4 py-6 overflow-y-auto">
      {/* El logo lleva a TU inicio: la sede no puede inscribirse, así que va a su Resumen */}
      <Link href={esSede ? '/sede' : '/explorar'} className="flex items-center gap-2.5 px-2 mb-6">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#B6FF3A] text-[#0A0A0F] font-black text-lg text-display">T</span>
        <span className="text-[19px] font-black text-white text-display tracking-tight">Torneum</span>
      </Link>

      <Link href="/buscar" className="flex items-center gap-2.5 px-3 h-10 mb-2 rounded-xl border border-white/10 text-[#8B8BA8] hover:text-white hover:border-white/20 transition-colors text-sm">
        <Search size={16} /> {t('nav.buscar')}
      </Link>

      <Link href="/notificaciones" className={cn(
        'flex items-center gap-2.5 px-3 h-10 rounded-xl text-sm font-semibold transition-colors',
        pathname === '/notificaciones' ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
      )}>
        <span className="relative inline-flex">
          <Bell size={16} />
          {noLeidas > 0 && <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-[#FF3D71] text-white text-[9px] font-bold flex items-center justify-center font-mono-num">{noLeidas}</span>}
        </span>
        {t('nav.notificaciones')}
      </Link>

      {esTO && <p className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6B82]">{t('dual.jugador')}</p>}
      <nav className={cn('flex flex-col gap-1', !esTO && 'mt-2')}>
        {itemsPrimarios.map(({ href, icon: Icon, texto, badge }) => {
          // /sede (Resumen) solo activo en exacto: sus subrutas tienen su propio ítem
          const active = href === '/sede' ? pathname === '/sede' : pathname === href || pathname.startsWith(href + '/')
          return (
            <Link key={href} href={href} aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3 px-3 h-11 rounded-xl text-[15px] font-semibold transition-colors',
                active ? 'bg-[#B6FF3A]/12 text-[#B6FF3A]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
              )}>
              {href === '/perfil' ? (
                // Tu foto (emoji o inicial) en vez de icono: el hub personal
                <span className={cn('flex h-5 w-5 items-center justify-center rounded-full overflow-hidden text-[11px] leading-none shrink-0', (fotoPerfil || avatarEmoji) ? 'bg-white/10' : 'bg-[#B6FF3A] text-[#0A0A0F] font-black')}
                  style={{ boxShadow: active ? '0 0 0 2px #B6FF3A' : '0 0 0 1px rgba(255,255,255,0.25)' }}>
                  {fotoPerfil
                    /* eslint-disable-next-line @next/next/no-img-element */
                    ? <img src={fotoPerfil} alt="" className="h-full w-full object-cover" />
                    : (avatarEmoji ?? inicial)}
                </span>
              ) : (
                <Icon size={20} strokeWidth={active ? 2.4 : 1.9} />
              )}
              <span className="flex-1">{texto}</span>
              {badge != null && badge > 0 && (
                <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3D71] text-white text-[10px] font-bold flex items-center justify-center font-mono-num">{badge}</span>
              )}
            </Link>
          )
        })}
      </nav>

      {esTO ? (
        <>
          <p className="mt-4 mb-1 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#6B6B82]">{t('dual.org')}</p>
          <nav className="flex flex-col gap-1">
            {tabsTO.map(({ href, icon: Icon, label, match }) => {
              const active = pathname === href || match.some(m => pathname.startsWith(m))
              return (
                <Link key={href} href={href} aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 px-3 h-11 rounded-xl text-[15px] font-semibold transition-colors',
                    active ? 'bg-[#E0BE63]/12 text-[#E0BE63]' : 'text-[#B8B8CC] hover:bg-white/5 hover:text-white',
                  )}>
                  <Icon size={20} strokeWidth={active ? 2.4 : 1.9} /> {t(label)}
                </Link>
              )
            })}
          </nav>
          <div className="mt-auto" />
        </>
      ) : !esSede ? (
        // Sin perfil de TO: organizar se activa desde aquí (perfil dual)
        <Link href="/consola"
          className="mt-auto flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-dashed border-white/12 text-[12px] text-[#8B8BA8] hover:text-white hover:border-white/25 transition-colors">
          <Trophy size={15} className="shrink-0 text-[#B6FF3A]" />
          <span>{t('nav.organizas')}<br /><span className="font-bold text-[#B8B8CC]">{t('nav.abreConsola')}</span></span>
        </Link>
      ) : (
        // Rol local (sede): sin CTA de alta de TO — las sedes no organizan
        <div className="mt-auto" />
      )}

      <div className="mt-4 px-2 flex items-end justify-between gap-2">
        <div className="text-[11px] text-[#6B6B82] min-w-0">
          <p className="font-semibold text-[#8B8BA8]">Torneum</p>
          <p className="truncate">{t('nav.claim')}</p>
        </div>
        {/* Selector de idioma (i18n F9: 3 idiomas) */}
        <div className="flex shrink-0 rounded-lg border border-white/10 bg-white/4 p-0.5">
          {(['es', 'en', 'ja'] as const).map(l => (
            <button key={l} onClick={() => setIdioma(l)}
              className={`h-6 px-2 rounded-md text-[10px] font-black uppercase whitespace-nowrap transition-colors ${idioma === l ? 'bg-[#B6FF3A] text-[#0A0A0F]' : 'text-[#8B8BA8] hover:text-white'}`}>
              {l === 'ja' ? '日本語' : l}
            </button>
          ))}
        </div>
      </div>
    </aside>
  )
}
