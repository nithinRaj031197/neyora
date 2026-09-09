'use client'

import { useFormStatus } from 'react-dom'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Select } from '@/components/ui/Form'
import { toDateTimeLocalValue } from '@/lib/utils/format'
import type { ContentStatus } from '@/types/database'

function SaveButton({ status }: { status: ContentStatus }) {
  const { pending } = useFormStatus()
  const label =
    status === 'published' ? 'Save & publish' : status === 'scheduled' ? 'Save & schedule' : 'Save draft'

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center gap-2 rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Saving…' : label}
      {!pending ? <Icon name="check" size={15} /> : null}
    </button>
  )
}

/**
 * Sticky publish controls.
 *
 * Pinned to the bottom of the viewport because a recipe form is long: an
 * editor should never have to scroll to find Save, and should always be able
 * to see whether they are about to publish or just save a draft.
 */
export function PublishBar({
  status,
  onStatusChange,
  scheduledAt,
  onScheduledAtChange,
  previewHref,
  publicHref,
  extra,
  scheduleError,
}: {
  status: ContentStatus
  onStatusChange: (status: ContentStatus) => void
  scheduledAt: string | null
  onScheduledAtChange: (value: string) => void
  previewHref?: string
  publicHref?: string
  extra?: React.ReactNode
  scheduleError?: string
}) {
  return (
    <div className="sticky bottom-0 z-30 -mx-5 mt-8 border-t border-beige bg-ivory/97 px-5 py-3.5 lg:-mx-8 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-40">
            <label
              htmlFor="status"
              className="text-[0.6875rem] font-semibold tracking-[0.12em] text-earth-muted uppercase"
            >
              Status
            </label>
            <Select
              id="status"
              name="status"
              value={status}
              onChange={(event) => onStatusChange(event.target.value as ContentStatus)}
              className="mt-1.5 h-11"
            >
              <option value="draft">Draft — not visible</option>
              <option value="published">Published — live now</option>
              <option value="scheduled">Scheduled — goes live later</option>
            </Select>
          </div>

          {/*
            Only rendered for 'scheduled', but the input must still exist in
            the form for other statuses, so it is hidden rather than removed.
          */}
          <div className={status === 'scheduled' ? 'min-w-56' : 'hidden'}>
            <label
              htmlFor="scheduled_at"
              className="text-[0.6875rem] font-semibold tracking-[0.12em] text-earth-muted uppercase"
            >
              Publish at (UTC)
            </label>
            <input
              id="scheduled_at"
              name="scheduled_at"
              type="datetime-local"
              value={toDateTimeLocalValue(scheduledAt)}
              onChange={(event) => onScheduledAtChange(event.target.value)}
              aria-invalid={Boolean(scheduleError) || undefined}
              className={`mt-1.5 h-11 w-full rounded-xs border bg-ivory px-3 text-[0.875rem] focus:border-botanical focus:outline-none ${
                scheduleError ? 'border-danger' : 'border-beige'
              }`}
            />
            {scheduleError ? (
              <p className="mt-1 text-[0.75rem] text-danger">{scheduleError}</p>
            ) : null}
          </div>

          {status !== 'scheduled' ? (
            <input type="hidden" name="scheduled_at" value="" />
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {extra}
          {previewHref ? (
            <Link
              href={previewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-beige px-4 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
            >
              <Icon name="external" size={15} />
              Preview
            </Link>
          ) : null}
          {publicHref ? (
            <Link
              href={publicHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center gap-2 rounded-xs border border-beige px-4 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
            >
              <Icon name="external" size={15} />
              View live
            </Link>
          ) : null}
          <SaveButton status={status} />
        </div>
      </div>
    </div>
  )
}
