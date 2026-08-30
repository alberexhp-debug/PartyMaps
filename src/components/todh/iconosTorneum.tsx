import type { ReactNode, SVGProps } from 'react'

// ─────────────────────────────────────────────────────────────────────────────
// ICONOS TORNEUM — set propio general (rediseño 30-08, decisión Albert #4).
//
// CRITERIO
// · Inventario: los ~50 iconos de lucide-react más importados en src/app +
//   src/components (ranking por nº de imports, 30-08). Se incluyen además los
//   espejos triviales (ChevronLeft/Up, ArrowRight) para cubrir navegación.
// · Contrato: MISMO nombre exportado y misma firma práctica que lucide
//   ({ size?, className?, strokeWidth? } + props SVG, color vía CSS
//   currentColor). El barrido futuro es solo cambiar el import:
//     import { X, Check } from 'lucide-react'
//       →  import { X, Check } from '@/components/todh/iconosTorneum'
// · Lenguaje visual: el de los tiles de logros — viewBox 24, trazo 2,
//   extremos/uniones redondeados, un solo color. Carácter propio: geometría
//   algo más angulosa/gaming que lucide (escudos y campanas de cortes rectos,
//   estrellas de puntas más finas, flechas de cabeza más afilada, el engranaje
//   es una tuerca hexagonal) sin perder legibilidad a 14-16 px.
// · Cada icono: pocos paths, siluetas cerradas cuando ayudan a leer en 12 px.
// ─────────────────────────────────────────────────────────────────────────────

export type IconoTorneumProps = Omit<SVGProps<SVGSVGElement>, 'strokeWidth'> & {
  size?: number | string
  strokeWidth?: number | string
}

function icono(nombre: string, contenido: ReactNode) {
  function Icono({ size = 24, strokeWidth = 2, className = '', ...resto }: IconoTorneumProps) {
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className={className}
        {...resto}
      >
        {contenido}
      </svg>
    )
  }
  Icono.displayName = `IconoTorneum(${nombre})`
  return Icono
}

// ── Básicos / acciones ───────────────────────────────────────────────────────

export const X = icono('X', <path d="M5.5 5.5 L18.5 18.5 M18.5 5.5 L5.5 18.5" />)

export const Check = icono('Check', <path d="M4 12.5 L9.5 18 L20 6.5" />)

export const Plus = icono('Plus', <path d="M12 4.5 V19.5 M4.5 12 H19.5" />)

export const Minus = icono('Minus', <path d="M5 12 H19" />)

export const Copy = icono('Copy', (
  <>
    <rect x="8.5" y="8.5" width="12" height="12" rx="2.5" />
    <path d="M5.5 15.5 A2 2 0 0 1 3.5 13.5 V5.5 A2 2 0 0 1 5.5 3.5 H13.5 A2 2 0 0 1 15.5 5.5" />
  </>
))

export const Trash2 = icono('Trash2', (
  <>
    <path d="M3.5 6.5 H20.5" />
    <path d="M9 6.5 V4.5 A1.2 1.2 0 0 1 10.2 3.5 H13.8 A1.2 1.2 0 0 1 15 4.5 V6.5" />
    <path d="M5.5 6.5 L6.4 18.8 A2 2 0 0 0 8.4 20.5 H15.6 A2 2 0 0 0 17.6 18.8 L18.5 6.5" />
    <path d="M10 10.5 V16.5 M14 10.5 V16.5" />
  </>
))

export const Pencil = icono('Pencil', (
  <>
    <path d="M14.5 5.5 L4.5 15.5 L3.5 20.5 L8.5 19.5 L18.5 9.5 Z" />
    <path d="M13 7 L17 11 M16.5 3.5 L20.5 7.5 L18.5 9.5" />
  </>
))

export const Save = icono('Save', (
  <>
    <path d="M3.5 6 A2.5 2.5 0 0 1 6 3.5 H15.5 L20.5 8.5 V18 A2.5 2.5 0 0 1 18 20.5 H6 A2.5 2.5 0 0 1 3.5 18 Z" />
    <path d="M7.5 20.5 V14.5 H16.5 V20.5" />
    <path d="M7.5 3.5 V7.5 H14" />
  </>
))

export const Download = icono('Download', (
  <>
    <path d="M12 3.5 V14.5 M6.8 9.2 L12 14.5 L17.2 9.2" />
    <path d="M3.5 15.5 V18 A2.5 2.5 0 0 0 6 20.5 H18 A2.5 2.5 0 0 0 20.5 18 V15.5" />
  </>
))

export const Send = icono('Send', (
  <>
    <path d="M21 3 L10.5 13.5" />
    <path d="M21 3 L14.2 21 L10.5 13.5 L3 9.8 Z" />
  </>
))

