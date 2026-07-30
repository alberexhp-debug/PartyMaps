import { PanelEnObras } from '@/components/ui/PanelEnObras'

// Panel LEGADO de Rumbo, tapado hasta el backend Tourneum (ver PanelEnObras).
export default function Layout(_props: { children: React.ReactNode }) {
  return <PanelEnObras nombre="Panel del gestor" demoHref="/sede" demoLabel="Panel de sede (demo)" />
}
