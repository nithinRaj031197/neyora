import 'server-only'
import { recordSheetSync } from '@/lib/orders/repository'
import type { Order } from '@/lib/orders/schema'
import { runAfterResponse } from '@/lib/background'
import { sheetsConfig } from './config'
import { appendRows, ensureSheet, readRowKeys, readSheetContents, updateRows } from './client'
import { orderToRows, rowKey, rowsMatch } from './mapping'

/**
 * Project one order into the reporting spreadsheet.
 *
 * STRICTLY ONE WAY. MongoDB is the source of truth; this writes what MongoDB
 * says and never reads the sheet to decide anything about an order. If the two
 * disagree, MongoDB is right and the sheet is behind — which is a retry, not a
 * merge.
 *
 * The contract this module keeps: **a Sheets failure must never reach the
 * customer, and must never affect the order**. `queueSheetSync` resolves
 * successfully whatever Google does; the only record of a failure is on the
 * order document, where the admin can see and retry it.
 */

/** The tab is checked once per process, not once per order. */
let sheetReady: Promise<void> | undefined

export interface SyncResult {
  ok: boolean
  /** No credentials. Not a failure — see config.ts. */
  skipped?: boolean
  error?: string
}

/**
 * Write this order's rows, creating or overwriting as needed.
 *
 * IDEMPOTENT BY CONSTRUCTION. Every row carries `NEY-0021#1` in column A; the
 * sync reads that column, updates the rows that already exist and appends only
 * the ones that do not. Running it a hundred times leaves exactly as many rows
 * as the order has items.
 *
 * This is also how a status or payment change reaches the sheet: the same
 * order, re-projected, lands on the same rows.
 */
export async function syncOrderToSheet(order: Order): Promise<SyncResult> {
  const config = sheetsConfig()
  if (!config) return { ok: false, skipped: true }

  try {
    sheetReady ??= ensureSheet(config)
    await sheetReady
  } catch (error) {
    // A failed setup must not be cached as done — the next attempt should try
    // again rather than writing into a tab that may not exist.
    sheetReady = undefined
    return { ok: false, error: describe(error) }
  }

  try {
    const existing = await readRowKeys(config)
    const rows = orderToRows(order)

    const updates: { rowNumber: number; row: (string | number)[] }[] = []
    const appends: (string | number)[][] = []

    rows.forEach((row, index) => {
      const rowNumber = existing.get(rowKey(order.reference, index))
      if (rowNumber) updates.push({ rowNumber, row })
      else appends.push(row)
    })

    await updateRows(config, updates)
    await appendRows(config, appends)

    return { ok: true }
  } catch (error) {
    return { ok: false, error: describe(error) }
  }
}

/** Sync and record the outcome. Never throws. */
export async function syncAndRecord(order: Order): Promise<SyncResult> {
  const result = await syncOrderToSheet(order)

  try {
    await recordSheetSync(order.reference, result)
  } catch (error) {
    // The rows may well have been written; we just cannot say so. Logged
    // rather than thrown — this usually runs after the customer has gone.
    console.error(`[sheets] could not record sync state for ${order.reference}`, error)
  }

  if (!result.ok && !result.skipped) {
    console.error(`[sheets] sync failed for ${order.reference}:`, result.error)
  }
  return result
}

/**
 * Fire and forget, for the order action and the admin actions.
 *
 * Returns immediately. Nothing it does can turn a stored order into an error
 * on anyone's screen.
 */
export async function queueSheetSync(order: Order): Promise<void> {
  await runAfterResponse(syncAndRecord(order), 'sheets')
}

function describe(error: unknown): string {
  if (error instanceof Error) {
    return error.name === 'AbortError' ? 'Google Sheets timed out' : error.message
  }
  return String(error)
}

/** Tests and credential changes need the per-process tab check to reset. */
export function resetSheetReady(): void {
  sheetReady = undefined
}


// ---------------------------------------------------------------------------
// Reconcile — the "Sync All" operation
// ---------------------------------------------------------------------------

