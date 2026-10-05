import { z } from 'zod'
import {
  BULK_ORDER_MESSAGE,
  DELIVERY_CITY,
  isDeliverablePincode,
  MAX_PACKS_PER_ORDER,
  normalisePincode,
  PINCODE_ERROR,
} from './delivery'

/**
 * What an order is.
 *
 * MongoDB will accept any shape you hand it, which is exactly why this file
 * exists: the collection has no schema of its own, so validation has to happen
 * before the write or the first bad row is permanent. Everything that reaches
 * the database goes through `newOrderSchema`.
 *
 * Shaped for the flow that exists today — the customer picks a variety and a
 * quantity, gives a delivery address, and pays the rider. Nothing is charged
 * online. When a payment gateway arrives it adds a `method` to the payment
 * block; it does not change anything else here.
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

/**
 * Delivery area and order limits live in ./delivery, re-exported here so the
 * schema stays the single import for everything about an order. That module
 * documents what the pincode check actually proves — and what it does not.
 */
export {
  BULK_ORDER_MESSAGE,
  DELIVERY_CITY,
  DELIVERY_NOTICE,
  MAX_PACKS_PER_ORDER,
  PINCODE_ERROR,
} from './delivery'

// ---------------------------------------------------------------------------
// Order status — where the order is in fulfilment
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'new',
  'confirmed',
  'preparing',
  'out_for_delivery',
  'delivered',
  'cancelled',
] as const
export type OrderStatus = (typeof ORDER_STATUSES)[number]

/**
 * Statuses an order can move to from each state. Guards the admin actions.
 *
 * Strictly forward, plus cancel from anything still live. There is no way back
 * from delivered: an order that was delivered and then returned is a different
 * event, and recording it as "un-delivering" would lose that it ever arrived.
 */
export const STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'New',
  confirmed: 'Confirmed',
  preparing: 'Preparing',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false
}

/** Still in play: counts towards open orders, still cancellable. */
export function isOpen(status: OrderStatus): boolean {
  return status !== 'delivered' && status !== 'cancelled'
}

// ---------------------------------------------------------------------------
// Payment — deliberately a separate axis from status
// ---------------------------------------------------------------------------

/**
 * Payment status is NOT derived from order status.
 *
 * A delivered order is not automatically a paid one — the rider can hand over
 * the pack and come back without the cash, and an accounting model that cannot
 * express that will quietly lose money. Marking paid is always an explicit act
 * by an admin.
 */
export const PAYMENT_METHODS = ['pay_on_delivery'] as const
export type PaymentMethod = (typeof PAYMENT_METHODS)[number]

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  pay_on_delivery: 'Pay on delivery',
}

export const PAYMENT_STATUSES = ['pending', 'paid'] as const
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number]

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pending',
  paid: 'Paid',
}

export interface Payment {
  method: PaymentMethod
  status: PaymentStatus
  /** Set when status becomes 'paid', cleared when an admin reverses it. */
  paidAt?: Date
  /** Which admin last changed the payment state. */
  updatedBy?: string
  /**
   * Every payment change, appended — never overwritten.
   *
   * `paidAt` answers "is it paid, and since when"; this answers "who said so,
   * and was it ever said and then taken back". A reversal clears `paidAt`, so
   * without this the fact that money was once recorded as received would
   * vanish entirely — which is exactly the event an audit needs to keep.
   */
  history?: { status: PaymentStatus; at: Date; by: string }[]
}

// ---------------------------------------------------------------------------
// Admin notifications — one record per channel
// ---------------------------------------------------------------------------

/**
 * Per channel, never one shared flag.
 *
 * A single `notifiedAt` would claim every channel succeeded when only one did
 * — and the one that failed is exactly the one you need to know about. With
 * one channel today that costs nothing; with two it is the difference between
 * knowing and guessing.
 *
 * `skipped` is distinct from `failed` on purpose: a channel with no credentials
 * configured (every local dev machine) has not gone wrong, and showing it as a
 * failure trains the admin to ignore the one state that matters.
 */
export const CHANNEL_STATUSES = ['pending', 'sent', 'failed', 'skipped'] as const
export type ChannelStatus = (typeof CHANNEL_STATUSES)[number]

export interface ChannelState {
  status: ChannelStatus
  attempts: number
  sentAt?: Date
  lastError?: string
  lastAttemptAt?: Date
}

/**
 * The channels an order is announced on.
 *
 * Email only today. Adding WhatsApp is: a `whatsappConfig()` in
 * lib/notify/config.ts, a provider in lib/notify/providers.ts, and this array.
 * Nothing in the order flow, the repository or the admin changes — they all
 * iterate this list rather than naming channels.
 *
 * Orders placed before a channel existed simply have no record for it, which
 * `emptyChannelState()` supplies on read.
 */
