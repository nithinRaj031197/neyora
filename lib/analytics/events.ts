/**
 * The analytics contract.
 *
 * Provider-agnostic on purpose: the event names below are the stable interface
 * and every provider is a thin adapter. Swapping "internal" for a hosted
 * product later means writing one file, not touching call sites.
 *
 * Shared by server and client, so no server-only imports here.
 */

export const ANALYTICS_EVENTS = [
  'recipe_view',
  'qr_scan',
  'product_view',
  'contact_click',
  'whatsapp_click',
  'social_click',
  'recipe_share',
  'pack_size_change',
  'contact_submit',
] as const

export type AnalyticsEventName = (typeof ANALYTICS_EVENTS)[number]

/**
 * Event properties are deliberately restricted to low-cardinality, non-personal
 * values — a slug, a pack size, a platform name. Never an email, a name, a
 * message body or anything a person typed.
 */
export type AnalyticsProps = Record<string, string | number | boolean>

export interface AnalyticsEvent {
  name: AnalyticsEventName
  path?: string
  props?: AnalyticsProps
}

export function isAnalyticsEventName(value: string): value is AnalyticsEventName {
  return (ANALYTICS_EVENTS as readonly string[]).includes(value)
}

/** Strips anything that is not a short scalar, and caps the property count. */
export function sanitizeProps(props: AnalyticsProps | undefined): AnalyticsProps {
  if (!props) return {}
  const out: AnalyticsProps = {}
  let count = 0
  for (const [key, value] of Object.entries(props)) {
    if (count >= 8) break
    if (!/^[a-z0-9_]{1,32}$/.test(key)) continue
    if (typeof value === 'string') {
      if (value.length > 120) continue
      out[key] = value
    } else if (typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value
    } else if (typeof value === 'boolean') {
      out[key] = value
    }
    count += 1
  }
  return out
}
