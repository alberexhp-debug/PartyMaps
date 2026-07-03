import { TOSideNav } from '@/components/todh/TOSideNav'

// Shell del PANEL DEL TO: rail propio de organizador en escritorio (los jugadores
// no crean torneos; su app no enseña nada de esto). En móvil las páginas mantienen
// sus cabeceras con botón de volver.
export default function TOLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen lg:pl-[244px]">
      <TOSideNav />
      <main className="w-full lg:pt-5 lg:px-8 relative">
        {children}
      </main>
    </div>
  )
}
