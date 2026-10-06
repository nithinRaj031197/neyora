import { isBatchActive, type BatchStage } from './schema'
import type {
  BatchRecord,
  ContaminationRecord,
  CostRecord,
  HarvestRecord,
  SaleRecord,
} from './rows'

/**
 * Every farm number, computed in one place.
 *
 * Nothing derived is stored in the spreadsheet, and nothing is recomputed in a
 * component. If profit appeared in three files it would eventually mean three
 * things, and the first time two screens disagreed nobody would trust either.
 *
 * Read the sheet → normalise (rows.ts) → aggregate HERE → render.
 */

// ---------------------------------------------------------------------------
// Bag health — derived from contamination events, never stored
// ---------------------------------------------------------------------------

/**
 * How many bags of a batch were lost, without double-counting.
 *
 * Two kinds of event exist and they must not be added together naively:
 *
 *   IDENTIFIED   the bags were named — B013, B018, B026
 *   ANONYMOUS    only a count was recorded, because nobody wrote the IDs down
 *
 * Identified bags are de-duplicated across events: B013 reported twice, once
 * as "isolated" and later as "discarded", is ONE lost bag, not two. That is the
 * whole reason bag identity exists.
 *
 * Anonymous counts cannot be de-duplicated — there is nothing to compare — so
 * they are summed and then added to the distinct identified count. The risk is
 * overlap between an anonymous event and a later identified one, which would
 * overstate loss; the total is therefore capped at the batch's bag count, so
 * contamination can never exceed 100%.
 */
export interface BagHealth {
  prepared: number
  /** Distinct bags named in contamination events. */
  identifiedAffected: number
  /** Bags reported only as a number. */
  anonymousAffected: number
  /** identified + anonymous, capped at `prepared`. */
  affected: number
  /** Affected bags whose event action was "Discarded". */
  discarded: number
  remaining: number
  /** affected / prepared, as a percentage. Undefined when no bags prepared. */
  contaminationRate?: number
}

export function bagHealth(
  batch: BatchRecord,
  contamination: readonly ContaminationRecord[],
): BagHealth {
  const identified = new Set<string>()
  const discardedBags = new Set<string>()
  let anonymous = 0
  let anonymousDiscarded = 0

  for (const event of contamination) {
    if (event.batchId !== batch.batchId) continue
    if (event.bagIds.length > 0) {
      for (const id of event.bagIds) {
        identified.add(id)
        if (event.action === 'Discarded') discardedBags.add(id)
      }
    } else if (event.affectedCount > 0) {
      anonymous += event.affectedCount
      if (event.action === 'Discarded') anonymousDiscarded += event.affectedCount
    }
  }

  const prepared = batch.bagCount
  const affected = Math.min(identified.size + anonymous, prepared)
  const discarded = Math.min(discardedBags.size + anonymousDiscarded, affected)

  return {
    prepared,
    identifiedAffected: identified.size,
    anonymousAffected: anonymous,
    affected,
    discarded,
    remaining: Math.max(prepared - affected, 0),
    contaminationRate: prepared > 0 ? (affected / prepared) * 100 : undefined,
  }
}

// ---------------------------------------------------------------------------
// Production
// ---------------------------------------------------------------------------

export interface Production {
  flushes: number
  totalKg: number
  saleableKg: number
  secondaryKg: number
  wasteKg: number
  firstHarvestDate?: string
  lastHarvestDate?: string
}

export function production(
  batchId: string,
  harvests: readonly HarvestRecord[],
): Production {
  const mine = harvests.filter((h) => h.batchId === batchId)
  const dates = mine.map((h) => h.date).filter((d): d is string => Boolean(d)).sort()

  return {
    flushes: new Set(mine.map((h) => h.flush ?? 0)).size,
    totalKg: round(mine.reduce((sum, h) => sum + h.totalKg, 0)),
    saleableKg: round(mine.reduce((sum, h) => sum + h.saleableKg, 0)),
    secondaryKg: round(mine.reduce((sum, h) => sum + h.secondaryKg, 0)),
    wasteKg: round(mine.reduce((sum, h) => sum + h.wasteKg, 0)),
    firstHarvestDate: dates[0],
    lastHarvestDate: dates[dates.length - 1],
  }
}

// ---------------------------------------------------------------------------
// Yield — named precisely, because the denominator changes the meaning
// ---------------------------------------------------------------------------

