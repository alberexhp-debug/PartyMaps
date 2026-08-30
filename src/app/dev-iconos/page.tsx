'use client'

// TEMPORAL QA — revisión visual del REDISEÑO de iconos (decisión Albert #4).
// Borrar tras el QA. Sin i18n a propósito (solo desarrollo). Ruta: /dev-iconos
// Sección 1: 10 juegos ANTES/DESPUÉS · Sección 2: set propio vs lucide.

import type { ComponentType, ReactNode } from 'react'
import * as Lucide from 'lucide-react'
import * as Torneum from '@/components/todh/iconosTorneum'
import { JUEGOS_LIST } from '@/lib/torneos/sample'
import { GAME_GLYPHS } from '@/components/todh/gameGlyphs'
import { GameBadge, GameChip } from '@/components/todh/GameIcon'

// ── Glifos ANTERIORES (copia congelada para comparar; el fichero real ya es el nuevo) ──
const GLIFOS_ANTES: Record<string, ReactNode> = {
  smash: (<><path d="M15.4 2.6 L15.6 10.3 L19.5 14.7 L13.7 15.6 L8.8 20.9 L8.4 13.7 L4 9.1 L10.3 8.4 Z" /><path d="M5.2 4.2 L7 6" /></>),
  magic: (<><rect x="4.8" y="8" width="8.5" height="12" rx="2" transform="rotate(-14 9.05 14)" /><rect x="10.7" y="8" width="8.5" height="12" rx="2" transform="rotate(14 14.95 14)" /><path d="M12 2 L12.7 3.8 L14.5 4.5 L12.7 5.2 L12 7 L11.3 5.2 L9.5 4.5 L11.3 3.8 Z" /></>),
  pokemon: (<><rect x="6" y="3" width="12" height="18" rx="2" /><path d="M13.5 7.5 L10 12.5 L14 12.5 L10.5 17.5" /></>),
  tft: (<><path d="M12 2 L20.66 7 V17 L12 22 L3.34 17 V7 Z" /><circle cx="12" cy="9.4" r="2.05" /><path d="M8.8 17.4 C8.8 15 10.2 14 12 14 C13.8 14 15.2 15 15.2 17.4 Z" /></>),
  tekken: (<><path d="M4 15.5 V8.5 A2 2 0 0 1 8 8.5 A2 2 0 0 1 12 8.5 A2 2 0 0 1 16 8.5 A2 2 0 0 1 20 8.5 V15.5 A3 3 0 0 1 17 18.5 H7 A3 3 0 0 1 4 15.5 Z" /><path d="M4 13.5 H10.5 C12.3 13.5 13 14.4 13 16" /></>),
  sf6: (<><circle cx="15.5" cy="12" r="5" /><path d="M3 9 H8.5 M2 12 H7.5 M3 15 H8.5" /></>),
  valorant: (<><path d="M4.5 9.5 V4.5 H9.5 M14.5 4.5 H19.5 V9.5 M19.5 14.5 V19.5 H14.5 M9.5 19.5 H4.5 V14.5" /><circle cx="12" cy="12" r="1" /></>),
  lol: (<><path d="M4.5 4.5 L19.5 19.5 M16.5 21 L21 16.5 M19.5 4.5 L4.5 19.5 M3 16.5 L7.5 21" /></>),
  cod: (<><circle cx="12" cy="12" r="8" /><path d="M12 2 V6.5 M12 17.5 V22 M2 12 H6.5 M17.5 12 H22" /></>),
  cs: (<><circle cx="10.5" cy="14.5" r="7.5" /><path d="M15.8 9.2 C16.6 7.8 17.3 6.7 18.4 5.5" /><path d="M20 2 L20.55 3.35 L21.9 3.9 L20.55 4.45 L20 5.8 L19.45 4.45 L18.1 3.9 L19.45 3.35 Z" /></>),
}

