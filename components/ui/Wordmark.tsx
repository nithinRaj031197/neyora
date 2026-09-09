import { cn } from '@/lib/utils/cn'

/**
 * The NEYORA wordmark, set in live text rather than an image.
 *
 * Live text means it is selectable, scales perfectly, needs no request, and
 * is read correctly by a screen reader. The gradient is applied with
 * background-clip and degrades to solid forest green where that is
 * unsupported (see .neyora-gradient-text in globals.css).
 */
export function Wordmark({
  className,
  invert = false,
  gradient = true,
  showTagline = false,
  tagline = 'GROWN FOR LIFE.',
  brandName = 'NEYORA',
  as: Tag = 'span',
}: {
  className?: string
  invert?: boolean
  gradient?: boolean
  showTagline?: boolean
  tagline?: string
  brandName?: string
  as?: 'span' | 'div' | 'h1'
}) {
  const gradientClass = invert ? 'neyora-gradient-text-light' : 'neyora-gradient-text'

  return (
    <Tag className={cn('inline-flex flex-col', className)}>
      <span
        className={cn(
          'font-display font-semibold leading-none tracking-[0.16em]',
          gradient ? gradientClass : invert ? 'text-ivory' : 'text-forest',
        )}
      >
        {brandName}
      </span>
      {showTagline ? (
        <span
          className={cn(
            'mt-1.5 font-sans text-[0.5625rem] font-medium tracking-[0.34em]',
            invert ? 'text-ivory/55' : 'text-earth/55',
          )}
        >
          {tagline}
        </span>
      ) : null}
    </Tag>
  )
}
