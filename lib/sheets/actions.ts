'use server'

import { requireAdmin } from '@/lib/auth/session'
import {
  acquireSyncLock,
  listOrders,
  recordSheetSync,
  releaseSyncLock,
} from '@/lib/orders/repository'
import { emptyReport, reconcileOrders, type ReconcileReport } from './sync'

/**
 * The admin's "Sync All" button.
 *
 * Lives beside the rest of the Sheets code rather than with the order list,
 * because it is a Sheets operation that happens to read orders — not an order
 * operation. The only thing it shares with pagination is `listOrders`.
 */

export interface SyncAllState {
  status: 'idle' | 'done' | 'error'
  message?: string
  report?: ReconcileReport
  /** Set when orders remain. The UI offers "Continue sync". */
  nextCursor?: string | null
}

/** Matches the existing backfill batching, and what a Worker can finish. */
const SYNC_BATCH = 25
const LOCK = 'sheets-sync-all'

/**
 * Reconcile MongoDB orders into the Google Sheets Orders tab.
 *
 * ONE WAY, AND NON-DESTRUCTIVE. Orders are upserted by Row Key; a sheet row
 * with no matching order — history, an archived order, a hand-typed line — is
 * left exactly where it is. Nothing here deletes a row.
 *
 * This is the same operation as the per-order background sync, run over a
 * batch: identical mapping, identical Row Key, identical upsert. There is no
 * second synchronisation system, which is why running it repeatedly is safe.
 *
 * Admin-only, and guarded by a lock so two runs cannot both decide a row is
 * missing and both append it.
 *
 * Batched at 25 and resumable by cursor, because a Worker invocation has a
 * deadline and an unbounded loop over every order would eventually hit it.
 */
export async function syncAllOrders(
  _previous: SyncAllState,
  formData: FormData,
): Promise<SyncAllState> {
  let admin
  try {
    admin = await requireAdmin()
  } catch {
    return { status: 'error', message: 'Your session has expired. Please sign in again.' }
  }

  const cursor = String(formData.get('cursor') ?? '').trim() || undefined

  if (!(await acquireSyncLock(LOCK, admin.email))) {
    return {
      status: 'error',
      message: 'A sync is already running. Wait for it to finish before starting another.',
    }
  }

  try {
    const page = await listOrders({ limit: SYNC_BATCH, cursor })
    if (page.orders.length === 0) {
      return { status: 'done', message: 'No orders to sync.', report: emptyReport() }
    }

    const report = await reconcileOrders(page.orders)

    if (report.skipped) {
      return { status: 'error', message: 'Google Sheets is not configured, so nothing was synced.' }
    }

    /*
     * Each order's own sync state is updated too, so the dashboard's "behind"
     * count and the background retry agree with what just happened. Failures
     * are recorded per order rather than inferred.
     */
    const ok = report.rowsFailed === 0 && !report.error
    await Promise.all(
      page.orders.map((order) =>
        recordSheetSync(order.reference, { ok, error: ok ? undefined : report.error }).catch(
          (error: unknown) => console.error('[sheets] could not record sync state', error),
        ),
      ),
    )

    return {
      status: report.rowsFailed > 0 || report.error ? 'error' : 'done',
      report,
      nextCursor: page.nextCursor,
      message: report.error,
    }
  } catch (error) {
    console.error('[sheets] sync all failed', error)
    return { status: 'error', message: 'Sync stopped early. See the server logs.' }
  } finally {
    // Always released, including on the error paths above — otherwise one
    // failure locks the button for the full TTL.
    await releaseSyncLock(LOCK, admin.email).catch(() => {})
  }
}
