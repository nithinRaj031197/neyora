import { beforeEach, describe, expect, it, vi } from 'vitest'

/*
 * THE GOOGLE LAYER IS MOCKED, NOT REACHED.
 *
 * Mocking `lib/google/sheets` rather than `fetch` means there is no code path
 * from this file to a real spreadsheet even if a credential happens to be in
 * the environment — these tests must never be able to write to the farm's
 * actual workbook.
 */
type Rows = unknown[][]
const readRanges = vi.fn<(id: string, ranges: { tab: string; a1: string }[]) => Promise<Rows[]>>()
const readRange = vi.fn<(id: string, tab: string, a1: string) => Promise<Rows>>()
const appendRows = vi.fn<(id: string, tab: string, rows: Rows) => Promise<void>>(async () => {})
const updateRows =
  vi.fn<(id: string, tab: string, updates: { rowNumber: number; row: unknown[] }[]) => Promise<void>>(
    async () => {},
  )

vi.mock('@/lib/google/sheets', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/google/sheets')>()
  return {
    ...actual,
    readRanges,
    readRange,
    appendRows,
    updateRows,
    listTabs: async () => Object.values(TAB_TITLES).map((title, i) => ({ title, sheetId: i })),
    addTab: async () => {},
    writeHeader: async () => {},
    batchUpdate: async () => {},
  }
})

const requireAdmin = vi.fn(async () => ({ email: 'shyni@neyora.in' }))
vi.mock('@/lib/auth/session', () => ({ requireAdmin: () => requireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: () => {} }))

const TAB_TITLES = {
  batches: 'Batches',
  bags: 'Bags',
  harvests: 'Harvests',
  contamination: 'Contamination',
  costs: 'Costs',
  sales: 'Sales',
}

const BATCH = 'BAT-202610-001'
const OTHER = 'BAT-202610-002'

/** A Batches row: id, label, variety, stage, bag count, prepared date. */
const batchRow = (id: string, bagCount: number, stage = 'Fruiting') => {
  const row = Array.from({ length: 18 }, () => '')
  row[0] = id
  row[2] = 'White Oyster'
  row[3] = stage
  row[4] = String(bagCount)
  row[5] = '2026-10-01'
  row[17] = '2026-10-01 09:00'
  return row
}

const bagRow = (batchId: string, n: number) => {
  const row = Array.from({ length: 7 }, () => '')
  row[0] = `${batchId}-B${String(n).padStart(3, '0')}`
  row[1] = batchId
  row[2] = String(n)
  return row
}

const contaminationRow = (id: string, batchId: string, bagIds: string[], count = '') => {
  const row = Array.from({ length: 12 }, () => '')
  row[0] = id
  row[1] = batchId
  row[2] = '2026-10-10'
  row[3] = bagIds.join(', ')
  row[4] = count
  row[5] = 'Green mold'
  row[6] = 'High'
  row[7] = 'Discarded'
  return row
}

