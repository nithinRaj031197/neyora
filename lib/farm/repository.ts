import 'server-only'
import { revalidatePath } from 'next/cache'
import {
  addTab,
  appendRows,
  batchUpdate,
  columnLetter,
  forceText,
  listTabs,
  normaliseCell,
  readRanges,
  readRange,
  safeText,
  updateRows,
  writeHeader,
  type Row,
} from '@/lib/google/sheets'
import { farmSheetId } from './config'
import {
  COLUMNS,
  HEADERS,
  TABS,
  bagId as makeBagId,
  batchPrefix,
  eventPrefix,
  nextSequence,
  allocationId,
  ID_PATTERNS,
  STAGE_TRANSITIONS,
  type BatchStage,
  type NewBatch,
  type NewContamination,
  type NewCost,
  type NewHarvest,
  type NewSale,
  type TabKey,
} from './schema'
import {
  parseBags,
  parseBatches,
  parseContamination,
  parseCosts,
  parseHarvests,
  parseSales,
  type BagRecord,
  type BatchRecord,
  type ContaminationRecord,
  type CostRecord,
  type DataIssue,
  type HarvestRecord,
  type SaleRecord,
} from './rows'

/**
 * Every read and write of the farm workbook.
 *
 * Google Sheets is the source of truth here, so this layer carries two
 * responsibilities the Orders projection never had: it must not lose a manual
 * edit, and it must not make the dashboard cost one API call per bag.
 */

export class FarmError extends Error {}

function sheetId(): string {
  const id = farmSheetId()
  if (!id) throw new FarmError('The farm spreadsheet is not configured')
  return id
}

/** Full data range for a tab: row 2 to the end, every declared column. */
const dataRange = (tab: TabKey) => ({
  tab: TABS[tab],
  a1: `A2:${columnLetter(HEADERS[tab].length)}`,
})

export interface FarmData {
  batches: BatchRecord[]
  bags: BagRecord[]
  harvests: HarvestRecord[]
  contamination: ContaminationRecord[]
  costs: CostRecord[]
  sales: SaleRecord[]
  /** Rows the parser could not trust. Surfaced, never silently dropped. */
  issues: DataIssue[]
}

/**
 * The whole workbook, in ONE request.
 *
 * `batchGet` fetches all six tabs together. Six separate reads would be six
 * round trips and six chances to be rate-limited, for a dashboard that needs
 * all of them anyway.
 *
 * Bags are the one tab that grows without bound — a hundred batches of eighty
 * bags is eight thousand rows — so callers that do not need bag identity can
 * skip it.
 */
export async function readFarm(options: { includeBags?: boolean } = {}): Promise<FarmData> {
  /*
   * The workbook is created on READ as well as on write.
   *
   * Without this, the very first visit to a freshly shared spreadsheet asks
   * for six tabs that do not exist yet, Sheets answers 400, and the admin is
   * told their data could not be reached — on a workbook that is in perfect
   * health and simply empty. The dashboard is where somebody lands first, so
   * it has to be the thing that makes the workbook real.
   *
   * Memoised per process, so this is one extra `listTabs` at startup rather
   * than a cost on every page load.
   */
  await ensureWorkbook()
  const id = sheetId()
  const tabs: TabKey[] = ['batches', 'harvests', 'contamination', 'costs', 'sales']
  if (options.includeBags) tabs.splice(1, 0, 'bags')

  const results = await readRanges(id, tabs.map(dataRange))
  const byTab = Object.fromEntries(tabs.map((tab, i) => [tab, results[i] ?? []])) as Record<
    TabKey,
    Row[]
  >

  const batches = parseBatches(byTab.batches ?? [])
  const bags = options.includeBags ? parseBags(byTab.bags ?? []) : { records: [], issues: [] }
  const harvests = parseHarvests(byTab.harvests ?? [])
  const contamination = parseContamination(byTab.contamination ?? [])
  const costs = parseCosts(byTab.costs ?? [])
  const sales = parseSales(byTab.sales ?? [])

  return {
    batches: batches.records,
    bags: bags.records,
    harvests: harvests.records,
    contamination: contamination.records,
    costs: costs.records,
    sales: sales.records,
    issues: [
      ...batches.issues,
      ...bags.issues,
      ...harvests.issues,
      ...contamination.issues,
      ...costs.issues,
      ...sales.issues,
    ],
  }
}

