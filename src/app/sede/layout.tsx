import { UserBottomNav } from '@/components/user/UserBottomNav'
import { UserSideNav } from '@/components/user/UserSideNav'
import { RequireSesion } from '@/components/todh/RequireSesion'

// El panel de sede usa el MISMO shell que la app (rail lateral / barra inferior):
// el menú de la sede muestra sus apartados directamente (Resumen, Solicitudes,
// Plano, Disponibilidad, Torneos) y debajo la sección de Organizador, como un TO.
export default function SedeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RequireSesion rol="local">
      <div className="flex flex-col min-h-screen lg:pl-[244px]">
        <UserSideNav />
        <main className="flex-1 pb-20 lg:pb-8 w-full max-w-xl md:max-w-2xl lg:max-w-none mx-auto lg:mx-0 relative">
          {children}
        </main>
        <UserBottomNav />
      </div>
    </RequireSesion>
  )
}
