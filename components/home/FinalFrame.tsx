import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon } from '@/components/ui/Icon'
import { Display } from './Display'
import type { FinalCtaChapter } from '@/types/content'

/**
 * Chapter 09 — the final frame.
 *
 * Deliberately built like the last shot of a film: full viewport, photograph
 * pushing slowly in behind, the closing line set as large as the hero's, and
 * one action. Nothing competes with it — the footer that follows is
 * intentionally quiet.
 */
export function FinalFrame({
  finalCta,
  brandName,
  tagline,
}: {
  finalCta: FinalCtaChapter
  brandName: string
  tagline?: string
}) {
  return (
    <section
      aria-labelledby="final-heading"
      className="chapter-full relative isolate flex items-center overflow-clip bg-ink"
    >
      <div className="absolute inset-0 -z-10">
        <Picture
          image={finalCta.image}
          alt=""
          sizes="100vw"
          wrapperClassName="h-full w-full"
          className="scene-zoom"
          position="center 45%"
        />
        <div aria-hidden="true" className="absolute inset-0 bg-ink/62" />
      </div>

      <div className="mx-auto w-full max-w-[88rem] px-5 py-24 sm:px-8 lg:px-12">
        {finalCta.eyebrow ? (
          <p className="eyebrow scene-fade text-leaf">{finalCta.eyebrow}</p>
        ) : null}

        <Display
          id="final-heading"
          lines={finalCta.lines}
          size="xl"
          invert
          className="mt-8"
        />

        {finalCta.body ? (
          <p className="scene-rise mt-10 max-w-[44ch] text-[1.0625rem] leading-relaxed text-ivory/70">
            {finalCta.body}
          </p>
        ) : null}

        <div className="scene-rise mt-12 flex flex-wrap items-center gap-3">
          {finalCta.ctaLabel && finalCta.ctaHref ? (
            <Link
              href={finalCta.ctaHref}
              className="press cta-arrow inline-flex h-14 items-center gap-2.5 rounded-xs bg-ivory px-8 text-[0.875rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:bg-beige-soft"
            >
              {finalCta.ctaLabel}
              <Icon name="arrow-right" size={17} />
            </Link>
          ) : null}
        </div>

        <div className="scene-fade mt-20 border-t border-ivory/15 pt-8">
          <Wordmark brandName={brandName} tagline={tagline} invert showTagline className="text-2xl" />
        </div>
      </div>
    </section>
  )
}
