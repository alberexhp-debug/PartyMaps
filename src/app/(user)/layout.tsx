import { UserBottomNav } from '@/components/user/UserBottomNav'
import { PWAInstallPrompt } from '@/components/user/PWAInstallPrompt'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Columna mobile-first centrada en escritorio (ancho máx tipo app) */}
      <main className="flex-1 pb-20 w-full max-w-xl mx-auto relative">
        {children}
      </main>
      <PWAInstallPrompt />
      <UserBottomNav />
    </div>
  )
}
