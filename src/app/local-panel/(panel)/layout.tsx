'use client'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useLocalPanelStore } from '@/lib/stores/useLocalPanelStore'
import { supabase } from '@/lib/supabase/client'
import {
  Bell, Sun, Moon, ChevronDown, LogOut, Settings, Users, CreditCard,
  LifeBuoy, ListChecks, LayoutDashboard, ArrowLeft,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROL_LABEL, homeDeRol, zonasDeTrabajador, homeDeTrabajador, type ZonaPanel } from '@/lib/permisosLocal'
import { BadgePuestaAPunto } from '@/components/local-panel/BadgePuestaAPunto'
import { AvisoEstadoLocal } from '@/components/local-panel/AvisoEstadoLocal'
import { sonidoMensaje } from '@/lib/sonido'

// Apartados de cuenta/ajustes que viven detrás del avatar (los operativos están
// en la rejilla de la home). Se filtran por permisos del rol.
type CuentaItem = { zona: ZonaPanel; href: string; icon: React.ElementType; label: string }
const CUENTA_ITEMS: CuentaItem[] = [
  { zona: 'puesta-a-punto', href: '/local-panel/puesta-a-punto', icon: ListChecks, label: 'Puesta a punto' },
  { zona: 'configuracion',  href: '/local-panel/configuracion',  icon: Settings,   label: 'Configuración' },
  { zona: 'equipo',         href: '/local-panel/equipo',         icon: Users,      label: 'Equipo' },
  { zona: 'facturacion',    href: '/local-panel/facturacion',    icon: CreditCard, label: 'Facturación' },
  { zona: 'soporte',        href: '/local-panel/soporte',        icon: LifeBuoy,   label: 'Soporte' },
]

function zonaActual(pathname: string): ZonaPanel | null {
  const m = pathname.match(/^\/local-panel\/([^/]+)/)
  return m ? (m[1] as ZonaPanel) : null
}

