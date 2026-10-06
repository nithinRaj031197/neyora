/**
 * The only sanctioned way to delete an order that a live test created.
 *
 * ── WHY THIS FILE EXISTS ──────────────────────────────────────────────────
 *
 * Verifying the order flow against the real database and the real spreadsheet
 * is worth doing — mocks cannot prove that a service-account key still works
 * or that a row lands in the right column. But it leaves test rows in a
 * collection that also holds real customers' orders, and the cleanup that
 * follows is where a live test stops being a test and becomes an incident.
 *
 * The rule enforced here is provenance: cleanup may delete a document ONLY
 * when that document carries an idempotency key the test itself minted. Not a
 * reference ("NEY-0001" is whatever the counter happened to issue), not a
 * customer name (a real customer may be called Test), not "everything created
 * in the last hour" (so was the order that came in while the test ran).
 *
 * ── THE SHAPES THAT ARE REFUSED ───────────────────────────────────────────
 *
 *   deleteMany({})                 no filter at all
 *   deleteMany({ status: 'new' })  a property real orders also have
 *   deleteMany({ createdAt: … })   a time window real orders also fall in
 *   clearing the Orders sheet      rows the test never wrote
 *   resetting the counter          see assertCounterUntouched
 *
 * None of those can be expressed through this module. `planCleanup` returns a
 * filter keyed on `idempotencyKey` and nothing else, and that key must carry
 * the reserved prefix below — which `createOrder` never generates on its own,
 * because real keys come from `crypto.randomUUID()` in the browser.
 *
 * This module is deliberately pure: no mongodb import, no network, no
 * `server-only`. It is the decision, not the deletion, and that is what makes
 * every rule here testable without a database.
 */

/**
 * The marker that proves a test made this order.
 *
 * A colon is not a hex digit, so no `randomUUID()` can ever collide with it —
 * a real customer's order cannot be mistaken for a test's however unlucky.
 */
export const TEST_KEY_PREFIX = 'neyora-live-test:'

export class UnsafeCleanupError extends Error {
  override name = 'UnsafeCleanupError'
}

/** Mint a key for an order a live test is about to place. */
export function mintTestKey(label: string, random: string = globalThis.crypto.randomUUID()): string {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  if (!slug) throw new UnsafeCleanupError('A test key needs a label describing what the test does')
  return `${TEST_KEY_PREFIX}${slug}:${random}`
}

export function isTestKey(key: unknown): key is string {
  return typeof key === 'string' && key.startsWith(TEST_KEY_PREFIX) && key.length > TEST_KEY_PREFIX.length
}

export interface CleanupPlan {
  /**
   * The Mongo filter. Keyed on `idempotencyKey` alone, on purpose: adding a
   * second clause could only ever widen what a mistake would match.
   */
  filter: { idempotencyKey: { $in: string[] } }
  /** Exactly how many documents the caller expects. Not "at most". */
  expected: number
  keys: string[]
}

/**
 * Turn a list of minted keys into a plan, or refuse.
 *
 * An empty list is refused rather than treated as "nothing to do", because
 * `{ $in: [] }` matches nothing today but an empty list almost always means
 * the caller lost track of its keys — and the next edit to such code is the
 * one that drops the filter entirely.
 */
export function planCleanup(keys: readonly string[]): CleanupPlan {
  if (keys.length === 0) {
    throw new UnsafeCleanupError('Nothing to clean up: the test recorded no idempotency keys')
  }
  for (const key of keys) {
    if (!isTestKey(key)) {
      throw new UnsafeCleanupError(
        `Refusing to delete by ${JSON.stringify(key)}: it was not minted by mintTestKey(), ` +
          'so there is no proof a test created that order',
      )
    }
  }
  const unique = [...new Set(keys)]
  if (unique.length !== keys.length) {
    throw new UnsafeCleanupError('The same idempotency key was listed twice; the expected count would be wrong')
  }
  return { filter: { idempotencyKey: { $in: unique } }, expected: unique.length, keys: unique }
}

export interface MatchedOrder {
  reference?: string
  idempotencyKey?: string
}

/**
 * Check what the filter actually matched, BEFORE deleting.
 *
 * The filter being correct is not the same as the result being expected: a
 * test that thinks it placed two orders and matched three has misunderstood
 * something, and deleting the third is exactly the mistake this exists to
 * prevent. Fewer than expected is also refused — it usually means an order
 * failed to save and the test is about to report a pass it did not earn.
 */
export function assertMatchesPlan(plan: CleanupPlan, matched: readonly MatchedOrder[]): void {
  for (const order of matched) {
    if (!isTestKey(order.idempotencyKey) || !plan.keys.includes(order.idempotencyKey)) {
      throw new UnsafeCleanupError(
        `Refusing to delete ${order.reference ?? 'an order'}: its idempotency key is not one this test minted`,
      )
    }
  }
  if (matched.length !== plan.expected) {
    throw new UnsafeCleanupError(
      `Expected to delete exactly ${plan.expected} test order(s) but matched ${matched.length}`,
    )
  }
}

/**
 * The counter is never test cleanup's to touch.
 *
 * ── WHY A REFERENCE MUST NEVER BE REISSUED ────────────────────────────────
 *
 * `NEY-0001` is not a database key; it is what gets read out on the phone,
 * printed on the delivery note and quoted in the confirmation email. Deleting
 * the order does not recall any of those. Rewinding the counter therefore
 * issues a reference that already exists in the world, and two different
 * orders become indistinguishable to the one person — the customer — who
 * cannot look in the database to tell them apart.
 *
 * Mongo's unique index does not help: it only sees the documents that are
 * still there. The guarantee has to be that the counter only ever goes up.
 */
export function assertCounterUntouched(before: number | null, after: number | null): void {
  if (before !== after) {
    throw new UnsafeCleanupError(
      `Test cleanup changed the order reference counter (${before ?? 'absent'} -> ${after ?? 'absent'}). ` +
        'References are permanent and must never be reissued.',
    )
  }
}

/**
 * Which spreadsheet rows a test may remove.
 *
 * The Orders sheet is a projection, so a stale row is harmless, but it is also
 * a place the admin reads history from. Cleanup removes only the rows whose
 * reference belongs to an order this test created — never "clear the tab".
 */
export function sheetRowsToRemove(
  rows: readonly { reference?: string }[],
  deletedReferences: readonly string[],
): number[] {
  const allowed = new Set(deletedReferences.filter(Boolean))
  if (allowed.size === 0) return []
  return rows
    .map((row, index) => (row.reference && allowed.has(row.reference) ? index : -1))
    .filter((index) => index >= 0)
}
