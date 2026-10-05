import 'server-only'
import type { Collection, Filter } from 'mongodb'
import { db } from '@/lib/db/mongo'
import {
  canTransition,
  DELIVERY_CITY,
  emptyChannelState,
  emptyNotifications,
  emptySheetSync,
  newOrderSchema,
  orderTotal,
  type ChannelState,
  type NewOrder,
  NOTIFY_CHANNELS,
  type NotifyChannel,
  type Order,
  type OrderStatus,
  type PaymentStatus,
  type SheetSync,
} from './schema'

/**
 * Every read and write of an order goes through here.
 *
 * Keeping the driver behind a repository means the rest of the app never sees
 * an ObjectId, a filter document or a cursor — and if this ever moves off
 * MongoDB, only this file changes. That is the same seam `lib/content` gives
 * the static content.
 */

const ORDERS = 'orders'
const COUNTERS = 'counters'

async function orders(): Promise<Collection<Order>> {
  const database = await db()
  return database.collection<Order>(ORDERS)
}

/**
 * Create the indexes the queries rely on.
 *
 * Called on first write rather than from a migration step, because there is no
 * migration step — `createIndex` is idempotent, so running it repeatedly is
 * cheap and the collection is always correctly indexed even on a fresh Atlas
 * cluster that nobody prepared.
 */
let indexesReady: Promise<void> | undefined
function ensureIndexes(): Promise<void> {
  indexesReady ??= (async () => {
    const col = await orders()
    await Promise.all([
      // The reference is what you read out on the phone; it must be unique.
      // It is also the cursor tiebreak below, so uniqueness is load-bearing.
      col.createIndex({ reference: 1 }, { unique: true }),
      /*
       * The dashboard's default page, and the sort every other query uses.
       *
       * Compound on (createdAt, reference) because that pair is the cursor:
       * `createdAt` alone is not unique, and a sort it cannot fully determine
       * is a sort MongoDB may return in a different order next time — which
       * is precisely how cursor pagination skips and duplicates rows.
       */
      col.createIndex({ createdAt: -1, reference: -1 }),
      // Filtering by fulfilment status, still in cursor order. Replaces the
      // old { status, createdAt } index, which could not serve the tiebreak.
      col.createIndex({ status: 1, createdAt: -1, reference: -1 }),
      /*
       * Filtering by payment, and `countUnpaid`. Worth its own index because
       * "who still owes money" is a question asked on every dashboard load.
       */
      col.createIndex({ 'payment.status': 1, createdAt: -1, reference: -1 }),
      // Finding a returning customer's history by phone — also the search box.
      col.createIndex({ 'customer.phone': 1, createdAt: -1 }),
      /*
       * The retry sweeps, for both admin alerts and the spreadsheet. Sparse
       * because orders created before the projection existed have no
       * `sheetSync` field at all, and indexing those nulls buys nothing.
       */
      col.createIndex({ 'sheetSync.status': 1, createdAt: -1 }, { sparse: true }),
      /*
       * Unique AND sparse. Unique is what makes a double submission collide
       * rather than duplicate; sparse is what lets every order created without
       * a browser token coexist, since a plain unique index treats many
       * missing values as many duplicate nulls.
       */
      col.createIndex({ idempotencyKey: 1 }, { unique: true, sparse: true }),
    ])
  })()
  return indexesReady
}

/**
 * The next order reference, as NEY-0001.
 *
 * A counter document incremented with findOneAndUpdate, which is atomic in
 * MongoDB. Counting existing orders instead would hand two simultaneous
 * customers the same reference — rare, but it would mean two different orders
 * you cannot tell apart on the phone.
 */
async function nextReference(): Promise<string> {
  const database = await db()
  const counter = await database
    .collection<{ _id: string; value: number }>(COUNTERS)
    .findOneAndUpdate(
      { _id: 'orderReference' },
      { $inc: { value: 1 } },
      { upsert: true, returnDocument: 'after' },
    )
  const n = counter?.value ?? 1
  return `NEY-${String(n).padStart(4, '0')}`
}