/**
 * Two different questions, deliberately not collapsed into "yield per bag":
 *
 *   perBagPrepared   how the batch did OVERALL, losses included. The honest
 *                    number for deciding whether a batch was worth running.
 *   perBagRemaining  how the SURVIVING bags performed. Isolates growing
 *                    conditions from contamination.
 *
 * A batch that lost half its bags but grew beautifully on the rest looks fine
 * on the second and poor on the first, and both facts matter. Reporting one
 * unlabelled number would hide whichever one you needed.
 */
export interface Yield {
  perBagPrepared?: number
  perBagRemaining?: number
  saleablePerBagPrepared?: number
  /** Fresh harvest ÷ dry substrate × 100. Only when dry weight was recorded. */
  biologicalEfficiency?: number
}

export function yields(batch: BatchRecord, health: BagHealth, prod: Production): Yield {
  const perBagPrepared = health.prepared > 0 ? prod.totalKg / health.prepared : undefined
  const perBagRemaining = health.remaining > 0 ? prod.totalKg / health.remaining : undefined
  const saleablePerBagPrepared =
    health.prepared > 0 ? prod.saleableKg / health.prepared : undefined

  /*
   * Biological efficiency needs DRY substrate weight. Computed from wet
   * substrate it reads three to four times too low and makes a healthy farm
   * look like a failing one — so when the dry weight is absent this stays
   * undefined and the UI says "not enough data" rather than guessing.
   */
  let biologicalEfficiency: number | undefined
  const dryPerBag = batch.drySubstratePerBagGrams
  if (dryPerBag && dryPerBag > 0 && health.prepared > 0 && prod.totalKg > 0) {
    const dryTotalKg = (dryPerBag * health.prepared) / 1000
    biologicalEfficiency = (prod.totalKg / dryTotalKg) * 100
  }

  return {
    perBagPrepared: round(perBagPrepared, 3),
    perBagRemaining: round(perBagRemaining, 3),
    saleablePerBagPrepared: round(saleablePerBagPrepared, 3),
    biologicalEfficiency: round(biologicalEfficiency, 1),
  }
}

// ---------------------------------------------------------------------------
// Economics
// ---------------------------------------------------------------------------

export interface Economics {
  directCost: number
  allocatedCost: number
  totalCost: number
  revenue: number
  quantitySoldKg: number
  profit: number
  /** profit ÷ revenue × 100. Undefined with no revenue — not 0%, not −100%. */
  marginPercent?: number
  costPerKgHarvested?: number
  costPerKgSaleable?: number
  revenuePerKgSold?: number
  costPerBag?: number
}

export function economics(
  batchId: string,
  costs: readonly CostRecord[],
  sales: readonly SaleRecord[],
  prod: Production,
  health: BagHealth,
): Economics {
  const mine = costs.filter((c) => c.batchId === batchId)
  const direct = mine.filter((c) => c.costType !== 'Allocated')
  const allocated = mine.filter((c) => c.costType === 'Allocated')

  const directCost = round(direct.reduce((s, c) => s + c.totalCost, 0))
  const allocatedCost = round(allocated.reduce((s, c) => s + c.totalCost, 0))
  const totalCost = round(directCost + allocatedCost)

  // Only the allocations belonging to this batch. A sale split across two
  // batches contributes its own share to each, and never its whole value.
  const myAllocations = sales.filter((s) => s.batchId === batchId)
  const revenue = round(myAllocations.reduce((s, a) => s + a.revenue, 0))
  const quantitySoldKg = round(myAllocations.reduce((s, a) => s + a.quantityKg, 0))

  return {
    directCost,
    allocatedCost,
    totalCost,
    revenue,
    quantitySoldKg,
    profit: round(revenue - totalCost),
    marginPercent: revenue > 0 ? round(((revenue - totalCost) / revenue) * 100, 1) : undefined,
    costPerKgHarvested: prod.totalKg > 0 ? round(totalCost / prod.totalKg) : undefined,
    costPerKgSaleable: prod.saleableKg > 0 ? round(totalCost / prod.saleableKg) : undefined,
    revenuePerKgSold: quantitySoldKg > 0 ? round(revenue / quantitySoldKg) : undefined,
    costPerBag: health.prepared > 0 ? round(totalCost / health.prepared, 2) : undefined,
  }
}

// ---------------------------------------------------------------------------
// One batch, fully analysed
// ---------------------------------------------------------------------------

