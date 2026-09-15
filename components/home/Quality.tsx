import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import { Eyebrow } from './Display'
import type { QualityChapter, Testimonial } from '@/types/content'

/**
 * Chapter 08 — quality.
 *
 * The calm chapter. Four single words, set large, each with one plain
 * sentence under it — no icons, no badges, no certification marks we have not
 * earned. Almost nothing moves here, which is what makes the final chapter
 * land.
 *
 * A single testimonial closes it, because trust reads better in someone
 * else's voice than in ours.
 */
export function Quality({
  quality,
  testimonial,
}: {
  quality: QualityChapter
  testimonial?: Testimonial
}) {
  return (
    <section aria-labelledby="quality-heading" className="overflow-hidden bg-ivory py-(--spacing-section)">
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            {quality.eyebrow ? <Eyebrow>{quality.eyebrow}</Eyebrow> : null}
            {quality.heading ? (
              <h2
                id="quality-heading"
                className="scene-rise mt-6 max-w-[16ch] font-display text-(length:--text-display-md) leading-[1.02] tracking-[-0.025em] text-forest"
              >
                {quality.heading}
              </h2>
            ) : null}
            {quality.body ? (
              <p className="scene-rise mt-8 max-w-[44ch] text-[1.0625rem] leading-relaxed text-earth-soft">
                {quality.body}
              </p>
            ) : null}

            {quality.ctaLabel && quality.ctaHref ? (
              <Link
                href={quality.ctaHref}
                className="scene-fade mt-10 inline-flex h-13 items-center gap-2.5 rounded-xs border border-forest/35 px-6 text-[0.8125rem] font-medium tracking-[0.06em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
              >
                {quality.ctaLabel}
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : null}
          </div>

          {quality.pillars.length > 0 ? (
            <dl className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-0">
              {quality.pillars.map((pillar) => (
                <div
                  key={pillar.word}
                  className="scene-rise border-t border-beige py-8 first:border-t-0 first:pt-0 lg:py-10"
                >
                  <dt className="font-display text-[clamp(1.75rem,3.6vw,3rem)] leading-none tracking-[-0.02em] text-forest">
                    {pillar.word}
                  </dt>
                  <dd className="mt-4 max-w-[48ch] text-[1rem] leading-relaxed text-earth-soft">
                    {pillar.description}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {testimonial ? (
          <figure className="scene-rise mt-20 border-t border-beige pt-12 lg:mt-28">
            <blockquote className="max-w-[28ch] font-display text-[clamp(1.5rem,3.4vw,2.75rem)] leading-[1.14] tracking-[-0.02em] text-forest">
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <figcaption className="mt-8 text-[0.8125rem] tracking-[0.14em] text-earth-muted uppercase">
              {testimonial.authorName}
              {testimonial.authorRole || testimonial.location ? (
                <span className="ml-3 text-earth-muted/70">
                  {[testimonial.authorRole, testimonial.location].filter(Boolean).join(' · ')}
                </span>
              ) : null}
            </figcaption>
          </figure>
        ) : null}
      </div>
    </section>
  )
}
