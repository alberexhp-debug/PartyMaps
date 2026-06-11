'use client'
import { useState } from 'react'
import {
  Sun, Moon, Bell, ChevronDown, ChevronRight,
  Ticket, Beer, ScanLine, LayoutGrid, Gift,
  CalendarDays, Megaphone, BellRing, Contact, BarChart3, Star, MessageSquare,
  User, Settings2, Users, CreditCard, LifeBuoy, ListChecks, LogOut,
} from 'lucide-react'

/**
 * PROTOTIPO — Panel de control web. SIN barra lateral.
 * Página principal completa: lo que va en ella son TODAS las secciones
 * principales, ordenadas por grupos y desglosables. El avatar (arriba a la
 * izquierda) guarda lo de cuenta/ajustes (perfil, configuración, facturación…).
 * Claro por defecto + interruptor a oscuro. Responsive. Ruta: /preview/panel
 */

const TEMA = {
  claro: {
    canvas: '#FAFAFB', surface: '#FFFFFF', surface2: '#F4F4F7',
    text: '#16161D', text2: '#5B5B68', text3: '#9A9AA6',
    border: '#ECECF1', accent: '#E0455E',
    green: '#15803D', amber: '#B45309', blue: '#2563EB', violet: '#7C5CFF',
    shadow: '0 1px 2px rgba(16,16,29,0.04), 0 10px 26px -16px rgba(16,16,29,0.16)',
    tint: (c: string) => `${c}14`,
  },
  oscuro: {
    canvas: '#0B0B12', surface: '#15151F', surface2: '#1B1B2A',
    text: '#FAFAFC', text2: '#B8B8CC', text3: '#82829A',
    border: 'rgba(255,255,255,0.08)', accent: '#E94560',
    green: '#34D399', amber: '#F39C12', blue: '#4F8EF7', violet: '#9B82FF',
    shadow: '0 10px 30px -16px rgba(0,0,0,0.7)',
    tint: (c: string) => `${c}22`,
  },
}

const KPIS = [['1.240 €', 'Ingresos hoy'], ['320', 'Entradas hoy'], ['60%', 'Aforo ahora'], ['1.240', 'Suscriptores']]

const CUENTA = [
  { icon: User, label: 'Tu perfil' }, { icon: Settings2, label: 'Configuración del local' },
  { icon: Users, label: 'Equipo' }, { icon: CreditCard, label: 'Facturación' },
  { icon: ListChecks, label: 'Puesta a punto' }, { icon: LifeBuoy, label: 'Soporte' },
]

