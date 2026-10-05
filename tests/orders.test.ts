import { describe, expect, it } from 'vitest'
import {
  BULK_ORDER_MESSAGE,
  canTransition,
  checkoutFormSchema,
  DELIVERY_CITY,
  DELIVERY_NOTICE,
  MAX_PACKS_PER_ORDER,
  emptyNotifications,
  emptySheetSync,
  formatAddress,
  isOpen,
  newOrderSchema,
  notificationNeedsAttention,
  NOTIFY_CHANNELS,
  orderTotal,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SHEET_SYNC_STATUSES,
  sheetNeedsAttention,
  STATUS_TRANSITIONS,
  type OrderItem,
} from '@/lib/orders/schema'
import {
  isDeliverablePincode,
  normalisePincode,
  SUPPORTED_PINCODES,
} from '@/lib/orders/delivery'

/*
 * The orders collection has no schema of its own — MongoDB will store whatever
 * it is handed. These tests are therefore the only thing standing between a
 * malformed payload and a permanent row, so they cover the rules that actually
 * cost money if they fail: a phone number we cannot dial, an address we cannot
 * find, an empty order, and a total the customer got to choose.
 *
 * No database here on purpose. Everything below is pure.
 */

const whiteOyster: OrderItem = {
  productSlug: 'fresh-oyster-mushrooms-250g',
  name: 'Fresh White Oyster Mushrooms',
  variety: 'White oyster',
  packLabel: '250 g',
  weightGrams: 250,
  unitPrice: 100,
  quantity: 3,
}

const greyOyster: OrderItem = {
  productSlug: 'grey-oyster-mushrooms-250g',
  name: 'Fresh Grey Oyster Mushrooms',
  variety: 'Grey oyster',
  packLabel: '250 g',
  weightGrams: 250,
  unitPrice: 100,
  quantity: 1,
}

const address = {
  line1: '12, Sunrise Apartments',
  line2: '4th Cross',
  area: 'Koramangala',
  city: DELIVERY_CITY,
  pincode: '560034',
  landmark: 'Opposite the bakery',
} as const

const base = {
  customer: { name: 'Asha Menon', phone: '9876543210', address },
  items: [whiteOyster],
}

const withCustomer = (patch: Record<string, unknown>) => ({
  ...base,
  customer: { ...base.customer, ...patch },
})
const withAddress = (patch: Record<string, unknown>) =>
  withCustomer({ address: { ...address, ...patch } })

describe('phone numbers', () => {
  // Every one of these is a way a real customer writes their own number.
  it.each([
    '9876543210',
    '+91 98765 43210',
    '+91-98765-43210',
    '09876543210',
    '919876543210',
    '(+91) 9876543210',
  ])('accepts %s', (input) => {
    const result = newOrderSchema.safeParse(withCustomer({ phone: input }))
    expect(result.success).toBe(true)
    // Always stored as the bare ten digits, so one person typed two ways is
    // one customer when you look up their history.
    if (result.success) expect(result.data.customer.phone).toBe('9876543210')
  })

  it.each([
    ['', 'empty'],
    ['12345', 'too short'],
    ['1234567890', 'does not start 6-9'],
    ['98765432101', 'too long'],
    ['abcdefghij', 'not digits'],
  ])('rejects %s (%s)', (input) => {
    expect(newOrderSchema.safeParse(withCustomer({ phone: input })).success).toBe(false)
  })
})

describe('delivery address', () => {
  it('accepts a complete Bengaluru address', () => {
    expect(newOrderSchema.safeParse(base).success).toBe(true)
  })

  it('requires the fields a rider cannot deliver without', () => {
    for (const field of ['line1', 'area', 'pincode'] as const) {
      expect(newOrderSchema.safeParse(withAddress({ [field]: '' })).success).toBe(false)
    }
  })

  it('treats street and landmark as optional', () => {
    const { line2: _line2, landmark: _landmark, ...minimal } = address
    expect(newOrderSchema.safeParse(withCustomer({ address: minimal })).success).toBe(true)
  })

  /*
   * We deliver in Bengaluru only, and saying so at the form is the honest
   * place. Accepting a Chennai pincode here means discovering it on the phone,
   * after the customer has been told their order is placed.
   */
  it.each(['600001', '110001', '400001', '56003', '5600345', 'abc123'])(
    'rejects the non-Bengaluru pincode %s',
    (pincode) => {
      expect(newOrderSchema.safeParse(withAddress({ pincode })).success).toBe(false)
    },
  )

  it.each(['560034', '560001', '562130'])('accepts the Bengaluru pincode %s', (pincode) => {
    expect(newOrderSchema.safeParse(withAddress({ pincode })).success).toBe(true)
  })

  it('strips non-digits from the pincode before checking it', () => {
    const result = newOrderSchema.safeParse(withAddress({ pincode: '560 034' }))
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.customer.address.pincode).toBe('560034')
  })

  it('refuses a city we do not deliver to', () => {
    expect(newOrderSchema.safeParse(withAddress({ city: 'Chennai' })).success).toBe(false)
  })

  it('writes the address out in one readable line', () => {
    expect(formatAddress(address)).toBe(
      '12, Sunrise Apartments, 4th Cross, Koramangala, Bengaluru 560034, Landmark: Opposite the bakery',
    )
  })
})

