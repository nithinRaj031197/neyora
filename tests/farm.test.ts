import { describe, expect, it } from 'vitest'
import {
  analyseBatch,
  bagHealth,
  economics,
  harvestBetween,
  production,
  summarise,
  yields,
} from '@/lib/farm/analytics'
import {
  parseBatches,
  parseContamination,
  parseHarvests,
  parseSales,
  type BatchRecord,
  type ContaminationRecord,
  type CostRecord,
  type HarvestRecord,
  type SaleRecord,
} from '@/lib/farm/rows'
import {
  allocationId,
  bagId,
  batchPrefix,
  eventPrefix,
  ID_PATTERNS,
  newBatchSchema,
  newContaminationSchema,
  newHarvestSchema,
  newSaleSchema,
  nextSequence,
  STAGE_TRANSITIONS,
} from '@/lib/farm/schema'

/*
 * NOTHING HERE TOUCHES GOOGLE. The analytics and parsing layers are pure by
 * design, which is what makes the farm's arithmetic testable without a
 * spreadsheet — and the arithmetic is the part that decides whether a batch
 * looks profitable.
 */

const batch = (over: Partial<BatchRecord> = {}): BatchRecord => ({
  rowNumber: 2,
  batchId: 'BAT-202610-001',
  variety: 'White Oyster',
  stage: 'Fruiting',
  bagCount: 100,
  preparedDate: '2026-10-01',
  ...over,
})

const contamination = (over: Partial<ContaminationRecord> = {}): ContaminationRecord => ({
  rowNumber: 2,
  contaminationId: 'CON-20261015-001',
  batchId: 'BAT-202610-001',
  detectedDate: '2026-10-15',
  bagIds: [],
  affectedCount: 0,
  action: 'Discarded',
  ...over,
})

const harvest = (over: Partial<HarvestRecord> = {}): HarvestRecord => ({
  rowNumber: 2,
  harvestId: 'HAR-20261015-001',
  batchId: 'BAT-202610-001',
  date: '2026-10-15',
  flush: 1,
  totalKg: 12.4,
  saleableKg: 11.8,
  secondaryKg: 0,
  wasteKg: 0.6,
  ...over,
})

describe('identifiers', () => {
  it('builds stable, readable ids', () => {
    expect(bagId('BAT-202610-001', 1)).toBe('BAT-202610-001-B001')
    expect(bagId('BAT-202610-001', 80)).toBe('BAT-202610-001-B080')
    expect(allocationId('SALE-20261015-001', 0)).toBe('SALE-20261015-001-A1')
    expect(batchPrefix(new Date('2026-10-05T00:00:00Z'))).toBe('BAT-202610-')
    expect(eventPrefix('HAR', new Date('2026-10-15T00:00:00Z'))).toBe('HAR-20261015-')
  })

  it('matches its own patterns', () => {
    expect(ID_PATTERNS.batch.test('BAT-202610-001')).toBe(true)
    expect(ID_PATTERNS.bag.test('BAT-202610-001-B001')).toBe(true)
    expect(ID_PATTERNS.allocation.test('SALE-20261015-001-A1')).toBe(true)
    expect(ID_PATTERNS.batch.test('BAT-2026-1')).toBe(false)
  })

  it('continues a sequence from the ids already present', () => {
    expect(nextSequence(['BAT-202610-001', 'BAT-202610-004'], 'BAT-202610-')).toBe('BAT-202610-005')
    expect(nextSequence([], 'BAT-202610-')).toBe('BAT-202610-001')
    // Another month's ids must not advance this month's sequence.
    expect(nextSequence(['BAT-202609-009'], 'BAT-202610-')).toBe('BAT-202610-001')
  })
})

describe('batch lifecycle', () => {
  it('moves forward only', () => {
    expect(STAGE_TRANSITIONS.Preparing).toContain('Incubating')
    expect(STAGE_TRANSITIONS.Fruiting).toContain('Harvesting')
    expect(STAGE_TRANSITIONS.Harvesting).not.toContain('Fruiting')
  })

  it('lets anything live be discarded, and treats finished as final', () => {
    for (const stage of ['Preparing', 'Incubating', 'Fruiting', 'Harvesting'] as const) {
      expect(STAGE_TRANSITIONS[stage]).toContain('Discarded')
    }
    expect(STAGE_TRANSITIONS.Completed).toHaveLength(0)
    expect(STAGE_TRANSITIONS.Discarded).toHaveLength(0)
  })
})

