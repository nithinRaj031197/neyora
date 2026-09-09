/**
 * Media helpers.
 *
 * Responsive images without a paid image service: the admin uploader resizes
 * each file in the browser to WebP at several widths and stores every one in
 * Supabase Storage. Those widths land in `media.variants`, and this module
 * turns them into a real `srcset`. The browser then downloads roughly the
 * bytes it needs — the same outcome a transformation CDN would give us, paid
 * for once at upload instead of on every request.
 */
import type { MediaRow, MediaVariant } from '@/types/database'
import { publicEnv, supabaseEnv } from '@/lib/env'

/** Widths generated on upload. Covers phones through 2× desktop. */
export const UPLOAD_WIDTHS = [480, 960, 1600, 2400] as const

/** Only what a component needs, so callers can pass partial selections. */
export type MediaLike = Pick<
  MediaRow,
  'public_url' | 'alt' | 'width' | 'height' | 'variants' | 'mime_type'
> & { title?: string | null }

export function storagePublicUrl(path: string, bucket = publicEnv().mediaBucket): string {
  const { supabaseUrl } = supabaseEnv()
  return `${supabaseUrl}/storage/v1/object/public/${bucket}/${path.replace(/^\/+/, '')}`
}

function variantUrl(v: MediaVariant): string {
  return v.url ?? storagePublicUrl(v.path)
}

/** `srcset` string, or undefined when there is only one size on offer. */
export function buildSrcSet(media: MediaLike): string | undefined {
  const variants = Array.isArray(media.variants) ? media.variants : []
  if (variants.length === 0) return undefined
  return [...variants]
    .sort((a, b) => a.width - b.width)
    .map((v) => `${variantUrl(v)} ${v.width}w`)
    .join(', ')
}

/** The middle variant as `src`, so a no-srcset browser gets something sane. */
export function bestFallbackSrc(media: MediaLike): string {
  const variants = Array.isArray(media.variants) ? media.variants : []
  if (variants.length === 0) return media.public_url
  const sorted = [...variants].sort((a, b) => a.width - b.width)
  const mid = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length / 2))]
  return mid ? variantUrl(mid) : media.public_url
}

export function aspectRatio(media: MediaLike): number | undefined {
  if (!media.width || !media.height) return undefined
  return media.width / media.height
}

/** Never renders an empty alt on a content image — a11y regression guard. */
export function altText(media: MediaLike | null | undefined, fallback = ''): string {
  return media?.alt?.trim() || fallback
}
