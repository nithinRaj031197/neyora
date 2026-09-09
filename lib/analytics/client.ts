'use client'

/**
 * Client-side event dispatch.
 *
 * `sendBeacon` first: it survives the page unloading, which is exactly the
 * case for an outbound WhatsApp or social click — the most valuable events we
 * have. `fetch(keepalive)` is the fallback.
 *
 * Fire-and-forget by design: analytics must never delay a navigation or
 * surface an error to a visitor.
 */
import type { AnalyticsEventName, AnalyticsProps } from './events'

const ENDPOINT = '/api/analytics'

export function track(name: AnalyticsEventName, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return

  const provider = process.env.NEXT_PUBLIC_ANALYTICS_PROVIDER ?? 'none'
  if (provider === 'none') return

  // Respect the browser's Do Not Track signal even though it is advisory.
  const nav = window.navigator as Navigator & { doNotTrack?: string; msDoNotTrack?: string }
  if (nav.doNotTrack === '1' || nav.msDoNotTrack === '1') return

  // umami and plausible are script-tag providers: their own script sees the
  // pageview, and custom events go through their global.
  if (provider === 'umami') {
    const umami = (window as unknown as { umami?: { track: (n: string, d?: object) => void } }).umami
    umami?.track(name, props)
    return
  }
  if (provider === 'plausible') {
    const plausible = (
      window as unknown as { plausible?: (n: string, o?: { props?: object }) => void }
    ).plausible
    plausible?.(name, props ? { props } : undefined)
    return
  }

  const body = JSON.stringify({ event_name: name, path: window.location.pathname, props })

  try {
    if (typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' })
      if (navigator.sendBeacon(ENDPOINT, blob)) return
    }
    void fetch(ENDPOINT, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
    }).catch(() => {})
  } catch {
    // Never let analytics break a page.
  }
}
