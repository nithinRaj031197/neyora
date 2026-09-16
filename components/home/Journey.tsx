import { Picture } from '@/components/ui/Picture'
import { Eyebrow } from './Display'
import type { JourneyChapter } from '@/types/content'

/**
 * Chapter 04 — grown, harvested, packed, at your table.
 *
 * Not four cards. The stage titles stick to the viewport while their images
 * scroll past, so each stage becomes visually dominant in turn and the
 * sequence reads as a progression rather than a row of equals.
 *
 * `position: sticky` does the work — no scroll listener, no JavaScript. On
 * mobile the stages simply stack, which is the honest recomposition rather
 * than a squeezed desktop layout.
 */
export function Journey({ journey }: { journey: JourneyChapter }) {
  return (
    <section
      aria-labelledby="journey-heading"
      className="overflow-clip bg-beige-soft py-(--spacing-section)"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {journey.eyebrow ? <Eyebrow>{journey.eyebrow}</Eyebrow> : null}
        {journey.heading ? (
          <h2
            id="journey-heading"
            className="scene-rise mt-6 max-w-[20ch] font-display text-(length:--text-display-md) text-forest"
          >
            {journey.heading}
          </h2>
        ) : null}
      </div>

      <ol className="mt-16 lg:mt-24">
        {journey.stages.map((stage) => (
          <li
            key={stage.number}
            className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12"
          >
            <div className="border-t border-earth/12 py-10 lg:grid lg:grid-cols-12 lg:gap-10 lg:py-0">
              {/*
                The label column sticks while its image scrolls past it.
                `h-fit` keeps the sticky box the height of its content, which
                is what lets the next stage push it out of the way.
              */}
              <div className="lg:col-span-5 lg:sticky lg:top-28 lg:h-fit lg:py-24">
                <div className="flex items-baseline gap-5">
                  <span
                    aria-hidden="true"
                    className="font-display text-[clamp(2.5rem,6vw,5rem)] leading-none text-leaf"
                  >
                    {stage.number}
                  </span>
                  <h3 className="font-display text-[clamp(1.5rem,3.2vw,2.75rem)] leading-none tracking-[-0.02em] text-forest">
                    {stage.title}
                  </h3>
                </div>

                {stage.description ? (
                  <p className="mt-6 max-w-[42ch] text-[1.0625rem] leading-relaxed text-earth-soft">
                    {stage.description}
                  </p>
                ) : null}
              </div>

              <div className="mt-8 lg:col-span-6 lg:col-start-7 lg:mt-0 lg:py-24">
                <Picture
                  image={stage.image}
                  sizes="(max-width: 1024px) 100vw, 46vw"
                  aspect="4 / 5"
                  wrapperClassName="scene-wipe overflow-clip rounded-sm"
                  className="scene-zoom"
                />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}
