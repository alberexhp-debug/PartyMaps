import { PanelEnObras } from '@/components/ui/PanelEnObras'

// Panel LEGADO de Rumbo, tapado hasta el backend Tourneum (ver PanelEnObras).
export default function Layout(_props: { children: React.ReactNode }) {
  return <PanelEnObras nombre="Panel RRPP" demoHref="/consola" demoLabel="Consola del TO (demo)" />
}