describe('order contents', () => {
  it('accepts a white oyster order', () => {
    const result = newOrderSchema.safeParse(base)
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.items[0]?.variety).toBe('White oyster')
  })

  it('accepts a grey oyster order', () => {
    const result = newOrderSchema.safeParse({ ...base, items: [greyOyster] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items[0]?.variety).toBe('Grey oyster')
      expect(result.data.items[0]?.productSlug).toBe('grey-oyster-mushrooms-250g')
    }
  })

  /*
   * "Mushrooms × 2" six months later is not a record of anything. Every
   * descriptive field is copied onto the order so it still reads correctly
   * after the product is renamed or withdrawn.
   */
  it('records which variety was bought, not just a product', () => {
    const result = newOrderSchema.safeParse({ ...base, items: [whiteOyster, greyOyster] })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.items.map((i) => i.variety)).toEqual(['White oyster', 'Grey oyster'])
      expect(result.data.items.every((i) => i.packLabel && i.name)).toBe(true)
    }
  })

  it('rejects an empty order', () => {
    expect(newOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false)
  })

  it('rejects a zero or negative quantity', () => {
    for (const quantity of [0, -1]) {
      expect(newOrderSchema.safeParse({ ...base, items: [{ ...whiteOyster, quantity }] }).success).toBe(
        false,
      )
    }
  })

  it('sends bulk orders to the phone rather than the form', () => {
    expect(
      newOrderSchema.safeParse({ ...base, items: [{ ...whiteOyster, quantity: 999 }] }).success,
    ).toBe(false)
  })

  // strictObject: an unexpected key is a bug or an attack, never a no-op.
  it('rejects unknown fields', () => {
    expect(newOrderSchema.safeParse(withCustomer({ isAdmin: true })).success).toBe(false)
    expect(newOrderSchema.safeParse(withAddress({ country: 'India' })).success).toBe(false)
  })

  it('requires a name, since we phone to confirm', () => {
    expect(newOrderSchema.safeParse(withCustomer({ name: '' })).success).toBe(false)
  })
})

describe('totals', () => {
  it('multiplies unit price by quantity across items', () => {
    expect(orderTotal(base.items)).toBe(300)
    expect(orderTotal([whiteOyster, greyOyster])).toBe(400)
  })

  it('is zero for no items', () => {
    expect(orderTotal([])).toBe(0)
  })

  /*
   * The form never posts a price or a total — the server looks the price up by
   * slug and recomputes. This asserts the schema has no field to post a total
   * into, so a crafted request cannot set what it owes.
   */
  it('cannot be supplied by the caller', () => {
    expect(newOrderSchema.safeParse({ ...base, total: 1 }).success).toBe(false)
  })

  it('has no field for payment status either — the server owns it', () => {
    expect(newOrderSchema.safeParse({ ...base, payment: { status: 'paid' } }).success).toBe(false)
  })
})

describe('order status transitions', () => {
  it('walks the fulfilment path', () => {
    expect(canTransition('new', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'preparing')).toBe(true)
    expect(canTransition('preparing', 'out_for_delivery')).toBe(true)
    expect(canTransition('out_for_delivery', 'delivered')).toBe(true)
  })

  it('refuses to skip ahead', () => {
    expect(canTransition('new', 'delivered')).toBe(false)
    expect(canTransition('new', 'out_for_delivery')).toBe(false)
    expect(canTransition('confirmed', 'delivered')).toBe(false)
  })

  it('never moves backwards', () => {
    expect(canTransition('delivered', 'confirmed')).toBe(false)
    expect(canTransition('confirmed', 'new')).toBe(false)
    expect(canTransition('out_for_delivery', 'preparing')).toBe(false)
  })

  it('treats delivered and cancelled as final', () => {
    expect(STATUS_TRANSITIONS.delivered).toHaveLength(0)
    expect(STATUS_TRANSITIONS.cancelled).toHaveLength(0)
    expect(isOpen('delivered')).toBe(false)
    expect(isOpen('cancelled')).toBe(false)
  })

  it('lets anything live be cancelled', () => {
    for (const status of ['new', 'confirmed', 'preparing', 'out_for_delivery'] as const) {
      expect(canTransition(status, 'cancelled')).toBe(true)
      expect(isOpen(status)).toBe(true)
    }
  })

  it('declares a transition list for every status', () => {
    for (const status of ORDER_STATUSES) expect(STATUS_TRANSITIONS[status]).toBeDefined()
  })

  it('returns false for an unknown status rather than throwing', () => {
    // A legacy row from before this model existed must not take down the page
    // that exists to display it.
    expect(canTransition('called' as never, 'confirmed')).toBe(false)
  })
})

