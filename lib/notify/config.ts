import 'server-only'

/**
 * Notification credentials.
 *
 * `server-only`: this module throws at build time if anything in the browser
 * bundle imports it, which is the guarantee that an API key cannot reach a
 * client component by accident. Nothing here is ever named NEXT_PUBLIC_*.
 *
 * Email is the only channel today. WhatsApp is the intended second one, and it
 * adds a `whatsappConfig()` here plus a provider in ./providers — the order
 * flow does not change.
 *
 * Every channel is independently optional. A missing credential means that
 * channel is DISABLED, not broken — a developer with no Resend account should
 * be able to place an order locally and see the whole flow work, with the
 * channel recorded as `skipped` rather than `failed`. Production is told it is
 * misconfigured by `notifyReadiness()` on the admin dashboard, not by a crash
 * on the customer's checkout.
 */

export interface EmailConfig {
  apiKey: string
  from: string
  to: string[]
}

const read = (name: string): string | undefined => process.env[name]?.trim() || undefined

export function emailConfig(): EmailConfig | null {
  const apiKey = read('RESEND_API_KEY')
  const from = read('ORDER_EMAIL_FROM')
  const to = read('ADMIN_NOTIFICATION_EMAIL')
  if (!apiKey || !from || !to) return null
  // Comma-separated, so a second admin can be added without a code change.
  const recipients = to
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean)
  if (recipients.length === 0) return null
  return { apiKey, from, to: recipients }
}

/**
 * What the admin dashboard shows about its own plumbing.
 *
 * Reports only whether each channel is configured — never the values. An
 * environment page that prints a masked key is still a page that prints a key.
 */
export function notifyReadiness(): { email: boolean } {
  return { email: emailConfig() !== null }
}
