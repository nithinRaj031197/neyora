'use client'

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { registerMedia } from '@/lib/actions/media'
import {
  ACCEPTED_TYPES,
  ImageProcessingError,
  buildStoragePath,
  isVector,
  processImage,
} from '@/lib/media/resize'
import { storagePublicUrl } from '@/lib/media'
import { Icon } from '@/components/ui/Icon'
import { Alert } from '@/components/ui/Alert'
import { useToast } from './Toast'
import { cn } from '@/lib/utils/cn'
import { publicEnv } from '@/lib/env'
import type { MediaRow, MediaVariant } from '@/types/database'

interface UploadProgress {
  fileName: string
  stage: 'processing' | 'uploading' | 'saving' | 'done' | 'error'
  message?: string
}

/**
 * Uploads one or more images to the media library.
 *
 * The whole pipeline runs in the browser: resize to WebP at several widths,
 * push each file straight to Supabase Storage with the anon key (Storage RLS
 * only lets admins write), then record the metadata through a Server Action.
 * Image bytes never travel through a Server Action, so there is no body-size
 * ceiling to run into on Workers.
 */
export function ImageUploader({
  folder = 'general',
  onUploaded,
  compact = false,
}: {
  folder?: string
  onUploaded?: (media: MediaRow) => void
  compact?: boolean
}) {
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<UploadProgress[]>([])
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { push } = useToast()

  const upload = useCallback(
    async (files: FileList | File[]) => {
      setError(null)
      const bucket = publicEnv().mediaBucket
      const supabase = createClient()

      for (const file of Array.from(files)) {
        const update = (patch: Partial<UploadProgress>) =>
          setProgress((prev) => {
            const next = [...prev]
            const index = next.findIndex((p) => p.fileName === file.name)
            if (index === -1) next.push({ fileName: file.name, stage: 'processing', ...patch })
            else next[index] = { ...next[index]!, ...patch }
            return next
          })

        update({ stage: 'processing' })

        try {
          if (!ACCEPTED_TYPES.includes(file.type)) {
            throw new ImageProcessingError(`${file.name} is not an image we can accept.`)
          }

          // Vectors are stored as-is; rasterising them would be vandalism.
          if (isVector(file)) {
            const path = buildStoragePath({ folder, fileName: file.name, extension: 'svg' })
            update({ stage: 'uploading' })
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(path, file, { contentType: 'image/svg+xml', upsert: false })
            if (uploadError) throw new Error(uploadError.message)

            update({ stage: 'saving' })
            const result = await registerMedia({
              path,
              public_url: storagePublicUrl(path, bucket),
              mime_type: 'image/svg+xml',
              size_bytes: file.size,
              folder,
              alt: '',
              title: file.name.replace(/\.[^.]+$/, ''),
              variants: [],
            })
            if (result.status !== 'success' || !result.data) {
              throw new Error(result.message ?? 'Could not save the image record.')
            }
            update({ stage: 'done' })
            onUploaded?.(result.data)
            continue
          }

          const processed = await processImage(file)

          update({ stage: 'uploading' })

          const variants: MediaVariant[] = []
          let largestPath = ''
          let largestBytes = 0

          for (const variant of processed.variants) {
            const path = buildStoragePath({
              folder,
              fileName: file.name,
              width: variant.width,
              extension: variant.extension,
            })
            const { error: uploadError } = await supabase.storage
              .from(bucket)
              .upload(path, variant.blob, { contentType: variant.mimeType, upsert: false })
            if (uploadError) throw new Error(uploadError.message)

            variants.push({
              width: variant.width,
              path,
              bytes: variant.blob.size,
              url: storagePublicUrl(path, bucket),
            })

            if (variant.width >= largestBytes) {
              largestPath = path
              largestBytes = variant.width
            }
          }

          const largestVariant = variants.at(-1)
          const largest = processed.variants.at(-1)

          update({ stage: 'saving' })
          const result = await registerMedia({
            path: largestPath,
            public_url: largestVariant?.url ?? storagePublicUrl(largestPath, bucket),
            mime_type: largest?.mimeType ?? 'image/webp',
            // Store the largest generated size, which is what the srcset's
            // top entry actually is — not the untouched original's dimensions.
            width: largest?.width ?? processed.original.width,
            height: largest?.height ?? processed.original.height,
            size_bytes: largestVariant?.bytes ?? processed.original.sizeBytes,
            folder,
            alt: '',
            title: file.name.replace(/\.[^.]+$/, ''),
            variants,
          })

          if (result.status !== 'success' || !result.data) {
            throw new Error(result.message ?? 'Could not save the image record.')
          }

          update({ stage: 'done' })
          onUploaded?.(result.data)
          push('success', `${file.name} uploaded`)
        } catch (uploadError) {
          const message =
            uploadError instanceof Error ? uploadError.message : 'Something went wrong.'
          update({ stage: 'error', message })
          setError(message)
          push('error', `${file.name}: ${message}`)
        }
      }

      // Clear the input so choosing the same file again re-triggers change.
      if (inputRef.current) inputRef.current.value = ''
      window.setTimeout(() => setProgress((prev) => prev.filter((p) => p.stage === 'error')), 2500)
    },
    [folder, onUploaded, push],
  )

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          if (event.dataTransfer.files.length > 0) void upload(event.dataTransfer.files)
        }}
        className={cn(
          'flex flex-col items-center justify-center rounded-sm border border-dashed text-center transition-colors',
          compact ? 'px-4 py-6' : 'px-6 py-10',
          dragging ? 'border-botanical bg-leaf/8' : 'border-beige bg-ivory',
        )}
      >
        <Icon name="image" size={compact ? 22 : 28} className="text-beige" />
        <p className={cn('mt-3 text-earth-soft', compact ? 'text-[0.8125rem]' : 'text-[0.875rem]')}>
          Drag images here, or
        </p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="mt-3 inline-flex h-10 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
        >
          <Icon name="plus" size={15} />
          Choose files
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          multiple
          onChange={(event) => {
            if (event.target.files?.length) void upload(event.target.files)
          }}
          className="sr-only"
        />
        <p className="mt-3 max-w-[46ch] text-[0.75rem] leading-relaxed text-earth-muted">
          Images are resized in your browser to WebP at four widths, so pages load quickly. Upload
          the best original you have — up to 25 MB.
        </p>
      </div>

      {progress.length > 0 ? (
        <ul className="flex flex-col gap-1.5" aria-live="polite">
          {progress.map((item) => (
            <li
              key={item.fileName}
              className="flex items-center justify-between gap-3 rounded-xs border border-beige bg-ivory px-3 py-2 text-[0.8125rem]"
            >
              <span className="min-w-0 flex-1 truncate text-earth">{item.fileName}</span>
              <span
                className={cn(
                  'shrink-0 text-[0.75rem]',
                  item.stage === 'error' ? 'text-danger' : 'text-earth-muted',
                )}
              >
                {item.stage === 'processing' && 'Resizing…'}
                {item.stage === 'uploading' && 'Uploading…'}
                {item.stage === 'saving' && 'Saving…'}
                {item.stage === 'done' && 'Done'}
                {item.stage === 'error' && (item.message ?? 'Failed')}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <Alert tone="danger">{error}</Alert> : null}
    </div>
  )
}