export interface BatchAnalysis {
  batch: BatchRecord
  health: BagHealth
  production: Production
  yields: Yield
  economics: Economics
  /** Prepared → first harvest, in days. Undefined until both dates exist. */
  daysToFirstHarvest?: number
  cycleDays?: number
}

export function analyseBatch(
  batch: BatchRecord,
  data: {
    harvests: readonly HarvestRecord[]
    contamination: readonly ContaminationRecord[]
    costs: readonly CostRecord[]
    sales: readonly SaleRecord[]
  },
): BatchAnalysis {
  const health = bagHealth(batch, data.contamination)
  const prod = production(batch.batchId, data.harvests)

  return {
    batch,
    health,
    production: prod,
    yields: yields(batch, health, prod),
    economics: economics(batch.batchId, data.costs, data.sales, prod, health),
    daysToFirstHarvest: daysBetween(batch.preparedDate, prod.firstHarvestDate),
    cycleDays: daysBetween(batch.preparedDate, prod.lastHarvestDate),
  }
}

// ---------------------------------------------------------------------------
// Portfolio — the dashboard
// ---------------------------------------------------------------------------

export interface FarmSummary {
  activeBatches: number
  totalBatches: number
  bagsPrepared: number
  bagsRemaining: number
  bagsAffected: number
  bagsDiscarded: number
  contaminationRate?: number
  harvestThisWeekKg: number
  harvestThisMonthKg: number
  totalHarvestKg: number
  saleableHarvestKg: number
  totalCost: number
  revenue: number
  profit: number
}

export function summarise(
  analyses: readonly BatchAnalysis[],
  harvests: readonly HarvestRecord[],
  now = new Date(),
): FarmSummary {
  const weekAgo = isoDaysAgo(now, 7)
  const monthStart = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-01`

  const bagsPrepared = analyses.reduce((s, a) => s + a.health.prepared, 0)
  const bagsAffected = analyses.reduce((s, a) => s + a.health.affected, 0)

  return {
    activeBatches: analyses.filter((a) => isBatchActive(a.batch.stage)).length,
    totalBatches: analyses.length,
    bagsPrepared,
    bagsRemaining: analyses.reduce((s, a) => s + a.health.remaining, 0),
    bagsAffected,
    bagsDiscarded: analyses.reduce((s, a) => s + a.health.discarded, 0),
    contaminationRate: bagsPrepared > 0 ? round((bagsAffected / bagsPrepared) * 100, 1) : undefined,
    harvestThisWeekKg: harvestBetween(harvests, weekAgo),
    harvestThisMonthKg: harvestBetween(harvests, monthStart),
    totalHarvestKg: round(analyses.reduce((s, a) => s + a.production.totalKg, 0)),
    saleableHarvestKg: round(analyses.reduce((s, a) => s + a.production.saleableKg, 0)),
    totalCost: round(analyses.reduce((s, a) => s + a.economics.totalCost, 0)),
    revenue: round(analyses.reduce((s, a) => s + a.economics.revenue, 0)),
    profit: round(analyses.reduce((s, a) => s + a.economics.profit, 0)),
  }
}

/** Harvest totals over a window, straight from the events. */
export function harvestBetween(
  harvests: readonly HarvestRecord[],
  fromIso: string,
  toIso?: string,
): number {
  return round(
    harvests
      .filter((h) => h.date && h.date >= fromIso && (!toIso || h.date <= toIso))
      .reduce((sum, h) => sum + h.totalKg, 0),
  )
}

export const isoDaysAgo = (now: Date, days: number) =>
  new Date(now.getTime() - days * 86_400_000).toISOString().slice(0, 10)

export const isoToday = (now: Date) => now.toISOString().slice(0, 10)

function daysBetween(from?: string, to?: string): number | undefined {
  if (!from || !to) return undefined
  const a = Date.parse(from)
  const b = Date.parse(to)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return undefined
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/**
 * Round, PRESERVING undefined.
 *
 * A metric with no data must stay undefined so the UI can say "not enough
 * data". Collapsing it to 0 would render as a real result — a yield of
 * 0 kg/bag reads as a catastrophic batch, not as a batch nobody has harvested
 * from yet.
 */
function round<T extends number | undefined>(value: T, decimals = 2): T extends number ? number : number | undefined {
  if (value === undefined || !Number.isFinite(value)) {
    return undefined as T extends number ? number : number | undefined
  }
  const factor = 10 ** decimals
  return (Math.round((value as number) * factor) / factor) as T extends number ? number : number | undefined
}

export const stageLabel = (stage: BatchStage) => stage