describe('bag health', () => {
  /*
   * THE RULE THAT MATTERS. A bag reported twice — isolated on Monday,
   * discarded on Friday — is ONE lost bag. Counting it twice would inflate the
   * contamination rate and could push it over 100%.
   */
  it('counts a bag reported twice as one', () => {
    const health = bagHealth(batch(), [
      contamination({ bagIds: ['BAT-202610-001-B013'], action: 'Isolated' }),
      contamination({
        contaminationId: 'CON-20261020-001',
        bagIds: ['BAT-202610-001-B013'],
        action: 'Discarded',
      }),
    ])
    expect(health.identifiedAffected).toBe(1)
    expect(health.affected).toBe(1)
    expect(health.contaminationRate).toBe(1)
  })

  it('counts distinct identified bags', () => {
    const health = bagHealth(batch(), [
      contamination({ bagIds: ['BAT-202610-001-B013', 'BAT-202610-001-B018'] }),
      contamination({ contaminationId: 'CON-2', bagIds: ['BAT-202610-001-B026'] }),
    ])
    expect(health.affected).toBe(3)
    expect(health.remaining).toBe(97)
    expect(health.contaminationRate).toBe(3)
  })

  /* Anonymous counts cannot be de-duplicated, so they are summed. */
  it('adds anonymous counts to distinct identified bags', () => {
    const health = bagHealth(batch(), [
      contamination({ bagIds: ['BAT-202610-001-B013'] }),
      contamination({ contaminationId: 'CON-2', affectedCount: 4 }),
    ])
    expect(health.identifiedAffected).toBe(1)
    expect(health.anonymousAffected).toBe(4)
    expect(health.affected).toBe(5)
  })

  /* The cap: overlap between anonymous and identified events could otherwise
     push loss past the number of bags that ever existed. */
  it('never reports more affected bags than were prepared', () => {
    const health = bagHealth(batch({ bagCount: 10 }), [
      contamination({ affectedCount: 8 }),
      contamination({ contaminationId: 'CON-2', affectedCount: 8 }),
    ])
    expect(health.affected).toBe(10)
    expect(health.remaining).toBe(0)
    expect(health.contaminationRate).toBe(100)
  })

  it('separates discarded from merely affected', () => {
    const health = bagHealth(batch(), [
      contamination({ bagIds: ['BAT-202610-001-B001'], action: 'Isolated' }),
      contamination({ contaminationId: 'CON-2', bagIds: ['BAT-202610-001-B002'], action: 'Discarded' }),
    ])
    expect(health.affected).toBe(2)
    expect(health.discarded).toBe(1)
  })

  it('ignores events belonging to another batch', () => {
    const health = bagHealth(batch(), [
      contamination({ batchId: 'BAT-202610-002', affectedCount: 50 }),
    ])
    expect(health.affected).toBe(0)
  })
})

describe('production and flushes', () => {
  it('totals every flush', () => {
    const prod = production('BAT-202610-001', [
      harvest({ flush: 1, totalKg: 12.4, saleableKg: 11.8, wasteKg: 0.6 }),
      harvest({ harvestId: 'HAR-2', flush: 2, totalKg: 8.2, saleableKg: 7.9, wasteKg: 0.3, date: '2026-10-22' }),
      harvest({ harvestId: 'HAR-3', flush: 3, totalKg: 3.1, saleableKg: 2.8, wasteKg: 0.3, date: '2026-10-29' }),
    ])
    expect(prod.totalKg).toBe(23.7)
    expect(prod.saleableKg).toBe(22.5)
    expect(prod.flushes).toBe(3)
    expect(prod.firstHarvestDate).toBe('2026-10-15')
    expect(prod.lastHarvestDate).toBe('2026-10-29')
  })

  it('sums harvest within a window', () => {
    const rows = [
      harvest({ date: '2026-10-01', totalKg: 5 }),
      harvest({ harvestId: 'HAR-2', date: '2026-10-20', totalKg: 7 }),
    ]
    expect(harvestBetween(rows, '2026-10-15')).toBe(7)
    expect(harvestBetween(rows, '2026-10-01')).toBe(12)
  })
})

