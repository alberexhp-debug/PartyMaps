import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
    tracesSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    replaysSessionSampleRate: 0,
    enabled: process.env.NODE_ENV === 'production',
    integrations: [
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
    ],
  })
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
