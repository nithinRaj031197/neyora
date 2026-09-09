import { cn } from '@/lib/utils/cn'
import { altText, bestFallbackSrc, buildSrcSet, type MediaLike } from '@/lib/media'

/**
 * The one image component.
 *
 * A plain <img> with a hand-built srcset rather than next/image, because image
 * optimisation is unavailable on Cloudflare Workers without a paid service —
 * so the sizes are generated at upload time instead (see lib/media.ts).
 * Explicit width/height on every image keeps CLS at zero.
 */
export function Picture({
  media,
  alt,
  sizes = '100vw',
  priority = false,
  className,
  wrapperClassName,
  aspect,
  fit = 'cover',
  position,
}: {
  media: MediaLike | null | undefined
  /** Overrides the media library's alt text. Pass "" only for decoration. */
  alt?: string
  sizes?: string
  /** True for the hero only: eager + high priority, everything else lazy. */
  priority?: boolean
  className?: string
  wrapperClassName?: string
  /** CSS aspect-ratio, e.g. '4 / 3'. Omit to use the file's own dimensions. */
  aspect?: string
  fit?: 'cover' | 'contain'
  position?: string
}) {
  if (!media?.public_url) {
    return (
      <div
        aria-hidden="true"
        className={cn('bg-beige-soft', wrapperClassName, className)}
        style={aspect ? { aspectRatio: aspect } : undefined}
      />
    )
  }

  const resolvedAlt = alt !== undefined ? alt : altText(media)
  const srcSet = buildSrcSet(media)

  const img = (
    <img
      src={bestFallbackSrc(media)}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={resolvedAlt}
      width={media.width ?? undefined}
      height={media.height ?? undefined}
      loading={priority ? 'eager' : 'lazy'}
      // fetchPriority tells the browser this is the LCP candidate.
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      className={cn(
        'block h-full w-full',
        fit === 'cover' ? 'object-cover' : 'object-contain',
        className,
      )}
      style={position ? { objectPosition: position } : undefined}
    />
  )

  if (!aspect && !wrapperClassName) return img

  return (
    <div
      className={cn('overflow-hidden bg-beige-soft', wrapperClassName)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {img}
    </div>
  )
}