/**
 * Fill in anything an older document predates.
 *
 * Orders written before payment, notification tracking and the full delivery
 * address existed have none of those fields — and `order.payment.status` or
 * `order.customer.address.line1` on one of them throws while rendering the
 * dashboard, taking down the very page that exists to show them.
 *
 * Reads are therefore defensive, so a schema change can never strand the rows
 * already in the collection. This is a read-time shim, not a migration: the
 * stored document is left exactly as it was, and what is missing is plainly
 * marked as missing rather than invented.
 */
function normalise(order: Order): Order {
  const customer = order.customer as typeof order.customer & { area?: string }

  return {
    ...order,
    payment: order.payment ?? { method: 'pay_on_delivery', status: 'pending' },
    notifications: order.notifications ?? emptyNotifications(),
    // An order written before the projection existed has never been synced,
    // which is exactly what `pending` means.
    sheetSync: order.sheetSync ?? emptySheetSync(),
    history: order.history ?? [],
    customer: {
      ...customer,
      address: customer.address ?? {
        // The old form collected one free-text "area" and nothing else. It is
        // carried into `area` and the rest is labelled, not guessed — an
        // invented house number is worse than an obviously absent one.
        line1: 'Address not collected (pre-Phase-1 order)',
        area: customer.area ?? 'Unknown',
        city: DELIVERY_CITY,
        pincode: '000000',
      },
    },
  }
}

export async function createOrder(
  input: unknown,
  options: { idempotencyKey?: string } = {},
): Promise<Order> {
  // Validate before touching the database. The collection has no schema, so
  // this is the only thing standing between a bad payload and a permanent row.
  const parsed: NewOrder = newOrderSchema.parse(input)
  await ensureIndexes()

  const col = await orders()
  const key = options.idempotencyKey?.trim() || undefined

  /*
   * The cheap check first. It catches the common case — a customer tapping
   * "Place order" twice — without burning a reference number, and the unique
   * index below catches the genuine race that this misses.
   */
  if (key) {
    const existing = await col.findOne({ idempotencyKey: key }, { projection: { _id: 0 } })
    if (existing) return normalise(existing)
  }

  const now = new Date()
  const order: Order = {
    ...parsed,
    reference: await nextReference(),
    status: 'new',
    // Computed here, never read from the request — otherwise the customer
    // decides what they owe.
    total: orderTotal(parsed.items),
    payment: { method: 'pay_on_delivery', status: 'pending' },
    notifications: emptyNotifications(),
    ...(key ? { idempotencyKey: key } : {}),
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'new', at: now }],
  }

  try {
    await col.insertOne(order)
  } catch (error) {
    /*
     * Duplicate key on idempotencyKey: two submissions raced past the lookup
     * above and this one lost. The other order is the real one — return it, so
     * the customer sees a successful order rather than an error for something
     * that did in fact work.
     */
    if (key && isDuplicateKeyError(error)) {
      const winner = await col.findOne({ idempotencyKey: key }, { projection: { _id: 0 } })
      if (winner) return normalise(winner)
    }
    throw error
  }

  return order
}

function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 11000
}

/**
 * How the dashboard asks for orders.
 *
 * Every field is optional and every one is applied IN MONGODB — nothing is
 * filtered in the browser, because the browser is not allowed to hold the
 * collection.
 */
export interface OrderQuery {
  status?: OrderStatus
  paymentStatus?: PaymentStatus
  /** An order reference or a phone number. See `searchFilter`. */
  search?: string
  limit?: number
  /** Opaque token from a previous page. See `encodeCursor`. */
  cursor?: string
}

export interface OrderPage {
  orders: Order[]
  /** Pass to the next call. `null` when there is nothing more. */
  nextCursor: string | null
}

