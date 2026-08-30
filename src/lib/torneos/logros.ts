import {
  Crown, Flame, Target, Sunrise, Handshake,
  Trophy, Globe2, Gem, Layers, Megaphone, Medal,
} from 'lucide-react'
import type { ClaveI18n } from '@/lib/i18n'

// ─────────────────────────────────────────────────────────────────────────────
// Logros del usuario de la demo. Fuente única: los lee la tira del perfil
// (solo desbloqueados) y /perfil/logros (todos, con su condición). Título y
// condición son claves i18n; el icono es un componente de lucide con tile de
// color (mismo lenguaje visual que los KPI del perfil).
// ─────────────────────────────────────────────────────────────────────────────
export type LogroDef = {
  id: string
  icon: React.ElementType
  color: string
  titulo: ClaveI18n
  condicion: ClaveI18n
  desbloqueado: boolean
}

export const LOGROS_USUARIO: LogroDef[] = [
  // Desbloqueados
  { id: 'campeon',     icon: Crown,     color: '#E0BE63', titulo: 'lg.campeon',     condicion: 'lg.campeonC',     desbloqueado: true },
  { id: 'racha10',     icon: Flame,     color: '#FF8A5C', titulo: 'lg.racha10',     condicion: 'lg.racha10C',     desbloqueado: true },
  { id: 'torneos50',   icon: Target,    color: '#9B82FF', titulo: 'lg.torneos50',   condicion: 'lg.torneos50C',   desbloqueado: true },
  { id: 'madrugador',  icon: Sunrise,   color: '#4F8EF7', titulo: 'lg.madrugador',  condicion: 'lg.madrugadorC',  desbloqueado: true },
  { id: 'buenrival',   icon: Handshake, color: '#2ED47A', titulo: 'lg.buenrival',   condicion: 'lg.buenrivalC',   desbloqueado: true },
  // Bloqueados (en gris con candado y su condición)
  { id: 'torneos100',  icon: Medal,     color: '#B6FF3A', titulo: 'lg.torneos100',  condicion: 'lg.torneos100C',  desbloqueado: false },
  { id: 'major',       icon: Trophy,    color: '#E63E54', titulo: 'lg.major',       condicion: 'lg.majorC',       desbloqueado: false },
  { id: 'trotamundos', icon: Globe2,    color: '#5CC8FF', titulo: 'lg.trotamundos', condicion: 'lg.trotamundosC', desbloqueado: false },
  { id: 'rangos',      icon: Gem,       color: '#A78BFA', titulo: 'lg.rangos',      condicion: 'lg.rangosC',      desbloqueado: false },
  { id: 'polivalente', icon: Layers,    color: '#2EC4B6', titulo: 'lg.polivalente', condicion: 'lg.polivalenteC', desbloqueado: false },
  { id: 'anfitrion',   icon: Megaphone, color: '#F4912B', titulo: 'lg.anfitrion',   condicion: 'lg.anfitrionC',   desbloqueado: false },
]

export const LOGROS_DESBLOQUEADOS = LOGROS_USUARIO.filter(l => l.desbloqueado)
export const LOGROS_BLOQUEADOS = LOGROS_USUARIO.filter(l => !l.desbloqueado)