describe('payment', () => {
  /*
   * Payment is a SEPARATE axis from fulfilment. The rider can hand over the
   * pack and come back without the cash, and a model that infers "paid" from
   * "delivered" quietly loses that money.
   */
  it('is not part of the order status enum', () => {
    for (const payment of PAYMENT_STATUSES) {
      expect((ORDER_STATUSES as readonly string[]).includes(payment)).toBe(false)
    }
  })

  it('offers exactly pending and paid', () => {
    expect([...PAYMENT_STATUSES]).toEqual(['pending', 'paid'])
  })
})

describe('notification state', () => {
  it('starts pending on every channel, with no attempts', () => {
    const notifications = emptyNotifications()
    for (const channel of NOTIFY_CHANNELS) {
      expect(notifications[channel]).toEqual({ status: 'pending', attempts: 0 })
    }
  })

  /*
   * Built from NOTIFY_CHANNELS rather than named one by one, so adding
   * WhatsApp later is a single change to that list — nothing in the schema,
   * the repository or the admin names a channel.
   */
  it('covers exactly the declared channels', () => {
    expect(Object.keys(emptyNotifications()).sort()).toEqual([...NOTIFY_CHANNELS].sort())
  })

  it('flags an order whose alert failed or never went out', () => {
    expect(notificationNeedsAttention(emptyNotifications())).toBe(true)
    expect(
      notificationNeedsAttention({
        email: { status: 'failed', attempts: 3, lastError: 'Resend 401' },
      }),
    ).toBe(true)
  })

  it('does not flag an alert that landed', () => {
    expect(notificationNeedsAttention({ email: { status: 'sent', attempts: 1 } })).toBe(false)
  })

  /*
   * A channel with no credentials has not gone wrong. Showing it as a failure
   * is how an admin learns to ignore the colour that matters.
   */
  it('does not flag a channel that is simply not configured', () => {
    expect(notificationNeedsAttention({ email: { status: 'skipped', attempts: 1 } })).toBe(false)
  })

  /*
   * An order placed before a channel existed has no record for it at all.
   * That is history, not a delivery to chase.
   */
  it('does not flag a channel an older order never had', () => {
    expect(notificationNeedsAttention({} as never)).toBe(false)
  })
})

describe('delivery area', () => {
  /*
   * The pincode rule is a BROAD REGIONAL CHECK, not a serviceability
   * guarantee — see lib/orders/delivery.ts. These tests pin the behaviour and
   * the seam that lets it become an explicit list later.
   */
  it('accepts Bengaluru Urban and Rural pincodes', () => {
    for (const pincode of ['560001', '560034', '562130', '561203']) {
      expect(isDeliverablePincode(pincode)).toBe(true)
    }
  })

  it('refuses anything outside the region', () => {
    for (const pincode of ['600001', '110001', '660001', '460001']) {
      expect(isDeliverablePincode(pincode)).toBe(false)
    }
  })

  it('normalises before deciding, so "560 034" is the same as "560034"', () => {
    expect(normalisePincode('560 034')).toBe('560034')
    expect(isDeliverablePincode('560-034')).toBe(true)
  })

  it('is not yet an explicit list — and says so', () => {
    // The seam: setting SUPPORTED_PINCODES switches the rule without touching
    // the schema or the checkout form.
    expect(SUPPORTED_PINCODES).toBeNull()
  })

  it('does not promise every 56xxxx address is served', () => {
    expect(DELIVERY_NOTICE).toContain('confirm every order by phone')
    expect(DELIVERY_NOTICE).not.toMatch(/guarantee|all pincodes|anywhere/i)
  })
})

