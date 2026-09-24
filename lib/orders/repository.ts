import 'server-only'
import type { Collection, Filter } from 'mongodb'
import { db } from '@/lib/db/mongo'
import {
  canTransition,
  newOrderSchema,
  orderTotal,
  type NewOrder,
  type Order,
  type OrderStatus,
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
      col.createIndex({ reference: 1 }, { unique: true }),
      // The dashboard's default view: newest first.
      col.createIndex({ createdAt: -1 }),
      // Filtering the dashboard by status, still newest first.
      col.createIndex({ status: 1, createdAt: -1 }),
      // Finding a returning customer's history by phone.
      col.createIndex({ 'customer.phone': 1, createdAt: -1 }),
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

export async function createOrder(input: unknown): Promise<Order> {
  // Validate before touching the database. The collection has no schema, so
  // this is the only thing standing between a bad payload and a permanent row.
  const parsed: NewOrder = newOrderSchema.parse(input)
  await ensureIndexes()

  const now = new Date()
  const order: Order = {
    ...parsed,
    reference: await nextReference(),
    status: 'new',
    // Computed here, never read from the request — otherwise the customer
    // decides what they owe.
    total: orderTotal(parsed.items),
    createdAt: now,
    updatedAt: now,
    history: [{ status: 'new', at: now }],
  }

  const col = await orders()
  await col.insertOne(order)
  return order
}

export async function listOrders(options: {
  status?: OrderStatus
  limit?: number
} = {}): Promise<Order[]> {
  const col = await orders()
  const filter: Filter<Order> = options.status ? { status: options.status } : {}
  return col
    .find(filter, { projection: { _id: 0 } })
    .sort({ createdAt: -1 })
    .limit(Math.min(options.limit ?? 100, 500))
    .toArray()
}

export async function getOrder(reference: string): Promise<Order | null> {
  const col = await orders()
  return col.findOne({ reference }, { projection: { _id: 0 } })
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
): Promise<Order | null> {
  if (!canTransition(from, to)) {
    throw new Error(`Cannot move an order from ${from} to ${to}`)
  }
  const col = await orders()
  const now = new Date()
  return col.findOneAndUpdate(
    { reference, status: from },
    { $set: { status: to, updatedAt: now }, $push: { history: { status: to, at: now } } },
    { returnDocument: 'after', projection: { _id: 0 } },
  )
}

export async function countByStatus(): Promise<Record<string, number>> {
  const col = await orders()
  const rows = await col
    .aggregate<{ _id: OrderStatus; n: number }>([{ $group: { _id: '$status', n: { $sum: 1 } } }])
    .toArray()
  return Object.fromEntries(rows.map((r) => [r._id, r.n]))
}