describe('yield', () => {
  /*
   * Two denominators, named separately on purpose. A batch that lost half its
   * bags but grew well on the rest looks poor on one and fine on the other,
   * and collapsing them into one "yield per bag" would hide whichever mattered.
   */
  it('reports per-prepared and per-remaining separately', () => {
    const b = batch({ bagCount: 100 })
    const health = bagHealth(b, [contamination({ affectedCount: 50 })])
    const prod = production(b.batchId, [harvest({ totalKg: 25, saleableKg: 24 })])
    const y = yields(b, health, prod)

    expect(y.perBagPrepared).toBe(0.25)
    expect(y.perBagRemaining).toBe(0.5)
    expect(y.saleablePerBagPrepared).toBe(0.24)
  })

  /* BE needs DRY substrate. From wet weight it reads three to four times too
     low and makes a healthy farm look like a failing one. */
  it('reports biological efficiency only when dry substrate weight exists', () => {
    const prod = production('BAT-202610-001', [harvest({ totalKg: 20 })])
    const withoutDry = yields(batch({ substratePerBagGrams: 1000 }), bagHealth(batch(), []), prod)
    expect(withoutDry.biologicalEfficiency).toBeUndefined()

    const withDry = yields(
      batch({ bagCount: 100, drySubstratePerBagGrams: 400 }),
      bagHealth(batch({ bagCount: 100 }), []),
      prod,
    )
    // 100 bags x 400 g = 40 kg dry; 20 kg fresh = 50%.
    expect(withDry.biologicalEfficiency).toBe(50)
  })

  it('says nothing rather than zero when there is no harvest', () => {
    const b = batch({ bagCount: 0 })
    const y = yields(b, bagHealth(b, []), production(b.batchId, []))
    expect(y.perBagPrepared).toBeUndefined()
    expect(y.perBagRemaining).toBeUndefined()
  })
})

describe('economics', () => {
  const costs: CostRecord[] = [
    { rowNumber: 2, costId: 'COST-1', batchId: 'BAT-202610-001', category: 'Spawn', costType: 'Direct', totalCost: 1200 },
    { rowNumber: 3, costId: 'COST-2', batchId: 'BAT-202610-001', category: 'Electricity', costType: 'Allocated', totalCost: 800 },
    { rowNumber: 4, costId: 'COST-3', batchId: 'BAT-202610-002', category: 'Spawn', costType: 'Direct', totalCost: 9999 },
  ]

  /* A 5 kg sale split across two batches contributes its own share to each. */
  const sales: SaleRecord[] = [
    { rowNumber: 2, allocationId: 'SALE-1-A1', saleId: 'SALE-1', batchId: 'BAT-202610-001', quantityKg: 3, unitPrice: 400, revenue: 1200 },
    { rowNumber: 3, allocationId: 'SALE-1-A2', saleId: 'SALE-1', batchId: 'BAT-202610-002', quantityKg: 2, unitPrice: 400, revenue: 800 },
    { rowNumber: 4, allocationId: 'SALE-2-A1', saleId: 'SALE-2', batchId: 'BAT-202610-001', quantityKg: 5, unitPrice: 400, revenue: 2000 },
  ]

  it('separates direct from allocated cost and totals both', () => {
    const prod = production('BAT-202610-001', [harvest({ totalKg: 20, saleableKg: 18 })])
    const e = economics('BAT-202610-001', costs, sales, prod, bagHealth(batch(), []))
    expect(e.directCost).toBe(1200)
    expect(e.allocatedCost).toBe(800)
    expect(e.totalCost).toBe(2000)
  })

  it('counts only the revenue allocated to this batch', () => {
    const prod = production('BAT-202610-001', [harvest({ totalKg: 20, saleableKg: 18 })])
    const e = economics('BAT-202610-001', costs, sales, prod, bagHealth(batch(), []))
    // 1200 from the split sale + 2000 from its own; never the other batch's 800.
    expect(e.revenue).toBe(3200)
    expect(e.quantitySoldKg).toBe(8)
    expect(e.profit).toBe(1200)
  })

  it('computes per-kg economics from the right denominators', () => {
    const prod = production('BAT-202610-001', [harvest({ totalKg: 20, saleableKg: 16 })])
    const e = economics('BAT-202610-001', costs, sales, prod, bagHealth(batch({ bagCount: 100 }), []))
    expect(e.costPerKgHarvested).toBe(100)
    expect(e.costPerKgSaleable).toBe(125)
    expect(e.revenuePerKgSold).toBe(400)
    expect(e.costPerBag).toBe(20)
  })

  it('reports no margin rather than a misleading one when nothing sold', () => {
    const prod = production('BAT-202610-001', [harvest({ totalKg: 20 })])
    const e = economics('BAT-202610-001', costs, [], prod, bagHealth(batch(), []))
    expect(e.revenue).toBe(0)
    expect(e.marginPercent).toBeUndefined()
    expect(e.profit).toBe(-2000)
  })
})