/** Every tab, in the order `readFarm`/`readBagsForPicker` request them. */
function sheet({
  batches = [batchRow(BATCH, 80), batchRow(OTHER, 20)],
  bags = Array.from({ length: 80 }, (_, i) => bagRow(BATCH, i + 1)),
  contamination = [] as string[][],
} = {}) {
  readRanges.mockImplementation(async (_id, ranges) =>
    ranges.map((range) => {
      if (range.tab === 'Batches') return batches
      if (range.tab === 'Bags') return bags
      if (range.tab === 'Contamination') return contamination
      return []
    }),
  )
  readRange.mockImplementation(async (_id, tab) => {
    if (tab === 'Batches') return batches
    if (tab === 'Bags') return bags
    if (tab === 'Contamination') return contamination
    return []
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  requireAdmin.mockResolvedValue({ email: 'shyni@neyora.in' })
  process.env.FARM_GOOGLE_SHEETS_ID = 'farm-sheet-test'
  process.env.GOOGLE_SHEETS_ID = 'orders-sheet-test'
  sheet()
})

// ---------------------------------------------------------------------------

describe('on-demand bags for one batch', () => {
  it('returns only the chosen batch, compactly', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    sheet({
      bags: [...Array.from({ length: 3 }, (_, i) => bagRow(BATCH, i + 1)), bagRow(OTHER, 1)],
    })

    const bags = await readBagsForPicker(BATCH)
    expect(bags).toEqual([
      { bagId: `${BATCH}-B001`, bagNumber: 1, previouslyReported: false },
      { bagId: `${BATCH}-B002`, bagNumber: 2, previouslyReported: false },
      { bagId: `${BATCH}-B003`, bagNumber: 3, previouslyReported: false },
    ])
    // Nothing beyond what the picker draws crosses the boundary.
    expect(Object.keys(bags[0]!)).toEqual(['bagId', 'bagNumber', 'previouslyReported'])
  })

  it('reads bags and contamination in ONE request, and never the other tabs', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    await readBagsForPicker(BATCH)

    expect(readRanges).toHaveBeenCalledTimes(1)
    const ranges = readRanges.mock.calls[0]![1]
    expect(ranges.map((r) => r.tab)).toEqual(['Bags', 'Contamination'])
  })

  it('handles a batch of 120 bags in order', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    sheet({
      batches: [batchRow(BATCH, 120)],
      // Deliberately shuffled: the sheet may be sorted any way at all.
      bags: Array.from({ length: 120 }, (_, i) => bagRow(BATCH, i + 1)).reverse(),
    })

    const bags = await readBagsForPicker(BATCH)
    expect(bags).toHaveLength(120)
    expect(bags[0]!.bagId).toBe(`${BATCH}-B001`)
    expect(bags[119]!.bagId).toBe(`${BATCH}-B120`)
    expect(bags.map((b) => b.bagNumber)).toEqual([...bags.map((b) => b.bagNumber)].sort((a, b) => a - b))
  })

  it('keeps a bag whose Bag Number column was cleared by hand', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    const blanked = bagRow(BATCH, 7)
    blanked[2] = ''
    sheet({ bags: [blanked] })

    // The number is recoverable from the id, so the bag stays pickable.
    expect(await readBagsForPicker(BATCH)).toEqual([
      { bagId: `${BATCH}-B007`, bagNumber: 7, previouslyReported: false },
    ])
  })

  it('rejects a batch id that is not one', async () => {
    const { readBagsForPicker, FarmError } = await import('@/lib/farm/repository')
    await expect(readBagsForPicker('../../etc/passwd')).rejects.toThrow(FarmError)
    expect(readRanges).not.toHaveBeenCalled()
  })
})

describe('previously reported bags', () => {
  it('marks a bag named in an earlier event, and only that bag', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    sheet({
      bags: Array.from({ length: 4 }, (_, i) => bagRow(BATCH, i + 1)),
      contamination: [contaminationRow('CON-20261010-001', BATCH, [`${BATCH}-B002`])],
    })

    const bags = await readBagsForPicker(BATCH)
    expect(bags.filter((b) => b.previouslyReported).map((b) => b.bagId)).toEqual([`${BATCH}-B002`])
  })

  it('does not carry a mark across batches', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    sheet({
      bags: [bagRow(BATCH, 1)],
      // Same bag NUMBER, different batch. Nothing should be marked.
      contamination: [contaminationRow('CON-20261010-001', OTHER, [`${OTHER}-B001`])],
    })
    expect((await readBagsForPicker(BATCH))[0]!.previouslyReported).toBe(false)
  })

  it('ignores count-only events, which name no bag', async () => {
    const { readBagsForPicker } = await import('@/lib/farm/repository')
    sheet({
      bags: [bagRow(BATCH, 1)],
      contamination: [contaminationRow('CON-20261010-001', BATCH, [], '5')],
    })
    expect((await readBagsForPicker(BATCH))[0]!.previouslyReported).toBe(false)
  })
})

