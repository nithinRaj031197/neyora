import 'server-only'

/**
 * Server-side event recording.
 *
 * Writes with the service-role client because `analytics_events` has no public
 * INSERT policy — if it did, anyone with the anon key could flood the table.
 *
 * Privacy: no IP address, no user agent, no cookie. `session_hash` is a salted
 * digest that rotates daily, which is enough to spot obvious flooding and not
 * enough to follow a person across days.
 */
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { isAnalyticsEventName, sanitizeProps, type AnalyticsProps } from './events'
import { publicEnv } from '@/lib/env'

/** Salted, day-scoped, one-way. Never reversible to an IP. */
export async function anonymousSessionHash(ipAddress: string | null): Promise<string | null> {
  if (!ipAddress) return null
  const day = new Date().toISOString().slice(0, 10)
  const salt = process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 16) ?? 'neyora'
  const data = new TextEncoder().encode(`${ipAddress}:${day}:${salt}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .slice(0, 12)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function recordEvent(args: {
  eventName: string
  path?: string | null
  referrer?: string | null
  props?: AnalyticsProps
  sessionHash?: string | null
}): Promise<{ ok: boolean; reason?: string }> {
  const { analyticsProvider } = publicEnv()
  if (analyticsProvider !== 'internal') return { ok: true, reason: 'provider-not-internal' }
  if (!hasServiceRole()) return { ok: false, reason: 'no-service-role' }
  if (!isAnalyticsEventName(args.eventName)) return { ok: false, reason: 'unknown-event' }

  // Only the referrer's host, never the full URL — a full referrer can carry
  // search terms and identifiers we have no business storing.
  let referrerHost: string | null = null
  if (args.referrer) {
    try {
      referrerHost = new URL(args.referrer).host || null
    } catch {
      referrerHost = null
    }
  }

  const supabase = createAdminClient()
  const { error } = await supabase.from('analytics_events').insert({
    event_name: args.eventName,
    path: args.path?.slice(0, 400) ?? null,
    referrer_host: referrerHost,
    props: sanitizeProps(args.props),
    session_hash: args.sessionHash ?? null,
  })

  if (error) {
    // Logged, not thrown: a failed metric must never fail a page.
    console.error('[analytics] insert failed:', error.message)
    return { ok: false, reason: error.message }
  }
  return { ok: true }
}