describe('whole-batch analysis and summary', () => {
  it('assembles one batch end to end', () => {
    const a = analyseBatch(batch(), {
      harvests: [harvest({ totalKg: 12 }), harvest({ harvestId: 'HAR-2', flush: 2, totalKg: 8, date: '2026-10-25' })],
      contamination: [contamination({ bagIds: ['BAT-202610-001-B001'] })],
      costs: [{ rowNumber: 2, costId: 'C1', batchId: 'BAT-202610-001', totalCost: 500, costType: 'Direct' }],
      sales: [{ rowNumber: 2, allocationId: 'S1-A1', saleId: 'S1', batchId: 'BAT-202610-001', quantityKg: 10, revenue: 4000 }],
    })
    expect(a.production.totalKg).toBe(20)
    expect(a.health.affected).toBe(1)
    expect(a.economics.profit).toBe(3500)
    expect(a.daysToFirstHarvest).toBe(14)
    expect(a.cycleDays).toBe(24)
  })

  it('summarises a portfolio without double counting', () => {
    const a = analyseBatch(batch(), { harvests: [harvest({ totalKg: 12 })], contamination: [], costs: [], sales: [] })
    const b = analyseBatch(batch({ batchId: 'BAT-202610-002', rowNumber: 3, stage: 'Completed', bagCount: 50 }), {
      harvests: [], contamination: [], costs: [], sales: [],
    })
    const s = summarise([a, b], [harvest({ totalKg: 12 })], new Date('2026-10-16T00:00:00Z'))

    expect(s.totalBatches).toBe(2)
    expect(s.activeBatches).toBe(1)
    expect(s.bagsPrepared).toBe(150)
    expect(s.totalHarvestKg).toBe(12)
    expect(s.harvestThisWeekKg).toBe(12)
  })
})