export const NOTIFY_CHANNELS = ['email'] as const
export type NotifyChannel = (typeof NOTIFY_CHANNELS)[number]

export type Notifications = Record<NotifyChannel, ChannelState>

export function emptyChannelState(): ChannelState {
  return { status: 'pending', attempts: 0 }
}

export function emptyNotifications(): Notifications {
  return Object.fromEntries(
    NOTIFY_CHANNELS.map((channel) => [channel, emptyChannelState()]),
  ) as Notifications
}

/** Did any channel actually reach a human? Drives the dashboard warning. */
export function notificationNeedsAttention(notifications: Notifications): boolean {
  return NOTIFY_CHANNELS.some((channel) => {
    // A channel with no record at all — an order from before it existed — is
    // not a failure to chase.
    const status = notifications[channel]?.status
    return status === 'failed' || status === 'pending'
  })
}

// ---------------------------------------------------------------------------
// Google Sheets — a one-way projection, never a source of truth
// ---------------------------------------------------------------------------

/**
 * Whether this order has reached the reporting spreadsheet.
 *
 * The same SHAPE as a notification channel — a state, attempts, a timestamp,
 * the last error — because the operational question is identical: "did this
 * reach where it was supposed to, and if not, why?"
 *
 * But its own vocabulary, and its own field. The lifecycles genuinely differ:
 * a notification fires once, at creation, and stays `sent`. The sheet is a
 * projection that must be rewritten every time the order changes — a status
 * move, a payment — so it goes back to `pending` and is synced again. Sharing
 * one type would have forced "sent" to mean two different things.
 *
 * MongoDB is authoritative. This field records how far behind the spreadsheet
 * is; it is never read to decide what an order actually says.
 */
export const SHEET_SYNC_STATUSES = ['pending', 'synced', 'failed', 'skipped'] as const
export type SheetSyncStatus = (typeof SHEET_SYNC_STATUSES)[number]

export interface SheetSync {
  status: SheetSyncStatus
  attempts: number
  syncedAt?: Date
  lastAttemptAt?: Date
  lastError?: string
}

export function emptySheetSync(): SheetSync {
  return { status: 'pending', attempts: 0 }
}

/** Has the spreadsheet fallen behind, in a way an admin should see? */
export function sheetNeedsAttention(sync: SheetSync | undefined): boolean {
  return sync?.status === 'failed'
}

// ---------------------------------------------------------------------------
// The order itself
// ---------------------------------------------------------------------------

/**
 * A delivery address we could actually hand a pack to.
 *
 * `line1` and `pincode` are the two that make a delivery possible; everything
 * else narrows it down. `area` stays because it is what a Bengaluru rider
 * actually navigates by, and `landmark` because half of Bengaluru is found
 * that way rather than by number.
 */
/**
 * The rules for one field, defined once.
 *
 * The browser validates a FLAT form and the server validates a NESTED order,
 * so the two schemas cannot be the same object — but they must not be two
 * different opinions either. A field that the form accepts and the server
 * rejects is the worst outcome: the customer fills everything in correctly and
 * is told to check the highlighted fields, with nothing highlighted.
 *
 * So every rule lives here and both schemas are composed from it.
 */
export const FIELD = {
  name: z.string().trim().min(2, 'Please enter your name').max(80),

  phone: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ''))
    .refine((d) => PHONE_DIGITS.test(d), 'Enter a 10-digit Indian mobile number')
    // Store one canonical form, so the same person typed two ways is one
    // customer when you look up their history.
    .transform((d) => d.slice(-10)),

  /*
   * One character is enough.
   *
   * This used to require three, which rejected "23" — an ordinary Bengaluru
   * house number. The customer had filled the form in correctly and was told
   * to check the highlighted fields. A door number can be "4", "23" or "A1";
   * there is no minimum length that is both safe and correct, so the rule is
   * simply that it is not empty.
   */
  line1: z.string().trim().min(1, 'Enter your house, flat or building').max(120),

  line2: z.string().trim().max(120).optional(),
  area: z.string().trim().min(2, 'Which area should we deliver to?').max(120),

  pincode: z
    .string()
    .trim()
    .transform(normalisePincode)
    // The rule itself lives in ./delivery, so moving from a regional prefix to
    // an explicit supported-pincode list never touches this schema.
    .refine(isDeliverablePincode, PINCODE_ERROR),

  landmark: z.string().trim().max(120).optional(),
  note: z.string().trim().max(500).optional(),
} as const

export const addressSchema = z.strictObject({
  line1: FIELD.line1,
  line2: FIELD.line2,
  area: FIELD.area,
  city: z.literal(DELIVERY_CITY, `We currently deliver in ${DELIVERY_CITY} only`),
  pincode: FIELD.pincode,
  landmark: FIELD.landmark,
})

