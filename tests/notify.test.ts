import { describe, expect, it } from 'vitest'
import { buildOrderMessage, escapeHtml, formatIst, formatPhone } from '@/lib/notify/message'
import { emptyNotifications, type Order } from '@/lib/orders/schema'

/*
 * The message builder is pure on purpose — no network, no environment, no
 * database — which is what makes the thing an admin actually reads testable
 * without a Resend key.
 */

const order: Order = {
  reference: 'NEY-0042',
  status: 'new',
  total: 300,
  payment: { method: 'pay_on_delivery', status: 'pending' },
  notifications: emptyNotifications(),
  createdAt: new Date('2026-10-05T04:30:00.000Z'), // 10:00 IST
  updatedAt: new Date('2026-10-05T04:30:00.000Z'),
  history: [{ status: 'new', at: new Date('2026-10-05T04:30:00.000Z') }],
  customer: {
    name: 'Asha Menon',
    phone: '9876543210',
    address: {
      line1: '12, Sunrise Apartments',
      line2: '4th Cross',
      area: 'Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      landmark: 'Opposite the bakery',
    },
    note: 'Please call before coming up',
  },
  items: [
    {
      productSlug: 'fresh-oyster-mushrooms-250g',
      name: 'Fresh White Oyster Mushrooms',
      variety: 'White oyster',
      packLabel: '250 g',
      weightGrams: 250,
      unitPrice: 100,
      quantity: 3,
    },
  ],
}

const ADMIN_URL = 'https://neyora.com/admin/orders/NEY-0042'

describe('order message', () => {
  const message = buildOrderMessage(order, ADMIN_URL)

  it('puts the reference in the subject, so an inbox is searchable by it', () => {
    expect(message.subject).toBe('New NEYORA order — NEY-0042')
  })

  it.each([
    ['the reference', 'NEY-0042'],
    ['the customer name', 'Asha Menon'],
    ['the phone number', '+91 98765 43210'],
    ['the building', '12, Sunrise Apartments'],
    ['the pincode', 'Bengaluru 560034'],
    ['the landmark', 'Opposite the bakery'],
    ['what was bought', '3 × Fresh White Oyster Mushrooms (250 g)'],
    ['the payment state', 'Pay on delivery — PENDING'],
    ['the customer note', 'Please call before coming up'],
    ['the admin link', ADMIN_URL],
  ])('carries %s', (_label, needle) => {
    expect(message.text).toContain(needle)
  })

  it('shows the total', () => {
    expect(message.text).toMatch(/Total: ₹\s?300/)
  })

  /*
   * IST, not UTC and not the server's clock. An order time in the wrong zone
   * is worse than no order time: it reads as plausible and is six hours out.
   */
  it('stamps the time in IST', () => {
    expect(formatIst(order.createdAt)).toContain('10:00')
    expect(message.text).toContain(formatIst(order.createdAt))
  })

  it('renders every channel from the same facts', () => {
    for (const body of [message.text, message.html]) {
      expect(body).toContain('NEY-0042')
      expect(body).toContain('Asha Menon')
      expect(body).toContain('560034')
    }
  })

  it('gives the email both an HTML document and a plain-text part', () => {
    expect(message.html.startsWith('<!doctype html>')).toBe(true)
    expect(message.text).not.toContain('<')
  })

  it('omits the note block entirely when there is no note', () => {
    const { note: _note, ...customer } = order.customer
    const plain = buildOrderMessage({ ...order, customer }, ADMIN_URL)
    expect(plain.text).not.toContain('NOTE')
  })

  it('reports a paid order as paid', () => {
    const paid = buildOrderMessage(
      { ...order, payment: { method: 'pay_on_delivery', status: 'paid' } },
      ADMIN_URL,
    )
    expect(paid.text).toContain('Pay on delivery — PAID')
  })
})

describe('escaping', () => {
  /*
   * Customer-supplied text goes into an HTML email. A stray '<' in a landmark
   * would swallow the rest of the message — silently, and only for that one
   * order.
   */
  it('neutralises the characters that break an HTML message', () => {
    expect(escapeHtml('<b>flat & "3"</b>')).toBe(
      '&lt;b&gt;flat &amp; &quot;3&quot;&lt;/b&gt;',
    )
  })

  it('escapes a hostile name everywhere it appears', () => {
    const hostile = buildOrderMessage(
      {
        ...order,
        customer: { ...order.customer, name: '<script>alert(1)</script>' },
      },
      ADMIN_URL,
    )
    expect(hostile.html).not.toContain('<script>')
    expect(hostile.html).toContain('&lt;script&gt;')
    // The plain-text part carries the raw value; it is not markup, and the
    // email client renders it as text.
    expect(hostile.text).toContain('<script>')
  })
})

describe('phone formatting', () => {
  it('reads back the stored ten digits as a dialable number', () => {
    expect(formatPhone('9876543210')).toBe('+91 98765 43210')
  })

  it('leaves anything unexpected alone rather than mangling it', () => {
    expect(formatPhone('123')).toBe('123')
  })
})

// ---------------------------------------------------------------------------

