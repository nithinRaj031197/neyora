import { z } from 'zod'

/**
 * The NEYORA farm workbook.
 *
 * ── GOOGLE SHEETS IS THE SOURCE OF TRUTH HERE ────────────────────────────
 *
 * The opposite of the ecommerce Orders tab, which is a projection of MongoDB.
 * Farm data lives only in the spreadsheet: the admin portal is an operational
 * UI over it, and nothing is copied into a database. That makes two things
 * non-negotiable — the sheet must stay readable and editable by hand, and
 * every write must assume a human may have changed the row first.
 *
 * ── ONE SOURCE PER FACT ──────────────────────────────────────────────────
 *
 *   Batches        lifecycle and stage
 *   Bags           identity and traceability — never mutable health
 *   Contamination  bag health and loss
 *   Harvests       production
 *   Costs          spend
 *   Sales          revenue
 *
 * Nothing derived is stored. There is no "Total Harvest" column on Batches to
 * drift out of step with the Harvests tab; totals are computed in
 * lib/farm/analytics.ts and nowhere else, so profit cannot mean two different
 * things on two different screens.
 */

// ---------------------------------------------------------------------------
// Varieties and lifecycle
// ---------------------------------------------------------------------------

/**
 * Open by design. A batch records whatever variety it grew, and the two NEYORA
 * sells today are suggestions in the UI rather than a closed enum — a trial of
 * pink oyster should not need a code change.
 */
export const KNOWN_VARIETIES = ['White Oyster', 'Grey Oyster'] as const

/**
 * The batch lifecycle. Owned by the BATCH, not by individual bags.
 *
 * Bags do not move to fruiting one at a time — the whole batch does, on one
 * day, as one act. Storing a stage per bag would be a second mutable truth
 * that nobody maintains and that silently disagrees with the batch.
 */
export const BATCH_STAGES = [
  'Preparing',
  'Incubating',
  'Fruiting',
  'Harvesting',
  'Completed',
  'Discarded',
] as const
export type BatchStage = (typeof BATCH_STAGES)[number]

/** Forward only, plus Discarded from anywhere still live. */
export const STAGE_TRANSITIONS: Record<BatchStage, readonly BatchStage[]> = {
  Preparing: ['Incubating', 'Discarded'],
  Incubating: ['Fruiting', 'Discarded'],
  Fruiting: ['Harvesting', 'Discarded'],
  Harvesting: ['Completed', 'Discarded'],
  Completed: [],
  Discarded: [],
}

export const isBatchActive = (stage: BatchStage) => stage !== 'Completed' && stage !== 'Discarded'

export const CONTAMINATION_TYPES = [
  'Green mold',
  'Black mold',
  'Bacterial',
  'Unknown',
  'Other',
] as const
export const CONTAMINATION_SEVERITIES = ['Low', 'Medium', 'High'] as const
export const CONTAMINATION_ACTIONS = ['Isolated', 'Observed', 'Discarded'] as const

export const COST_CATEGORIES = [
  'Spawn',
  'Substrate/Pellets',
  'Grow Bags',
  'Labour',
  'Electricity',
  'Water',
  'Cleaning/Sanitation',
  'Packaging',
  'Transport',
  'Equipment Allocation',
  'Other',
] as const

/**
 * Direct costs belong to one batch outright — spawn, pellets, the bags.
 * Allocated costs are a share of something shared, like a month of electricity
 * split across the batches running that month. Recording which is which now
 * means a real allocation model can arrive later without re-entering history.
 */
export const COST_TYPES = ['Direct', 'Allocated'] as const

export const SALES_CHANNELS = [
  'Website',
  'Direct',
  'Retail',
  'Restaurant',
  'Wholesale',
  'Other',
] as const

// ---------------------------------------------------------------------------
// Tab definitions — the exact column order written to the spreadsheet
// ---------------------------------------------------------------------------

export const TABS = {
  batches: 'Batches',
  bags: 'Bags',
  harvests: 'Harvests',
  contamination: 'Contamination',
  costs: 'Costs',
  sales: 'Sales',
} as const
export type TabKey = keyof typeof TABS

