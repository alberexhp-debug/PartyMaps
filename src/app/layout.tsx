import type { Metadata, Viewport } from 'next'
import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'PartyMaps — Ocio nocturno en Madrid',
  description: 'Descubre qué local merece la pena esta noche. Mapa en tiempo real, entradas, planes y más.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PartyMaps',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0D0D1A',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
        <script dangerouslySetInnerHTML={{
          __html: `if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').catch(() => {}) }`
        }} />
      </body>
    </html>
  )
}