export const Search = icono('Search', (
  <>
    <circle cx="10.5" cy="10.5" r="6.5" />
    <path d="M15.3 15.3 L21 21" />
  </>
))

export const RotateCcw = icono('RotateCcw', (
  <>
    <path d="M3.5 3.5 V8.5 H8.5" />
    <path d="M3.5 12 A8.5 8.5 0 1 0 12 3.5 C9.5 3.5 7.2 4.5 5.5 6.2 L3.5 8.1" />
  </>
))

export const RefreshCw = icono('RefreshCw', (
  <>
    <path d="M20.5 3.5 V8.5 H15.5" />
    <path d="M20.5 12 A8.5 8.5 0 1 1 12 3.5 C14.5 3.5 16.8 4.5 18.5 6.2 L20.5 8.1" />
  </>
))

export const Play = icono('Play', <path d="M7.5 4.5 L19.5 12 L7.5 19.5 Z" />)

export const Power = icono('Power', (
  <>
    <path d="M12 2.5 V11" />
    <path d="M7.5 5.6 A8 8 0 1 0 16.5 5.6" />
  </>
))

// ── Flechas y chevrons ───────────────────────────────────────────────────────

export const ArrowLeft = icono('ArrowLeft', <path d="M20.5 12 H3.5 M10 5.5 L3.5 12 L10 18.5" />)

export const ArrowRight = icono('ArrowRight', <path d="M3.5 12 H20.5 M14 5.5 L20.5 12 L14 18.5" />)

export const ChevronRight = icono('ChevronRight', <path d="M9 4.5 L16.5 12 L9 19.5" />)

export const ChevronLeft = icono('ChevronLeft', <path d="M15 4.5 L7.5 12 L15 19.5" />)

export const ChevronDown = icono('ChevronDown', <path d="M4.5 9 L12 16.5 L19.5 9" />)

export const ChevronUp = icono('ChevronUp', <path d="M4.5 15 L12 7.5 L19.5 15" />)

export const LogOut = icono('LogOut', (
  <>
    <path d="M9.5 3.5 H6 A2.5 2.5 0 0 0 3.5 6 V18 A2.5 2.5 0 0 0 6 20.5 H9.5" />
    <path d="M15.5 7.5 L20 12 L15.5 16.5 M20 12 H9.5" />
  </>
))

export const ExternalLink = icono('ExternalLink', (
  <>
    <path d="M13.5 3.5 H20.5 V10.5 M20.5 3.5 L11.5 12.5" />
    <path d="M20.5 14 V18 A2.5 2.5 0 0 1 18 20.5 H6 A2.5 2.5 0 0 1 3.5 18 V6 A2.5 2.5 0 0 1 6 3.5 H10" />
  </>
))

// ── Personas ─────────────────────────────────────────────────────────────────

export const User = icono('User', (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M4.5 20.5 C4.5 15.9 7.6 13.9 12 13.9 C16.4 13.9 19.5 15.9 19.5 20.5" />
  </>
))

export const Users = icono('Users', (
  <>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M3.5 20.5 C3.5 16.2 5.9 14.2 9 14.2 C12.1 14.2 14.5 16.2 14.5 20.5" />
    <path d="M15.5 4.9 A3.5 3.5 0 0 1 15.5 11.1" />
    <path d="M17.3 14.6 C19.6 15.4 20.5 17.4 20.5 20.5" />
  </>
))

export const UserPlus = icono('UserPlus', (
  <>
    <circle cx="9.5" cy="8" r="4" />
    <path d="M2.5 20.5 C2.5 15.9 5.6 13.9 9.5 13.9 C11.5 13.9 13.2 14.3 14.4 15.2" />
    <path d="M19 8.5 V14.5 M16 11.5 H22" />
  </>
))

// ── Competición / juego ──────────────────────────────────────────────────────

export const Trophy = icono('Trophy', (
  <>
    <path d="M7 3.5 H17 V9 A5 5 0 0 1 7 9 Z" />
    <path d="M7 5.5 H3.5 C3.5 8.6 5 10.4 7.4 10.9 M17 5.5 H20.5 C20.5 8.6 19 10.4 16.6 10.9" />
    <path d="M12 14 V17.5" />
    <path d="M8 20.5 C8 18.6 9.7 17.5 12 17.5 C14.3 17.5 16 18.6 16 20.5 Z" />
  </>
))

export const Star = icono('Star', (
  <path d="M12 2.8 L14.6 8.8 L21.1 9.4 L16.2 13.8 L17.6 20.2 L12 16.8 L6.4 20.2 L7.8 13.8 L2.9 9.4 L9.4 8.8 Z" />
))

export const Crown = icono('Crown', (
  <>
    <path d="M3.5 7 L8.5 10.5 L12 4.5 L15.5 10.5 L20.5 7 L19 18.5 H5 Z" />
    <path d="M5.5 14.8 H18.5" />
  </>
))