export const HEADERS = {
  batches: [
    'Batch ID', 'Label', 'Variety', 'Stage', 'Bag Count',
    'Prepared Date', 'Inoculated Date', 'Incubation End', 'Fruiting Start',
    'Spawn Source', 'Spawn Lot', 'Spawn Used (g)',
    'Substrate Type', 'Substrate per Bag (g)', 'Dry Substrate per Bag (g)',
    'Notes', 'Created At', 'Updated At',
  ],
  bags: [
    'Bag ID', 'Batch ID', 'Bag Number', 'Prepared Date',
    'Substrate Weight (g)', 'Spawn Weight (g)', 'Created At',
  ],
  harvests: [
    'Harvest ID', 'Batch ID', 'Date', 'Flush',
    'Total (kg)', 'Saleable (kg)', 'Secondary (kg)', 'Waste (kg)',
    'Notes', 'Created At', 'Updated At',
  ],
  contamination: [
    'Contamination ID', 'Batch ID', 'Detected Date',
    'Bag IDs', 'Affected Bags Count',
    'Type', 'Severity', 'Action', 'Estimated Loss (kg)',
    'Notes', 'Created At', 'Updated At',
  ],
  costs: [
    'Cost ID', 'Batch ID', 'Date', 'Category', 'Cost Type', 'Description',
    'Quantity', 'Unit', 'Unit Cost (₹)', 'Total Cost (₹)',
    'Notes', 'Created At', 'Updated At',
  ],
  sales: [
    'Allocation ID', 'Sale ID', 'Batch ID', 'Date', 'Variety',
    'Quantity (kg)', 'Unit Price (₹/kg)', 'Revenue (₹)',
    'Channel', 'Buyer', 'Notes', 'Created At', 'Updated At',
  ],
} as const satisfies Record<TabKey, readonly string[]>

/** Column index by header name, derived so a reorder cannot misalign a write. */
export const COLUMNS = Object.fromEntries(
  (Object.keys(HEADERS) as TabKey[]).map((key) => [
    key,
    Object.fromEntries(HEADERS[key].map((header, index) => [header, index])),
  ]),
) as { [K in TabKey]: Record<(typeof HEADERS)[K][number], number> }

// ---------------------------------------------------------------------------
// Identifiers
// ---------------------------------------------------------------------------

/**
 * Stable IDs, never row numbers.
 *
 * A spreadsheet row moves the moment somebody sorts a column, so a row index
 * is not an identity. Every cross-tab reference is by ID, and every ID carries
 * the date it was created, which makes the sheet readable without a join.
 *
 *   BAT-202610-001            batch, by month
 *   BAT-202610-001-B001       bag, inside its batch
 *   HAR-20261015-001          harvest event, by day
 *   CON-20261015-001          contamination event
 *   COST-20261015-001         cost line
 *   SALE-20261015-001         a sale
 *   SALE-20261015-001-A1      one batch's allocation of that sale
 */
export const ID_PATTERNS = {
  batch: /^BAT-\d{6}-\d{3}$/,
  bag: /^BAT-\d{6}-\d{3}-B\d{3,4}$/,
  harvest: /^HAR-\d{8}-\d{3}$/,
  contamination: /^CON-\d{8}-\d{3}$/,
  cost: /^COST-\d{8}-\d{3}$/,
  sale: /^SALE-\d{8}-\d{3}$/,
  allocation: /^SALE-\d{8}-\d{3}-A\d{1,2}$/,
} as const

export const bagId = (batchId: string, bagNumber: number) =>
  `${batchId}-B${String(bagNumber).padStart(3, '0')}`

export const allocationId = (saleId: string, index: number) => `${saleId}-A${index + 1}`

/** `BAT-202610-` — the prefix a new batch number is appended to. */
export const batchPrefix = (date: Date) =>
  `BAT-${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}-`