describe('bulk orders', () => {
  it('caps a normal checkout at the supported quantity', () => {
    expect(MAX_PACKS_PER_ORDER).toBe(50)
    const atLimit = { ...base, items: [{ ...whiteOyster, quantity: MAX_PACKS_PER_ORDER }] }
    expect(newOrderSchema.safeParse(atLimit).success).toBe(true)
  })

  /*
   * Above the cap NO ORDER IS CREATED. The customer is sent to us instead,
   * because a 200-pack order accepted silently is one we may not be able to
   * pick.
   */
  it('creates nothing above the cap, and explains why', () => {
    const tooMany = { ...base, items: [{ ...whiteOyster, quantity: MAX_PACKS_PER_ORDER + 1 }] }
    const result = newOrderSchema.safeParse(tooMany)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe(BULK_ORDER_MESSAGE)
      expect(BULK_ORDER_MESSAGE).toMatch(/talk to us/i)
    }
  })
})

describe('sheet sync state', () => {
  it('starts pending with no attempts', () => {
    expect(emptySheetSync()).toEqual({ status: 'pending', attempts: 0 })
  })

  /*
   * Its own vocabulary, not a notification channel's. A notification is `sent`
   * once and stays sent; a projection is `synced` and goes back to `pending`
   * every time the order changes.
   */
  it('uses synced, not sent', () => {
    expect([...SHEET_SYNC_STATUSES]).toEqual(['pending', 'synced', 'failed', 'skipped'])
    expect((SHEET_SYNC_STATUSES as readonly string[]).includes('sent')).toBe(false)
  })

  it('flags only a genuine failure', () => {
    expect(sheetNeedsAttention({ status: 'failed', attempts: 2 })).toBe(true)
    // Pending is normal for a few seconds after every change; badging it would
    // flash a warning on every status move.
    expect(sheetNeedsAttention({ status: 'pending', attempts: 0 })).toBe(false)
    expect(sheetNeedsAttention({ status: 'synced', attempts: 1 })).toBe(false)
    // Not configured is a setting, not a fault.
    expect(sheetNeedsAttention({ status: 'skipped', attempts: 1 })).toBe(false)
    // An order from before the projection existed.
    expect(sheetNeedsAttention(undefined)).toBe(false)
  })
})

describe('cursor pagination', () => {
  /*
   * These exercise the cursor arithmetic against an in-memory collection,
   * because the property that matters — never skip, never duplicate — is about
   * the ORDERING RULE, not about MongoDB. The same comparison is what the
   * repository hands to the driver.
   */
  const encode = (createdAt: Date, reference: string) =>
    Buffer.from(`${createdAt.toISOString()}|${reference}`).toString('base64url')

  const decode = (cursor: string) => {
    const [iso, reference] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
    return { createdAt: new Date(iso!), reference: reference! }
  }

  /** The sort the repository uses: newest first, reference breaking ties. */
  const newestFirst = (a: { createdAt: Date; reference: string }, b: typeof a) =>
    b.createdAt.getTime() - a.createdAt.getTime() || b.reference.localeCompare(a.reference)

  /** The filter the repository builds from a cursor. */
  const after = (cursor: { createdAt: Date; reference: string }) => (row: typeof cursor) =>
    row.createdAt < cursor.createdAt ||
    (row.createdAt.getTime() === cursor.createdAt.getTime() && row.reference < cursor.reference)

  const page = (rows: { createdAt: Date; reference: string }[], size: number, cursor?: string) => {
    const sorted = [...rows].sort(newestFirst)
    const eligible = cursor ? sorted.filter(after(decode(cursor))) : sorted
    const slice = eligible.slice(0, size)
    const last = slice[slice.length - 1]
    return {
      rows: slice,
      nextCursor:
        eligible.length > size && last ? encode(last.createdAt, last.reference) : null,
    }
  }

  /** Ten orders, five of them sharing one millisecond — the hard case. */
  const sameInstant = new Date('2026-10-05T10:00:00.000Z')
  const rows = [
    ...Array.from({ length: 5 }, (_, i) => ({
      createdAt: sameInstant,
      reference: `NEY-00${10 + i}`,
    })),
    ...Array.from({ length: 5 }, (_, i) => ({
      createdAt: new Date(sameInstant.getTime() - (i + 1) * 60_000),
      reference: `NEY-000${5 - i}`,
    })),
  ]

  const walk = (size: number) => {
    const seen: string[] = []
    let cursor: string | undefined
    for (let guard = 0; guard < 20; guard += 1) {
      const result = page(rows, size, cursor)
      seen.push(...result.rows.map((r) => r.reference))
      if (!result.nextCursor) break
      cursor = result.nextCursor
    }
    return seen
  }

  it('returns newest first', () => {
    const first = page(rows, 3).rows
    expect(first[0]!.reference).toBe('NEY-0014')
    expect(first.map((r) => r.reference)).toEqual(['NEY-0014', 'NEY-0013', 'NEY-0012'])
  })

  it.each([1, 2, 3, 4, 7, 10])('walks every order exactly once at page size %i', (size) => {
    const seen = walk(size)
    expect(seen).toHaveLength(rows.length)
    expect(new Set(seen).size).toBe(rows.length)
  })

  /*
   * The reason the cursor is (createdAt, reference) and not createdAt alone.
   * Five orders share a millisecond here; a timestamp-only cursor would either
   * skip the rest of that group or return it twice.
   */
  it('does not skip or duplicate orders created in the same millisecond', () => {
    const seen = walk(2)
    const tied = seen.filter((ref) => ref >= 'NEY-0010')
    expect(tied).toEqual(['NEY-0014', 'NEY-0013', 'NEY-0012', 'NEY-0011', 'NEY-0010'])
  })

  it('stops with a null cursor at the end', () => {
    expect(page(rows, 100).nextCursor).toBeNull()
  })

  it('round-trips a cursor', () => {
    const cursor = encode(sameInstant, 'NEY-0012')
    expect(decode(cursor)).toEqual({ createdAt: sameInstant, reference: 'NEY-0012' })
  })
})