export default function PreviewPanel() {
  const [modo, setModo] = useState<'claro' | 'oscuro'>('claro')
  const [menu, setMenu] = useState(false)
  const t = TEMA[modo]

  const GRUPOS = [
    { titulo: 'Tu noche', items: [
      { icon: Ticket, label: 'Taquilla', sub: 'Vender en puerta', color: t.accent },
      { icon: Beer, label: 'Barra', sub: '3 en cola', color: t.amber },
      { icon: ScanLine, label: 'Puerta', sub: '320 dentro', color: t.blue },
      { icon: LayoutGrid, label: 'Sala y mesas', sub: '4 reservas', color: t.violet },
      { icon: Gift, label: 'Cortesías', sub: 'Emitir / canjear', color: t.green },
    ] },
    { titulo: 'Crecer', items: [
      { icon: CalendarDays, label: 'Eventos', sub: 'Vie · Techno', color: t.accent },
      { icon: Megaphone, label: 'RRPP', sub: '8 activos', color: t.violet },
      { icon: BellRing, label: 'Notificaciones', sub: 'Avisar a tus seguidores', color: t.blue },
    ] },
    { titulo: 'Tu audiencia', items: [
      { icon: Contact, label: 'Clientes', sub: '1.240 fichas', color: t.blue },
      { icon: BarChart3, label: 'Analítica', sub: 'Cómo va el negocio', color: t.violet },
      { icon: Star, label: 'Reseñas', sub: '4,6 de media', color: t.amber },
      { icon: MessageSquare, label: 'Sugerencias', sub: '2 nuevas', color: t.green },
    ] },
  ]

  return (
    <div style={{ background: t.canvas, color: t.text, minHeight: '100dvh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Barra superior ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: t.surface, borderBottom: `1px solid ${t.border}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${t.accent}, ${t.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>A</span>
              <ChevronDown size={16} style={{ color: t.text3 }} />
            </button>
            {menu && (
              <>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 50, left: 0, zIndex: 2, width: 256, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow, padding: 8 }}>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Albert · Sala Aurora</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: t.text3 }}>Dueño</p>
                  </div>
                  <div style={{ height: 1, background: t.border, margin: '2px 0 6px' }} />
                  {CUENTA.map(({ icon: Icon, label }) => (
                    <button key={label} style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 10px', borderRadius: 10, cursor: 'pointer', color: t.text, fontSize: 14 }}>
                      <Icon size={16} style={{ color: t.text3 }} /> {label}
                    </button>
                  ))}
                  <div style={{ height: 1, background: t.border, margin: '6px 0' }} />
                  <button style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', padding: '9px 10px', borderRadius: 10, cursor: 'pointer', color: t.accent, fontSize: 14, fontWeight: 600 }}>
                    <LogOut size={16} /> Cerrar sesión
                  </button>
                </div>
              </>
            )}
          </div>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em' }}>Sala Aurora</p>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <button aria-label="Avisos" style={{ position: 'relative', width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <Bell size={17} /><span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 99, background: t.accent }} />
            </button>
            <button onClick={() => setModo(modo === 'claro' ? 'oscuro' : 'claro')} aria-label="Cambiar tema" style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {modo === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Página principal (completa) ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '26px 20px 56px' }}>
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>Buenas noches, Albert</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: t.text2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: t.green }} /> Abierto ahora · 60% de aforo · Sábado 14 jun
          </p>
        </div>

        {/* Números */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 14 }}>
          {KPIS.map(([n, l]) => (
            <div key={l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: '15px 18px', boxShadow: t.shadow }}>
              <p style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{n}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: t.text3, fontWeight: 500 }}>{l}</p>
            </div>
          ))}
        </div>

        {/* Te interesa (compacto, arriba porque es accionable) */}
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: t.shadow, marginBottom: 30 }}>
          {[
            { icon: MessageSquare, color: t.violet, txt: '2 mensajes sin leer', sub: 'De un RRPP y de tu equipo' },
            { icon: Star, color: t.amber, txt: '3 reseñas nuevas', sub: 'Una de 5 estrellas' },
            { icon: CalendarDays, color: t.accent, txt: 'El viernes no tiene precio', sub: 'Techno Underground' },
          ].map((a, i) => (
            <button key={a.txt} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${t.border}` : 'none', padding: '13px 16px', cursor: 'pointer', color: t.text }}>
              <span style={{ width: 32, height: 32, borderRadius: 9, background: t.tint(a.color), color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><a.icon size={15} /></span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14, fontWeight: 600 }}>{a.txt}</span>
                <span style={{ display: 'block', fontSize: 12, color: t.text3 }}>{a.sub}</span>
              </span>
              <ChevronRight size={17} style={{ color: t.text3 }} />
            </button>
          ))}
        </div>

        {/* Secciones por grupos — todas a la vista, desglosables */}
        {GRUPOS.map(g => (
          <div key={g.titulo} style={{ marginBottom: 26 }}>
            <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '0 2px 12px' }}>{g.titulo}</p>
            <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12 }}>
              {g.items.map(({ icon: Icon, label, sub, color }) => (
                <button key={label} style={{ textAlign: 'left', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 14, padding: 15, cursor: 'pointer', color: t.text, boxShadow: t.shadow }}>
                  <span style={{ width: 36, height: 36, borderRadius: 10, background: t.tint(color), color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 11 }}><Icon size={18} /></span>
                  <p style={{ margin: 0, fontSize: 14.5, fontWeight: 600 }}>{label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: t.text3 }}>{sub}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        <p style={{ textAlign: 'center', fontSize: 11.5, color: t.text3, marginTop: 10, opacity: 0.75 }}>
          Prototipo · panel de control web · sin barra lateral · secciones agrupadas en la página principal
        </p>
      </main>
    </div>
  )
}
