import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon } from '@/components/ui/Icon'
import type { HeroChapter } from '@/types/content'

/**
 * Chapter 01 — the hero.
 *
 * A full-viewport photograph with the wordmark set over it, not text-left /
 * image-right. The image is the page; the type sits in it.
 *
 * As the page scrolls the photograph pushes in slightly and the type lifts
 * and fades, so the hero reads as transforming into the next chapter rather
 * than scrolling away from it. Both are scroll-driven CSS (see globals.css) —
 * no JavaScript, and no motion at all under `prefers-reduced-motion`.
 */
export function Hero({ hero }: { hero: HeroChapter }) {
  return (
    <section
      aria-labelledby="hero-heading"
      className="chapter-full relative isolate flex flex-col justify-end overflow-clip bg-ink"
    >
      {/* The photograph fills the chapter and sits behind everything. */}
      <div className="absolute inset-0 -z-10">
        <Picture
          image={hero.image}
          mobileImage={hero.imageMobile}
          alt=""
          sizes="100vw"
          priority
          wrapperClassName="h-full w-full"
          className="hero-image"
          position="center 40%"
        />
        {/*
          Two scrims, crossed.

          The vertical one darkens top and bottom so the header and the CTAs
          always have a ground. On its own it left the headline stranded: the
          middle of the frame is its lightest point, and that is exactly where
          a pale subject — a mushroom cap, a bowl, a hand — lands. So a second
          scrim runs left to right, protecting the column the type occupies
          regardless of what the photograph turns out to be. It fades out
          entirely by 60%, leaving the subject side untouched.
        */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/35 to-ink/55"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/25 to-transparent to-60%"
        />
      </div>

      {/*
        `enter-group` staggers these five children in order (globals.css §2).
        The offset holds the whole sequence back until the hero photograph has
        had a moment to paint, so the type does not animate over a grey box.
      */}
      <div
        className="hero-type enter-group relative mx-auto box-border w-full max-w-[88rem] px-5 pb-16 sm:px-8 lg:px-12 lg:pb-24"
        style={{ ['--enter-offset' as string]: '120ms', ['--enter-step' as string]: '90ms' }}
      >
        {hero.eyebrow ? (
          <p className="eyebrow text-leaf">{hero.eyebrow}</p>
        ) : null}

        <h1 id="hero-heading" className="mt-6">
          <Wordmark
            as="span"
            brandName={hero.headline}
            invert
            className="hero-wordmark display display-xl block leading-[0.86]"
          />
          {hero.tagline ? (
            <span className="mt-4 block font-display text-[clamp(1.1rem,3.2vw,2.4rem)] leading-none font-light tracking-[0.18em] text-ivory/85">
              {hero.tagline}
            </span>
          ) : null}
        </h1>

        {hero.description ? (
          <p className="mt-8 max-w-[30ch] text-[1.0625rem] leading-relaxed text-ivory/75 [text-wrap:wrap] sm:max-w-[44ch] sm:text-[1.125rem]">
            {hero.description}
          </p>
        ) : null}

        <div className="mt-10 flex flex-wrap items-center gap-3">
          {hero.ctaLabel && hero.ctaHref ? (
            <Link
              href={hero.ctaHref}
              className="press cta-arrow inline-flex h-14 items-center gap-2.5 rounded-xs bg-ivory px-7 text-[0.875rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:bg-beige-soft"
            >
              {hero.ctaLabel}
              <Icon name="arrow-right" size={17} />
            </Link>
          ) : null}
          {hero.secondaryCtaLabel && hero.secondaryCtaHref ? (
            <Link
              href={hero.secondaryCtaHref}
              className="press inline-flex h-14 items-center rounded-xs border border-ivory/35 px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:border-ivory hover:bg-ivory/10"
            >
              {hero.secondaryCtaLabel}
            </Link>
          ) : null}
        </div>
      </div>

      {hero.scrollHint ? (
        <div
          aria-hidden="true"
          className="hero-hint absolute inset-x-0 bottom-5 flex justify-center"
        >
          <span className="animate-hint flex flex-col items-center gap-1.5 text-[0.625rem] tracking-[0.3em] text-ivory/55 uppercase">
            {hero.scrollHint}
            <Icon name="chevron-down" size={14} />
          </span>
        </div>
      ) : null}
    </section>
  )
}
