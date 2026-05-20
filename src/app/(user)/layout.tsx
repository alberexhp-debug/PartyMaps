import { UserBottomNav } from '@/components/user/UserBottomNav'

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#0D0D1A]">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <UserBottomNav />
    </div>
  )
}
