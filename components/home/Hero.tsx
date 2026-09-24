import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Wordmark } from '@/components/ui/Wordmark'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'
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
  /*
   * When the artwork already carries the branding, the desktop hero must not
   * repeat it. The headline stays in the DOM — an <h1> is how the page tells a
   * search engine what it is — but is visually hidden from `lg` up, where the
   * banner's own lettering takes over. Phones keep the live type, because the
   * banner's 16:9 layout is unreadable cropped to a phone.
   */
  const artworkIncludesType = hero.artworkIncludesType === true
  const typeHidden = artworkIncludesType ? 'lg:sr-only' : ''

  return (
    <section
      aria-labelledby="hero-heading"
      className={cn(
        'chapter-full relative isolate flex flex-col justify-end overflow-clip bg-ink',
        // Flags the page so the header can hide its own logo over this hero.
        // The aspect override lets the full banner show instead of being
        // cropped to the viewport's shape.
        artworkIncludesType && 'neyora-hero-branded lg:aspect-[1672/941] lg:min-h-0',
      )}
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
          Scrims exist to give live type a contrast floor. A finished banner
          has its own — adding ours on top only greys out the artwork — so when
          the image carries the type, only a light top wash remains, enough to
          keep the header legible.
        */}
        {artworkIncludesType ? (
          <>
            {/* Phones keep the full scrim — they show live type over a
                text-free crop, so they need the contrast floor as much as
                ever. From `lg` up the banner supplies its own lettering and a
                heavy scrim would only grey the artwork out. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/35 to-ink/55 lg:hidden"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 hidden bg-gradient-to-b from-ink/12 via-transparent to-ink/15 lg:block"
            />
          </>
        ) : (
          <>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-ink/88 via-ink/35 to-ink/55"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/25 to-transparent to-60%"
            />
          </>
        )}
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
          <p className={cn('eyebrow text-leaf', typeHidden)}>{hero.eyebrow}</p>
        ) : null}

        <h1 id="hero-heading" className={cn('mt-6', typeHidden)}>
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
          <p
            className={cn(
              'mt-8 max-w-[30ch] text-[1.0625rem] leading-relaxed text-ivory/75 [text-wrap:wrap] sm:max-w-[44ch] sm:text-[1.125rem]',
              typeHidden,
            )}
          >
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
              className="press glass inline-flex h-14 items-center rounded-xs border px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase"
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
