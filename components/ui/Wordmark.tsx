import { cn } from '@/lib/utils/cn'

/**
 * The NEYORA logo.
 *
 * Outlined SVG artwork, not live text. A logo has to be identical everywhere,
 * and live text cannot promise that: it depends on a webfont arriving, and the
 * mark is set in Poppins, which is deliberately not one of the three faces the
 * site loads (Fraunces, Geist, Geist Mono — BRAND_GUIDELINES §3). The glyphs
 * are converted to paths by `scripts/brand/build-logo.py`, so nothing at
 * runtime needs the font.
 *
 * Painted as a CSS `background-image` on a single element rather than an
 * `<img>`. That is what lets the header swap to the light-on-dark artwork
 * while it floats over the hero photograph — the header's state lives in CSS
 * (`.site-header[data-scrolled]`), so the artwork has to be selectable from
 * CSS too. A pair of stacked `<img>` tags would mean shipping both files and
 * hiding one; this way the browser only fetches the variant it paints.
 *
 * SIZING is driven by font-size, exactly as the old text wordmark was, so
 * existing call sites (`className="text-2xl"`) still mean what they meant.
 * Each artwork's height multiplier makes its cap height equal 1em.
 */
export function Wordmark({
  className,
  invert = false,
  showTagline = false,
  brandName = 'NEYORA',
  tagline = 'GROWN FOR LIFE.',
  as: Tag = 'span',
}: {
  className?: string
  /** Force the light-on-dark artwork. The home header overrides this in CSS. */
  invert?: boolean
  /** Switch to the lockup, which carries "GROWN FOR LIFE." beneath the mark. */
  showTagline?: boolean
  /**
   * Accessible name only — the artwork is fixed. Content can no longer change
   * the letters that render, which is the point of a logo.
   */
  brandName?: string
  /** Accessible name only, as with `brandName`. Drawn into the lockup artwork. */
  tagline?: string
  as?: 'span' | 'div' | 'h1'
} & { gradient?: never }) {
  return (
    <Tag
      role="img"
      aria-label={showTagline ? `${brandName} — ${tagline}` : brandName}
      className={cn(
        'brand-logo',
        showTagline ? 'brand-logo--lockup' : 'brand-logo--wordmark',
        invert && 'brand-logo--invert',
        className,
      )}
    />
  )
}