// Qué evoca cada glifo nuevo (para juzgar identificabilidad).
const EVOCA: Record<string, string> = {
  smash: 'cruz descentrada del emblema',
  magic: 'óvalo del logo con la M',
  pokemon: 'pokéball',
  tft: 'hex del tablero + peón',
  tekken: 'los dos bloques en itálica del logo',
  sf6: 'el 6 hexagonal del logo',
  valorant: 'V angular partida',
  lol: 'L con cortes diagonales',
  cod: 'mira militar',
  cs: 'C partida con el 2',
}

// Set general: [nombre, nº de imports en src (30-08)]. Orden = ranking de uso.
const SET_GENERAL: [string, number][] = [
  ['X', 64], ['Check', 63], ['Users', 40], ['ArrowLeft', 36], ['Star', 31],
  ['Plus', 30], ['ChevronRight', 27], ['Trophy', 26], ['Store', 25], ['MapPin', 24],
  ['Ticket', 21], ['Lock', 21], ['Clock', 21], ['Calendar', 20], ['ShieldCheck', 20],
  ['Search', 19], ['Megaphone', 18], ['Eye', 18], ['Wallet', 16], ['Copy', 16],
  ['Trash2', 14], ['CalendarClock', 13], ['Mail', 12], ['User', 12], ['RotateCcw', 11],
  ['AlertCircle', 11], ['Radio', 11], ['TrendingUp', 10], ['ChevronDown', 10], ['UserPlus', 10],
  ['Bell', 10], ['KeyRound', 9], ['Sparkles', 9], ['Shield', 9], ['Crown', 9],
  ['MessageSquare', 8], ['LogOut', 8], ['Send', 8], ['EyeOff', 8], ['Swords', 8],
  ['Minus', 8], ['AlertTriangle', 8], ['QrCode', 8], ['LayoutDashboard', 7], ['AtSign', 7],
  ['Play', 7], ['Settings', 7], ['Save', 7], ['ListTree', 7], ['Download', 7],
  ['Zap', 7], ['Power', 6], ['Pencil', 6], ['ChevronLeft', 5], ['ArrowRight', 5],
  ['ExternalLink', 4], ['ChevronUp', 3], ['RefreshCw', 3],
]

type IconoLib = ComponentType<{ size?: number; className?: string; strokeWidth?: number; style?: React.CSSProperties }>
const L = Lucide as unknown as Record<string, IconoLib>
const T = Torneum as unknown as Record<string, IconoLib>

const MUTED = '#8B8BA8'
const CARD = { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16 }

// Glifo de juego crudo (sin GameIcon, para comparar viejo/nuevo sin sondas de assets).
function Glifo({ id, color, size, antes = false }: { id: string; color: string; size: number; antes?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {(antes ? GLIFOS_ANTES : GAME_GLYPHS)[id]}
    </svg>
  )
}

// Tile receta-logros alrededor de un glifo (fondo/borde del color del juego).
function Tile({ color, box, children }: { color: string; box: number; children: ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0"
      style={{ width: box, height: box, background: `${color}1A`, border: `1px solid ${color}40`, borderRadius: Math.round(box * 0.3) }}>
      {children}
    </span>
  )
}

const TAMANOS: [number, number][] = [[12, 24], [24, 40], [48, 72]] // [glifo, caja]

