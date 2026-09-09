'use client'

import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { ContentStatus } from '@/types/database'

/**
 * Per-row actions in an admin list.
 *
 * Each control is its own tiny <form> posting to a Server Action, rather than
 * a fetch: it works without JavaScript, Next revalidates the list
 * automatically, and there is no client-side state to fall out of sync with
 * the database.
 */
export function RowActions({
  id,
  status,
  featured,
  editHref,
  publicHref,
  previewHref,
  statusAction,
  featureAction,
  duplicateAction,
}: {
  id: string
  status: ContentStatus
  featured?: boolean
  editHref: string
  publicHref?: string
  previewHref?: string
  statusAction?: (formData: FormData) => void | Promise<void>
  featureAction?: (formData: FormData) => void | Promise<void>
  duplicateAction?: (formData: FormData) => void | Promise<void>
}) {
  const button =
    'inline-flex h-8 w-8 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest'

  return (
    <div className="flex items-center justify-end gap-1.5">
      {featureAction ? (
        <form action={featureAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="featured" value={featured ? 'false' : 'true'} />
          <button
            type="submit"
            title={featured ? 'Remove from featured' : 'Feature this'}
            aria-label={featured ? 'Remove from featured' : 'Feature this'}
            className={`${button} ${featured ? 'border-leaf/60 text-botanical' : ''}`}
          >
            <Icon name="leaf" size={14} />
          </button>
        </form>
      ) : null}

      {statusAction ? (
        <form action={statusAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="status" value={status === 'published' ? 'draft' : 'published'} />
          <button
            type="submit"
            title={status === 'published' ? 'Unpublish' : 'Publish now'}
            aria-label={status === 'published' ? 'Unpublish' : 'Publish now'}
            className={button}
          >
            <Icon name={status === 'published' ? 'alert' : 'check'} size={14} />
          </button>
        </form>
      ) : null}

      {duplicateAction ? (
        <form action={duplicateAction}>
          <input type="hidden" name="id" value={id} />
          <button type="submit" title="Duplicate" aria-label="Duplicate" className={button}>
            <Icon name="plus" size={14} />
          </button>
        </form>
      ) : null}

      {previewHref && status !== 'published' ? (
        <Link
          href={previewHref}
          target="_blank"
          rel="noopener noreferrer"
          title="Preview"
          aria-label="Preview"
          className={button}
        >
          <Icon name="search" size={14} />
        </Link>
      ) : null}

      {publicHref ? (
        <Link
          href={publicHref}
          target="_blank"
          rel="noopener noreferrer"
          title="View live"
          aria-label="View live"
          className={button}
        >
          <Icon name="external" size={14} />
        </Link>
      ) : null}

      <Link href={editHref} title="Edit" aria-label="Edit" className={button}>
        <Icon name="chevron-right" size={14} />
      </Link>
    </div>
  )
}
