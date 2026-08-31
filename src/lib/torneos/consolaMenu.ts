import { Trophy, MapPin, Wallet, Users } from '@/components/todh/iconosTorneum'
import { UserRound } from 'lucide-react'
import type { IconoTorneum } from '@/components/todh/iconosTorneum'
import type { ClaveI18n } from '@/lib/i18n'

// Fuente ÚNICA del menú interno de la consola del TO: la sidebar ya solo tiene
// «Consola TO» y todo lo demás se llega desde aquí. Dos grupos: lo que se
// gestiona a diario (torneos, sedes) y lo que define a la organización
// (perfil, facturación, comunidad). Las páginas destino viven en (to)/.
export type ItemConsola = {
  href: string
  icon: IconoTorneum
  labelKey: ClaveI18n
  descKey: ClaveI18n
}

export type GrupoConsola = {
  tituloKey: ClaveI18n
  items: ItemConsola[]
}

export const MENU_CONSOLA: GrupoConsola[] = [
  {
    tituloKey: 'cm.gestion',
    items: [
      { href: '/gestionar', icon: Trophy, labelKey: 'cm.torneos', descKey: 'cm.torneosDesc' },
      { href: '/sedes', icon: MapPin, labelKey: 'to.sedes', descKey: 'cm.sedesDesc' },
    ],
  },
  {
    tituloKey: 'cm.organizacion',
    items: [
      { href: '/consola/perfil', icon: UserRound, labelKey: 'cm.perfil', descKey: 'cm.perfilDesc' },
      { href: '/consola/facturacion', icon: Wallet, labelKey: 'cm.facturacion', descKey: 'cm.facturacionDesc' },
      { href: '/consola/comunidad', icon: Users, labelKey: 'to.comunidad', descKey: 'cm.comunidadDesc' },
    ],
  },
]