describe('checkout form validation', () => {
  /*
   * The browser and the server must never disagree. A value the form accepts
   * and the server rejects produces "please check the highlighted fields" with
   * nothing highlighted — which is exactly the bug this suite now guards.
   */
  const valid = {
    name: 'Nithin Raj',
    phone: '9019274278',
    line1: '23',
    line2: '',
    area: 'Vijayanagar (Bangalore)',
    pincode: '560040',
    landmark: '',
    note: '',
  }

  /* The payload from the real failure report. */
  it('accepts a bare door number as the building line', () => {
    const result = checkoutFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
  })

  it.each(['4', '23', 'A1', '12/3', '#7'])('accepts the door number %s', (line1) => {
    expect(checkoutFormSchema.safeParse({ ...valid, line1 }).success).toBe(true)
  })

  it('still requires the building line to be non-empty', () => {
    expect(checkoutFormSchema.safeParse({ ...valid, line1: '' }).success).toBe(false)
    expect(checkoutFormSchema.safeParse({ ...valid, line1: '   ' }).success).toBe(false)
  })

  /*
   * The property that matters most: every value the form accepts must survive
   * the server's own schema. They are composed from the same FIELD rules, and
   * this asserts that stays true.
   */
  it.each([
    ['a bare door number', { line1: '23' }],
    ['a long area name', { area: 'Vijayanagar (Bangalore)' }],
    ['a spaced phone number', { phone: '+91 90192 74278' }],
    ['a spaced pincode', { pincode: '560 040' }],
    ['no street or landmark', { line2: '', landmark: '' }],
  ])('what the form accepts, the server accepts: %s', (_label, patch) => {
    const form = checkoutFormSchema.safeParse({ ...valid, ...patch })
    expect(form.success).toBe(true)
    if (!form.success) return

    const server = newOrderSchema.safeParse({
      customer: {
        name: form.data.name,
        phone: form.data.phone,
        address: {
          line1: form.data.line1,
          ...(form.data.line2 ? { line2: form.data.line2 } : {}),
          area: form.data.area,
          city: DELIVERY_CITY,
          pincode: form.data.pincode,
          ...(form.data.landmark ? { landmark: form.data.landmark } : {}),
        },
        ...(form.data.note ? { note: form.data.note } : {}),
      },
      items: [whiteOyster],
    })
    expect(server.success).toBe(true)
  })

  it.each([
    ['an empty name', { name: '' }],
    ['a short name', { name: 'A' }],
    ['a landline', { phone: '0801234567' }],
    ['a Chennai pincode', { pincode: '600001' }],
    ['an empty area', { area: '' }],
  ])('rejects %s in the browser, before a round trip', (_label, patch) => {
    expect(checkoutFormSchema.safeParse({ ...valid, ...patch }).success).toBe(false)
  })

  /* Optional fields are plain strings: an input holds "" and never undefined. */
  it('treats blank optional fields as valid', () => {
    const result = checkoutFormSchema.safeParse(valid)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.line2).toBe('')
      expect(result.data.landmark).toBe('')
    }
  })
})
