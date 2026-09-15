import { cn } from '@/lib/utils/cn'
import type { Image as ContentImage } from '@/types/content'

/**
 * The one image component.
 *
 * A plain `<img>` rather than `next/image`, because image optimisation is
 * unavailable on Cloudflare Workers without a paid service. Images are
 * committed to /public already sized and compressed, and every one carries
 * explicit width and height so the browser reserves space and the page never
 * shifts as it loads.
 */
export function Picture({
  image,
  mobileImage,
  mobileUpTo = 640,
  alt,
  sizes,
  priority = false,
  className,
  wrapperClassName,
  aspect,
  fit = 'cover',
  position,
}: {
  image: ContentImage | null | undefined
  /**
   * An art-directed crop for small screens.
   *
   * Not a smaller copy of the same file — a different composition. A 16:9
   * landscape hero shown on a 9:19 phone is a sliver of its subject, which is
   * the difference between a cinematic hero and a shrunk desktop one.
   */
  mobileImage?: ContentImage | null
  /** Breakpoint below which `mobileImage` is used, in px. */
  mobileUpTo?: number
  /** Overrides the content's alt text. Pass "" only for decoration. */
  alt?: string
  sizes?: string
  /** True for the hero only: eager + high priority. Everything else lazy. */
  priority?: boolean
  className?: string
  wrapperClassName?: string
  /** CSS aspect-ratio, e.g. '4 / 3'. Omit to use the file's own dimensions. */
  aspect?: string
  fit?: 'cover' | 'contain'
  position?: string
}) {
  if (!image?.src) {
    return (
      <div
        aria-hidden="true"
        className={cn('bg-beige-soft', wrapperClassName, className)}
        style={aspect ? { aspectRatio: aspect } : undefined}
      />
    )
  }

  const resolvedAlt = alt !== undefined ? alt : image.alt

  const picture = (
    <img
      src={image.src}
      alt={resolvedAlt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      // Tells the browser this is the LCP candidate.
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

  /*
   * <picture> only when there is genuinely a second composition to offer.
   * The <img> keeps the desktop dimensions, so the aspect box below still
   * reserves the right space and the swap costs no layout shift.
   */
  const img = mobileImage ? (
    <picture>
      <source media={`(max-width: ${mobileUpTo}px)`} srcSet={mobileImage.src} />
      {picture}
    </picture>
  ) : (
    picture
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