/**
 * What one reconcile pass did.
 *
 * Counted in ROWS, not orders, because one order can be several rows — and
 * "rows added" is the number that tells you whether the sheet grew.
 */
export interface ReconcileReport {
  ordersChecked: number
  rowsAdded: number
  rowsUpdated: number
  rowsUnchanged: number
  rowsFailed: number
  /** Rows in the sheet with no matching MongoDB order. NEVER touched. */
  sheetOnlyRows: number
  /** Row Keys appearing more than once. Reported, never deleted. */
  duplicateKeys: string[]
  skipped?: boolean
  error?: string
}

export function emptyReport(): ReconcileReport {
  return {
    ordersChecked: 0,
    rowsAdded: 0,
    rowsUpdated: 0,
    rowsUnchanged: 0,
    rowsFailed: 0,
    sheetOnlyRows: 0,
    duplicateKeys: [],
  }
}

/**
 * Project a batch of MongoDB orders into the sheet, changing nothing else.
 *
 * ── THE RULE THIS FUNCTION EXISTS TO KEEP ────────────────────────────────
 *
 * It is an UPSERT, never a mirror. A row in the sheet whose order is not in
 * this batch — because it was archived, deleted, or typed in by hand — is left
 * exactly as it is. Nothing here deletes a row, ever. The sheet is allowed to
 * hold more history than the database does, and that is the point: a business
 * record should outlive a database row.
 *
 * ── DUPLICATES ───────────────────────────────────────────────────────────
 *
 * If a Row Key already appears twice — a manual copy-paste, an older bug — the
 * FIRST occurrence is updated and the rest are left untouched and REPORTED.
 * Deleting them automatically would be destroying a business record on a guess.
 *
 * ── DIRECTION ────────────────────────────────────────────────────────────
 *
 * Strictly MongoDB → Sheets. Nothing read from the sheet ever reaches an order;
 * the values read here are used only to decide "does this row already say the
 * right thing", and if the sheet disagrees with MongoDB, the sheet is wrong.
 */
export async function reconcileOrders(orders: Order[]): Promise<ReconcileReport> {
  const report = emptyReport()
  const config = sheetsConfig()
  if (!config) return { ...report, skipped: true }

  try {
    sheetReady ??= ensureSheet(config)
    await sheetReady
  } catch (error) {
    sheetReady = undefined
    return { ...report, error: describe(error) }
  }

  try {
    const contents = await readSheetContents(config)
    report.duplicateKeys = [...contents.duplicates.keys()]

    const updates: { rowNumber: number; row: (string | number)[] }[] = []
    const appends: (string | number)[][] = []
    const touched = new Set<string>()

    for (const order of orders) {
      report.ordersChecked += 1
      orderToRows(order).forEach((row, index) => {
        const key = rowKey(order.reference, index)
        touched.add(key)
        const existing = contents.byKey.get(key)

        if (!existing) {
          appends.push(row)
          report.rowsAdded += 1
          return
        }
        // Already says the right thing: leave it alone rather than rewriting
        // the whole sheet on every run.
        if (rowsMatch(existing.values, row)) {
          report.rowsUnchanged += 1
          return
        }
        updates.push({ rowNumber: existing.rowNumber, row })
        report.rowsUpdated += 1
      })
    }

    /*
     * Everything in the sheet this batch did not account for. Preserved, and
     * counted so the admin can see the sheet holds more than the database.
     */
    report.sheetOnlyRows = [...contents.byKey.keys()].filter((key) => !touched.has(key)).length

    // Updates before appends: an append shifts nothing, but doing them in this
    // order means a failure half way leaves existing rows correct.
    try {
      await updateRows(config, updates)
    } catch (error) {
      report.rowsFailed += updates.length
      report.rowsUpdated -= updates.length
      report.error = describe(error)
    }

    try {
      await appendRows(config, appends)
    } catch (error) {
      report.rowsFailed += appends.length
      report.rowsAdded -= appends.length
      report.error ??= describe(error)
    }

    return report
  } catch (error) {
    return { ...report, error: describe(error) }
  }
}
