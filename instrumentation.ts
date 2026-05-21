import * as Sentry from '@sentry/nextjs'

// Server-side initialization (Node y Edge). El cliente se inicializa en
// instrumentation-client.ts.
export async function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
  if (!dsn) return

  if (process.env.NEXT_RUNTIME === 'nodejs' || process.env.NEXT_RUNTIME === 'edge') {
    Sentry.init({
      dsn,
      environment: process.env.VERCEL_ENV ?? 'development',
      tracesSampleRate: 0.1,
      // No queremos rastrear ruido en local
      enabled: process.env.NODE_ENV === 'production' || process.env.SENTRY_FORCE === '1',
    })
  }
}

export const onRequestError = Sentry.captureRequestError
