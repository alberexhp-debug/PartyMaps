import { UserBottomNav } from '@/components/user/UserBottomNav'
import { UserSideNav } from '@/components/user/UserSideNav'
import { PWAInstallPrompt } from '@/components/user/PWAInstallPrompt'
import { AvisoMiMesa } from '@/components/todh/AvisoMiMesa'
import { AvisoInactividad } from '@/components/todh/AvisoInactividad'
import { BuzonCuenta } from '@/components/todh/BuzonCuenta'
import { RequireSesion } from '@/components/todh/RequireSesion'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  // La app pública admite también a la SEDE (rol local): así puede ver las
  // fichas de torneo y el bracket de lo que aloja, el mapa y Explorar. Su menú
  // cambia (Mi sede en vez de entradas/perfil); ver UserSideNav/UserBottomNav.
  return (
    <RequireSesion rol={['jugador', 'local']}>
    <div className="flex flex-col min-h-screen lg:pl-[244px]">
      {/* Rail lateral fijo en escritorio; barra inferior en móvil/tablet. */}
      <UserSideNav />
      {/* Móvil: columna tipo app. Tablet/escritorio: contenido más ancho y centrado. */}
      {/* Escritorio: contenido FLUIDO pegado al rail (sin contenedor centrado con
          pasillos muertos); cada página decide si limita su ancho de lectura. */}
      <main className="flex-1 pb-20 lg:pb-8 lg:pt-5 w-full max-w-xl md:max-w-2xl lg:max-w-none lg:px-8 mx-auto lg:mx-0 relative">
        {children}
      </main>
      <PWAInstallPrompt />
      {/* «Ver mi mesa» flotante: sigue al jugador por toda la app cuando su torneo está en directo */}
      <AvisoMiMesa />
      {/* Vigía de inactividad: deja el aviso de pérdida de puntos en el buzón */}
      <AvisoInactividad />
      {/* Buzón cruzado: entrega lo que otras cuentas dejaron a tu nombre */}
      <BuzonCuenta />
      <UserBottomNav />
    </div>
    </RequireSesion>
  )
}