export const Swords = icono('Swords', (
  <>
    <path d="M4.5 4.5 L19.5 19.5 M16.5 21 L21 16.5" />
    <path d="M19.5 4.5 L4.5 19.5 M3 16.5 L7.5 21" />
  </>
))

export const Zap = icono('Zap', (
  <path d="M13.5 2.5 L4.5 13.5 H11 L10.5 21.5 L19.5 10.5 H13 Z" />
))

export const Sparkles = icono('Sparkles', (
  <>
    <path d="M10.5 4.5 L12.3 10.2 L18 12 L12.3 13.8 L10.5 19.5 L8.7 13.8 L3 12 L8.7 10.2 Z" />
    <path d="M18.5 3 L19.2 5.3 L21.5 6 L19.2 6.7 L18.5 9 L17.8 6.7 L15.5 6 L17.8 5.3 Z" />
    <path d="M18 15.5 L18.6 17.4 L20.5 18 L18.6 18.6 L18 20.5 L17.4 18.6 L15.5 18 L17.4 17.4 Z" />
  </>
))

// ── Seguridad / estado ───────────────────────────────────────────────────────

export const Shield = icono('Shield', (
  <path d="M12 2.5 L20 5.5 V12 L12 21.5 L4 12 V5.5 Z" />
))

export const ShieldCheck = icono('ShieldCheck', (
  <>
    <path d="M12 2.5 L20 5.5 V12 L12 21.5 L4 12 V5.5 Z" />
    <path d="M8.5 11.5 L11.2 14.2 L15.5 8.9" />
  </>
))

export const Lock = icono('Lock', (
  <>
    <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
    <path d="M8 10.5 V7.5 A4 4 0 0 1 16 7.5 V10.5" />
    <path d="M12 14.3 V16.7" />
  </>
))

export const KeyRound = icono('KeyRound', (
  <>
    <circle cx="7.8" cy="16.2" r="4.3" />
    <path d="M10.8 13.2 L20.5 3.5" />
    <path d="M17.5 6.5 L20.5 9.5" />
  </>
))

export const Eye = icono('Eye', (
  <>
    <path d="M2.5 12 C5 7.2 8.2 5 12 5 C15.8 5 19 7.2 21.5 12 C19 16.8 15.8 19 12 19 C8.2 19 5 16.8 2.5 12 Z" />
    <circle cx="12" cy="12" r="3.2" />
  </>
))

export const EyeOff = icono('EyeOff', (
  <>
    <path d="M4 4 L20 20" />
    <path d="M9.9 5.3 C10.6 5.1 11.3 5 12 5 C15.8 5 19 7.2 21.5 12 C20.8 13.4 19.9 14.6 19 15.6" />
    <path d="M6.6 6.9 C4.9 8.2 3.6 9.9 2.5 12 C5 16.8 8.2 19 12 19 C13.8 19 15.5 18.5 17 17.5" />
    <path d="M9.8 10.1 A3.2 3.2 0 0 0 13.9 14.2" />
  </>
))

export const AlertCircle = icono('AlertCircle', (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5 V13 M12 16.4 V16.6" />
  </>
))

export const AlertTriangle = icono('AlertTriangle', (
  <>
    <path d="M10.2 4.4 A2.1 2.1 0 0 1 13.8 4.4 L21.5 17.4 A2.1 2.1 0 0 1 19.7 20.5 H4.3 A2.1 2.1 0 0 1 2.5 17.4 Z" />
    <path d="M12 9.5 V14 M12 17.2 V17.4" />
  </>
))

// ── Tiempo / lugar ───────────────────────────────────────────────────────────

export const Clock = icono('Clock', (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 6.5 V12 L15.5 14" />
  </>
))

export const Calendar = icono('Calendar', (
  <>
    <rect x="3.5" y="4.5" width="17" height="16" rx="2.5" />
    <path d="M3.5 9.5 H20.5 M8 2.5 V6.5 M16 2.5 V6.5" />
  </>
))

export const CalendarClock = icono('CalendarClock', (
  <>
    <path d="M20.5 9 V7 A2.5 2.5 0 0 0 18 4.5 H6 A2.5 2.5 0 0 0 3.5 7 V18 A2.5 2.5 0 0 0 6 20.5 H10.5" />
    <path d="M3.5 9.5 H20.5 M8 2.5 V6.5 M16 2.5 V6.5" />
    <circle cx="17" cy="17" r="4.5" />
    <path d="M17 14.8 V17 L18.7 18.3" />
  </>
))

