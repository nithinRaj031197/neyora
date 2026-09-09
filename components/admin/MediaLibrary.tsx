'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ImageUploader } from './ImageUploader'
import { Modal } from './Modal'
import { SimpleForm } from './SimpleForm'
import { ConfirmButton } from './ConfirmButton'
import { Field, Input, Textarea } from '@/components/ui/Form'
import { Badge } from '@/components/ui/Badge'
import { EmptyState } from '@/components/ui/EmptyState'
import { Icon } from '@/components/ui/Icon'
import { useToast } from './Toast'
import { deleteMedia, updateMediaMeta } from '@/lib/actions/media'
import { formatBytes, formatDate } from '@/lib/utils/format'
import type { MediaRow } from '@/types/database'

/**
 * The media library grid.
 *
 * Missing alt text is surfaced on the thumbnail rather than hidden in a detail
 * panel: alt text is an accessibility requirement, and the only way it gets
 * written is if the gap is visible where the work happens.
 */
export function MediaLibrary({
  media,
  folder,
  uploadOnly = false,
}: {
  media: MediaRow[]
  folder: string
  uploadOnly?: boolean
}) {
  const router = useRouter()
  const [selected, setSelected] = useState<MediaRow | null>(null)
  const { push } = useToast()

  async function copyUrl(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      push('success', 'Image URL copied')
    } catch {
      push('error', 'Your browser blocked clipboard access')
    }
  }

  if (uploadOnly) {
    return <ImageUploader folder={folder} onUploaded={() => router.refresh()} />
  }

  if (media.length === 0) {
    return (
      <EmptyState
        icon="image"
        title="No images here yet"
        description="Upload the photography for your hero, products and recipes. Everything is resized automatically."
      />
    )
  }

  return (
    <>
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {media.map((item) => (
          <li key={item.id} className="overflow-hidden rounded-sm border border-beige bg-ivory">
            <button
              type="button"
              onClick={() => setSelected(item)}
              className="block w-full text-left"
            >
              <span className="block aspect-square overflow-hidden bg-beige-soft">
                <img
                  src={item.public_url}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </span>
            </button>

            <div className="px-3 py-2.5">
              <p className="truncate text-[0.8125rem] font-medium text-earth">
                {item.title || 'Untitled'}
              </p>
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                {item.is_demo ? <Badge tone="golden">Demo</Badge> : null}
                {item.alt?.trim() ? (
                  <span className="text-[0.6875rem] text-earth-muted">
                    {item.width}×{item.height}
                  </span>
                ) : (
                  <Badge tone="warning">No alt text</Badge>
                )}
              </div>

              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="inline-flex h-8 items-center rounded-xs border border-beige px-2.5 text-[0.6875rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                >
                  Details
                </button>
                <button
                  type="button"
                  onClick={() => copyUrl(item.public_url)}
                  aria-label={`Copy URL for ${item.title || 'image'}`}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-xs border border-beige text-earth-muted transition-colors hover:border-forest/50 hover:text-forest"
                >
                  <Icon name="link" size={13} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title="Image details"
        description="Alt text is read aloud by screen readers and used when an image fails to load. Describe what is in the picture."
        size="wide"
      >
        {selected ? (
          <div className="flex flex-col gap-5">
            <div className="overflow-hidden rounded-sm border border-beige bg-beige-soft">
              <img
                src={selected.public_url}
                alt={selected.alt ?? ''}
                className="mx-auto max-h-72 w-auto object-contain"
              />
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-[0.8125rem] sm:grid-cols-4">
              <div>
                <dt className="text-earth-muted">Dimensions</dt>
                <dd className="text-earth">
                  {selected.width ?? '?'} × {selected.height ?? '?'}
                </dd>
              </div>
              <div>
                <dt className="text-earth-muted">Size</dt>
                <dd className="text-earth">{formatBytes(selected.size_bytes)}</dd>
              </div>
              <div>
                <dt className="text-earth-muted">Sizes stored</dt>
                <dd className="text-earth">{selected.variants.length || 1}</dd>
              </div>
              <div>
                <dt className="text-earth-muted">Uploaded</dt>
                <dd className="text-earth">{formatDate(selected.created_at)}</dd>
              </div>
            </dl>

            <div className="flex items-center gap-2 rounded-xs border border-beige bg-ivory-soft px-3 py-2">
              <code className="min-w-0 flex-1 truncate font-mono text-[0.75rem] text-earth-soft">
                {selected.public_url}
              </code>
              <button
                type="button"
                onClick={() => copyUrl(selected.public_url)}
                className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-xs border border-beige bg-ivory px-2.5 text-[0.6875rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
              >
                <Icon name="link" size={13} />
                Copy
              </button>
            </div>

            <SimpleForm action={updateMediaMeta} submitLabel="Save details">
              {(state) => (
                <>
                  <input type="hidden" name="id" value={selected.id} />

                  <Field
                    label="Alt text"
                    htmlFor="alt"
                    hint="Describe the image for someone who cannot see it. Skip “image of” — screen readers already say that."
                    error={state.errors?.alt}
                  >
                    <Input
                      id="alt"
                      name="alt"
                      defaultValue={selected.alt ?? ''}
                      maxLength={300}
                      invalid={Boolean(state.errors?.alt)}
                      placeholder="Clusters of grey oyster mushrooms on raw linen in morning light"
                    />
                  </Field>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field label="Title" htmlFor="title" hint="Internal name, to help you find it again.">
                      <Input id="title" name="title" defaultValue={selected.title ?? ''} />
                    </Field>
                    <Field
                      label="Folder"
                      htmlFor="media-folder"
                      hint="Lowercase, hyphens only. Groups images in the library."
                      error={state.errors?.folder}
                    >
                      <Input
                        id="media-folder"
                        name="folder"
                        defaultValue={selected.folder}
                        invalid={Boolean(state.errors?.folder)}
                        className="font-mono"
                      />
                    </Field>
                  </div>

                  <Field label="Description" htmlFor="description" hint="Optional notes — shoot details, credit, usage.">
                    <Textarea
                      id="description"
                      name="description"
                      rows={2}
                      defaultValue={selected.description ?? ''}
                    />
                  </Field>
                </>
              )}
            </SimpleForm>

            <div className="border-t border-beige pt-5">
              <ConfirmButton
                action={deleteMedia}
                hiddenFields={{ id: selected.id }}
                triggerLabel="Delete image"
                title="Delete this image?"
                description="It is removed from the library and every size is deleted from storage. Anything currently using it will lose its image — check first."
                confirmLabel="Delete permanently"
              />
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  )
}
