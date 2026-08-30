import { PanelEnObras } from '@/components/ui/PanelEnObras'

// Panel LEGADO de Rumbo, tapado hasta el backend Torneum (ver PanelEnObras).
export default function Layout(_props: { children: React.ReactNode }) {
  return <PanelEnObras nombre="Administración" demoHref="/admin-demo" demoLabel="Panel admin (demo)" />
}
