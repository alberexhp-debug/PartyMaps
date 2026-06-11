'use client'
import { useState } from 'react'
import {
  Sun, Moon, Bell, ChevronDown, ChevronRight, X,
  LayoutDashboard, Ticket, Beer, ScanLine, LayoutGrid, Gift,
  CalendarDays, Megaphone, BellRing, Contact, BarChart3, Star,
  MessageSquare, User, Settings2, Users, CreditCard, LifeBuoy, LogOut,
} from 'lucide-react'

/**
 * PROTOTIPO — Panel de control web, RESPONSIVE (móvil · tablet · ordenador).
 * Móvil/tablet: navegación detrás del avatar. Ordenador: barra lateral fija
 * con todas las secciones (avatar arriba) + contenido expandido.
 * Claro por defecto + interruptor a oscuro. Ruta pública: /preview/panel
 */

const TEMA = {
  claro: {
    canvas: '#FAFAFB', surface: '#FFFFFF', surface2: '#F4F4F7',
    text: '#16161D', text2: '#5B5B68', text3: '#9A9AA6',
    border: '#ECECF1', accent: '#E0455E', accentSoft: '#FCEBEE',
    green: '#15803D', amber: '#B45309', blue: '#2563EB', violet: '#7C5CFF',
    shadow: '0 1px 2px rgba(16,16,29,0.04), 0 10px 26px -16px rgba(16,16,29,0.18)',
  },
  oscuro: {
    canvas: '#0B0B12', surface: '#15151F', surface2: '#1B1B2A',
    text: '#FAFAFC', text2: '#B8B8CC', text3: '#82829A',
    border: 'rgba(255,255,255,0.08)', accent: '#E94560', accentSoft: 'rgba(233,69,96,0.14)',
    green: '#34D399', amber: '#F39C12', blue: '#4F8EF7', violet: '#9B82FF',
    shadow: '0 10px 30px -16px rgba(0,0,0,0.7)',
  },
}

const NAV: { grupo: string | null; items: { icon: React.ElementType; label: string; dato?: string; activo?: boolean }[] }[] = [
  { grupo: null, items: [{ icon: LayoutDashboard, label: 'Inicio', activo: true }] },
  { grupo: 'La noche', items: [
    { icon: Ticket, label: 'Taquilla' }, { icon: Beer, label: 'Barra', dato: '3' },
    { icon: ScanLine, label: 'Puerta' }, { icon: LayoutGrid, label: 'Sala y mesas' }, { icon: Gift, label: 'Cortesías' },
  ] },
  { grupo: 'Crecer', items: [
    { icon: CalendarDays, label: 'Eventos' }, { icon: Megaphone, label: 'RRPP' }, { icon: BellRing, label: 'Notificaciones' },
  ] },
  { grupo: 'Audiencia', items: [
    { icon: Contact, label: 'Clientes' }, { icon: BarChart3, label: 'Analítica' }, { icon: Star, label: 'Reseñas' },
  ] },
]
const CUENTA = [
  { icon: User, label: 'Tu perfil' }, { icon: Settings2, label: 'Configuración' },
  { icon: Users, label: 'Equipo' }, { icon: CreditCard, label: 'Facturación' }, { icon: LifeBuoy, label: 'Soporte' },
]
const KPIS = [['1.240 €', 'Ingresos hoy'], ['320', 'Entradas hoy'], ['60%', 'Aforo ahora'], ['1.240', 'Suscriptores']]

