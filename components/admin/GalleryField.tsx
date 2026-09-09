'use client'

import { useState } from 'react'
import { MediaPicker, type PickableMedia } from './MediaPicker'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import type { MediaRow } from '@/types/database'

/**
 * Ordered image gallery.
 *
 * Order is meaningful — position one is the primary image used on cards and
 * in Open Graph tags — so the first slot is labelled explicitly rather than
 * left for the editor to infer.
 */
export function GalleryField({
  name,
  value,
  onChange,
  folder,
  max = 12,
}: {
  name: string
  value: MediaRow[]
  onChange: (next: MediaRow[]) => void
  folder?: string
  max?: number
}) {
  const [open, setOpen] = useState(false)

  function move(index: number, delta: number) {
    const target = index + delta
    if (target < 0 || target >= value.length) return
    const next = [...value]
    const [moved] = next.splice(index, 1)
    if (!moved) return
    next.splice(target, 0, moved)
    onChange(next)
  }

  const iconButton =
    'inline-flex h-8 w-8 items-center justify-center rounded-xs border border-beige bg-ivory text-earth-muted transition-colors hover:border-forest/50 hover:text-forest disabled:pointer-events-none disabled:opacity-35'

  return (
    <div className="flex flex-col gap-4">
      <input type="hidden" name={name} value={JSON.stringify(value.map((m) => m.id))} />

      {value.length === 0 ? (
        <p className="rounded-sm border border-dashed border-beige px-4 py-8 text-center text-[0.875rem] text-earth-muted">
          No images yet. The product page needs at least one.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {value.map((media, index) => (
            <li key={media.id} className="rounded-sm border border-beige bg-ivory p-2">
              <span className="block aspect-square overflow-hidden rounded-xs bg-beige-soft">
                <img
                  src={media.public_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </span>

              <div className="mt-2 flex items-center justify-between gap-1">
                {index === 0 ? <Badge tone="leaf">Primary</Badge> : <span />}
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move image earlier"
                    className={iconButton}
                  >
                    <Icon name="chevron-right" size={13} className="rotate-180" />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(index, 1)}
                    disabled={index === value.length - 1}
                    aria-label="Move image later"
                    className={iconButton}
                  >
                    <Icon name="chevron-right" size={13} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange(value.filter((_, i) => i !== index))}
                    aria-label="Remove image"
                    className={`${iconButton} hover:border-danger hover:text-danger`}
                  >
                    <Icon name="trash" size={13} />
                  </button>
                </div>
              </div>

              {!media.alt ? (
                <p className="mt-1.5 text-[0.6875rem] leading-snug text-warning">
                  No alt text — add it in the media library.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={value.length >= max}
        className="inline-flex h-10 w-fit items-center gap-2 rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium text-earth-soft transition-colors hover:border-forest/50 hover:text-forest disabled:pointer-events-none disabled:opacity-40"
      >
        <Icon name="plus" size={15} />
        Add image
      </button>

      <MediaPicker
        open={open}
        onClose={() => setOpen(false)}
        folder={folder}
        onSelect={(picked: PickableMedia) => {
          // Silently ignore a duplicate rather than adding the same photo twice.
          if (!value.some((m) => m.id === picked.id)) {
            onChange([...value, picked as MediaRow])
          }
          setOpen(false)
        }}
      />
    </div>
  )
}
