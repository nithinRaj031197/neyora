/**
 * Delete the orders a live test created — and nothing else.
 *
 * Usage:
 *   node --env-file=.env.local scripts/cleanup-test-orders.ts <idempotency-key> [...]
 *
 * Every key must be one `mintTestKey()` produced, so a live test has to record
 * its keys and hand them back. That is the point: there is no invocation of
 * this script that empties the collection, clears the Orders tab or rewinds the
 * counter, because none of those can be expressed by the guard it runs on.
 *
 * It verifies what it matched BEFORE deleting, and re-reads the counter
 * afterwards to prove it did not move. See scripts/lib/test-cleanup.ts for why
 * a reissued reference is worse than a leftover test row.
 */
import { MongoClient } from 'mongodb'
import {
  assertCounterUntouched,
  assertMatchesPlan,
  planCleanup,
  UnsafeCleanupError,
} from './lib/test-cleanup.ts'

const keys = process.argv.slice(2)

const uri = process.env.MONGODB_URI
if (!uri) {
  console.error('MONGODB_URI is not set. Run with --env-file=.env.local')
  process.exit(1)
}

const client = new MongoClient(uri)

try {
  const plan = planCleanup(keys)

  await client.connect()
  const db = client.db(process.env.MONGODB_DB || 'neyora')
  const orders = db.collection<{ reference?: string; idempotencyKey?: string }>('orders')
  const counters = db.collection<{ _id: string; value: number }>('counters')

  const counterBefore = (await counters.findOne({ _id: 'orderReference' }))?.value ?? null

  const matched = await orders
    .find(plan.filter, { projection: { _id: 0, reference: 1, idempotencyKey: 1 } })
    .toArray()

  // Refuses before anything is removed, so a surprise is survivable.
  assertMatchesPlan(plan, matched)

  for (const order of matched) console.log(`  deleting ${order.reference}`)
  const { deletedCount } = await orders.deleteMany(plan.filter)
  console.log(`deleted ${deletedCount} test order(s)`)

  const counterAfter = (await counters.findOne({ _id: 'orderReference' }))?.value ?? null
  assertCounterUntouched(counterBefore, counterAfter)
  console.log(`reference counter unchanged at ${counterAfter ?? 'absent'}`)
  console.log(`orders remaining: ${await orders.countDocuments()}`)
} catch (error) {
  if (error instanceof UnsafeCleanupError) {
    console.error(`REFUSED: ${error.message}`)
    process.exit(2)
  }
  throw error
} finally {
  await client.close()
}
