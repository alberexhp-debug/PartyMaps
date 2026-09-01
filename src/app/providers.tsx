'use client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { capturarSalaDeURL } from '@/lib/supabase/sala'
import { ToastProvider } from '@/components/ui/Toast'
import { CookieBanner } from '@/components/ui/CookieBanner'
import { SplashScreen } from '@/components/ui/SplashScreen'
import { AuthProvider } from '@/components/user/AuthProvider'

export function Providers({ children }: { children: React.ReactNode }) {
  // Sala multi-dispositivo: `?sala=codigo` conecta desde cualquier URL (01-09)
  useEffect(() => { capturarSalaDeURL() }, [])

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          {children}
          <CookieBanner />
          <SplashScreen />
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  )
}