export const eventPrefix = (kind: 'HAR' | 'CON' | 'COST' | 'SALE', date: Date) => {
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${kind}-${y}${m}${d}-`
}

/**
 * Next free sequence for a prefix, from the IDs already present.
 *
 * ── KNOWN LIMITATION: NOT ATOMIC ──────────────────────────────────────────
 *
 * The id is derived by reading what is in the tab and adding one. Google
 * Sheets has no uniqueness constraint and no atomic counter, so two admins
 * who press "create batch" within the same second can both read the same rows
 * and both compute BAT-202610-004. Both rows then append, and the workbook
 * holds two batches with one id — which every cross-tab join would mix
 * together.
 *
 * This is ACCEPTED at NEYORA's current scale, deliberately. The farm is run by
 * two people who are rarely both entering data, let alone in the same second,
 * and the alternatives all cost more than the risk: a lock document in the
 * sheet adds a read and a write to every create and can strand a lock when a
 * request dies; MongoDB would reintroduce the database this module exists
 * without.
 *
 * What IS in place: the write path re-reads existing ids and refuses a
 * collision it can see (`createBatch`), and the ids themselves are
 * human-readable, so a duplicate is visible in the sheet rather than silent.
 * Neither closes the race — they narrow it and make it recoverable.
 *
 * FUTURE HARDENING, if more than a couple of people ever enter data at once:
 * make id generation atomic — a lock row claimed with a conditional write, or
 * a dedicated counter tab — before adding any other concurrency feature.
 */
export function nextSequence(existing: readonly string[], prefix: string, width = 3): string {
  let highest = 0
  for (const id of existing) {
    if (!id.startsWith(prefix)) continue
    const tail = id.slice(prefix.length).split('-')[0]
    const n = Number.parseInt(tail ?? '', 10)
    if (Number.isFinite(n) && n > highest) highest = n
  }
  return `${prefix}${String(highest + 1).padStart(width, '0')}`
}

// ---------------------------------------------------------------------------
// Validation — every write goes through these
// ---------------------------------------------------------------------------

/** A date as `YYYY-MM-DD`. Year-first sorts correctly as text and cannot be
 *  misread as month-first by a reader or by Sheets itself. */
const isoDate = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date in YYYY-MM-DD form')

const optionalDate = z.union([isoDate, z.literal('')]).optional()
const kg = z.coerce.number().min(0, 'Cannot be negative').max(10_000)
const grams = z.coerce.number().min(0).max(1_000_000)
const rupees = z.coerce.number().min(0, 'Cannot be negative').max(10_000_000)

export const newBatchSchema = z.object({
  label: z.string().trim().max(80).optional(),
  variety: z.string().trim().min(2, 'Which variety is this batch?').max(60),
  bagCount: z.coerce
    .number()
    .int()
    .min(1, 'A batch needs at least one bag')
    // Not an arbitrary ceiling: beyond this, one batch is really several, and
    // the bag generation below would be a very large single write.
    .max(2000, 'Split anything larger into separate batches'),
  preparedDate: isoDate,
  inoculatedDate: optionalDate,
  spawnSource: z.string().trim().max(120).optional(),
  spawnLot: z.string().trim().max(80).optional(),
  spawnUsedGrams: z.union([grams, z.literal('')]).optional(),
  substrateType: z.string().trim().max(120).optional(),
  substratePerBagGrams: z.union([grams, z.literal('')]).optional(),
  /**
   * Dry weight, and only dry weight.
   *
   * Biological efficiency is fresh mushroom weight over DRY substrate weight.
   * Computing it from wet substrate gives a number three to four times too
   * low, which looks like a catastrophically failing farm. If this is blank
   * the analytics layer reports "not enough data" rather than guessing.
   */
  drySubstratePerBagGrams: z.union([grams, z.literal('')]).optional(),
  notes: z.string().trim().max(500).optional(),
})

export const newHarvestSchema = z
  .object({
    batchId: z.string().trim().regex(ID_PATTERNS.batch, 'Choose a batch'),
    date: isoDate,
    flush: z.coerce.number().int().min(1, 'Flush starts at 1').max(10),
    totalKg: kg.refine((v) => v > 0, 'Record a harvest weight'),
    saleableKg: kg,
    secondaryKg: kg,
    wasteKg: kg,
    notes: z.string().trim().max(500).optional(),
  })
  /*
   * The grades are a breakdown OF the total, not additions to it. Allowing
   * them to exceed it would silently inflate saleable yield, which is the
   * number every downstream economic metric divides by.
   */
  .refine((v) => v.saleableKg + v.secondaryKg + v.wasteKg <= v.totalKg + 0.001, {
    message: 'Saleable, secondary and waste cannot add up to more than the total harvest',
    path: ['saleableKg'],
  })

export const newContaminationSchema = z
  .object({
    batchId: z.string().trim().regex(ID_PATTERNS.batch, 'Choose a batch'),
    detectedDate: isoDate,
    /** Known bag identities, when they were recorded. */
    bagIds: z.array(z.string().trim().regex(ID_PATTERNS.bag)).default([]),
    /** Used ONLY when no bag identities are given. See analytics for why. */
    affectedCount: z.coerce.number().int().min(0).max(2000).default(0),
    type: z.enum(CONTAMINATION_TYPES),
    severity: z.enum(CONTAMINATION_SEVERITIES),
    action: z.enum(CONTAMINATION_ACTIONS),
    estimatedLossKg: z.union([kg, z.literal('')]).optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.bagIds.length > 0 || v.affectedCount > 0, {
    message: 'Select the affected bags, or give a count',
    path: ['affectedCount'],
  })
  /*
   * Never both. An event with three named bags AND a count of three would be
   * counted twice by any denominator that trusted both fields — so the shape
   * makes that impossible rather than asking the analytics to guess.
   */
  .refine((v) => v.bagIds.length === 0 || v.affectedCount === 0, {
    message: 'Give either the specific bags or a count, not both',
    path: ['affectedCount'],
  })
  /*
   * No bag named twice in one event.
   *
   * The analytics de-duplicate across events, because the same bag genuinely
   * can be observed twice on different days. Within ONE event a repeat is not
   * an observation, it is a mistake — and it would be written to the sheet as
   * "B013, B013", which reads to a human as two bags.
   */
  .refine((v) => new Set(v.bagIds).size === v.bagIds.length, {
    message: 'The same bag is listed twice',
    path: ['bagIds'],
  })

export const newCostSchema = z.object({
  batchId: z.string().trim().regex(ID_PATTERNS.batch, 'Choose a batch'),
  date: isoDate,
  category: z.enum(COST_CATEGORIES),
  costType: z.enum(COST_TYPES).default('Direct'),
  description: z.string().trim().max(200).optional(),
  quantity: z.union([z.coerce.number().min(0), z.literal('')]).optional(),
  unit: z.string().trim().max(20).optional(),
  unitCost: z.union([rupees, z.literal('')]).optional(),
  totalCost: rupees.refine((v) => v > 0, 'Enter the amount'),
  notes: z.string().trim().max(500).optional(),
})

/**
 * One sale, allocated across one or more batches.
 *
 * ── WHY ALLOCATIONS RATHER THAN A BATCH ID ON THE SALE ───────────────────
 *
 * A 5 kg order is genuinely picked from whatever is fruiting: 3 kg from one
 * batch, 2 kg from another. Forcing a sale to belong to a single batch would
 * mean either inventing a split later or attributing all the revenue to one
 * batch, which makes batch profitability meaningless.
 *
 * So a sale is a group of allocation ROWS sharing a `Sale ID`. Each row names
 * one batch and its share. Batch P&L sums only the rows for that batch, and
 * total revenue sums every row — neither double-counts, and the sheet stays
 * flat and readable with no nesting.
 */
export const newSaleSchema = z.object({
  date: isoDate,
  variety: z.string().trim().min(2).max(60),
  channel: z.enum(SALES_CHANNELS),
  buyer: z.string().trim().max(120).optional(),
  notes: z.string().trim().max(500).optional(),
  allocations: z
    .array(
      z.object({
        batchId: z.string().trim().regex(ID_PATTERNS.batch, 'Choose a batch'),
        quantityKg: kg.refine((v) => v > 0, 'Enter a quantity'),
        unitPrice: rupees,
      }),
    )
    .min(1, 'Allocate the sale to at least one batch'),
})

export type NewBatch = z.infer<typeof newBatchSchema>
export type NewHarvest = z.infer<typeof newHarvestSchema>
export type NewContamination = z.infer<typeof newContaminationSchema>
export type NewCost = z.infer<typeof newCostSchema>
export type NewSale = z.infer<typeof newSaleSchema>