describe('loadBagsAction', () => {
  it('refuses an unauthenticated caller before touching Google', async () => {
    const { loadBagsAction } = await import('@/lib/farm/actions')
    requireAdmin.mockRejectedValueOnce(new Error('no session'))

    expect(await loadBagsAction(BATCH)).toEqual({
      status: 'error',
      message: 'Your session has expired. Please sign in again.',
    })
    expect(readRanges).not.toHaveBeenCalled()
  })

  it('rejects a malformed batch id before touching Google', async () => {
    const { loadBagsAction } = await import('@/lib/farm/actions')
    expect(await loadBagsAction('not-a-batch')).toEqual({
      status: 'error',
      message: 'That is not a batch id.',
    })
    expect(readRanges).not.toHaveBeenCalled()
  })

  it('returns an empty list for a batch with no bag rows', async () => {
    const { loadBagsAction } = await import('@/lib/farm/actions')
    sheet({ bags: [] })
    expect(await loadBagsAction(BATCH)).toEqual({ status: 'ok', bags: [] })
  })

  it('reports a Google failure as something the admin can retry', async () => {
    const { loadBagsAction } = await import('@/lib/farm/actions')
    readRanges.mockRejectedValueOnce(new Error('Sheets 503: backend error'))

    const result = await loadBagsAction(BATCH)
    expect(result.status).toBe('error')
    // The provider's own words never reach the screen.
    expect(result).toEqual({ status: 'error', message: 'Could not reach the spreadsheet. Try again.' })
  })
})

// ---------------------------------------------------------------------------