describe('validation', () => {
  it('rejects a harvest whose grades exceed the total', () => {
    const base = { batchId: 'BAT-202610-001', date: '2026-10-15', flush: 1, totalKg: 10 }
    expect(newHarvestSchema.safeParse({ ...base, saleableKg: 9, secondaryKg: 1, wasteKg: 1 }).success).toBe(false)
    expect(newHarvestSchema.safeParse({ ...base, saleableKg: 9, secondaryKg: 0.5, wasteKg: 0.5 }).success).toBe(true)
  })

  it('rejects a contamination event that is both identified and anonymous', () => {
    const base = {
      batchId: 'BAT-202610-001', detectedDate: '2026-10-15',
      type: 'Green mold' as const, severity: 'Medium' as const, action: 'Discarded' as const,
    }
    expect(newContaminationSchema.safeParse({ ...base, bagIds: ['BAT-202610-001-B001'], affectedCount: 1 }).success).toBe(false)
    expect(newContaminationSchema.safeParse({ ...base, bagIds: ['BAT-202610-001-B001'], affectedCount: 0 }).success).toBe(true)
    expect(newContaminationSchema.safeParse({ ...base, bagIds: [], affectedCount: 3 }).success).toBe(true)
    expect(newContaminationSchema.safeParse({ ...base, bagIds: [], affectedCount: 0 }).success).toBe(false)
  })

  it('requires a batch to have bags and a variety', () => {
    const base = { variety: 'White Oyster', bagCount: 40, preparedDate: '2026-10-01' }
    expect(newBatchSchema.safeParse(base).success).toBe(true)
    expect(newBatchSchema.safeParse({ ...base, bagCount: 0 }).success).toBe(false)
    expect(newBatchSchema.safeParse({ ...base, variety: '' }).success).toBe(false)
    expect(newBatchSchema.safeParse({ ...base, preparedDate: '01/10/2026' }).success).toBe(false)
  })

  it('requires a sale to be allocated to at least one batch', () => {
    const base = { date: '2026-10-20', variety: 'White Oyster', channel: 'Direct' as const }
    expect(newSaleSchema.safeParse({ ...base, allocations: [] }).success).toBe(false)
    expect(
      newSaleSchema.safeParse({
        ...base,
        allocations: [
          { batchId: 'BAT-202610-001', quantityKg: 3, unitPrice: 400 },
          { batchId: 'BAT-202610-002', quantityKg: 2, unitPrice: 400 },
        ],
      }).success,
    ).toBe(true)
  })
})

describe('reading a hand-edited sheet', () => {
  /*
   * The sheet is the source of truth AND hand-editable, so a stray space or a
   * blank optional cell must not take down the dashboard. Tolerance stops
   * where a guess would change a number.
   */
  it('tolerates whitespace, units and blanks', () => {
    const { records, issues } = parseHarvests([
      ['HAR-20261015-001', ' BAT-202610-001 ', '2026-10-15', 1, ' 12.4 kg ', '11.8', '', ''],
    ])
    expect(issues).toHaveLength(0)
    expect(records[0]!.batchId).toBe('BAT-202610-001')
    expect(records[0]!.totalKg).toBe(12.4)
    expect(records[0]!.secondaryKg).toBe(0)
  })

  it('skips an unreadable row and reports it, rather than reading zero', () => {
    const { records, issues } = parseHarvests([
      ['HAR-1', 'BAT-202610-001', '2026-10-15', 1, 'about ten kilos'],
      ['HAR-2', 'BAT-202610-001', '2026-10-16', 2, 5],
    ])
    expect(records).toHaveLength(1)
    expect(issues).toHaveLength(1)
    expect(issues[0]!.row).toBe(2)
    expect(issues[0]!.problem).toMatch(/weight/i)
  })

  it('ignores blank spacer rows without complaining', () => {
    const { records, issues } = parseHarvests([[], ['', '', ''], ['HAR-1', 'BAT-202610-001', '2026-10-15', 1, 5]])
    expect(records).toHaveLength(1)
    expect(issues).toHaveLength(0)
  })

  it('reports an unknown batch stage instead of guessing one', () => {
    const { records, issues } = parseBatches([
      ['BAT-202610-001', '', 'White Oyster', 'Fruting', 40],
    ])
    expect(records).toHaveLength(0)
    expect(issues[0]!.problem).toMatch(/Stage/)
  })

  it('splits bag ids however they were typed', () => {
    const { records } = parseContamination([
      ['CON-1', 'BAT-202610-001', '2026-10-15', 'BAT-202610-001-B013, BAT-202610-001-B018  BAT-202610-001-B026', ''],
    ])
    expect(records[0]!.bagIds).toHaveLength(3)
  })

  it('recovers a blank revenue cell from quantity and price', () => {
    const { records } = parseSales([
      ['SALE-1-A1', 'SALE-1', 'BAT-202610-001', '2026-10-20', 'White Oyster', 3, 400, ''],
    ])
    expect(records[0]!.revenue).toBe(1200)
  })
})