export const MapPin = icono('MapPin', (
  <>
    <path d="M12 21.5 C7.3 17 4.5 13.5 4.5 9.8 A7.5 7.5 0 0 1 19.5 9.8 C19.5 13.5 16.7 17 12 21.5 Z" />
    <circle cx="12" cy="9.8" r="2.6" />
  </>
))

// ── Comercio ─────────────────────────────────────────────────────────────────

export const Store = icono('Store', (
  <>
    <path d="M4.5 3.5 H19.5 L21 8.5 H3 Z" />
    <path d="M4.5 8.5 V20.5 H19.5 V8.5" />
    <path d="M9.5 20.5 V14 H14.5 V20.5" />
  </>
))

export const Ticket = icono('Ticket', (
  <>
    <path d="M3.5 6.5 H20.5 V10 A2.2 2.2 0 0 0 20.5 14.4 V17.5 H3.5 V14.4 A2.2 2.2 0 0 0 3.5 10 Z" />
    <path d="M9.5 6.5 V8.4 M9.5 11 V13 M9.5 15.6 V17.5" />
  </>
))

export const Wallet = icono('Wallet', (
  <>
    <rect x="3.5" y="5.5" width="17" height="14" rx="2.5" />
    <path d="M20.5 10.5 H16 A2.5 2.5 0 0 0 16 15.5 H20.5" />
  </>
))

// ── Comunicación ─────────────────────────────────────────────────────────────

export const Mail = icono('Mail', (
  <>
    <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
    <path d="M3.5 8.5 L12 13.8 L20.5 8.5" />
  </>
))

export const AtSign = icono('AtSign', (
  <>
    <circle cx="12" cy="12" r="3.8" />
    <path d="M15.8 8.2 V13.7 A2.3 2.3 0 0 0 20.4 13.7 V12 A8.4 8.4 0 1 0 16.9 18.8" />
  </>
))

export const MessageSquare = icono('MessageSquare', (
  <path d="M20.5 6 A2.5 2.5 0 0 0 18 3.5 H6 A2.5 2.5 0 0 0 3.5 6 V20.5 L7.3 17 H18 A2.5 2.5 0 0 0 20.5 14.5 Z" />
))

export const Bell = icono('Bell', (
  <>
    <path d="M12 3.5 C8.7 3.5 6.5 5.9 6.5 9.5 C6.5 13.8 5.2 15.3 4 16.5 H20 C18.8 15.3 17.5 13.8 17.5 9.5 C17.5 5.9 15.3 3.5 12 3.5 Z" />
    <path d="M9.9 20 A2.3 2.3 0 0 0 14.1 20" />
  </>
))

export const Megaphone = icono('Megaphone', (
  <>
    <path d="M21 5 L3.5 10.3 V13.7 L21 19 Z" />
    <path d="M7.5 14.8 L8.6 19 A1.8 1.8 0 0 0 12.1 18.1 L11.3 15.2" />
  </>
))

export const Radio = icono('Radio', (
  <>
    <circle cx="12" cy="12" r="2" />
    <path d="M8.2 15.8 A5.4 5.4 0 0 1 8.2 8.2 M15.8 8.2 A5.4 5.4 0 0 1 15.8 15.8" />
    <path d="M4.9 19.1 A10 10 0 0 1 4.9 4.9 M19.1 4.9 A10 10 0 0 1 19.1 19.1" />
  </>
))

// ── Datos / paneles ──────────────────────────────────────────────────────────

export const TrendingUp = icono('TrendingUp', (
  <>
    <path d="M3 17.5 L9.5 11 L13.5 15 L21 7.5" />
    <path d="M15.5 7.5 H21 V13" />
  </>
))

export const LayoutDashboard = icono('LayoutDashboard', (
  <>
    <rect x="3.5" y="3.5" width="7" height="9" rx="1.8" />
    <rect x="13.5" y="3.5" width="7" height="5" rx="1.8" />
    <rect x="13.5" y="11.5" width="7" height="9" rx="1.8" />
    <rect x="3.5" y="15.5" width="7" height="5" rx="1.8" />
  </>
))

export const ListTree = icono('ListTree', (
  <>
    <path d="M8.5 5.5 H20.5 M13 12 H20.5 M13 18.5 H20.5" />
    <path d="M4 5.5 V10 A2 2 0 0 0 6 12 H9 M4 10 V16.5 A2 2 0 0 0 6 18.5 H9" />
  </>
))

export const QrCode = icono('QrCode', (
  <>
    <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
    <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    <path d="M13.5 17 V13.5 H17 M20.5 13.5 V16.5 M17 17 H20.5 V20.5 M13.5 20.5 H16.5" />
  </>
))

export const Settings = icono('Settings', (
  <>
    <path d="M12 2.8 L19.97 7.4 V16.6 L12 21.2 L4.03 16.6 V7.4 Z" />
    <circle cx="12" cy="12" r="3.2" />
  </>
))