export default function LocalPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, local, trabajador, hydrated, logout } = useLocalPanelStore()
  const rol = trabajador?.rol
  const [menu, setMenu] = useState(false)
  const [tema, setTema] = useState<'light' | 'dark'>('light')
  const [noLeidosMsg, setNoLeidosMsg] = useState(0)
  const silenciadosRef = useRef<string[]>([])
  // Zonas efectivas (rol base + permisos a medida §2.1). Sin override = rol base.
  const zonasPermitidas = useMemo(() => zonasDeTrabajador(trabajador), [trabajador])
  const tieneMensajes = zonasPermitidas.includes('mensajes')

  // Tema: claro por defecto; se recuerda. Sin parpadeo notable porque el panel
  // no pinta contenido hasta hidratar.
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('panel-tema') : null
    if (saved === 'dark' || saved === 'light') setTema(saved)
  }, [])
  const toggleTema = () => setTema(prev => {
    const next = prev === 'light' ? 'dark' : 'light'
    try { localStorage.setItem('panel-tema', next) } catch {}
    return next
  })

  // Badge de mensajes no leídos: realtime para que se actualice al instante y
  // suene el ping aunque estés en otra página del panel; sondeo de respaldo.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !tieneMensajes) return
    let vivo = true
    const cargar = () => fetch('/api/local-panel/mensajes')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && d) { setNoLeidosMsg(d.no_leidos_total || 0); silenciadosRef.current = d.silenciados_match || [] } })
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 15000)

    const esGestor = rol === 'dueno' || rol === 'gestor'
    const esEntrante = (e?: string) => esGestor ? (e === 'rrpp' || e === 'trabajador') : (e === 'local')
    const onMsg = (payload: { new?: { emisor?: string; rrpp_id?: string; trabajador_id?: string } }) => {
      cargar()
      const n = payload.new || {}
      const refId = n.rrpp_id || n.trabajador_id
      if (esEntrante(n.emisor) && !(refId && silenciadosRef.current.includes(refId))) sonidoMensaje()
    }
    let ch: ReturnType<typeof supabase.channel> | null = null
    if (local?.id) {
      ch = supabase.channel(`nav-msg-${local.id}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_rrpp', filter: `local_id=eq.${local.id}` }, onMsg)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_trabajador', filter: `local_id=eq.${local.id}` }, onMsg)
        .subscribe()
    }
    return () => { vivo = false; clearInterval(t); if (ch) supabase.removeChannel(ch) }
  }, [hydrated, isAuthenticated, tieneMensajes, local?.id, rol])

  // Redirección si la zona no está permitida para el rol
  useEffect(() => {
    if (!hydrated) return
    if (!isAuthenticated) { router.push('/local-panel/login'); return }
    if (!rol) return
    const zona = zonaActual(pathname)
    if (zona && !zonasPermitidas.includes(zona)) {
      router.replace(`/local-panel/${homeDeTrabajador(trabajador)}`)
    }
  }, [hydrated, isAuthenticated, rol, pathname, router, zonasPermitidas, trabajador])

  // Verifica que la sesión REAL de Supabase corresponde a este trabajador.
  // Las 4 superficies (PWA/admin/gestor/local) comparten UNA sola sesión de
  // Supabase; si entraste a otro panel después, el store del local sigue
  // diciendo "dueño" pero la sesión activa es otra → la RLS bloquea escrituras.
  // En ese caso, forzamos re-login para realinear la sesión.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !trabajador?.email) return
    let cancelado = false
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelado) return
      const sesion = session?.user?.email?.trim().toLowerCase()
      const esperado = trabajador.email.trim().toLowerCase()
      if (!sesion || sesion !== esperado) {
        logout()
        router.replace('/local-panel/login')
      }
    })()
    return () => { cancelado = true }
  }, [hydrated, isAuthenticated, trabajador?.email, logout, router])

  useEffect(() => { setMenu(false) }, [pathname])

  if (!hydrated) return null
  if (!isAuthenticated || !local || !rol) return null

  const handleLogout = async () => {
    const { supabase } = await import('@/lib/supabase/client')
    await supabase.auth.signOut()
    logout()
    router.push('/local-panel/login')
  }

  const cuenta = CUENTA_ITEMS.filter(it => zonasPermitidas.includes(it.zona))
  const inicioHref = `/local-panel/${homeDeRol(rol)}`
  const inicial = (local.nombre || '?').trim().charAt(0).toUpperCase()

  // "Volver atrás": en una subpágina de detalle (≥3 segmentos) sube a su lista;
  // en una sección de primer nivel vuelve al Inicio. No aparece en el Inicio.
  const enHome = pathname === inicioHref
  const volver = () => {
    const seg = pathname.split('/').filter(Boolean)
    if (seg.length > 2) router.push('/' + seg.slice(0, -1).join('/'))
    else router.push(inicioHref)
  }

  return (
    <div data-pt={tema} className="min-h-screen" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ───────────── Barra superior ───────────── */}
      <header
        className="sticky top-0 z-30"
        style={{ background: 'var(--p-surface)', borderBottom: '1px solid var(--p-border)' }}>
        <div className="mx-auto flex h-[60px] items-center gap-3 px-4" style={{ maxWidth: 1120 }}>
          {/* Volver atrás (en subpáginas) */}
          {!enHome && (
            <button onClick={volver} aria-label="Volver atrás"
              className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-[11px] transition-opacity hover:opacity-70"
              style={{ color: 'var(--p-text-2)' }}>
              <ArrowLeft size={20} />
            </button>
          )}
          {/* Avatar + menú de cuenta */}
          <div className="relative">
            <button onClick={() => setMenu(m => !m)} aria-label="Tu cuenta"
              className="flex items-center gap-2 rounded-xl p-1 transition-opacity hover:opacity-80">
              <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-[11px] text-sm font-extrabold text-white"
                style={{ background: 'linear-gradient(135deg, var(--p-accent), #7C5CFF)' }}>
                {local.imagenes?.[0]
                  ? <img src={local.imagenes[0]} alt="" className="h-full w-full object-cover"
                      onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
                  : inicial}
              </span>
              <ChevronDown size={16} style={{ color: 'var(--p-text-3)' }} />
            </button>
            {menu && (
              <>
                <div onClick={() => setMenu(false)} className="fixed inset-0 z-40" />
                <div className="absolute left-0 top-[52px] z-50 w-64 rounded-2xl p-2"
                  style={{ background: 'var(--p-surface)', border: '1px solid var(--p-border)', boxShadow: 'var(--p-shadow)' }}>
                  <div className="px-2.5 pb-2.5 pt-2">
                    <p className="truncate text-sm font-bold" style={{ color: 'var(--p-text)' }}>{local.nombre}</p>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--p-text-3)' }}>{trabajador?.nombre} · {ROL_LABEL[rol]}</p>
                  </div>
                  <div className="my-1.5 h-px" style={{ background: 'var(--p-border)' }} />
                  <Link href={inicioHref} className="flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm"
                    style={{ color: 'var(--p-text)' }}>
                    <LayoutDashboard size={16} style={{ color: 'var(--p-text-3)' }} /> Inicio
                  </Link>
                  {cuenta.map(({ href, icon: Icon, label }) => (
                    <Link key={href} href={href} className="flex items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm"
                      style={{ color: 'var(--p-text)' }}>
                      <Icon size={16} style={{ color: 'var(--p-text-3)' }} /> {label}
                    </Link>
                  ))}
                  <div className="my-1.5 h-px" style={{ background: 'var(--p-border)' }} />
                  <button onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-[10px] px-2.5 py-2.5 text-sm font-semibold"
                    style={{ color: 'var(--p-accent)' }}>
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>

          <Link href={inicioHref} className="truncate text-base font-bold" style={{ color: 'var(--p-text)', letterSpacing: '-0.01em' }}>
            {local.nombre}
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {tieneMensajes && (
              <Link href="/local-panel/mensajes" aria-label="Mensajes" className="relative grid h-[38px] w-[38px] place-items-center rounded-[11px]"
                style={{ border: '1px solid var(--p-border)', background: 'var(--p-surface)', color: 'var(--p-text-2)' }}>
                <Bell size={17} />
                {noLeidosMsg > 0 && (
                  <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full px-1 text-[10px] font-bold text-white"
                    style={{ background: 'var(--p-accent)' }}>{noLeidosMsg > 99 ? '99+' : noLeidosMsg}</span>
                )}
              </Link>
            )}
            <button onClick={toggleTema} aria-label="Cambiar tema" className="grid h-[38px] w-[38px] place-items-center rounded-[11px]"
              style={{ border: '1px solid var(--p-border)', background: 'var(--p-surface)', color: 'var(--p-text-2)' }}>
              {tema === 'light' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* ───────────── Contenido ───────────── */}
      <main className="mx-auto min-h-[calc(100vh-60px)]" style={{ maxWidth: 1120 }}>
        <AvisoEstadoLocal />
        {children}
      </main>

      {/* Pill flotante "Terminar (N)" (solo dueño/gestor con obligatorios pendientes) */}
      <BadgePuestaAPunto variant="movil" />
    </div>
  )
}
