'use client'
import { useState } from 'react'
import {
  Sun, Moon, Bell, ChevronDown, Ticket, Beer, ScanLine, CalendarDays,
  MessageSquare, Star, ChevronRight, User, Settings2, Users, CreditCard, LifeBuoy, LogOut,
} from 'lucide-react'

/**
 * PROTOTIPO 2 — "Panel de control" estilo web-app para el panel del local.
 * Página principal con lo FUNDAMENTAL del dueño + avatar/menú arriba a la izquierda
 * para perfil, configuración, etc. Claro por defecto + interruptor a oscuro.
 * Ruta pública: /preview/panel
 */

const TEMA = {
  claro: {
    canvas: '#FAFAFB', surface: '#FFFFFF', surface2: '#F4F4F7',
    text: '#16161D', text2: '#5B5B68', text3: '#9A9AA6',
    border: '#ECECF1', accent: '#E0455E', accentSoft: '#FCEBEE',
    green: '#15803D', amber: '#B45309', blue: '#2563EB', violet: '#7C5CFF',
    shadow: '0 1px 2px rgba(16,16,29,0.04), 0 10px 26px -16px rgba(16,16,29,0.20)',
    barShadow: '0 1px 0 rgba(16,16,29,0.05)',
  },
  oscuro: {
    canvas: '#0B0B12', surface: '#15151F', surface2: '#1B1B2A',
    text: '#FAFAFC', text2: '#B8B8CC', text3: '#82829A',
    border: 'rgba(255,255,255,0.08)', accent: '#E94560', accentSoft: 'rgba(233,69,96,0.14)',
    green: '#34D399', amber: '#F39C12', blue: '#4F8EF7', violet: '#9B82FF',
    shadow: '0 10px 30px -16px rgba(0,0,0,0.7)',
    barShadow: '0 1px 0 rgba(255,255,255,0.05)',
  },
}

const KPIS = [
  { n: '1.240 €', l: 'Ingresos hoy' },
  { n: '320', l: 'Entradas hoy' },
  { n: '60%', l: 'Aforo ahora' },
  { n: '1.240', l: 'Suscriptores' },
]

const MENU = [
  { icon: User, label: 'Tu perfil' },
  { icon: Settings2, label: 'Configuración del local' },
  { icon: Users, label: 'Equipo' },
  { icon: CreditCard, label: 'Facturación' },
  { icon: LifeBuoy, label: 'Soporte' },
]

