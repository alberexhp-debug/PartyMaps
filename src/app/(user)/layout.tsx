import { UserBottomNav } from '@/components/user/UserBottomNav'
import { UserSideNav } from '@/components/user/UserSideNav'
import { PWAInstallPrompt } from '@/components/user/PWAInstallPrompt'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen lg:pl-[244px]">
      {/* Rail lateral fijo en escritorio; barra inferior en móvil/tablet. */}
      <UserSideNav />
      {/* Móvil: columna tipo app. Tablet/escritorio: contenido más ancho y centrado. */}
      <main className="flex-1 pb-20 lg:pb-8 w-full max-w-xl md:max-w-2xl lg:max-w-7xl 2xl:max-w-[1480px] lg:px-6 mx-auto relative">
        {children}
      </main>
      <PWAInstallPrompt />
      <UserBottomNav />
    </div>
  )
}
