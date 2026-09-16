import 'server-only'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { cn } from '@/lib/utils/cn'
import type { Image as ContentImage } from '@/types/content'

function publicAssetExists(src: string): boolean {
  if (!src.startsWith('/') || src.includes('..')) return false
  return existsSync(join(process.cwd(), 'public', src))
}

function withTemporaryPlaceholderFallback(image: ContentImage): ContentImage {
  if (!image.src.endsWith('.webp') || publicAssetExists(image.src)) return image

  const fallbackSrc = image.src.replace(/\.webp$/, '.svg')
  if (!publicAssetExists(fallbackSrc)) return image

  return {
    ...image,
    src: fallbackSrc,
  }
}

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

  const resolvedImage = withTemporaryPlaceholderFallback(image)
  const resolvedMobileImage = mobileImage
    ? withTemporaryPlaceholderFallback(mobileImage)
    : mobileImage
  const resolvedAlt = alt !== undefined ? alt : image.alt
  const isTemporaryPlaceholder = resolvedImage.src !== image.src
  const isTemporaryMobilePlaceholder =
    Boolean(mobileImage && resolvedMobileImage && resolvedMobileImage.src !== mobileImage.src)

  const picture = (
    <img
      src={resolvedImage.src}
      alt={resolvedAlt}
      width={resolvedImage.width}
      height={resolvedImage.height}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      // Tells the browser this is the LCP candidate.
      fetchPriority={priority ? 'high' : 'auto'}
      decoding={priority ? 'sync' : 'async'}
      data-image-source={isTemporaryPlaceholder ? 'temporary-placeholder' : 'final'}
      data-expected-src={isTemporaryPlaceholder ? image.src : undefined}
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
      <source
        media={`(max-width: ${mobileUpTo}px)`}
        srcSet={resolvedMobileImage!.src}
        data-image-source={isTemporaryMobilePlaceholder ? 'temporary-placeholder' : 'final'}
        data-expected-src={isTemporaryMobilePlaceholder ? mobileImage.src : undefined}
      />
      {picture}
    </picture>
  ) : (
    picture
  )

  if (!aspect && !wrapperClassName) return img

  /*
   * `overflow-clip`, never `overflow-hidden`.
   *
   * Both clip identically, but `hidden` makes the element a SCROLL CONTAINER.
   * A scroll-driven `view()` animation binds to its nearest scroll container,
   * so a `hidden` wrapper silently captures the timeline of any .scene-*
   * inside it and pins its progress — the animation attaches, reports a
   * ViewTimeline, and never moves. `clip` creates no scroll container, so
   * view() resolves past it to the viewport, which is what these animations
   * are measured against. See globals.css §4.
   */
  return (
    <div
      className={cn('overflow-clip bg-beige-soft', wrapperClassName)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {img}
    </div>
  )
}