export default function DevIconosPage() {
  return (
    <main className="min-h-screen p-6 pb-16" style={{ background: '#0D0F15', color: '#E7EAF2' }}>
      <div className="mx-auto" style={{ maxWidth: 1120 }}>

        <p className="text-[11px] uppercase tracking-wider font-semibold" style={{ color: '#B6FF3A' }}>
          QA del rediseño — pendiente de aprobación de Albert
        </p>
        <h1 className="text-xl font-black mt-1">Iconos Torneum — rediseño total</h1>
        <p className="mt-1 text-xs" style={{ color: MUTED }}>
          Decisión #4 · glifos de juego identificables (evocan el logo real) + set general propio estilo logros.
          Solo diseño: la app sigue usando lucide hasta el barrido.
        </p>

        {/* ── 1 · Juegos: antes / después ─────────────────────────────── */}
        <h2 className="text-sm font-bold mt-8 mb-1">1 · Glifos de juego — antes / después</h2>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          12 · 24 · 48 px sobre tile de tarjeta. Criterio: ¿se sabe qué juego es a 24 px sin leer el nombre?
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {JUEGOS_LIST.map(j => (
            <div key={j.id} className="p-4" style={CARD}>
              <p className="text-[13px] font-bold leading-tight">{j.nombre}</p>
              <p className="text-[10px] mb-3" style={{ color: MUTED }}>{j.id} · {EVOCA[j.id]}</p>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[9px] uppercase tracking-wider font-bold w-12 shrink-0" style={{ color: MUTED }}>Antes</span>
                {TAMANOS.map(([g, caja]) => (
                  <Tile key={g} color={j.color} box={caja}><Glifo id={j.id} color={j.color} size={g} antes /></Tile>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-wider font-bold w-12 shrink-0" style={{ color: '#B6FF3A' }}>Después</span>
                {TAMANOS.map(([g, caja]) => (
                  <Tile key={g} color={j.color} box={caja}><Glifo id={j.id} color={j.color} size={g} /></Tile>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contexto real: chip/badge + fondo claro */}
        <div className="mt-4 flex flex-wrap items-center gap-4 p-4" style={CARD}>
          <span className="text-[10px] uppercase tracking-wider font-bold" style={{ color: MUTED }}>En contexto</span>
          <GameChip juegoId="smash" className="text-xs font-bold" />
          <GameChip juegoId="valorant" className="text-xs font-bold" />
          <GameBadge juegoId="cs" />
          <GameBadge juegoId="sf6" />
          <span className="inline-flex items-center gap-3 rounded-xl px-4 py-2" style={{ background: '#FBFBFD' }}>
            <span className="text-[10px] font-bold" style={{ color: '#5B5B68' }}>Fondo claro</span>
            {JUEGOS_LIST.map(j => <Glifo key={j.id} id={j.id} color={j.color} size={24} />)}
          </span>
        </div>

        {/* ── 2 · Set general propio ──────────────────────────────────── */}
        <h2 className="text-sm font-bold mt-10 mb-1">2 · Set general propio — lucide → Torneum</h2>
        <p className="text-xs mb-4" style={{ color: MUTED }}>
          Los {SET_GENERAL.length} lucide más usados de la app (nº = imports en src), rediseñados con la misma firma:
          el barrido será solo cambiar el import. Gris = lucide actual · blanco = propio (22 px) · pequeño = propio a 14 px.
        </p>
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))' }}>
          {SET_GENERAL.map(([nombre, usos]) => {
            const Lu = L[nombre]
            const To = T[nombre]
            return (
              <div key={nombre} className="px-2 py-3 flex flex-col items-center gap-1.5 text-center" style={CARD}>
                <span className="inline-flex items-center gap-2">
                  {Lu ? <Lu size={22} style={{ color: '#565670' }} /> : <span className="text-[10px]" style={{ color: MUTED }}>—</span>}
                  <span className="text-[10px]" style={{ color: '#565670' }}>→</span>
                  {To ? <To size={22} /> : <span className="text-[10px] text-red-400">falta</span>}
                  {To ? <To size={14} style={{ color: MUTED }} /> : null}
                </span>
                <span className="block text-[11px] font-bold leading-none mt-0.5">{nombre}</span>
                <span className="block text-[9px] leading-none" style={{ color: MUTED }}>{usos} usos</span>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-[10px]" style={{ color: '#565670' }}>
          Página temporal de QA — borrar tras la aprobación. Los glifos de juego viven en gameGlyphs.tsx;
          el set general en iconosTorneum.tsx (aún sin usar por la app).
        </p>
      </div>
    </main>
  )
}
