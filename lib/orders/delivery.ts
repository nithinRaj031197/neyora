/**
 * Where NEYORA delivers.
 *
 * One module, so widening the area later is a change here and nowhere else.
 * Checkout, validation and copy all read from this file.
 *
 * ── WHAT THIS CHECK IS, AND IS NOT ────────────────────────────────────────
 *
 * `56xxxx` is a BROAD REGIONAL CHECK, not a serviceability guarantee. It
 * matches Bengaluru Urban and Bengaluru Rural, which together cover a far
 * larger area than a morning delivery run can reach — so a pincode passing
 * this check means "plausibly Bengaluru", not "we will definitely deliver
 * there today".
 *
 * It is deliberately permissive. Phase 1 confirms every order by phone before
 * it is prepared, so a delivery that turns out to be too far is caught by a
 * human in a conversation that was happening anyway. The opposite error —
 * refusing a real customer two streets away because their pincode is not on a
 * list someone forgot to update — costs a sale and cannot be recovered.
 *
 * Customer-facing copy therefore says "we currently deliver in Bengaluru", and
 * never promises that every 56xxxx address is served.
 *
 * ── MOVING TO AN EXPLICIT LIST ───────────────────────────────────────────
 *
 * When the delivery run is fixed enough to enumerate, set SUPPORTED_PINCODES
 * to the list. Nothing else changes: `isDeliverablePincode` switches from the
 * prefix rule to membership, the schema keeps calling the same function, and
 * checkout does not need rewriting.
 */

export const DELIVERY_CITY = 'Bengaluru'

/** Bengaluru Urban and Rural. A region, not a service area — see above. */
export const BENGALURU_PINCODE = /^56\d{4}$/

/**
 * The exact pincodes served, once we can name them.
 *
 * `null` means "not enumerated yet — fall back to the regional rule". Replace
 * it with an array to switch to precise serviceability; the array wins
 * entirely, so a pincode absent from it is refused even if it starts 56.
 *
 * Example:
 *   export const SUPPORTED_PINCODES = ['560034', '560095', '560047'] as const
 */
export const SUPPORTED_PINCODES: readonly string[] | null = null

/** Digits only. Accepts "560 034" as readily as "560034". */
export function normalisePincode(value: string): string {
  return value.replace(/\D/g, '')
}

export function isDeliverablePincode(value: string): boolean {
  const pincode = normalisePincode(value)
  if (SUPPORTED_PINCODES) return SUPPORTED_PINCODES.includes(pincode)
  return BENGALURU_PINCODE.test(pincode)
}

/** Why a pincode was refused, in words a customer can act on. */
export const PINCODE_ERROR = SUPPORTED_PINCODES
  ? `We do not deliver to that pincode yet. Message us and we will tell you when we do.`
  : `Enter a ${DELIVERY_CITY} pincode — we do not deliver outside the city yet.`

/** Shown under the city field. Deliberately not a guarantee. */
export const DELIVERY_NOTICE = `We currently deliver in ${DELIVERY_CITY}. We confirm every order by phone, so we will tell you straight away if your address is outside our run.`

/**
 * The most packs a customer may order through checkout.
 *
 * Not an inventory limit — a routing one. Beyond this it stops being a normal
 * delivery and becomes a conversation about harvest volume, lead time and
 * price, so the form sends them to us rather than accepting an order we may
 * not be able to pick.
 */
export const MAX_PACKS_PER_ORDER = 50
export const BULK_ORDER_MESSAGE = `For more than ${MAX_PACKS_PER_ORDER} packs, talk to us first — we will plan the harvest around it.`