const DEFAULT_PAGE = 20
const MAX_PAGE = 100

/**
 * The cursor: the sort key of the last row on the page.
 *
 * NOT a skip/offset. `skip` re-walks every preceding document on each page,
 * so page 50 costs fifty times page 1 — and worse, an order placed while the
 * admin is paging shifts every later page by one, which silently duplicates
 * one order and hides another.
 *
 * (createdAt, reference) is a TOTAL order: `createdAt` alone is not unique, so
 * two orders placed in the same millisecond would have no defined order
 * between them and the boundary between pages would be arbitrary. `reference`
 * is unique and monotonic — the counter that issues it is atomic — so the pair
 * can never tie.
 *
 * Base64 because it is an implementation detail the UI passes back unexamined;
 * it is not secret, and nothing trusts its contents (see `decodeCursor`).
 */
function encodeCursor(order: Order): string {
  return Buffer.from(`${new Date(order.createdAt).toISOString()}|${order.reference}`).toString(
    'base64url',
  )
}

function decodeCursor(cursor: string): { createdAt: Date; reference: string } | null {
  try {
    const [iso, reference] = Buffer.from(cursor, 'base64url').toString('utf8').split('|')
    if (!iso || !reference) return null
    const createdAt = new Date(iso)
    // A malformed cursor must not become a query that returns everything.
    if (Number.isNaN(createdAt.getTime())) return null
    return { createdAt, reference }
  } catch {
    return null
  }
}

/**
 * Reference or phone, never free text.
 *
 * Both are anchored so the index can serve them. An unanchored regex on a name
 * cannot use an index and becomes a collection scan — which is fine at a dozen
 * orders and quietly terrible at ten thousand. Reference and phone are what an
 * admin actually has in front of them when a customer calls.
 */
function searchFilter(raw: string): Filter<Order> | null {
  const search = raw.trim()
  if (!search) return null

  const digits = search.replace(/\D/g, '')
  const clauses: Filter<Order>[] = []

  // "NEY-0021", "ney-21", or just "21".
  const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  clauses.push({ reference: { $regex: `^${escaped}`, $options: 'i' } })
  if (/^\d+$/.test(search)) {
    clauses.push({ reference: `NEY-${search.padStart(4, '0')}` })
  }

  // A phone number as stored (last ten digits), however it was typed.
  if (digits.length >= 4) {
    clauses.push({ 'customer.phone': { $regex: `${digits.slice(-10)}$` } })
  }

  return { $or: clauses }
}

function buildFilter(query: OrderQuery): Filter<Order> {
  const clauses: Filter<Order>[] = []
  if (query.status) clauses.push({ status: query.status })
  if (query.paymentStatus) clauses.push({ 'payment.status': query.paymentStatus })

  const search = query.search ? searchFilter(query.search) : null
  if (search) clauses.push(search)

  if (query.cursor) {
    const cursor = decodeCursor(query.cursor)
    if (cursor) {
      /*
       * Strictly after the last row of the previous page, in the same total
       * order as the sort. The second branch is what makes a tie impossible:
       * same timestamp, lower reference.
       */
      clauses.push({
        $or: [
          { createdAt: { $lt: cursor.createdAt } },
          { createdAt: cursor.createdAt, reference: { $lt: cursor.reference } },
        ],
      })
    }
  }

  return clauses.length > 0 ? { $and: clauses } : {}
}

/**
 * One page of orders, newest first.
 *
 * Fetches one more row than asked for: its existence is how we know there is a
 * next page, without a second count query. It is dropped before returning.
 */
