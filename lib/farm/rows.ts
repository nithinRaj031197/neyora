import { COLUMNS, type BatchStage, BATCH_STAGES } from './schema'

/**
 * Turning spreadsheet rows into typed records.
 *
 * ── THE SHEET IS HAND-EDITABLE, SO READS MUST BE FORGIVING ───────────────
 *
 * Someone will type " 12.4 kg" into a number column, leave an optional cell
 * blank, or add a note row at the bottom. None of that should take down the
 * dashboard — a farm manager locked out of their own numbers because one cell
 * has a stray space is a worse failure than a slightly odd reading.
 *
 * So parsing is tolerant: whitespace is trimmed, units are stripped from
 * numbers, blanks become undefined rather than NaN.
 *
 * ── BUT NOT SILENTLY WRONG ───────────────────────────────────────────────
 *
 * Tolerance stops at the point where a guess would change a number. A row with
 * no ID, or a harvest weight that is not a number at all, is SKIPPED and
 * reported as a data-quality issue the dashboard surfaces — never coerced to
 * zero, which would quietly drag an average down and look like a bad harvest.
 */

export interface DataIssue {
  tab: string
  /** 1-based spreadsheet row, so it can be found by eye. */
  row: number
  problem: string
}

export interface ParseResult<T> {
  records: T[]
  issues: DataIssue[]
}

