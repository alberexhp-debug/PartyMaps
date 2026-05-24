import type { NextConfig } from "next"
import { withSentryConfig } from "@sentry/nextjs"

const nextConfig: NextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: "https", hostname: "cyeunxszrivubdexirul.supabase.co" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "pub-*.r2.dev" },
      { protocol: "https", hostname: "api.mapbox.com" },
      { protocol: "https", hostname: "*.cdninstagram.com" },
      { protocol: "https", hostname: "*.fbcdn.net" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
  turbopack: {},
}

// Sentry: solo se aplica si hay DSN configurado. En local sin DSN, next.config.ts
// se exporta tal cual.
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN
const sentryOrg = process.env.SENTRY_ORG
const sentryProject = process.env.SENTRY_PROJECT

export default dsn && sentryOrg && sentryProject
  ? withSentryConfig(nextConfig, {
      org: sentryOrg,
      project: sentryProject,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      reactComponentAnnotation: { enabled: true },
      disableLogger: true,
      automaticVercelMonitors: true,
      sourcemaps: { disable: false },
    })
  : nextConfig
