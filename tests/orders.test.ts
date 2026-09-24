import { describe, expect, it } from 'vitest'
import {
  canTransition,
  newOrderSchema,
  orderTotal,
  ORDER_STATUSES,
  STATUS_TRANSITIONS,
  type OrderItem,
} from '@/lib/orders/schema'

/*
 * The orders collection has no schema of its own — MongoDB will store whatever
 * it is handed. These tests are therefore the only thing standing between a
 * malformed payload and a permanent row, so they cover the rules that actually
 * cost money if they fail: a phone number we cannot dial, an empty order, and
 * a total the customer got to choose.
 *
 * No database here on purpose. Everything below is pure.
 */

const item: OrderItem = {
  productSlug: 'fresh-oyster-mushrooms-200g',
  name: 'Fresh Oyster Mushrooms',
  packLabel: '200 g',
  unitPrice: 120,
  quantity: 3,
}

const base = {
  customer: { name: 'Asha Menon', phone: '9876543210', area: 'Koramangala, Bengaluru' },
  items: [item],
}
const withPhone = (phone: string) => ({ ...base, customer: { ...base.customer, phone } })

describe('phone numbers', () => {
  // Every one of these is a way a real customer writes their own number.
  it.each([
    '9876543210',
    '+91 98765 43210',
    '+91-98765-43210',
    '(+91) 9876543210',
    '91 9876543210',
    '098765 43210',
    '09876543210',
  ])('accepts %s and stores it as 9876543210', (input) => {
    expect(newOrderSchema.parse(withPhone(input)).customer.phone).toBe('9876543210')
  })

  it.each([
    ['12345', 'too short'],
    ['1234567890', 'Indian mobiles never start 1'],
    ['5876543210', 'nor 5'],
    ['+1 415 555 2671', 'not an Indian number'],
    ['abcdefghij', 'not a number at all'],
  ])('rejects %s (%s)', (input) => {
    expect(newOrderSchema.safeParse(withPhone(input)).success).toBe(false)
  })
})

describe('order contents', () => {
  it('rejects an empty order', () => {
    expect(newOrderSchema.safeParse({ ...base, items: [] }).success).toBe(false)
  })

  it('rejects a zero or negative quantity', () => {
    for (const quantity of [0, -1]) {
      const items = [{ ...item, quantity }]
      expect(newOrderSchema.safeParse({ ...base, items }).success).toBe(false)
    }
  })

  it('sends bulk orders to the phone rather than the form', () => {
    const items = [{ ...item, quantity: 999 }]
    const result = newOrderSchema.safeParse({ ...base, items })
    expect(result.success).toBe(false)
  })

  // strictObject: an unexpected key is a bug or an attack, never a no-op.
  it('rejects unknown fields', () => {
    const bad = { ...base, customer: { ...base.customer, isAdmin: true } }
    expect(newOrderSchema.safeParse(bad).success).toBe(false)
  })

  it('requires a name and a delivery area, since we phone and deliver', () => {
    expect(newOrderSchema.safeParse({ ...base, customer: { ...base.customer, name: '' } }).success).toBe(false)
    expect(newOrderSchema.safeParse({ ...base, customer: { ...base.customer, area: '' } }).success).toBe(false)
  })
})

describe('totals', () => {
  it('multiplies unit price by quantity across items', () => {
    expect(orderTotal(base.items)).toBe(360)
    expect(orderTotal([item, { ...item, unitPrice: 50, quantity: 2 }])).toBe(460)
  })

  it('is zero for no items', () => {
    expect(orderTotal([])).toBe(0)
  })

  /*
   * The form never posts a total — the server recomputes it. This asserts the
   * schema has no `total` field to post into, so a crafted request cannot set
   * its own price.
   */
  it('cannot be supplied by the caller', () => {
    expect(newOrderSchema.safeParse({ ...base, total: 1 }).success).toBe(false)
  })
})

describe('status transitions', () => {
  it('walks the happy path', () => {
    expect(canTransition('new', 'called')).toBe(true)
    expect(canTransition('called', 'confirmed')).toBe(true)
    expect(canTransition('confirmed', 'delivered')).toBe(true)
  })

  it('refuses to skip ahead', () => {
    expect(canTransition('new', 'delivered')).toBe(false)
    expect(canTransition('new', 'confirmed')).toBe(false)
  })

  it('never moves backwards', () => {
    expect(canTransition('delivered', 'confirmed')).toBe(false)
    expect(canTransition('confirmed', 'new')).toBe(false)
  })

  it('treats delivered and cancelled as final', () => {
    expect(STATUS_TRANSITIONS.delivered).toHaveLength(0)
    expect(STATUS_TRANSITIONS.cancelled).toHaveLength(0)
  })

  it('lets anything live be cancelled', () => {
    for (const s of ['new', 'called', 'confirmed'] as const) {
      expect(canTransition(s, 'cancelled')).toBe(true)
    }
  })

  it('declares a transition list for every status', () => {
    for (const s of ORDER_STATUSES) expect(STATUS_TRANSITIONS[s]).toBeDefined()
  })
})