const text = (cell: unknown): string => (cell === null || cell === undefined ? '' : String(cell).replace(/^'/, '').trim())

/**
 * A number from a cell a human may have typed into.
 *
 * Strips anything that is not part of a number — "12.4 kg", "₹ 1,200" and
 * " 40 " all read correctly. Returns undefined for a blank, and undefined
 * (not zero) for something that contains no digits at all.
 */
const num = (cell: unknown): number | undefined => {
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : undefined
  const raw = text(cell)
  if (raw === '') return undefined
  const cleaned = raw.replace(/[^0-9.\-]/g, '')
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return undefined
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : undefined
}

/** A date cell. Accepts the ISO form we write, and leaves anything else out. */
const date = (cell: unknown): string | undefined => {
  const raw = text(cell)
  if (!raw) return undefined
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return iso[0]
  // Sheets may hand back a serial number if a column was reformatted by hand.
  if (typeof cell === 'number' && cell > 20000 && cell < 80000) {
    const epoch = Date.UTC(1899, 11, 30) + cell * 86_400_000
    return new Date(epoch).toISOString().slice(0, 10)
  }
  return undefined
}

export interface BatchRecord {
  rowNumber: number
  batchId: string
  label?: string
  variety: string
  stage: BatchStage
  bagCount: number
  preparedDate?: string
  inoculatedDate?: string
  incubationEnd?: string
  fruitingStart?: string
  spawnSource?: string
  spawnLot?: string
  spawnUsedGrams?: number
  substrateType?: string
  substratePerBagGrams?: number
  drySubstratePerBagGrams?: number
  notes?: string
  updatedAt?: string
}

export interface BagRecord {
  rowNumber: number
  bagId: string
  batchId: string
  bagNumber?: number
}

export interface HarvestRecord {
  rowNumber: number
  harvestId: string
  batchId: string
  date?: string
  flush?: number
  totalKg: number
  saleableKg: number
  secondaryKg: number
  wasteKg: number
  notes?: string
  updatedAt?: string
}

export interface ContaminationRecord {
  rowNumber: number
  contaminationId: string
  batchId: string
  detectedDate?: string
  bagIds: string[]
  affectedCount: number
  type?: string
  severity?: string
  action?: string
  estimatedLossKg?: number
  notes?: string
  updatedAt?: string
}

export interface CostRecord {
  rowNumber: number
  costId: string
  batchId: string
  date?: string
  category?: string
  costType?: string
  description?: string
  totalCost: number
  updatedAt?: string
}

export interface SaleRecord {
  rowNumber: number
  allocationId: string
  saleId: string
  batchId: string
  date?: string
  variety?: string
  quantityKg: number
  unitPrice?: number
  revenue: number
  channel?: string
  buyer?: string
  updatedAt?: string
}

/** Rows start at spreadsheet row 2; index 0 of `rows` is row 2. */
const rowNumber = (index: number) => index + 2

function parse<T>(
  rows: unknown[][],
  tab: string,
  build: (cells: unknown[], rowNumber: number) => T | string,
): ParseResult<T> {
  const records: T[] = []
  const issues: DataIssue[] = []

  rows.forEach((cells, index) => {
    // A completely blank row is just spacing, not a problem worth reporting.
    if (!cells || cells.every((cell) => text(cell) === '')) return
    const result = build(cells, rowNumber(index))
    if (typeof result === 'string') issues.push({ tab, row: rowNumber(index), problem: result })
    else records.push(result)
  })

  return { records, issues }
}

export function parseBatches(rows: unknown[][]): ParseResult<BatchRecord> {
  const c = COLUMNS.batches
  return parse(rows, 'Batches', (cells, row) => {
    const batchId = text(cells[c['Batch ID']])
    if (!batchId) return 'No Batch ID — the row cannot be linked to anything'

    const rawStage = text(cells[c.Stage])
    const stage = (BATCH_STAGES as readonly string[]).includes(rawStage)
      ? (rawStage as BatchStage)
      : undefined
    if (!stage) return `Stage "${rawStage || 'blank'}" is not one of ${BATCH_STAGES.join(', ')}`

    const bagCount = num(cells[c['Bag Count']])
    if (bagCount === undefined) return 'Bag Count is not a number'

    return {
      rowNumber: row,
      batchId,
      label: text(cells[c.Label]) || undefined,
      variety: text(cells[c.Variety]) || 'Unknown',
      stage,
      bagCount,
      preparedDate: date(cells[c['Prepared Date']]),
      inoculatedDate: date(cells[c['Inoculated Date']]),
      incubationEnd: date(cells[c['Incubation End']]),
      fruitingStart: date(cells[c['Fruiting Start']]),
      spawnSource: text(cells[c['Spawn Source']]) || undefined,
      spawnLot: text(cells[c['Spawn Lot']]) || undefined,
      spawnUsedGrams: num(cells[c['Spawn Used (g)']]),
      substrateType: text(cells[c['Substrate Type']]) || undefined,
      substratePerBagGrams: num(cells[c['Substrate per Bag (g)']]),
      drySubstratePerBagGrams: num(cells[c['Dry Substrate per Bag (g)']]),
      notes: text(cells[c.Notes]) || undefined,
      updatedAt: text(cells[c['Updated At']]) || undefined,
    }
  })
}

export function parseBags(rows: unknown[][]): ParseResult<BagRecord> {
  const c = COLUMNS.bags
  return parse(rows, 'Bags', (cells, row) => {
    const bagId = text(cells[c['Bag ID']])
    const batchId = text(cells[c['Batch ID']])
    if (!bagId) return 'No Bag ID'
    if (!batchId) return `Bag ${bagId} has no Batch ID`
    return { rowNumber: row, bagId, batchId, bagNumber: num(cells[c['Bag Number']]) }
  })
}

export function parseHarvests(rows: unknown[][]): ParseResult<HarvestRecord> {
  const c = COLUMNS.harvests
  return parse(rows, 'Harvests', (cells, row) => {
    const harvestId = text(cells[c['Harvest ID']])
    const batchId = text(cells[c['Batch ID']])
    if (!harvestId) return 'No Harvest ID'
    if (!batchId) return `Harvest ${harvestId} has no Batch ID`

    const totalKg = num(cells[c['Total (kg)']])
    // Never coerced to zero: a weight that cannot be read would quietly drag
    // every yield average down and look like a failed flush.
    if (totalKg === undefined) return `Harvest ${harvestId} has no readable total weight`

    return {
      rowNumber: row,
      harvestId,
      batchId,
      date: date(cells[c.Date]),
      flush: num(cells[c.Flush]),
      totalKg,
      saleableKg: num(cells[c['Saleable (kg)']]) ?? 0,
      secondaryKg: num(cells[c['Secondary (kg)']]) ?? 0,
      wasteKg: num(cells[c['Waste (kg)']]) ?? 0,
      notes: text(cells[c.Notes]) || undefined,
      updatedAt: text(cells[c['Updated At']]) || undefined,
    }
  })
}

export function parseContamination(rows: unknown[][]): ParseResult<ContaminationRecord> {
  const c = COLUMNS.contamination
  return parse(rows, 'Contamination', (cells, row) => {
    const contaminationId = text(cells[c['Contamination ID']])
    const batchId = text(cells[c['Batch ID']])
    if (!contaminationId) return 'No Contamination ID'
    if (!batchId) return `Event ${contaminationId} has no Batch ID`

    const bagIds = text(cells[c['Bag IDs']])
      .split(/[,\s]+/)
      .map((id) => id.trim())
      .filter(Boolean)

    return {
      rowNumber: row,
      contaminationId,
      batchId,
      detectedDate: date(cells[c['Detected Date']]),
      bagIds,
      affectedCount: num(cells[c['Affected Bags Count']]) ?? 0,
      type: text(cells[c.Type]) || undefined,
      severity: text(cells[c.Severity]) || undefined,
      action: text(cells[c.Action]) || undefined,
      estimatedLossKg: num(cells[c['Estimated Loss (kg)']]),
      notes: text(cells[c.Notes]) || undefined,
      updatedAt: text(cells[c['Updated At']]) || undefined,
    }
  })
}

export function parseCosts(rows: unknown[][]): ParseResult<CostRecord> {
  const c = COLUMNS.costs
  return parse(rows, 'Costs', (cells, row) => {
    const costId = text(cells[c['Cost ID']])
    const batchId = text(cells[c['Batch ID']])
    if (!costId) return 'No Cost ID'
    if (!batchId) return `Cost ${costId} has no Batch ID`

    const totalCost = num(cells[c['Total Cost (₹)']])
    if (totalCost === undefined) return `Cost ${costId} has no readable amount`

    return {
      rowNumber: row,
      costId,
      batchId,
      date: date(cells[c.Date]),
      category: text(cells[c.Category]) || undefined,
      costType: text(cells[c['Cost Type']]) || undefined,
      description: text(cells[c.Description]) || undefined,
      totalCost,
      updatedAt: text(cells[c['Updated At']]) || undefined,
    }
  })
}

export function parseSales(rows: unknown[][]): ParseResult<SaleRecord> {
  const c = COLUMNS.sales
  return parse(rows, 'Sales', (cells, row) => {
    const allocationId = text(cells[c['Allocation ID']])
    const batchId = text(cells[c['Batch ID']])
    if (!allocationId) return 'No Allocation ID'
    if (!batchId) return `Allocation ${allocationId} has no Batch ID`

    const quantityKg = num(cells[c['Quantity (kg)']]) ?? 0
    const unitPrice = num(cells[c['Unit Price (₹/kg)']])
    // Revenue is stored, but a blank one is recoverable from quantity × price
    // rather than reported as a broken row.
    const revenue = num(cells[c['Revenue (₹)']]) ?? (unitPrice ? quantityKg * unitPrice : 0)

    return {
      rowNumber: row,
      allocationId,
      saleId: text(cells[c['Sale ID']]) || allocationId,
      batchId,
      date: date(cells[c.Date]),
      variety: text(cells[c.Variety]) || undefined,
      quantityKg,
      unitPrice,
      revenue,
      channel: text(cells[c.Channel]) || undefined,
      buyer: text(cells[c.Buyer]) || undefined,
      updatedAt: text(cells[c['Updated At']]) || undefined,
    }
  })
}