export default function PreviewPanel() {
  const [modo, setModo] = useState<'claro' | 'oscuro'>('claro')
  const [menu, setMenu] = useState(false)
  const t = TEMA[modo]

  const op = (icon: React.ElementType, label: string, dato: string, color: string) => ({ icon, label, dato, color })
  const OPER = [
    op(Ticket, 'Taquilla', 'Vender en puerta', t.accent),
    op(Beer, 'Barra', '3 pedidos en cola', t.amber),
    op(ScanLine, 'Puerta', '320 dentro', t.blue),
    op(CalendarDays, 'Eventos', 'Vie · Techno', t.violet),
  ]

  return (
    <div style={{ background: t.canvas, color: t.text, minHeight: '100dvh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* ── Barra superior (web) ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: t.surface, borderBottom: `1px solid ${t.border}`, boxShadow: t.barShadow }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', height: 60, padding: '0 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar + menú (arriba a la izquierda) */}
          <div style={{ position: 'relative' }}>
            <button onClick={() => setMenu(m => !m)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 12 }}>
              <span style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${t.accent}, ${t.violet})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 15 }}>A</span>
              <ChevronDown size={16} style={{ color: t.text3 }} />
            </button>
            {menu && (
              <>
                <div onClick={() => setMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 1 }} />
                <div style={{ position: 'absolute', top: 50, left: 0, zIndex: 2, width: 248, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, boxShadow: t.shadow, padding: 8 }}>
                  <div style={{ padding: '8px 10px 10px' }}>
                    <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>Albert · Sala Aurora</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12.5, color: t.text3 }}>Dueño</p>
                  </div>
                  <div style={{ height: 1, background: t.border, margin: '2px 0 6px' }} />
                  {MENU.map(({ icon: Icon, label }) => (
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
              <Bell size={17} />
              <span style={{ position: 'absolute', top: 8, right: 9, width: 7, height: 7, borderRadius: 99, background: t.accent }} />
            </button>
            <button onClick={() => setModo(modo === 'claro' ? 'oscuro' : 'claro')} aria-label="Cambiar tema"
              style={{ width: 38, height: 38, borderRadius: 11, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              {modo === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* ── Página principal (lo fundamental) ── */}
      <main style={{ maxWidth: 1000, margin: '0 auto', padding: '28px 20px 56px' }}>

        {/* Saludo + estado */}
        <div style={{ marginBottom: 22 }}>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-0.025em' }}>Buenas noches, Albert</h1>
          <p style={{ margin: '6px 0 0', fontSize: 14.5, color: t.text2, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: t.green, display: 'inline-block' }} />
            Abierto ahora · 60% de aforo · Sábado 14 jun
          </p>
        </div>

        {/* KPIs fundamentales */}
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 30 }}>
          {KPIS.map(k => (
            <div key={k.l} style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: '16px 18px', boxShadow: t.shadow }}>
              <p style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{k.n}</p>
              <p style={{ margin: '4px 0 0', fontSize: 12.5, color: t.text3, fontWeight: 500 }}>{k.l}</p>
            </div>
          ))}
        </div>

        {/* Tu noche — accesos operativos */}
        <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '0 2px 12px' }}>Tu noche</p>
        <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 12, marginBottom: 30 }}>
          {OPER.map(({ icon: Icon, label, dato, color }) => (
            <button key={label} style={{ textAlign: 'left', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 18, cursor: 'pointer', color: t.text, boxShadow: t.shadow }}>
              <span style={{ width: 40, height: 40, borderRadius: 12, background: modo === 'claro' ? `${color}14` : `${color}22`, color, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <Icon size={20} />
              </span>
              <p style={{ margin: 0, fontSize: 15.5, fontWeight: 600 }}>{label}</p>
              <p style={{ margin: '3px 0 0', fontSize: 12.5, color: t.text3 }}>{dato}</p>
            </button>
          ))}
        </div>

        {/* Te interesa — avisos */}
        <p style={{ fontSize: 12, letterSpacing: '0.12em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '0 2px 12px' }}>Te interesa</p>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden', boxShadow: t.shadow }}>
          {[
            { icon: MessageSquare, color: t.violet, txt: '2 mensajes sin leer', sub: 'De un RRPP y de tu equipo' },
            { icon: Star, color: t.amber, txt: '3 reseñas nuevas', sub: 'Una de 5 estrellas' },
            { icon: CalendarDays, color: t.accent, txt: 'El viernes no tiene precio', sub: 'Techno Underground' },
          ].map((a, i) => (
            <button key={a.txt} style={{ display: 'flex', alignItems: 'center', gap: 13, width: '100%', textAlign: 'left', background: 'transparent', border: 'none', borderTop: i ? `1px solid ${t.border}` : 'none', padding: '14px 16px', cursor: 'pointer', color: t.text }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: modo === 'claro' ? `${a.color}14` : `${a.color}22`, color: a.color, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <a.icon size={16} />
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 14.5, fontWeight: 600 }}>{a.txt}</span>
                <span style={{ display: 'block', fontSize: 12.5, color: t.text3 }}>{a.sub}</span>
              </span>
              <ChevronRight size={18} style={{ color: t.text3 }} />
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11.5, color: t.text3, marginTop: 30, opacity: 0.75 }}>
          Prototipo · panel de control web · avatar arriba a la izquierda → perfil, configuración…
        </p>
      </main>
    </div>
  )
}