describe('providers', () => {
  /*
   * The providers are exercised against a stubbed `fetch`. The point is not to
   * test Resend — it is to pin the two behaviours this system depends on: a channel with no credentials is SKIPPED rather than failed,
   * and a provider that errors returns a result instead of throwing into
   * `ctx.waitUntil`, where nothing would ever see it.
   */
  const message = buildOrderMessage(order, ADMIN_URL)

  const withEnv = async (env: Record<string, string | undefined>, run: () => Promise<void>) => {
    const previous = { ...process.env }
    for (const [key, value] of Object.entries(env)) {
      // DELETE rather than assign undefined. `process.env.X = undefined`
      // stores the STRING "undefined", which is truthy — and the "no
      // credentials" case would then silently test the opposite of itself.
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    try {
      await run()
    } finally {
      process.env = previous
    }
  }

  it('skips a channel that has no credentials', async () => {
    const { emailProvider } = await import('@/lib/notify/providers')
    await withEnv(
      {
        RESEND_API_KEY: undefined,
        ORDER_EMAIL_FROM: undefined,
        ADMIN_NOTIFICATION_EMAIL: undefined,
      },
      async () => {
        expect(await emailProvider.send(message)).toEqual({ ok: false, skipped: true })
      },
    )
  })

  it('reports a provider error rather than throwing it', async () => {
    const { emailProvider } = await import('@/lib/notify/providers')
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response('{"message":"API key is invalid"}', { status: 401 })) as unknown as typeof fetch

    try {
      await withEnv(
        {
          RESEND_API_KEY: 'bad-key',
          ORDER_EMAIL_FROM: 'orders@neyora.com',
          ADMIN_NOTIFICATION_EMAIL: 'admin@neyora.com',
        },
        async () => {
          const result = await emailProvider.send(message)
          expect(result.ok).toBe(false)
          expect(result.skipped).toBeUndefined()
          expect(result.error).toContain('401')
        },
      )
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('turns a network failure into a result, never an exception', async () => {
    const { emailProvider } = await import('@/lib/notify/providers')
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('getaddrinfo ENOTFOUND api.resend.com')
    }) as unknown as typeof fetch

    try {
      await withEnv(
        {
          RESEND_API_KEY: 'k',
          ORDER_EMAIL_FROM: 'orders@neyora.com',
          ADMIN_NOTIFICATION_EMAIL: 'admin@neyora.com',
        },
        async () => {
          await expect(emailProvider.send(message)).resolves.toMatchObject({ ok: false })
        },
      )
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('sends the email with both an HTML and a text part', async () => {
    const { emailProvider } = await import('@/lib/notify/providers')
    let sent: Record<string, unknown> = {}
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      sent = JSON.parse(String(init.body))
      return new Response('{"id":"x"}', { status: 200 })
    }) as unknown as typeof fetch

    try {
      await withEnv(
        {
          RESEND_API_KEY: 'k',
          ORDER_EMAIL_FROM: 'NEYORA <orders@neyora.com>',
          // Comma-separated, so a second admin needs no code change.
          ADMIN_NOTIFICATION_EMAIL: 'a@neyora.com, b@neyora.com',
        },
        async () => {
          expect(await emailProvider.send(message)).toEqual({ ok: true })
          expect(sent.to).toEqual(['a@neyora.com', 'b@neyora.com'])
          expect(sent.subject).toBe('New NEYORA order — NEY-0042')
          expect(String(sent.html)).toContain('<!doctype html>')
          expect(String(sent.text)).toContain('NEY-0042')
        },
      )
    } finally {
      globalThis.fetch = realFetch
    }
  })
})

// ---------------------------------------------------------------------------

describe('what the admin alert does and does not contain', () => {
  const message = buildOrderMessage(order, ADMIN_URL)
  const everywhere = [message.text, message.html]

  /*
   * Only what is needed to fulfil the order. The alert lands in an inbox,
   * which is not a place for internal plumbing.
   */
  it.each([
    ['the idempotency token', '6cb99afa'],
    ['a Mongo id', '_id'],
    ['the database name', 'mongodb'],
    ['an API key', 'RESEND_API_KEY'],
  ])('never leaks %s', (_label, needle) => {
    for (const body of everywhere) expect(body).not.toContain(needle)
  })

  it('carries no provider error text', () => {
    const failing = buildOrderMessage(
      {
        ...order,
        notifications: {
          email: { status: 'failed', attempts: 2, lastError: 'Resend 401: API key is invalid' },
        },
      },
      ADMIN_URL,
    )
    for (const body of [failing.text, failing.html]) {
      expect(body).not.toContain('401')
      expect(body).not.toContain('API key is invalid')
    }
  })

  it('links to the admin order, not to a raw identifier', () => {
    expect(message.text).toContain('/admin/orders/NEY-0042')
  })
})

describe('retry does not re-send a channel that already landed', () => {
  /*
   * The sweep picks up any order still needing attention. Without this guard
   * a channel that had already succeeded would be re-delivered on every pass —
   * after five sweeps that is five copies of one order in the inbox.
   */
  it('skips a channel recorded as sent, and forces only on an explicit retry', async () => {
    const { deliverOrderNotifications } = await import('@/lib/notify/dispatch')
    let sends = 0
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      sends += 1
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const previous = { ...process.env }
    Object.assign(process.env, {
      RESEND_API_KEY: 'k',
      ORDER_EMAIL_FROM: 'orders@neyora.com',
      ADMIN_NOTIFICATION_EMAIL: 'admin@neyora.com',
    })

    const alreadySent = {
      ...order,
      notifications: { email: { status: 'sent' as const, attempts: 1, sentAt: new Date() } },
    }

    try {
      await deliverOrderNotifications(alreadySent)
      expect(sends).toBe(0)

      // The admin's explicit Retry button forces, and does send again.
      await deliverOrderNotifications(alreadySent, { only: 'email', force: true })
      expect(sends).toBe(1)
    } finally {
      globalThis.fetch = realFetch
      process.env = previous
    }
  })
})
