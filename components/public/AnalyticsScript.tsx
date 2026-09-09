import Script from 'next/script'
import { publicEnv } from '@/lib/env'

/**
 * Loads a third-party analytics script only when one is configured.
 *
 * The default ('internal') loads nothing at all — events are posted to our own
 * route handler — so the public site ships zero third-party JavaScript unless
 * you deliberately opt in.
 */
export function AnalyticsScript() {
  const { analyticsProvider, analyticsScriptUrl, analyticsSiteId } = publicEnv()

  if (analyticsProvider === 'none' || analyticsProvider === 'internal') return null
  if (!analyticsScriptUrl || !analyticsSiteId) return null

  if (analyticsProvider === 'umami') {
    return (
      <Script
        src={analyticsScriptUrl}
        data-website-id={analyticsSiteId}
        strategy="afterInteractive"
        defer
      />
    )
  }

  return (
    <Script src={analyticsScriptUrl} data-domain={analyticsSiteId} strategy="afterInteractive" defer />
  )
}
