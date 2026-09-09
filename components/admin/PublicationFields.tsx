'use client'

import { useState } from 'react'
import { Field, Select } from '@/components/ui/Form'
import { toDateTimeLocalValue } from '@/lib/utils/format'
import type { ContentStatus } from '@/types/database'

/**
 * Status + schedule inputs for the smaller forms that do not warrant the full
 * sticky PublishBar.
 *
 * The datetime input stays in the DOM when not scheduling (hidden, empty) so
 * the Server Action always receives the field it expects.
 */
export function PublicationFields({
  defaultStatus = 'draft',
  defaultScheduledAt = null,
  scheduleError,
}: {
  defaultStatus?: ContentStatus
  defaultScheduledAt?: string | null
  scheduleError?: string
}) {
  const [status, setStatus] = useState<ContentStatus>(defaultStatus)

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Status" htmlFor="status">
        <Select
          id="status"
          name="status"
          value={status}
          onChange={(event) => setStatus(event.target.value as ContentStatus)}
        >
          <option value="draft">Draft — not visible</option>
          <option value="published">Published — live now</option>
          <option value="scheduled">Scheduled — goes live later</option>
        </Select>
      </Field>

      {status === 'scheduled' ? (
        <Field
          label="Publish at (UTC)"
          htmlFor="scheduled_at"
          error={scheduleError}
          hint="Goes live automatically once this time passes."
        >
          <input
            id="scheduled_at"
            name="scheduled_at"
            type="datetime-local"
            defaultValue={toDateTimeLocalValue(defaultScheduledAt)}
            aria-invalid={Boolean(scheduleError) || undefined}
            className={`h-11 w-full rounded-xs border bg-ivory px-3 text-[0.9375rem] focus:border-botanical focus:outline-none ${
              scheduleError ? 'border-danger' : 'border-beige'
            }`}
          />
        </Field>
      ) : (
        <input type="hidden" name="scheduled_at" value="" />
      )}
    </div>
  )
}