export const customerSchema = z.strictObject({
  name: FIELD.name,
  phone: FIELD.phone,
  address: addressSchema,
  note: FIELD.note,
})

/**
 * What the checkout form validates in the browser.
 *
 * Flat, because that is the shape of the form. Built from the same FIELD rules
 * the server uses, so the two can never disagree.
 *
 * The browser's copy is a convenience, not a security boundary: the server
 * re-validates everything, looks the price up itself, and is reachable by
 * direct POST regardless of what this does.
 */
export const checkoutFormSchema = z.object({
  name: FIELD.name,
  phone: FIELD.phone,
  line1: FIELD.line1,
  area: FIELD.area,
  pincode: FIELD.pincode,
  /*
   * The optional fields are typed as plain strings here, not `.optional()`.
   *
   * A text input always holds a string — empty is "" and never undefined — so
   * an optional type would make every value `string | undefined` and force the
   * whole form to be typed around a case that cannot occur. The server schema
   * keeps them genuinely optional, and the action drops the empty ones before
   * they reach it.
   */
  line2: z.string().trim().max(120),
  landmark: z.string().trim().max(120),
  note: z.string().trim().max(500),
})

/** Every field a string, because that is what an input holds. */
export type CheckoutFormValues = z.output<typeof checkoutFormSchema>

/**
 * What was bought, written down in full.
 *
 * Every descriptive field is COPIED IN rather than referenced, so an order
 * placed today still reads correctly after the product is renamed, repriced or
 * withdrawn. "Mushrooms × 2" six months later is not a record of anything.
 */
export const orderItemSchema = z.strictObject({
  productSlug: z.string().trim().min(1),
  name: z.string().trim().min(1),
  /** "White oyster" / "Grey oyster" — which variety, in plain words. */
  variety: z.string().trim().max(80).optional(),
  /** e.g. "250 g" — the pack as the customer saw it. */
  packLabel: z.string().trim().min(1),
  weightGrams: z.number().int().positive().optional(),
  unitPrice: z.number().int().nonnegative(),
  quantity: z
    .number()
    .int()
    .min(1, 'Choose at least one')
    // Above this the order is not created at all — the customer is sent to us
    // instead, because a 200-pack order placed silently is one we may not be
    // able to pick.
    .max(MAX_PACKS_PER_ORDER, BULK_ORDER_MESSAGE),
})

export const newOrderSchema = z.strictObject({
  customer: customerSchema,
  items: z.array(orderItemSchema).min(1, 'Your order is empty').max(10),
})

export type NewOrder = z.infer<typeof newOrderSchema>
export type OrderItem = z.infer<typeof orderItemSchema>
export type Customer = z.infer<typeof customerSchema>
export type Address = z.infer<typeof addressSchema>

/** An order as stored, with the fields the server owns. */
export interface Order extends NewOrder {
  /** Human-facing, e.g. "NEY-0042" — what you say on the phone. */
  reference: string
  status: OrderStatus
  /** Rupees. Computed on the server from `items`, never trusted from a form. */
  total: number
  payment: Payment
  notifications: Notifications
  /**
   * How far behind the reporting spreadsheet is. Absent on orders created
   * before the projection existed, which the backfill then picks up.
   */
  sheetSync?: SheetSync
  /**
   * A per-submission token from the browser, unique-indexed.
   *
   * It is what stops a double-tap, a flaky connection retry or a browser's
   * "resend POST?" dialog turning one order into two. Optional because an
   * order created by any other path (a script, a future admin entry form) has
   * no browser to generate one.
   */
  idempotencyKey?: string
  createdAt: Date
  updatedAt: Date
  history: { status: OrderStatus; at: Date; by?: string }[]
}

/** Total in rupees. Server-side only: a posted total is an attacker's total. */
export function orderTotal(items: readonly OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
}

/** One line, as it reads everywhere: "2 × Fresh White Oyster Mushrooms (250 g)". */
export function describeItem(item: OrderItem): string {
  return `${item.quantity} × ${item.name} (${item.packLabel})`
}

/** The address on one line, for a notification or a list row. */
export function formatAddress(address: Address): string {
  return [
    address.line1,
    address.line2,
    address.area,
    `${address.city} ${address.pincode}`,
    address.landmark ? `Landmark: ${address.landmark}` : null,
  ]
    .filter(Boolean)
    .join(', ')
}

/** The address over several lines, for an email or the admin detail page. */
export function addressLines(address: Address): string[] {
  return [
    address.line1,
    address.line2,
    address.area,
    `${address.city} ${address.pincode}`,
    address.landmark ? `Landmark: ${address.landmark}` : null,
  ].filter((line): line is string => Boolean(line))
}