/** Bags for one batch only — the detail screen, not the dashboard. */
export async function readBagsFor(batchId: string): Promise<BagRecord[]> {
  await ensureWorkbook()
  const rows = await readRange(sheetId(), TABS.bags, dataRange('bags').a1)
  return parseBags(rows).records.filter((bag) => bag.batchId === batchId)
}

/** The trailing `B013` of a bag id, for rows whose number column is blank. */
function bagNumberFromId(id: string): number {
  const n = Number.parseInt(id.slice(id.lastIndexOf('-B') + 2), 10)
  return Number.isFinite(n) ? n : 0
}

/** One bag, as the contamination picker needs it. Nothing more travels. */
export interface PickerBag {
  bagId: string
  bagNumber: number
  /** Named in an earlier contamination event. Derived, never stored. */
  previouslyReported: boolean
}

/**
 * The bags of ONE batch, for the contamination picker.
 *
 * ── WHY THIS IS NOT PART OF THE DASHBOARD READ ────────────────────────────
 *
 * Bags are the only tab that grows without bound: a hundred batches of eighty
 * bags is eight thousand rows, and the dashboard would pay for all of them on
 * every load to populate a picker that is usually never opened. So the
 * dashboard skips the tab entirely and this runs only when the admin actually
 * chooses a batch and asks for its bags.
 *
 * Contamination comes along in the same `batchGet` because the picker has to
 * show which bags were already reported, and a second round trip for that
 * would double the wait on the one interaction that is blocking the admin.
 *
 * `previouslyReported` is DERIVED here and nowhere persisted. A "contaminated"
 * flag on the Bags tab would be a second mutable truth that disagrees with the
 * contamination events the moment anyone edits either by hand.
 */