describe('recording contamination against named bags', () => {
  const base = {
    batchId: BATCH,
    detectedDate: '2026-10-15',
    type: 'Green mold' as const,
    severity: 'High' as const,
    action: 'Discarded' as const,
  }

  const write = async (over: Record<string, unknown>) => {
    const { recordContamination } = await import('@/lib/farm/repository')
    const { newContaminationSchema } = await import('@/lib/farm/schema')
    return recordContamination(newContaminationSchema.parse({ ...base, ...over }))
  }

  it('writes the exact bag ids as one event', async () => {
    const bagIds = [`${BATCH}-B013`, `${BATCH}-B018`, `${BATCH}-B026`]
    await write({ bagIds })

    expect(appendRows).toHaveBeenCalledTimes(1)
    const rows = appendRows.mock.calls[0]![2]
    expect(rows).toHaveLength(1)
    expect(rows[0]![3]).toBe(bagIds.join(', '))
    // Count stays blank, so no denominator can read both.
    expect(rows[0]![4]).toBe('')
  })

  it('writes a count with no bag ids in count-only mode', async () => {
    await write({ affectedCount: 5 })
    const rows = appendRows.mock.calls[0]![2]
    expect(rows[0]![3]).toBe('')
    expect(rows[0]![4]).toBe(5)
  })

  it('rejects exact ids and a count together', async () => {
    const { newContaminationSchema } = await import('@/lib/farm/schema')
    const parsed = newContaminationSchema.safeParse({
      ...base,
      bagIds: [`${BATCH}-B013`],
      affectedCount: 3,
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toMatch(/either the specific bags or a count/)
  })

  it('rejects the same bag listed twice in one event', async () => {
    const { newContaminationSchema } = await import('@/lib/farm/schema')
    const parsed = newContaminationSchema.safeParse({
      ...base,
      bagIds: [`${BATCH}-B013`, `${BATCH}-B013`],
    })
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.message).toMatch(/listed twice/)
  })

  it('rejects a bag belonging to another batch', async () => {
    const { FarmError } = await import('@/lib/farm/repository')
    await expect(write({ bagIds: [`${OTHER}-B001`] })).rejects.toThrow(FarmError)
    expect(appendRows).not.toHaveBeenCalled()
  })

  it('rejects a bag number beyond the batch size', async () => {
    // 80 bags prepared; B999 is not one of them however well-formed it looks.
    await expect(write({ bagIds: [`${BATCH}-B999`] })).rejects.toThrow(/not one of/)
    expect(appendRows).not.toHaveBeenCalled()
  })

  it('rejects a well-numbered bag with no row in the Bags tab', async () => {
    sheet({ bags: [bagRow(BATCH, 1), bagRow(BATCH, 2)] })
    await expect(write({ bagIds: [`${BATCH}-B003`] })).rejects.toThrow(/not recorded in the Bags tab/)
  })

  it('still accepts a named bag when bag generation never ran', async () => {
    /*
     * Bag rows can fail to write after the batch row succeeds. The repair path
     * exists for that, and an admin standing in front of a mouldy bag must not
     * be blocked by it — the Batches tab still bounds what is plausible.
     */
    sheet({ bags: [] })
    await expect(write({ bagIds: [`${BATCH}-B013`] })).resolves.toMatch(/^CON-/)
  })

  it('rejects an event against a batch that does not exist', async () => {
    await expect(write({ batchId: 'BAT-209901-009', bagIds: [] , affectedCount: 1 })).rejects.toThrow(
      /does not exist/,
    )
  })

  it('rejects a count larger than the batch', async () => {
    await expect(write({ affectedCount: 500 })).rejects.toThrow(/only has 80 bags/)
  })
})

describe('contamination analytics after the picker change', () => {
  it('counts a bag named in two events once', async () => {
    const { bagHealth } = await import('@/lib/farm/analytics')
    const { parseBatches, parseContamination } = await import('@/lib/farm/rows')

    const batch = parseBatches([batchRow(BATCH, 100)]).records[0]!
    const events = parseContamination([
      contaminationRow('CON-20261010-001', BATCH, [`${BATCH}-B013`, `${BATCH}-B018`]),
      contaminationRow('CON-20261012-001', BATCH, [`${BATCH}-B013`, `${BATCH}-B026`]),
    ]).records

    const health = bagHealth(batch, events)
    // B013, B018, B026 — three, not four.
    expect(health.identifiedAffected).toBe(3)
    expect(health.affected).toBe(3)
    expect(health.contaminationRate).toBeCloseTo(3)
  })

  it('adds anonymous counts to identified bags and caps at the batch size', async () => {
    const { bagHealth } = await import('@/lib/farm/analytics')
    const { parseBatches, parseContamination } = await import('@/lib/farm/rows')

    const batch = parseBatches([batchRow(BATCH, 10)]).records[0]!
    const events = parseContamination([
      contaminationRow('CON-20261010-001', BATCH, [`${BATCH}-B001`, `${BATCH}-B002`]),
      contaminationRow('CON-20261012-001', BATCH, [], '20'),
    ]).records

    const health = bagHealth(batch, events)
    expect(health.identifiedAffected).toBe(2)
    expect(health.anonymousAffected).toBe(20)
    // Contamination can never exceed the bags that were prepared.
    expect(health.affected).toBe(10)
    expect(health.contaminationRate).toBe(100)
    expect(health.remaining).toBe(0)
  })
})

describe('changing stage does not turn a hand-typed note into a formula', () => {
  it('re-escapes every cell it carries over', async () => {
    const { setBatchStage } = await import('@/lib/farm/repository')

    /*
     * A stage change rewrites the WHOLE row, so the admin's own Notes cell is
     * read out and written back. Reads are raw and writes are USER_ENTERED, so
     * without escaping, text that merely LOOKS like a formula becomes one — and
     * the trigger is somebody else pressing "move to fruiting".
     */
    const row = batchRow(BATCH, 80, 'Incubating')
    row[15] = '=HYPERLINK("http://evil.test","ok")'
    row[1] = '+1 rack by the door'
    sheet({ batches: [row] })

    await setBatchStage(BATCH, 'Fruiting', '2026-10-01 09:00')

    const written = updateRows.mock.calls[0]![2][0]!.row
    expect(written[15]).toBe("'=HYPERLINK(\"http://evil.test\",\"ok\")")
    expect(written[1]).toBe("'+1 rack by the door")
    expect(written[3]).toBe('Fruiting')
  })

  it('does not accumulate apostrophes over repeated stage changes', async () => {
    const { setBatchStage } = await import('@/lib/farm/repository')
    const row = batchRow(BATCH, 80, 'Incubating')
    row[15] = "'=1+1"
    sheet({ batches: [row] })

    await setBatchStage(BATCH, 'Fruiting', '2026-10-01 09:00')
    const written = updateRows.mock.calls[0]![2][0]!.row
    expect(written[15]).toBe("'=1+1")
  })

  it('refuses the write when the sheet moved underneath the form', async () => {
    const { setBatchStage, FarmError } = await import('@/lib/farm/repository')
    sheet({ batches: [batchRow(BATCH, 80, 'Incubating')] })

    await expect(setBatchStage(BATCH, 'Fruiting', '2026-09-30 08:00')).rejects.toThrow(FarmError)
    expect(updateRows).not.toHaveBeenCalled()
  })
})
