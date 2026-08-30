import { PanelEnObras } from '@/components/ui/PanelEnObras'

// Panel LEGADO de Rumbo (grupo promotor), tapado hasta el backend Torneum como
// el resto (rrpp, local-panel, gestor, admin): era el único que quedaba
// accesible apuntando a un Supabase retirado.
export default function Layout(_props: { children: React.ReactNode }) {
  return <PanelEnObras nombre="Panel de grupo" demoHref="/sede" demoLabel="Panel de sede (demo)" />
}
