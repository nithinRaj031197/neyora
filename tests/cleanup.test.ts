import { describe, expect, it } from 'vitest'
import {
  assertCounterUntouched,
  assertMatchesPlan,
  isTestKey,
  mintTestKey,
  planCleanup,
  sheetRowsToRemove,
  TEST_KEY_PREFIX,
  UnsafeCleanupError,
} from '@/scripts/lib/test-cleanup.ts'

/*
 * These exist because of a near miss.
 *
 * A live regression test placed a real order, then cleaned up after itself with
 * an ad-hoc `deleteMany`. That particular call was guarded, but the shape of it
 * — a filter written fresh each time, next to the thing it was deleting — is
 * how a test ends up removing a customer's order. The guard now lives in one
 * place, and these are the cases it must refuse.
 */

const realOrder = { reference: 'NEY-0007', idempotencyKey: '0b9c1f2e-4d3a-4a7b-9f1c-2e5d6a8b3c4f' }

describe('minting test keys', () => {
  it('carries a prefix no browser-generated key can collide with', () => {
    const key = mintTestKey('orders regression')
    expect(key.startsWith(TEST_KEY_PREFIX)).toBe(true)
    expect(isTestKey(key)).toBe(true)
    // A UUID is hex and hyphens; the prefix contains a colon, so the two
    // namespaces cannot meet however many orders are placed.
    expect(isTestKey(realOrder.idempotencyKey)).toBe(false)
  })

  it('refuses a label that says nothing about the test', () => {
    expect(() => mintTestKey('   ')).toThrow(UnsafeCleanupError)
  })
})

describe('cleanup cannot touch unrelated production orders', () => {
  it('refuses a key it did not mint', () => {
    expect(() => planCleanup([realOrder.idempotencyKey])).toThrow(UnsafeCleanupError)
  })

  it('refuses an empty key list rather than treating it as a no-op', () => {
    expect(() => planCleanup([])).toThrow(/recorded no idempotency keys/)
  })

  it('builds a filter keyed on the idempotency key alone', () => {
    const key = mintTestKey('live')
    const plan = planCleanup([key])
    // Nothing broad can be smuggled in: no status, no date window, no regex.
    expect(plan.filter).toEqual({ idempotencyKey: { $in: [key] } })
    expect(Object.keys(plan.filter)).toEqual(['idempotencyKey'])
  })

  it('refuses when the filter matched a real order as well', () => {
    const key = mintTestKey('live')
    const plan = planCleanup([key])
    expect(() =>
      assertMatchesPlan(plan, [{ reference: 'NEY-0100', idempotencyKey: key }, realOrder]),
    ).toThrow(/not one this test minted/)
  })

  it('refuses when more documents matched than the test created', () => {
    const [a, b] = [mintTestKey('a'), mintTestKey('b')]
    const plan = planCleanup([a])
    expect(() =>
      assertMatchesPlan(plan, [
        { reference: 'NEY-0101', idempotencyKey: a },
        { reference: 'NEY-0102', idempotencyKey: b },
      ]),
    ).toThrow(/not one this test minted/)
  })

  it('refuses when fewer matched than expected, rather than passing quietly', () => {
    const [a, b] = [mintTestKey('a'), mintTestKey('b')]
    const plan = planCleanup([a, b])
    expect(() => assertMatchesPlan(plan, [{ reference: 'NEY-0103', idempotencyKey: a }])).toThrow(
      /exactly 2 test order\(s\) but matched 1/,
    )
  })

  it('refuses a duplicated key, which would make the expected count wrong', () => {
    const key = mintTestKey('dup')
    expect(() => planCleanup([key, key])).toThrow(/listed twice/)
  })

  it('accepts the exact orders the test created', () => {
    const [a, b] = [mintTestKey('a'), mintTestKey('b')]
    const plan = planCleanup([a, b])
    expect(() =>
      assertMatchesPlan(plan, [
        { reference: 'NEY-0104', idempotencyKey: a },
        { reference: 'NEY-0105', idempotencyKey: b },
      ]),
    ).not.toThrow()
  })
})

describe('cleanup cannot reset a counter that issued real references', () => {
  it('refuses a counter that was rewound', () => {
    expect(() => assertCounterUntouched(7, null)).toThrow(/must never be reissued/)
    expect(() => assertCounterUntouched(7, 0)).toThrow(UnsafeCleanupError)
  })

  it('refuses a counter that moved at all, in either direction', () => {
    expect(() => assertCounterUntouched(7, 8)).toThrow(UnsafeCleanupError)
  })

  it('passes when cleanup left the counter alone', () => {
    expect(() => assertCounterUntouched(7, 7)).not.toThrow()
    expect(() => assertCounterUntouched(null, null)).not.toThrow()
  })
})

describe('cleanup cannot clear the Orders sheet', () => {
  const rows = [
    { reference: 'NEY-0001' },
    { reference: 'NEY-0002' },
    { reference: 'NEY-0003' },
  ]

  it('removes only the rows belonging to orders the test deleted', () => {
    expect(sheetRowsToRemove(rows, ['NEY-0002'])).toEqual([1])
  })

  it('removes nothing when the test deleted nothing', () => {
    expect(sheetRowsToRemove(rows, [])).toEqual([])
  })

  it('never selects a historical row the test did not write', () => {
    // The Sheet may hold rows for orders long gone from MongoDB. They survive.
    expect(sheetRowsToRemove(rows, ['NEY-0009'])).toEqual([])
  })
})
