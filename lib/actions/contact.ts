'use server'

/**
 * Contact form submission.
 *
 * Written with the service-role client, because `contact_messages` has no
 * public INSERT policy. Anyone holding the anon key could otherwise insert
 * rows straight into the table at whatever rate they liked; routing through
 * this action means validation, honeypot and rate limiting all run first.
 *
 * No paid email service: the message lands in Admin → Messages. A notification
 * transport can be added later behind `notifyNewMessage()`.
 */
import { headers } from 'next/headers'
import { createAdminClient, hasServiceRole } from '@/lib/supabase/admin'
import { contactMessageSchema } from '@/lib/validation/schemas'
import { fieldErrors } from '@/lib/validation/common'
import { anonymousSessionHash, recordEvent } from '@/lib/analytics/server'

export interface ContactFormState {
  status: 'idle' | 'success' | 'error'
  message?: string
  errors?: Record<string, string>
  /** Echoed back so a failed submission does not lose what was typed. */
  values?: Record<string, string>
}

/**
 * In-memory rate limit: 3 submissions per IP per 10 minutes.
 *
 * Deliberately simple. On Cloudflare Workers each isolate has its own map, so
 * this slows a casual flood rather than stopping a determined one — which is
 * the right trade for a free-tier build. The real backstop is that the table
 * is unreadable and unwritable without the service role. If abuse becomes a
 * problem, swap this for Cloudflare Rate Limiting or a KV counter; nothing
 * else needs to change.
 */
const RATE_LIMIT_MAX = 3
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const attempts = new Map<string, number[]>()

function rateLimited(key: string): boolean {
  const now = Date.now()
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX) {
    attempts.set(key, recent)
    return true
  }
  recent.push(now)
  attempts.set(key, recent)

  // Opportunistic cleanup so the map cannot grow without bound.
  if (attempts.size > 500) {
    for (const [k, times] of attempts) {
      if (times.every((t) => now - t >= RATE_LIMIT_WINDOW_MS)) attempts.delete(k)
    }
  }
  return false
}

export async function submitContactMessage(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const raw = {
    name: String(formData.get('name') ?? ''),
    email: String(formData.get('email') ?? ''),
    phone: String(formData.get('phone') ?? ''),
    subject: String(formData.get('subject') ?? ''),
    message: String(formData.get('message') ?? ''),
    website: String(formData.get('website') ?? ''),
  }

  const echo = {
    name: raw.name,
    email: raw.email,
    phone: raw.phone,
    subject: raw.subject,
    message: raw.message,
  }

  const parsed = contactMessageSchema.safeParse(raw)
  if (!parsed.success) {
    return {
      status: 'error',
      message: 'Please check the highlighted fields.',
      errors: fieldErrors(parsed.error),
      values: echo,
    }
  }

  // Honeypot. A human never sees this field, so a value in it means a bot.
  // Report success so the bot does not learn to work around it.
  if (parsed.data.website.trim() !== '') {
    return { status: 'success', message: 'Thank you — your message has been sent.' }
  }

  if (!hasServiceRole()) {
    return {
      status: 'error',
      message:
        'The contact form is not configured on this deployment (SUPABASE_SERVICE_ROLE_KEY is missing). Please email us instead.',
      values: echo,
    }
  }

  const headerList = await headers()
  const ip =
    headerList.get('cf-connecting-ip') ??
    headerList.get('x-real-ip') ??
    headerList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null

  if (ip && rateLimited(ip)) {
    return {
      status: 'error',
      message:
        'You have sent several messages already. Give us a little time to reply before sending another.',
      values: echo,
    }
  }

  // Salted hash only — never the raw address (see /privacy).
  const ipHash = await anonymousSessionHash(ip)

  const supabase = createAdminClient()
  const { error } = await supabase.from('contact_messages').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone,
    subject: parsed.data.subject,
    message: parsed.data.message,
    source: 'contact_page',
    ip_hash: ipHash,
    user_agent: headerList.get('user-agent')?.slice(0, 400) ?? null,
  })

  if (error) {
    console.error('[contact] insert failed:', error.message)
    return {
      status: 'error',
      message: 'We could not save your message. Please try again, or email us directly.',
      values: echo,
    }
  }

  await recordEvent({ eventName: 'contact_submit', path: '/contact' })

  return {
    status: 'success',
    message: 'Thank you — your message has reached us. We usually reply within a working day.',
  }
}
