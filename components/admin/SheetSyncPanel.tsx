'use client'

import { useActionState } from 'react'
import { syncAllOrders, type SyncAllState } from '@/lib/sheets/actions'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { useActionToast } from './useActionToast'

/**
 * The Google Sheets projection, and the button that reconciles it.
 *
 * "Sync All" is the same upsert the background sync performs, run over a batch
 * — not a second synchronisation system. It is safe to press repeatedly: every
 * row is keyed by `NEY-0021#1`, so a second run updates rather than appends.
 *
 * It is also NON-DESTRUCTIVE in the direction that matters. The sheet may hold
 * rows this database no longer has, and those are counted and left alone. The
 * panel says so, because an admin pressing a sync button deserves to know it
 * cannot eat their history.
 */
export function SheetSyncPanel({
  configured,
  behind,
  lastSyncedAt,
}: {
  configured: boolean
  /** Orders whose rows are missing or out of date. */
  behind: number
  lastSyncedAt?: Date | null
}) {
  const [state, action, pending] = useActionState<SyncAllState, FormData>(syncAllOrders, {
    status: 'idle',
  })

  useActionToast(
    // The hook fires on 'saved' | 'error'; map the reconcile's own vocabulary.
    { status: state.status === 'done' ? 'saved' : state.status, message: state.message },
    { title: 'Google Sheets synced', description: summary(state) },
  )

  if (!configured) {
    return (
      <div className="mt-6 flex flex-wrap items-center gap-3 rounded-sm border border-beige bg-ivory px-4 py-3">
        <Badge tone="outline">Google Sheets not set up</Badge>
        <p className="text-[0.8125rem] text-earth-muted">
          Orders are safe in the database. Add the Google credentials to start the
          reporting sheet.
        </p>
      </div>
    )
  }

  const report = state.report
  const more = Boolean(state.nextCursor)

  return (
    <section className="mt-6 rounded-sm border border-beige bg-ivory px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="text-[0.75rem] font-medium tracking-[0.1em] text-earth-muted uppercase">
          Google Sheets
        </p>
        {behind > 0 ? (
          <Badge tone="warning">{behind} not yet in the sheet</Badge>
        ) : (
          <Badge tone="success">Up to date</Badge>
        )}
        <p className="text-[0.8125rem] text-earth-muted">
          {lastSyncedAt
            ? `Last sync ${new Date(lastSyncedAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
                timeZone: 'Asia/Kolkata',
              })}`
            : 'Never synced'}
        </p>

        <form action={action} className="ml-auto flex items-center gap-2">
          {/* Carries the cursor so "Continue" resumes rather than restarting. */}
          {more ? <input type="hidden" name="cursor" value={state.nextCursor ?? ''} /> : null}
          <Button type="submit" size="sm" variant="secondary" disabled={pending}>
            {pending ? 'Syncing…' : more ? 'Continue sync' : 'Sync all orders'}
          </Button>
        </form>
      </div>

      {report ? (
        <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-t border-beige pt-3 text-[0.8125rem]">
          <Stat label="Orders checked" value={report.ordersChecked} />
          <Stat label="Rows added" value={report.rowsAdded} />
          <Stat label="Rows updated" value={report.rowsUpdated} />
          <Stat label="Already current" value={report.rowsUnchanged} />
          {report.rowsFailed > 0 ? <Stat label="Failed" value={report.rowsFailed} tone="danger" /> : null}
          {/* The reassurance: the sheet keeps what the database no longer has. */}
          <Stat label="Sheet-only rows kept" value={report.sheetOnlyRows} />
        </dl>
      ) : null}

      {report && report.duplicateKeys.length > 0 ? (
        <p className="mt-2.5 flex items-start gap-2 rounded-xs bg-warning/10 px-3 py-2 text-[0.8125rem] text-warning">
          <Icon name="alert" size={15} className="mt-0.5 shrink-0" />
          <span>
            {report.duplicateKeys.length} duplicate row
            {report.duplicateKeys.length === 1 ? '' : 's'} need review:{' '}
            <span className="font-mono">{report.duplicateKeys.slice(0, 5).join(', ')}</span>
            {report.duplicateKeys.length > 5 ? ' and more' : ''}. Nothing was deleted — open the
            sheet and remove the extra rows by hand if they are wrong.
          </span>
        </p>
      ) : null}

      {more ? (
        <p className="mt-2.5 text-[0.8125rem] text-earth-muted">
          More orders remain. Press “Continue sync” for the next {25}.
        </p>
      ) : null}
    </section>
  )
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone?: 'danger'
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <dt className="text-earth-muted">{label}</dt>
      <dd className={tone === 'danger' ? 'font-medium text-danger' : 'font-medium text-forest'}>
        {value}
      </dd>
    </div>
  )
}

function summary(state: SyncAllState): string | undefined {
  if (!state.report) return state.message
  const { rowsAdded, rowsUpdated, rowsUnchanged, sheetOnlyRows } = state.report
  return `${rowsAdded} added, ${rowsUpdated} updated, ${rowsUnchanged} already current, ${sheetOnlyRows} sheet-only rows kept.`
}