export async function listOrders(query: OrderQuery = {}): Promise<OrderPage> {
  const col = await orders()
  const limit = Math.min(Math.max(query.limit ?? DEFAULT_PAGE, 1), MAX_PAGE)

  const rows = await col
    .find(buildFilter(query), { projection: { _id: 0 } })
    .sort({ createdAt: -1, reference: -1 })
    .limit(limit + 1)
    .toArray()

  const hasMore = rows.length > limit
  const page = (hasMore ? rows.slice(0, limit) : rows).map(normalise)
  const last = page[page.length - 1]

  return { orders: page, nextCursor: hasMore && last ? encodeCursor(last) : null }
}

/** Every order, in pages. For the backfill — never for a page render. */
export async function* iterateOrders(batch = 100): AsyncGenerator<Order[]> {
  let cursor: string | undefined
  do {
    const page: OrderPage = await listOrders({ limit: batch, cursor })
    if (page.orders.length > 0) yield page.orders
    cursor = page.nextCursor ?? undefined
  } while (cursor)
}

export async function getOrder(reference: string): Promise<Order | null> {
  const col = await orders()
  const row = await col.findOne({ reference }, { projection: { _id: 0 } })
  return row ? normalise(row) : null
}

/**
 * Move an order to a new status.
 *
 * The transition is checked in the query itself (`status: from`), so two
 * admins acting at once cannot both succeed — the second matches nothing and
 * gets `null` rather than silently overwriting the first.
 */
