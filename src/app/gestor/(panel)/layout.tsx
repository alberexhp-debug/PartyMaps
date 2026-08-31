'use client'
import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useGestorStore } from '@/lib/stores/useGestorStore'
import { supabase } from '@/lib/supabase/client'
import { LayoutDashboard, Store, Megaphone, MessageSquare, Ticket, LogOut } from '@/components/todh/iconosTorneum'
import { Tag } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/gestor/dashboard', icon: LayoutDashboard, label: 'Inicio' },
  { href: '/gestor/mensajes', icon: MessageSquare, label: 'Mensajes' },
  { href: '/gestor/locales', icon: Store, label: 'Locales' },
  { href: '/gestor/rrpp', icon: Megaphone, label: 'RRPP' },
  { href: '/gestor/codigos', icon: Tag, label: 'Códigos' },
  { href: '/gestor/entradas-gratis', icon: Ticket, label: 'Gratis' },
]

const ACCENT = '#7C5CFF'

export default function GestorPanelLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, gestor, hydrated, logout } = useGestorStore()
  const [noLeidos, setNoLeidos] = useState(0)

  useEffect(() => {
    if (hydrated && !isAuthenticated) router.push('/gestor/login')
  }, [hydrated, isAuthenticated, router])

  // Verifica que la sesión de Supabase corresponde a este gestor. Las superficies
  // comparten una sola sesión; si entraste a otro panel después, realineamos.
  useEffect(() => {
    if (!hydrated || !isAuthenticated || !gestor?.email) return
    let cancelado = false
    ;(async () => {
      const { data, error } = await supabase.auth.getUser()
      if (cancelado || error) return
      const sesion = data.user?.email?.trim().toLowerCase()
      if (sesion !== gestor.email.trim().toLowerCase()) {
        logout()
        router.replace('/gestor/login')
      }
    })()
    return () => { cancelado = true }
  }, [hydrated, isAuthenticated, gestor?.email, logout, router])

  // Badge de mensajes sin leer en el nav (sondeo ligero; el realtime en vivo
  // vive en la propia página de Mensajes).
  useEffect(() => {
    if (!hydrated || !isAuthenticated) return
    let vivo = true
    const cargar = () => fetch('/api/gestor/mensajes')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (vivo && typeof d?.no_leidos_total === 'number') setNoLeidos(d.no_leidos_total) })
      .catch(() => {})
    cargar()
    const t = setInterval(cargar, 30000)
    return () => { vivo = false; clearInterval(t) }
  }, [hydrated, isAuthenticated])

  if (!hydrated) return null
  if (!isAuthenticated || !gestor) return null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    logout()
    router.push('/gestor/login')
  }

  return (
    <div className="min-h-screen flex bg-[#0D0F15]">
      {/* Sidebar (escritorio) */}
      <aside className="hidden md:flex w-60 flex-col fixed left-0 top-0 bottom-0 z-20 glass-strong border-r border-white/8">
        <div className="p-4 border-b border-white/8">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl holo-bg flex items-center justify-center shadow-[0_4px_14px_-4px_rgba(124,92,255,0.6)]">
              <span className="text-sm font-black text-white">T</span>
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#9B82FF]">TorneumGestor</p>
              <p className="text-sm font-semibold text-white truncate">{gestor.nombre}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all',
                  active ? 'bg-[#7C5CFF]/12 text-[#9B82FF] font-semibold' : 'text-[#A0A0B8] hover:bg-white/5 hover:text-white',
                )}>
                {active && <span className="absolute left-0 top-2 bottom-2 w-0.5 bg-[#7C5CFF] rounded-r-full shadow-[0_0_6px_rgba(124,92,255,0.6)]" />}
                <Icon size={16} strokeWidth={active ? 2.4 : 1.6} />
                {label}
                {href === '/gestor/mensajes' && noLeidos > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[#B6FF3A] px-1.5 text-[10px] font-bold text-[#0A0A0F]">
                    {noLeidos > 99 ? '99+' : noLeidos}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
        <div className="p-3 border-t border-white/8">
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-[#A0A0B8] hover:text-[#B6FF3A] hover:bg-[#B6FF3A]/8 transition-colors">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </aside>

      {/* Cabecera móvil */}
      <header className="md:hidden sticky top-0 z-20 glass-strong border-b border-white/8 safe-top w-full">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg holo-bg flex items-center justify-center">
              <span className="text-xs font-black text-white">T</span>
            </div>
            <div className="leading-tight">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#9B82FF]">TorneumGestor</p>
              <p className="text-sm font-semibold text-white truncate max-w-[40vw]">{gestor.nombre}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-[#B8B8CC] hover:text-[#B6FF3A] transition-colors"><LogOut size={18} /></button>
        </div>
      </header>

      <main className="flex-1 md:ml-60 min-h-screen pb-20 md:pb-0">
        <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">{children}</div>
      </main>

      {/* Nav inferior (móvil) */}
      <nav className="fixed bottom-0 left-0 right-0 z-20 glass-strong border-t border-white/8 md:hidden safe-bottom">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link key={href} href={href}
                className={cn('relative flex flex-col items-center gap-0.5 py-2 px-2', active ? 'text-[#9B82FF]' : 'text-[#6B6B85]')}>
                {active && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#7C5CFF] rounded-full shadow-[0_0_8px_rgba(124,92,255,0.6)]" />}
                <Icon size={20} strokeWidth={active ? 2.4 : 1.75} />
                {href === '/gestor/mensajes' && noLeidos > 0 && (
                  <span className="absolute top-1 left-1/2 ml-2 h-2 w-2 rounded-full bg-[#B6FF3A]" />
                )}
                <span className="text-[9px] font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
