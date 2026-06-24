'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

// Captura errores no manejados que ocurren fuera de las rutas (en el root layout).
// Doc7: cualquier error en producción debe acabar en Sentry.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="es">
      <body style={{ background: '#0D0D1A', color: '#FFFFFF', fontFamily: 'system-ui, sans-serif' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center', gap: 16 }}>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Algo ha fallado</h1>
          <p style={{ color: '#A0A0B8', maxWidth: 320, fontSize: 14 }}>
            Hemos registrado el error y lo estamos revisando. Vuelve a intentarlo en un momento.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#B6FF3A', color: '#FFFFFF', border: 'none',
              borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  )
}
