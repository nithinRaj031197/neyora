'use client'

import { useState } from 'react'
import { MediaPicker, type PickableMedia } from './MediaPicker'
import { Icon } from '@/components/ui/Icon'

/**
 * A form field that holds a media id.
 *
 * The id travels in a hidden input, so the surrounding form stays a plain
 * form and the Server Action receives a uuid it can validate like any other
 * field. Shows the current image, its alt text status, and a way to clear it.
 */
export function ImageField({
  name,
  label,
  hint,
  defaultMedia,
  folder,
  aspect = '4 / 3',
}: {
  name: string
  label: string
  hint?: string
  defaultMedia?: { id: string; public_url: string; alt: string | null; title: string | null } | null
  folder?: string
  aspect?: string
}) {
  const [media, setMedia] = useState(defaultMedia ?? null)
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col gap-2">
      <span className="text-[0.8125rem] font-medium text-earth">{label}</span>
      {hint ? (
        <p className="max-w-[70ch] text-[0.75rem] leading-relaxed text-earth-muted">{hint}</p>
      ) : null}

      <input type="hidden" name={name} value={media?.id ?? ''} />

      {media ? (
        <div className="flex flex-col gap-3 rounded-sm border border-beige bg-ivory p-3 sm:flex-row sm:items-start">
          <span
            className="block w-full shrink-0 overflow-hidden rounded-xs bg-beige-soft sm:w-40"
            style={{ aspectRatio: aspect }}
          >
            <img
              src={media.public_url}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
            />
          </span>

          <div className="min-w-0 flex-1">
            <p className="truncate text-[0.875rem] font-medium text-earth">
              {media.title || 'Untitled image'}
            </p>
            <p className="mt-1 text-[0.75rem] leading-relaxed text-earth-muted">
              {media.alt ? (
                <>Alt: {media.alt}</>
              ) : (
                <span className="text-warning">
                  No alt text — add it in the media library so screen readers can describe it.
                </span>
              )}
            </p>

            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest"
              >
                <Icon name="image" size={14} />
                Replace
              </button>
              <button
                type="button"
                onClick={() => setMedia(null)}
                className="inline-flex h-9 items-center rounded-xs border border-beige px-3 text-[0.75rem] font-medium text-earth-soft transition-colors hover:border-danger hover:text-danger"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex items-center justify-center gap-2 rounded-sm border border-dashed border-beige bg-ivory px-4 py-8 text-[0.875rem] text-earth-soft transition-colors hover:border-botanical hover:text-forest"
        >
          <Icon name="image" size={18} />
          Choose an image
        </button>
      )}

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        folder={folder}
        onSelect={(picked: PickableMedia) => {
          setMedia({
            id: picked.id,
            public_url: picked.public_url,
            alt: picked.alt,
            title: picked.title,
          })
          setOpen(false)
        }}
      />
    </div>
  )
}