export async function advanceOrder(
  reference: string,
  from: OrderStatus,
  to: OrderStatus,
  by?: string,
): Promise<Order | null> {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot move an order from ${from} to ${to}`)
  }
  const col = await orders()
  const now = new Date()
  const row = await col.findOneAndUpdate(
    { reference, status: from },
    {
      $set: { status: to, updatedAt: now },
      $push: { history: { status: to, at: now, ...(by ? { by } : {}) } },
    },
    { returnDocument: 'after', projection: { _id: 0 } },
  )
  return row ? normalise(row) : null
}

/**
 * Record that payment was collected, or undo a mistaken one.
 *
 * Conditional on the CURRENT payment status for the same reason transitions
 * are: two admins marking the same order paid should not both think they were
 * the one who did it, and an accidental double-tap on "reverse" should not
 * undo a payment someone else just re-recorded.
 *
 * `paidAt` is unset rather than nulled on reversal, so the field's presence
 * always means "this was genuinely paid at this time".
 */
export async function setPaymentStatus(
  reference: string,
  from: PaymentStatus,
  to: PaymentStatus,
  by: string,
): Promise<Order | null> {
  if (from === to) throw new Error('Payment status is already ' + to)

  const col = await orders()
  const now = new Date()
  // Appended in both directions, so a reversal leaves a trail rather than
  // erasing the fact that payment was once recorded.
  const entry = { status: to, at: now, by }

  const row = await col.findOneAndUpdate(
    { reference, 'payment.status': from },
    to === 'paid'
      ? {
          $set: {
            'payment.status': 'paid' as const,
            'payment.paidAt': now,
            'payment.updatedBy': by,
            updatedAt: now,
          },
          $push: { 'payment.history': entry },
        }
      : {
          $set: {
            'payment.status': 'pending' as const,
            'payment.updatedBy': by,
            updatedAt: now,
          },
          // Unset rather than nulled: the presence of `paidAt` always means
          // "genuinely paid at this time". The reversal survives in history.
          $unset: { 'payment.paidAt': '' },
          $push: { 'payment.history': entry },
        },
    { returnDocument: 'after', projection: { _id: 0 } },
  )
  return row ? normalise(row) : null
}

/**
 * Record the outcome of one notification attempt.
 *
 * Written per channel with a dotted path rather than by replacing the whole
 * `notifications` object, so two channels finishing at the same moment cannot
 * overwrite each other's result.
 */
export async function recordNotification(
  reference: string,
  channel: NotifyChannel,
  result: { ok: boolean; skipped?: boolean; error?: string },
): Promise<void> {
  const col = await orders()
  const now = new Date()

  const status: ChannelState['status'] = result.skipped ? 'skipped' : result.ok ? 'sent' : 'failed'

  const set: Record<string, unknown> = {
    [`notifications.${channel}.status`]: status,
    [`notifications.${channel}.lastAttemptAt`]: now,
    updatedAt: now,
  }
  if (result.ok && !result.skipped) set[`notifications.${channel}.sentAt`] = now
  if (result.error) set[`notifications.${channel}.lastError`] = result.error.slice(0, 300)

  await col.updateOne({ reference }, {
    $set: set,
    $inc: { [`notifications.${channel}.attempts`]: 1 },
    ...(result.ok || result.skipped
      ? { $unset: { [`notifications.${channel}.lastError`]: '' } }
      : {}),
  })
}

/**
 * Orders whose admin notification has not landed yet.
 *
 * `olderThanMs` exists so a sweep does not fight the in-flight attempt that
 * `ctx.waitUntil` is still running for an order placed two seconds ago.
 */
export async function listUnnotified(options: {
  olderThanMs?: number
  limit?: number
  maxAttempts?: number
} = {}): Promise<Order[]> {
  const col = await orders()
  const cutoff = new Date(Date.now() - (options.olderThanMs ?? 120_000))
  const maxAttempts = options.maxAttempts ?? 5

  const rows = await col
    .find(
      {
        createdAt: { $lte: cutoff },
        // Derived from the channel list rather than written out, so adding a
        // channel is one change in schema.ts and not a query somebody forgets.
        $or: NOTIFY_CHANNELS.map((channel) => ({
          [`notifications.${channel}.status`]: { $in: ['pending', 'failed'] },
          [`notifications.${channel}.attempts`]: { $lt: maxAttempts },
        })),
      },
      { projection: { _id: 0 } },
    )
    .sort({ createdAt: -1 })
    .limit(Math.min(options.limit ?? 20, 50))
    .toArray()

  return rows.map(normalise)
}

/** Reset a channel so the next attempt is treated as a first one. */
export async function resetNotificationChannel(
  reference: string,
  channel: NotifyChannel,
): Promise<void> {
  const col = await orders()
  await col.updateOne(
    { reference },
    { $set: { [`notifications.${channel}`]: emptyChannelState() } },
  )
}

/**
 * Record the outcome of one spreadsheet sync.
 *
 * Written with dotted paths rather than by replacing `sheetSync` wholesale, so
 * a sync finishing at the same moment as a status change cannot clobber it.
 */
export async function recordSheetSync(
  reference: string,
  result: { ok: boolean; skipped?: boolean; error?: string },
): Promise<void> {
  const col = await orders()
  const now = new Date()
  const status: SheetSync['status'] = result.skipped ? 'skipped' : result.ok ? 'synced' : 'failed'

  const set: Record<string, unknown> = {
    'sheetSync.status': status,
    'sheetSync.lastAttemptAt': now,
  }
  if (result.ok && !result.skipped) set['sheetSync.syncedAt'] = now
  if (result.error) set['sheetSync.lastError'] = result.error.slice(0, 300)

  await col.updateOne({ reference }, {
    $set: set,
    $inc: { 'sheetSync.attempts': 1 },
    ...(result.ok || result.skipped ? { $unset: { 'sheetSync.lastError': '' } } : {}),
  })
}

/**
 * Mark the projection stale after the order changed.
 *
 * Called on every status and payment move. Without it a delivered, paid order
 * would still read "New / Pending" in the spreadsheet for ever — the sheet
 * would be a record of orders as they arrived, not as they are.
 */
export async function markSheetStale(reference: string): Promise<void> {
  const col = await orders()
  await col.updateOne({ reference }, { $set: { 'sheetSync.status': 'pending' } })
}

/**
 * Orders whose spreadsheet row is missing or out of date.
 *
 * `$ne: 'synced'` rather than listing the other states, so an order written
 * before `sheetSync` existed — which has no field at all — is picked up by the
 * backfill rather than silently ignored.
 */
export async function listUnsynced(options: {
  limit?: number
  maxAttempts?: number
  includeFailed?: boolean
} = {}): Promise<Order[]> {
  const col = await orders()
  const maxAttempts = options.maxAttempts ?? 5

  const rows = await col
    .find(
      {
        $or: [
          { 'sheetSync.status': { $exists: false } },
          { 'sheetSync.status': 'pending' },
          ...(options.includeFailed === false
            ? []
            : [{ 'sheetSync.status': 'failed', 'sheetSync.attempts': { $lt: maxAttempts } }]),
        ],
      },
      { projection: { _id: 0 } },
    )
    // Oldest first: a backfill should fill history in the order it happened,
    // so a partial run still leaves the sheet chronological.
    .sort({ createdAt: 1, reference: 1 })
    .limit(Math.min(options.limit ?? 50, 500))
    .toArray()

  return rows.map(normalise)
}

/**
 * A short-lived lock, so two Sync All runs cannot append the same rows twice.
 *
 * The button is disabled while a run is in flight, but that only protects one
 * browser. Two admins, or a double submit that outruns React, would each read
 * "this Row Key is absent" and each append it — the one way this design can
 * create a duplicate.
 *
 * In MongoDB rather than in memory because Workers isolates share nothing: a
 * module-level flag would be per-isolate and protect almost nothing.
 *
 * `expiresAt` is what stops a crashed run locking the operation out for ever.
 */
export async function acquireSyncLock(
  name: string,
  holder: string,
  ttlMs = 120_000,
): Promise<boolean> {
  const database = await db()
  const now = new Date()
  const expiresAt = new Date(now.getTime() + ttlMs)

  try {
    // Upsert conditional on the lock being absent OR expired — one atomic
    // operation, so only one caller can win.
    const result = await database
      .collection<{ _id: string; holder: string; expiresAt: Date }>('locks')
      .updateOne(
        { _id: name, expiresAt: { $lt: now } },
        { $set: { holder, expiresAt } },
        { upsert: true },
      )
    return result.modifiedCount > 0 || result.upsertedCount > 0
  } catch (error) {
    // Duplicate key: the lock exists and has not expired, so someone else holds
    // it. That is a refusal, not a failure.
    if (isDuplicateKeyError(error)) return false
    throw error
  }
}

export async function releaseSyncLock(name: string, holder: string): Promise<void> {
  const database = await db()
  await database
    .collection<{ _id: string; holder: string }>('locks')
    // Only the holder may release it, so a slow run cannot unlock the one that
    // replaced it after its TTL expired.
    .deleteOne({ _id: name, holder })
}

export async function countByStatus(): Promise<Record<string, number>> {
  const col = await orders()
  const rows = await col
    .aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    .toArray()
  return Object.fromEntries(rows.map((r) => [r._id, r.n]))
}

/** When the spreadsheet was last brought up to date, for the admin panel. */
export async function lastSheetSync(): Promise<Date | null> {
  const col = await orders()
  const row = await col
    .find({ 'sheetSync.syncedAt': { $exists: true } }, { projection: { _id: 0, sheetSync: 1 } })
    .sort({ 'sheetSync.syncedAt': -1 })
    .limit(1)
    .next()
  return row?.sheetSync?.syncedAt ?? null
}

/** How many orders still owe money. Drives the dashboard's unpaid card. */
export async function countUnpaid(): Promise<{ orders: number; value: number }> {
  const col = await orders()
  const [row] = await col
    .aggregate<{ orders: number; value: number }>([
      { $match: { status: { $ne: 'cancelled' }, 'payment.status': { $ne: 'paid' } } },
      { $group: { _id: null, orders: { $sum: 1 }, value: { $sum: '$total' } } },
    ])
    .toArray()
  return { orders: row?.orders ?? 0, value: row?.value ?? 0 }
}
