import 'server-only'
import { emailConfig } from './config'
import type { OrderMessage } from './message'

/**
 * The channels, behind one interface.
 *
 * Each provider does exactly one thing: take a rendered message and try to
 * deliver it. They know nothing about orders, MongoDB or React, which is what
 * makes adding WhatsApp later a new file in this folder, one entry in
 * PROVIDERS and one entry in NOTIFY_CHANNELS — not a change to the order flow.
 *
 * Nothing here throws. A provider returns its outcome, and the dispatcher
 * records it; an exception escaping into `ctx.waitUntil` would be invisible.
 */

export interface DeliveryResult {
  ok: boolean
  /** The channel has no credentials. Not a failure — see config.ts. */
  skipped?: boolean
  error?: string
}

export interface Provider {
  name: 'email'
  send(message: OrderMessage): Promise<DeliveryResult>
}

/**
 * The provider is a plain HTTPS call, deliberately.
 *
 * No SDK. On Cloudflare Workers an SDK is a dependency that may reach for a
 * Node built-in the runtime does not have, to save writing a fetch — and this
 * API is a single POST.
 */
const TIMEOUT_MS = 10_000

async function post(
  url: string,
  init: RequestInit,
): Promise<{ ok: boolean; status: number; body: string }> {
  /*
   * An explicit timeout. Without one a hung provider holds the Worker
   * invocation open until the platform kills it, and the notification result
   * is never recorded — the exact failure this whole module exists to make
   * visible.
   */
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const response = await fetch(url, { ...init, signal: controller.signal })
    const body = await response.text().catch(() => '')
    return { ok: response.ok, status: response.status, body: body.slice(0, 300) }
  } finally {
    clearTimeout(timer)
  }
}

export const emailProvider: Provider = {
  name: 'email',
  async send(message) {
    const config = emailConfig()
    if (!config) return { ok: false, skipped: true }

    try {
      const result = await post('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${config.apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          from: config.from,
          to: config.to,
          subject: message.subject,
          html: message.html,
          // Always both parts. A text/plain alternative is what keeps the mail
          // out of spam folders and readable on a watch.
          text: message.text,
        }),
      })
      if (!result.ok) return { ok: false, error: `Resend ${result.status}: ${result.body}` }
      return { ok: true }
    } catch (error) {
      return { ok: false, error: describeError(error) }
    }
  },
}

export const PROVIDERS: readonly Provider[] = [emailProvider]

function describeError(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? `Timed out after ${TIMEOUT_MS}ms` : error.message
  }
  return String(error)
}
