import { z } from 'zod'

/**
 * What an order is.
 *
 * MongoDB will accept any shape you hand it, which is exactly why this file
 * exists: the collection has no schema of its own, so validation has to happen
 * before the write or the first bad row is permanent. Everything that reaches
 * the database goes through `newOrderSchema`.
 *
 * Shaped for the flow that exists today — customer picks a pack and a quantity,
 * we phone them to confirm, payment happens off-site. `total` is recorded but
 * nothing is charged. When a payment gateway arrives it adds fields; it does
 * not change these.
 */

/**
 * Indian mobile numbers: ten digits starting 6-9, optionally prefixed by the
 * country code 91 or the domestic trunk prefix 0.
 *
 * Applied to the DIGITS ONLY, after every space, hyphen, bracket and plus has
 * been stripped. Matching the raw string instead means chasing every way a
 * person writes a number — "+91 98765 43210", "098765-43210", "(+91)9876543210"
 * — and rejecting a real customer over a space is the worst possible failure
 * here, because the whole fulfilment model is that we phone them.
 */
const PHONE_DIGITS = /^(?:0|91|091)?[6-9]\d{9}$/

export const ORDER_STATUSES = ['new', 'called', 'confirmed', 'delivered', 'cancelled'] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/** Statuses an order can move to from each state. Guards the admin actions. */
export const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['called', 'cancelled'],
  called: ['confirmed', 'cancelled'],
  confirmed: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export const customerSchema = z.strictObject({
  name: z.string().trim().min(2, 'Please enter your name').max(80),
  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((d) => PHONE_DIGITS.test(d), 'Enter a 10-digit Indian mobile number')
    // Store one canonical form, so the same person typed two ways is one
    // customer when you look up their history.
    .transform((d) => d.slice(-10)),
  area: z.string().trim().min(2, 'Which area should we deliver to?').max(120),
  note: z.string().trim().max(500).optional(),
})

export const orderItemSchema = z.strictObject({
  productSlug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  /** e.g. "200 g" — copied in, so the order still reads correctly if the
   *  product is later renamed or repriced. */
  packLabel: z.string().trim().min(1),
  unitPrice: z.number().int().nonnegative(),
  quantity: z.number().int().min(1, 'Choose at least one').max(50, 'Please call us for bulk orders'),
})

export const newOrderSchema = z.strictObject({
  customer: customerSchema,
  items: z.array(orderItemSchema).min(1, 'Your order is empty').max(10),
})

export type NewOrder = z.infer<typeof newOrderSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type Customer = z.infer<typeof customerSchema>

/** An order as stored, with the fields the server owns. */
export interface Order extends NewOrder {
  /** Human-facing, e.g. "NEY-0042" — what you say on the phone. */
  reference: string
  status: OrderStatus
  /** Rupees. Computed on the server from `items`, never trusted from a form. */
  total: number
  createdAt: Date
  updatedAt: Date
  history: { status: OrderStatus; at: Date }[]
}

/** Total in rupees. Server-side only: a posted total is an attacker's total. */
export function orderTotal(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from].includes(to)
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  called: 'Called',
  confirmed: 'Confirmed',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}
