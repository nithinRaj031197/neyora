'use client'

import { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { ImageUploader } from './ImageUploader'
import { Icon } from '@/components/ui/Icon'
import { Alert } from '@/components/ui/Alert'
import { cn } from '@/lib/utils/cn'

export interface PickableMedia {
  id: string
  public_url: string
  alt: string | null
  title: string | null
  width: number | null
  height: number | null
  mime_type: string
  folder: string
}

/**
 * Media library picker.
 *
 * Loads the library on open, not on mount, so a form with six image fields
 * does not fire six requests before anyone clicks anything.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  folder,
}: {
  open: boolean
  onClose: () => void
  onSelect: (media: PickableMedia) => void
  folder?: string
}) {
  const [media, setMedia] = useState<PickableMedia[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [showUploader, setShowUploader] = useState(false)

  /*
   * Loads the library when the dialog opens, and again (debounced) as the
   * search term changes.
   *
   * One effect rather than two: it owns a single timer and a single
   * `cancelled` flag, so a fast typist cannot have an earlier, slower response
   * overwrite a later one. State is only ever set from inside the async
   * callback, never synchronously in the effect body — the latter would
   * trigger a cascading render on open.
   */
  useEffect(() => {
    // Nothing to clear on close: the next open resets `error` before fetching.
    if (!open) return

    let cancelled = false
    const controller = new AbortController()

    // No delay on open; a short debounce while typing.
    const timer = window.setTimeout(
      () => {
        void (async () => {
          setLoading(true)
          setError(null)
          try {
            const params = new URLSearchParams()
            if (query) params.set('q', query)
            if (folder) params.set('folder', folder)

            const response = await fetch(`/api/admin/media?${params.toString()}`, {
              cache: 'no-store',
              signal: controller.signal,
            })

            if (!response.ok) {
              throw new Error(
                response.status === 401
                  ? 'Your session has expired. Reload the page and sign in again.'
                  : 'Could not load the media library.',
              )
            }

            const payload = (await response.json()) as { media: PickableMedia[] }
            if (!cancelled) setMedia(payload.media)
          } catch (loadError) {
            if (cancelled || controller.signal.aborted) return
            setError(loadError instanceof Error ? loadError.message : 'Could not load images.')
          } finally {
            if (!cancelled) setLoading(false)
          }
        })()
      },
      query ? 300 : 0,
    )

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [open, query, folder])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Media library"
      description="Choose an image, or upload a new one."
      size="wide"
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-52 flex-1">
            <label htmlFor="media-picker-search" className="sr-only">
              Search images
            </label>
            <Icon
              name="search"
              size={15}
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-earth-muted"
            />
            <input
              id="media-picker-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or alt text"
              className="h-10 w-full rounded-xs border border-beige bg-ivory pr-3 pl-9 text-[0.875rem] focus:border-botanical focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowUploader((v) => !v)}
            aria-expanded={showUploader}
            className="inline-flex h-10 items-center gap-2 rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
          >
            <Icon name="plus" size={15} />
            Upload new
          </button>
        </div>

        {showUploader ? (
          <ImageUploader
            compact
            folder={folder ?? 'general'}
            onUploaded={(uploaded) => {
              setMedia((prev) => [uploaded as PickableMedia, ...prev])
              setShowUploader(false)
            }}
          />
        ) : null}

        {error ? <Alert tone="danger">{error}</Alert> : null}

        {loading ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-square animate-pulse rounded-xs bg-beige-soft" />
            ))}
          </div>
        ) : media.length === 0 ? (
          <div className="rounded-sm border border-dashed border-beige px-5 py-10 text-center">
            <p className="text-[0.875rem] text-earth-soft">
              {query ? 'No images match that search.' : 'The library is empty.'}
            </p>
            <button
              type="button"
              onClick={() => setShowUploader(true)}
              className="mt-4 text-[0.8125rem] text-botanical underline decoration-botanical/40 underline-offset-4"
            >
              Upload your first image
            </button>
          </div>
        ) : (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {media.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={cn(
                    'group block w-full overflow-hidden rounded-xs border border-beige text-left transition-colors',
                    'hover:border-botanical focus-visible:border-botanical',
                  )}
                >
                  <span className="block aspect-square overflow-hidden bg-beige-soft">
                    <img
                      src={item.public_url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </span>
                  <span className="block px-2 py-1.5">
                    <span className="block truncate text-[0.75rem] text-earth">
                      {item.title || 'Untitled'}
                    </span>
                    {/* Missing alt text is a real accessibility problem, so
                        the picker flags it where it is easiest to fix. */}
                    {item.alt ? null : (
                      <span className="mt-0.5 block text-[0.6875rem] text-warning">
                        No alt text
                      </span>
                    )}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  )
}
