import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Icon } from '@/components/ui/Icon'
import { Display, Eyebrow } from './Display'
import type { FarmChapter } from '@/types/content'

/**
 * Chapter 07 — the farm.
 *
 * After the appetite of the food chapter, this one slows right down. Earthy
 * ground, almost no movement, two photographs offset against a column of
 * plain prose. Quiet is the effect being aimed for.
 */
export function Farm({ farm }: { farm: FarmChapter }) {
  const [primary, secondary] = farm.images

  return (
    <section
      aria-labelledby="farm-heading"
      className="overflow-hidden bg-earth py-(--spacing-section) text-ivory"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            {farm.eyebrow ? <Eyebrow invert>{farm.eyebrow}</Eyebrow> : null}
            <Display id="farm-heading" lines={farm.lines} size="md" invert className="mt-8" />

            {farm.body ? (
              <p className="scene-rise mt-10 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ivory/65">
                {farm.body}
              </p>
            ) : null}

            {farm.ctaLabel && farm.ctaHref ? (
              <Link
                href={farm.ctaHref}
                className="scene-fade mt-10 inline-flex h-13 items-center gap-2.5 rounded-xs border border-ivory/35 px-6 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:border-ivory hover:bg-ivory/10"
              >
                {farm.ctaLabel}
                <Icon name="arrow-right" size={16} />
              </Link>
            ) : null}
          </div>

          {primary ? (
            <div className="mt-14 lg:col-span-6 lg:col-start-7 lg:mt-0">
              <Picture
                image={primary}
                sizes="(max-width: 1024px) 100vw, 46vw"
                aspect="4 / 5"
                wrapperClassName="scene-wipe overflow-hidden rounded-sm"
                className="scene-zoom"
              />

              {secondary ? (
                <div className="mt-6 lg:-ml-24 lg:w-[62%]">
                  <Picture
                    image={secondary}
                    sizes="(max-width: 1024px) 100vw, 28vw"
                    aspect="1 / 1"
                    wrapperClassName="scene-wipe overflow-hidden rounded-sm"
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