export async function readBagsForPicker(batchId: string): Promise<PickerBag[]> {
  if (!ID_PATTERNS.batch.test(batchId)) throw new FarmError('That is not a batch id')

  await ensureWorkbook()
  const id = sheetId()
  const [bagRows, contaminationRows] = await readRanges(id, [
    dataRange('bags'),
    dataRange('contamination'),
  ])

  const reported = new Set<string>()
  for (const event of parseContamination(contaminationRows ?? []).records) {
    if (event.batchId !== batchId) continue
    for (const bag of event.bagIds) reported.add(bag)
  }

  return parseBags(bagRows ?? [])
    .records.filter((bag) => bag.batchId === batchId)
    .map((bag) => ({
      bagId: bag.bagId,
      /*
       * The Bag Number column can be blank — somebody cleared it, or pasted
       * rows without it. The number is recoverable from the id, which is the
       * identity and cannot be blank, so the bag stays pickable instead of
       * vanishing from the list at the moment it needs reporting.
       */
      bagNumber: bag.bagNumber ?? bagNumberFromId(bag.bagId),
      previouslyReported: reported.has(bag.bagId),
    }))
    .sort((a, b) => a.bagNumber - b.bagNumber)
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

let ready: Promise<void> | undefined

/**
 * Create any missing tab with its header and formatting, once per process.
 *
 * The admin never has to build the workbook by hand: they create an empty
 * spreadsheet, share it, and the first write makes it real.
 */
export async function ensureWorkbook(): Promise<void> {
  ready ??= (async () => {
    const id = sheetId()
    const existing = new Set((await listTabs(id)).map((t) => t.title))

    for (const key of Object.keys(TABS) as TabKey[]) {
      const title = TABS[key]
      if (existing.has(title)) continue

      const newSheetId = await addTab(id, title)
      await writeHeader(id, title, HEADERS[key])

      if (typeof newSheetId === 'number') {
        // Best-effort: a failure here is cosmetic and must not block a write.
        await batchUpdate(id, [
          {
            updateSheetProperties: {
              properties: { sheetId: newSheetId, gridProperties: { frozenRowCount: 1 } },
              fields: 'gridProperties.frozenRowCount',
            },
          },
          {
            repeatCell: {
              range: { sheetId: newSheetId, startRowIndex: 0, endRowIndex: 1 },
              cell: {
                userEnteredFormat: {
                  textFormat: { bold: true },
                  backgroundColor: { red: 0.906, green: 0.875, blue: 0.816 },
                },
              },
              fields: 'userEnteredFormat(textFormat,backgroundColor)',
            },
          },
          {
            setBasicFilter: {
              filter: {
                range: {
                  sheetId: newSheetId,
                  startRowIndex: 0,
                  startColumnIndex: 0,
                  endColumnIndex: HEADERS[key].length,
                },
              },
            },
          },
        ]).catch((error: unknown) => {
          console.error(`[farm] could not format ${title} (data is unaffected)`, error)
        })
      }
    }
  })().catch((error: unknown) => {
    // A failed setup must not be cached as done.
    ready = undefined
    throw error
  })

  return ready
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

const now = () => new Date().toISOString().slice(0, 16).replace('T', ' ')
const str = (v: unknown) => safeText(v === undefined || v === null ? '' : String(v))
const numOrBlank = (v: unknown) => (v === '' || v === undefined || v === null ? '' : Number(v))

/**
 * Create a batch and all of its bags.
 *
 * ── ONE WRITE PER TAB, NOT ONE PER BAG ───────────────────────────────────
 *
 * Eighty bags is eighty rows in a single append, not eighty API calls. A
 * per-bag request would take minutes and exhaust the rate limit.
 *
 * ── PARTIAL FAILURE ──────────────────────────────────────────────────────
 *
 * The batch row is written FIRST, then the bags. If the bag append fails, the
 * batch exists with no bags — which is visible, recoverable and honest: the
 * detail screen shows "0 of 80 bag records" and offers to generate the missing
 * ones, which is safe because bag IDs are deterministic from the batch ID and
 * bag number. The reverse order would leave orphan bags pointing at a batch
 * that does not exist, which nothing could clean up automatically.
 *
 * There is no transaction available here — the Sheets API has none — so the
 * design makes the surviving state the one that can be repaired.
 */
export async function createBatch(input: NewBatch): Promise<{ batchId: string; bagsWritten: number }> {
  await ensureWorkbook()
  const id = sheetId()

  const existing = await readRange(id, TABS.batches, 'A2:A')
  const existingIds = existing.map((r) => normaliseCell(r[0])).filter(Boolean)

  const prepared = new Date(`${input.preparedDate}T00:00:00Z`)
  const batchId = nextSequence(existingIds, batchPrefix(prepared))
  if (existingIds.includes(batchId)) throw new FarmError(`${batchId} already exists`)

  const timestamp = now()
  const c = COLUMNS.batches
  const batchRow: Row = Array.from({ length: HEADERS.batches.length }, () => '')
  batchRow[c['Batch ID']] = batchId
  batchRow[c.Label] = str(input.label)
  batchRow[c.Variety] = str(input.variety)
  batchRow[c.Stage] = 'Preparing'
  batchRow[c['Bag Count']] = input.bagCount
  batchRow[c['Prepared Date']] = forceText(input.preparedDate)
  batchRow[c['Inoculated Date']] = input.inoculatedDate ? forceText(input.inoculatedDate) : ''
  batchRow[c['Spawn Source']] = str(input.spawnSource)
  batchRow[c['Spawn Lot']] = str(input.spawnLot)
  batchRow[c['Spawn Used (g)']] = numOrBlank(input.spawnUsedGrams)
  batchRow[c['Substrate Type']] = str(input.substrateType)
  batchRow[c['Substrate per Bag (g)']] = numOrBlank(input.substratePerBagGrams)
  batchRow[c['Dry Substrate per Bag (g)']] = numOrBlank(input.drySubstratePerBagGrams)
  batchRow[c.Notes] = str(input.notes)
  batchRow[c['Created At']] = forceText(timestamp)
  batchRow[c['Updated At']] = forceText(timestamp)

  await appendRows(id, TABS.batches, [batchRow])

  let bagsWritten = 0
  try {
    const b = COLUMNS.bags
    const bagRows: Row[] = Array.from({ length: input.bagCount }, (_, i) => {
      const row: Row = Array.from({ length: HEADERS.bags.length }, () => '')
      row[b['Bag ID']] = makeBagId(batchId, i + 1)
      row[b['Batch ID']] = batchId
      row[b['Bag Number']] = i + 1
      row[b['Prepared Date']] = forceText(input.preparedDate)
      row[b['Substrate Weight (g)']] = numOrBlank(input.substratePerBagGrams)
      row[b['Spawn Weight (g)']] = ''
      row[b['Created At']] = forceText(timestamp)
      return row
    })
    await appendRows(id, TABS.bags, bagRows)
    bagsWritten = bagRows.length
  } catch (error) {
    // The batch survives; the bags can be regenerated. Reported, not hidden.
    console.error(`[farm] ${batchId} created but bag rows failed`, error)
  }

  revalidateFarm()
  return { batchId, bagsWritten }
}

/** Regenerate any bag rows missing for a batch. Safe to run repeatedly. */
export async function generateMissingBags(batchId: string): Promise<number> {
  const id = sheetId()
  const [batch] = (await readFarm()).batches.filter((b) => b.batchId === batchId)
  if (!batch) throw new FarmError(`${batchId} does not exist`)

  const existing = new Set((await readBagsFor(batchId)).map((bag) => bag.bagId))
  const b = COLUMNS.bags
  const timestamp = now()

  const missing: Row[] = []
  for (let i = 1; i <= batch.bagCount; i += 1) {
    const bag = makeBagId(batchId, i)
    if (existing.has(bag)) continue
    const row: Row = Array.from({ length: HEADERS.bags.length }, () => '')
    row[b['Bag ID']] = bag
    row[b['Batch ID']] = batchId
    row[b['Bag Number']] = i
    row[b['Prepared Date']] = batch.preparedDate ? forceText(batch.preparedDate) : ''
    row[b['Created At']] = forceText(timestamp)
    missing.push(row)
  }

  if (missing.length > 0) await appendRows(id, TABS.bags, missing)
  revalidateFarm()
  return missing.length
}

/**
 * Move a batch to its next stage.
 *
 * OPTIMISTIC CONCURRENCY. The sheet can be edited by hand at the same moment,
 * so the row's `Updated At` is re-read and compared with what the form loaded.
 * If it changed, the write is refused rather than overwriting whatever the
 * other editor just did — the one failure mode that loses somebody's work.
 */
export async function setBatchStage(
  batchId: string,
  to: BatchStage,
  expectedUpdatedAt: string | undefined,
): Promise<void> {
  const id = sheetId()
  const batch = (await readFarm()).batches.find((b) => b.batchId === batchId)
  if (!batch) throw new FarmError(`${batchId} does not exist`)

  if (normaliseCell(batch.updatedAt) !== normaliseCell(expectedUpdatedAt)) {
    throw new FarmError(
      `${batchId} was changed in the spreadsheet since you opened it. Reload and try again.`,
    )
  }
  if (!STAGE_TRANSITIONS[batch.stage].includes(to)) {
    throw new FarmError(`A ${batch.stage} batch cannot move to ${to}`)
  }

  const c = COLUMNS.batches
  const timestamp = now()
  const cells = await readRange(id, TABS.batches, `A${batch.rowNumber}:${columnLetter(HEADERS.batches.length)}${batch.rowNumber}`)

  /*
   * ── THE ROUND TRIP IS THE DANGEROUS PART ────────────────────────────────
   *
   * Changing the stage rewrites the WHOLE row, so every cell the admin typed
   * by hand is read out and written straight back. Reads come back raw and
   * writes go out as USER_ENTERED, which means a cell holding the literal text
   * `=SUM(B2:B9)` — perfectly harmless sitting in Notes — is re-sent as a
   * formula and becomes one. The admin's own note is the injection vector,
   * and the trigger is somebody else pressing "move to fruiting".
   *
   * Every carried-over string therefore goes back through the same escaping as
   * a freshly written one. `safeText` is idempotent, so a value that already
   * carries its leading apostrophe is left exactly as it is rather than
   * collecting another one on each stage change.
   */
  const row: Row = Array.from({ length: HEADERS.batches.length }, (_, i) => {
    const cell = cells[0]?.[i] ?? ''
    return (typeof cell === 'string' ? safeText(cell) : cell) as Row[number]
  })

  row[c.Stage] = to
  if (to === 'Fruiting' && !row[c['Fruiting Start']]) row[c['Fruiting Start']] = forceText(isoToday())
  if (to === 'Fruiting' && !row[c['Incubation End']]) row[c['Incubation End']] = forceText(isoToday())
  row[c['Updated At']] = forceText(timestamp)

  await updateRows(id, TABS.batches, [{ rowNumber: batch.rowNumber, row }])
  revalidateFarm()
}

const isoToday = () => new Date().toISOString().slice(0, 10)

/** Every event tab is append-only, with an ID derived from what is there. */
async function appendEvent(
  tab: TabKey,
  kind: 'HAR' | 'CON' | 'COST' | 'SALE',
  date: string,
  build: (eventId: string, timestamp: string) => Row[],
): Promise<string> {
  await ensureWorkbook()
  const id = sheetId()
  const existing = await readRange(id, TABS[tab], 'A2:A')
  const ids = existing.map((r) => normaliseCell(r[0])).filter(Boolean)
  const eventId = nextSequence(ids, eventPrefix(kind, new Date(`${date}T00:00:00Z`)))

  await appendRows(id, TABS[tab], build(eventId, now()))
  revalidateFarm()
  return eventId
}

/**
 * Prove every named bag really is one of this batch's bags.
 *
 * ── WHY A PREFIX CHECK IS NOT ENOUGH ──────────────────────────────────────
 *
 * The browser sends bag IDs, and a Server Function is reachable by direct
 * POST, so the list is attacker-controlled. `startsWith(batchId + '-B')` alone
 * accepts `BAT-202610-001-B999` against a batch of eighty — a bag that does
 * not exist, which would then be counted as contaminated for ever, pushing the
 * rate above what the bags can account for and quietly corrupting the one
 * number the farm uses to judge a substrate supplier.
 *
 * Three checks, cheapest first:
 *
 *   1. the ID is formed from THIS batch's id — rejects a bag belonging to
 *      another batch, which would otherwise shift blame between batches;
 *   2. its number is within 1..Bag Count — rejects invented bags using the
 *      Batches tab, which is authoritative even when bag rows are missing;
 *   3. if the batch has bag rows at all, the ID must be among them.
 *
 * Check 3 is conditional for a reason. Bag generation can fail after the batch
 * row is written, and `generateMissingBags` exists to repair that. Demanding a
 * bag row unconditionally would mean a half-written batch could not have
 * contamination reported against it — turning a cosmetic gap into a blocked
 * workflow at the moment the admin is standing in front of a mouldy bag.
 */
async function assertBagsBelongTo(batch: BatchRecord, bagIds: readonly string[]): Promise<void> {
  if (bagIds.length === 0) return

  // Re-checked here even though the schema refuses duplicates, because this is
  // the last line before a write and it must not depend on an earlier caller.
  if (new Set(bagIds).size !== bagIds.length) {
    throw new FarmError('The same bag is listed twice')
  }

  const prefix = `${batch.batchId}-B`
  for (const bag of bagIds) {
    if (!bag.startsWith(prefix)) {
      throw new FarmError(`${bag} does not belong to ${batch.batchId}`)
    }
    const number = Number.parseInt(bag.slice(prefix.length), 10)
    if (!Number.isFinite(number) || number < 1 || number > batch.bagCount) {
      throw new FarmError(`${bag} is not one of ${batch.batchId}'s ${batch.bagCount} bags`)
    }
  }

  const known = await readBagsFor(batch.batchId)
  if (known.length === 0) return
  const existing = new Set(known.map((bag) => bag.bagId))
  for (const bag of bagIds) {
    if (!existing.has(bag)) throw new FarmError(`${bag} is not recorded in the Bags tab`)
  }
}

async function requireBatch(batchId: string): Promise<BatchRecord> {
  const batch = (await readFarm()).batches.find((b) => b.batchId === batchId)
  // Cross-tab references are validated before the write: an event pointing at
  // a batch that does not exist is invisible in every report that joins them.
  if (!batch) throw new FarmError(`${batchId} does not exist`)
  return batch
}

export async function recordHarvest(input: NewHarvest): Promise<string> {
  await requireBatch(input.batchId)
  const c = COLUMNS.harvests
  return appendEvent('harvests', 'HAR', input.date, (harvestId, timestamp) => {
    const row: Row = Array.from({ length: HEADERS.harvests.length }, () => '')
    row[c['Harvest ID']] = harvestId
    row[c['Batch ID']] = input.batchId
    row[c.Date] = forceText(input.date)
    row[c.Flush] = input.flush
    row[c['Total (kg)']] = input.totalKg
    row[c['Saleable (kg)']] = input.saleableKg
    row[c['Secondary (kg)']] = input.secondaryKg
    row[c['Waste (kg)']] = input.wasteKg
    row[c.Notes] = str(input.notes)
    row[c['Created At']] = forceText(timestamp)
    row[c['Updated At']] = forceText(timestamp)
    return [row]
  })
}

export async function recordContamination(input: NewContamination): Promise<string> {
  const batch = await requireBatch(input.batchId)
  await assertBagsBelongTo(batch, input.bagIds)
  if (input.affectedCount > batch.bagCount) {
    throw new FarmError(`${input.batchId} only has ${batch.bagCount} bags`)
  }

  const c = COLUMNS.contamination
  return appendEvent('contamination', 'CON', input.detectedDate, (eventId, timestamp) => {
    const row: Row = Array.from({ length: HEADERS.contamination.length }, () => '')
    row[c['Contamination ID']] = eventId
    row[c['Batch ID']] = input.batchId
    row[c['Detected Date']] = forceText(input.detectedDate)
    row[c['Bag IDs']] = str(input.bagIds.join(', '))
    row[c['Affected Bags Count']] = input.bagIds.length > 0 ? '' : input.affectedCount
    row[c.Type] = input.type
    row[c.Severity] = input.severity
    row[c.Action] = input.action
    row[c['Estimated Loss (kg)']] = numOrBlank(input.estimatedLossKg)
    row[c.Notes] = str(input.notes)
    row[c['Created At']] = forceText(timestamp)
    row[c['Updated At']] = forceText(timestamp)
    return [row]
  })
}

export async function recordCost(input: NewCost): Promise<string> {
  await requireBatch(input.batchId)
  const c = COLUMNS.costs
  return appendEvent('costs', 'COST', input.date, (costId, timestamp) => {
    const row: Row = Array.from({ length: HEADERS.costs.length }, () => '')
    row[c['Cost ID']] = costId
    row[c['Batch ID']] = input.batchId
    row[c.Date] = forceText(input.date)
    row[c.Category] = input.category
    row[c['Cost Type']] = input.costType
    row[c.Description] = str(input.description)
    row[c.Quantity] = numOrBlank(input.quantity)
    row[c.Unit] = str(input.unit)
    row[c['Unit Cost (₹)']] = numOrBlank(input.unitCost)
    row[c['Total Cost (₹)']] = input.totalCost
    row[c.Notes] = str(input.notes)
    row[c['Created At']] = forceText(timestamp)
    row[c['Updated At']] = forceText(timestamp)
    return [row]
  })
}

/**
 * One sale, written as one row PER BATCH ALLOCATION.
 *
 * All rows share a `Sale ID` so the sale reads as one event; each carries its
 * own batch and share. Summing a batch's rows gives its revenue and never
 * another batch's, and summing every row gives total revenue exactly once.
 */
export async function recordSale(input: NewSale): Promise<string> {
  for (const allocation of input.allocations) await requireBatch(allocation.batchId)

  const c = COLUMNS.sales
  return appendEvent('sales', 'SALE', input.date, (saleId, timestamp) =>
    input.allocations.map((allocation, index) => {
      const row: Row = Array.from({ length: HEADERS.sales.length }, () => '')
      row[c['Allocation ID']] = allocationId(saleId, index)
      row[c['Sale ID']] = saleId
      row[c['Batch ID']] = allocation.batchId
      row[c.Date] = forceText(input.date)
      row[c.Variety] = str(input.variety)
      row[c['Quantity (kg)']] = allocation.quantityKg
      row[c['Unit Price (₹/kg)']] = allocation.unitPrice
      row[c['Revenue (₹)']] = Math.round(allocation.quantityKg * allocation.unitPrice * 100) / 100
      row[c.Channel] = input.channel
      row[c.Buyer] = str(input.buyer)
      row[c.Notes] = str(input.notes)
      row[c['Created At']] = forceText(timestamp)
      row[c['Updated At']] = forceText(timestamp)
      return row
    }),
  )
}

/**
 * Freshness.
 *
 * Every farm page is dynamic, so a write only needs the affected routes
 * revalidated — the admin must see their own harvest the moment they record
 * it, which is the whole reason there is no long-lived cache here.
 */
function revalidateFarm(): void {
  revalidatePath('/admin/farm')
  revalidatePath('/admin/farm/batches')
}

export function resetWorkbookCache(): void {
  ready = undefined
}
