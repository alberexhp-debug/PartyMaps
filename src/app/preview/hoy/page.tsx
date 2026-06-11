'use client'
import { useState } from 'react'
import { Sun, Moon, ChevronRight, Play, Settings2 } from 'lucide-react'

/**
 * PROTOTIPO — Concepto "Tus noches" para el rediseño del panel del local.
 * Pantalla de inicio. Claro por defecto, interruptor a oscuro. Datos de ejemplo.
 * Objetivo: orden, limpieza, minimalismo y que se entienda sin ninguna guía.
 * Ruta pública para revisar: /preview/hoy
 */

const TEMA = {
  claro: {
    canvas: '#FBFBFD', surface: '#FFFFFF', surface2: '#F6F6F9',
    text: '#16161D', text2: '#5B5B68', text3: '#9A9AA6',
    border: '#ECECF1', accent: '#E0455E', accentInk: '#FFFFFF', accentSoft: '#FCEBEE',
    green: '#15803D', amber: '#B45309', greenSoft: '#EAF5EE', amberSoft: '#FBF1E3',
    shadow: '0 1px 2px rgba(16,16,29,0.04), 0 8px 24px -14px rgba(16,16,29,0.18)',
  },
  oscuro: {
    canvas: '#0B0B12', surface: '#15151F', surface2: '#1B1B2A',
    text: '#FAFAFC', text2: '#B8B8CC', text3: '#82829A',
    border: 'rgba(255,255,255,0.08)', accent: '#E94560', accentInk: '#FFFFFF', accentSoft: 'rgba(233,69,96,0.14)',
    green: '#34D399', amber: '#F39C12', greenSoft: 'rgba(52,211,153,0.12)', amberSoft: 'rgba(243,156,18,0.12)',
    shadow: '0 10px 30px -16px rgba(0,0,0,0.7)',
  },
}

const PROXIMAS = [
  { dia: 'Vie 20 jun', nombre: 'Techno Underground', estado: 'Falta el precio', listo: false },
  { dia: 'Sáb 21 jun', nombre: 'Reggaetón Hits', estado: 'Todo listo', listo: true },
]
const PASADAS = [
  { dia: 'Sáb 7 jun', ingresos: '4.120 €', entradas: '380 entradas' },
  { dia: 'Vie 6 jun', ingresos: '2.260 €', entradas: '210 entradas' },
]

export default function PreviewHoy() {
  const [modo, setModo] = useState<'claro' | 'oscuro'>('claro')
  const t = TEMA[modo]

  return (
    <div style={{ background: t.canvas, color: t.text, minHeight: '100dvh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 460, margin: '0 auto', padding: '0 18px 40px' }}>

        {/* Cabecera mínima */}
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '22px 2px 18px' }}>
          <div>
            <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: 0 }}>Tu local</p>
            <p style={{ fontSize: 19, fontWeight: 700, margin: '2px 0 0', letterSpacing: '-0.02em' }}>Sala Aurora</p>
          </div>
          <button onClick={() => setModo(modo === 'claro' ? 'oscuro' : 'claro')}
            aria-label="Cambiar tema"
            style={{ width: 38, height: 38, borderRadius: 12, border: `1px solid ${t.border}`, background: t.surface, color: t.text2, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            {modo === 'claro' ? <Moon size={17} /> : <Sun size={17} />}
          </button>
        </header>

        {/* ESTA NOCHE — la tarjeta principal */}
        <section style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 20, padding: 20, boxShadow: t.shadow }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: 0 }}>Esta noche · Sáb 14 jun</p>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, color: t.green }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: t.green, display: 'inline-block' }} />
              Abierto ahora
            </span>
          </div>

          {/* Tres números, limpios */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4, margin: '18px 0 20px' }}>
            {[['1.240 €', 'Ingresos'], ['320', 'Entradas'], ['60%', 'Aforo']].map(([n, l]) => (
              <div key={l} style={{ textAlign: 'left' }}>
                <p style={{ fontSize: 25, fontWeight: 700, margin: 0, letterSpacing: '-0.03em', fontFeatureSettings: '"tnum"' }}>{n}</p>
                <p style={{ fontSize: 12, color: t.text3, margin: '3px 0 0', fontWeight: 500 }}>{l}</p>
              </div>
            ))}
          </div>

          {/* Una sola acción, el único color de marca */}
          <button style={{ width: '100%', height: 52, borderRadius: 14, border: 'none', background: t.accent, color: t.accentInk, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', boxShadow: modo === 'claro' ? '0 8px 20px -10px rgba(224,69,94,0.55)' : 'none' }}>
            <Play size={18} fill="currentColor" /> Operar la noche
          </button>
        </section>

        {/* PRÓXIMAS */}
        <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '28px 2px 10px' }}>Próximas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PROXIMAS.map(p => (
            <button key={p.nombre} style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', textAlign: 'left', background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: '14px 16px', cursor: 'pointer', color: t.text }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 15, fontWeight: 600, margin: 0 }}>{p.nombre}</p>
                <p style={{ fontSize: 12.5, color: t.text3, margin: '3px 0 0' }}>{p.dia}</p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 10px', borderRadius: 99, color: p.listo ? t.green : t.amber, background: p.listo ? t.greenSoft : t.amberSoft }}>{p.estado}</span>
              <ChevronRight size={18} style={{ color: t.text3 }} />
            </button>
          ))}
        </div>

        {/* CÓMO FUE */}
        <p style={{ fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: t.text3, fontWeight: 700, margin: '28px 2px 10px' }}>Cómo fue</p>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, overflow: 'hidden' }}>
          {PASADAS.map((p, i) => (
            <div key={p.dia} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderTop: i ? `1px solid ${t.border}` : 'none' }}>
              <span style={{ fontSize: 14, color: t.text2 }}>{p.dia}</span>
              <span style={{ fontSize: 13.5 }}><strong style={{ fontWeight: 700 }}>{p.ingresos}</strong> <span style={{ color: t.text3 }}>· {p.entradas}</span></span>
            </div>
          ))}
        </div>

        {/* Lo de la trastienda, tranquilo y aparte */}
        <button style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', color: t.text3, fontSize: 13.5, padding: '22px 4px 0', cursor: 'pointer' }}>
          <Settings2 size={16} /> Ajustes del local, equipo y facturación
          <ChevronRight size={15} style={{ marginLeft: 'auto' }} />
        </button>

        <p style={{ textAlign: 'center', fontSize: 11, color: t.text3, marginTop: 28, opacity: 0.7 }}>
          Prototipo · concepto “Tus noches” · sin tutorial, se entiende solo
        </p>
      </div>
    </div>
  )
}