export default function PreviewPanel() {
  const [modo, setModo] = useState<'claro' | 'oscuro'>('claro')
  const [menu, setMenu] = useState(false)
  const t = TEMA[modo]

  const navItem = (Icon: React.ElementType, label: string, dato?: string, activo?: boolean) => (
    <button key={label} onClick={() => setMenu(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
        background: activo ? t.accentSoft : 'transparent', border: 'none', padding: '9px 11px',
        borderRadius: 10, cursor: 'pointer', color: activo ? t.accent : t.text, fontSize: 14, fontWeight: activo ? 600 : 500,
      }}>
      <Icon size={17} style={{ color: activo ? t.accent : t.text3, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      {dato && <span style={{ fontSize: 11, fontWeight: 700, color: t.amber, background: modo === 'claro' ? '#FBF1E3' : 'rgba(243,156,18,0.14)', padding: '1px 7px', borderRadius: 99 }}>{dato}</span>}
    </button>
  )

  const navCompleto = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 6px 12px' }}>
        <span style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg, ${t.accent}, ${t.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800 }}>A</span>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Sala Aurora</p>
          <p style={{ margin: 0, fontSize: 12, color: t.text3 }}>Albert · Dueño</p>
        </div>
      </div>
      <div style={{ height: 1, background: t.border, margin: '0 0 8px' }} />
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {NAV.map((g, gi) => (
          <div key={gi} style={{ marginBottom: 6 }}>
            {g.grupo && <p style={{ margin: '10px 11px 4px', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3, fontWeight: 700 }}>{g.grupo}</p>}
            {g.items.map(it => navItem(it.icon, it.label, it.dato, it.activo))}
          </div>
        ))}
        <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
        <p style={{ margin: '4px 11px 4px', fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: t.text3, fontWeight: 700 }}>Tu cuenta</p>
        {CUENTA.map(it => navItem(it.icon, it.label))}
      </div>
      <div style={{ height: 1, background: t.border, margin: '8px 0' }} />
      <button style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 11px', borderRadius: 10, cursor: 'pointer', color: t.accent, fontSize: 14, fontWeight: 600 }}>
        <LogOut size={17} /> Cerrar sesión
      </button>
    </>
  )

  return (
    <div style={{ background: t.canvas, color: t.text, minHeight: '100dvh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="lg:flex">

        {/* ── Barra lateral (solo ordenador) ── */}
        <aside className="hidden lg:flex lg:flex-col" style={{ width: 264, height: '100vh', position: 'sticky', top: 0, background: t.surface, borderRight: `1px solid ${t.border}`, padding: 14 }}>
          {navCompleto}
        </aside>

        {/* ── Contenido ── */}
        <div className="flex-1 min-w-0">
          {/* Barra superior */}
          <header style={{ position: 'sticky', top: 0, zIndex: 20, background: t.surface, borderBottom: `1px solid ${t.border}` }}>
            <div style={{ height: 58, padding: '0 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Avatar / menú (móvil y tablet) */}
              <button className="lg:hidden" onClick={() => setMenu(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 12 }}>
                <span style={{ width: 34, height: 34, borderRadius: 10, background: `linear-gradient(135deg, ${t.accent}, ${t.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 14 }}>A</span>
                <ChevronDown size={15} style={{ color: t.text3 }} />
              </button>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 700 }}>Inicio</p>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                <button aria-label="Avisos" style={{ position: 'relative', width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Bell size={17} /><span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 99, background: t.accent }} />
                </button>
                <button onClick={() => setModo(modo === 'claro' ? 'oscuro' : 'claro')} aria-label="Cambiar tema"
                  style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {modo === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
                </button>
              </div>
            </div>
          </header>

          {/* Página principal */}
          <main className="mx-auto" style={{ maxWidth: 1120, padding: '26px 18px 56px' }}>
            <div style={{ marginBottom: 22 }}>
              <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>Buenas noches, Albert</h1>
              <p style={{ margin: '6px 0 0', fontSize: 14.5, color: t.text2, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: t.green }} /> Abierto ahora · 60% de aforo · Sábado 14 jun
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 30 }}>
              {KPIS.map(([n, l]) => (
                <div key={l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: '16px 18px', boxShadow: t.shadow }}>
                  <p style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{n}</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12.5, color: t.text3, fontWeight: 500 }}>{l}</p>
                </div>
              ))}
            </div>

            {/* En ordenador: Tu noche + Te interesa en dos columnas */}
            <div className="lg:grid lg:grid-cols-3" style={{ gap: 22 }}>
              <div className="lg:col-span-2" style={{ marginBottom: 30 }}>
                <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '0 2px 12px' }}>Tu noche</p>
                <div className="grid grid-cols-2" style={{ gap: 12 }}>
                  {[[Ticket, 'Taquilla', 'Vender en puerta', t.accent], [Beer, 'Barra', '3 pedidos en cola', t.amber], [ScanLine, 'Puerta', '320 dentro', t.blue], [CalendarDays, 'Eventos', 'Vie · Techno', t.violet]].map(([Icon, label, dato, color]) => {
                    const I = Icon as React.ElementType
                    return (
                      <button key={label as string} style={{ textAlign: 'left', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 18, cursor: 'pointer', color: t.text, boxShadow: t.shadow }}>
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: modo === 'claro' ? `${color}14` : `${color}22`, color: color as string, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}><I size={20} /></span>
                        <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>{label as string}</p>
                        <p style={{ margin: '3px 0 0', fontSize: 12.5, color: t.text3 }}>{dato as string}</p>
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="lg:col-span-1" style={{ marginBottom: 30 }}>
                <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '0 2px 12px' }}>Te interesa</p>
                <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: t.shadow }}>
                  {[
                    { icon: MessageSquare, color: t.violet, txt: '2 mensajes sin leer', sub: 'De un RRPP y de tu equipo' },
                    { icon: Star, color: t.amber, txt: '3 reseñas nuevas', sub: 'Una de 5 estrellas' },
                    { icon: CalendarDays, color: t.accent, txt: 'El viernes no tiene precio', sub: 'Techno Underground' },
                  ].map((a, i) => (
                    <button key={a.txt} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${t.border}` : 'none', padding: '14px 16px', cursor: 'pointer', color: t.text }}>
                      <span style={{ width: 34, height: 34, borderRadius: 10, background: modo === 'claro' ? `${a.color}14` : `${a.color}22`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><a.icon size={16} /></span>
                      <span style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{a.txt}</span>
                        <span style={{ display: 'block', fontSize: 12, color: t.text3 }}>{a.sub}</span>
                      </span>
                      <ChevronRight size={18} style={{ color: t.text3 }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p style={{ textAlign: 'center', fontSize: 11.5, color: t.text3, marginTop: 8, opacity: 0.75 }}>
              Prototipo · panel de control web · responsive (móvil · tablet · ordenador)
            </p>
          </main>
        </div>
      </div>

      {/* ── Menú (móvil y tablet): cajón desde la izquierda ── */}
      {menu && (
        <div className="lg:hidden" style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
          <div onClick={() => setMenu(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
          <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 290, maxWidth: '82vw', background: t.surface, borderRight: `1px solid ${t.border}`, padding: 14, display: 'flex', flexDirection: 'column', boxShadow: t.shadow }}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 2 }}>
              <button onClick={() => setMenu(false)} aria-label="Cerrar" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: 'transparent', color: t.text3, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
            </div>
            {navCompleto}
          </div>
        </div>
      )}
    </div>
  )
}
