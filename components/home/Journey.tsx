import { Picture } from '@/components/ui/Picture'
import { cn } from '@/lib/utils/cn'
import { Eyebrow } from './Display'
import { ProcessTrack } from './ProcessTrack'
import type { JourneyChapter } from '@/types/content'

/**
 * Chapter 04 — grown, harvested, packed, at your table.
 *
 * Two layouts, chosen by what the artwork already contains.
 *
 * When the images are plain photographs, the stage titles stick to the
 * viewport while their pictures scroll past, so each stage becomes dominant in
 * turn. `position: sticky` does all of that — no scroll listener, no
 * JavaScript.
 *
 * When every image is a finished campaign poster, that layout has nothing left
 * to do: the type already lives inside the artwork, the sticky column is
 * `sr-only`, and the chapter degenerates into four full-width pictures stacked
 * one below another with nothing connecting them. Those go to ProcessTrack
 * instead, which lays the same four posters left to right beneath a numbered
 * rail, so the sequence is visible before a single word has been read.
 */
export function Journey({ journey }: { journey: JourneyChapter }) {
  /*
   * All of them, not some. A mixed run would stand posters that carry their
   * own type beside photographs that need a caption column, and no single
   * layout serves both — so the sticky layout stays the fallback.
   */
  const allCarded =
    journey.stages.length > 0 &&
    journey.stages.every((stage) => stage.artworkIncludesType === true)

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

      {allCarded ? (
        <ProcessTrack
          label={journey.eyebrow ?? 'Our process'}
          stages={journey.stages.map((stage) => ({
            number: stage.number,
            title: stage.title,
            description: stage.description,
          }))}
          slides={journey.stages.map((stage) => (
            <Picture
              key={stage.number}
              image={stage.image}
              sizes="(max-width: 640px) 82vw, (max-width: 1024px) 26rem, 22rem"
              /* A poster is a composition — cropping it to a fixed ratio clips
                 its own margins. Let it keep its natural shape. */
              wrapperClassName="overflow-clip"
            />
          ))}
        />
      ) : (
        <ol className="mt-16 lg:mt-24">
          {journey.stages.map((stage) => {
            /*
             * A finished card already carries the number, title and description
             * in its pixels. Printing them again beside it is the same mistake
             * the hero made. The words stay in the DOM — a card is a picture,
             * and a search engine cannot read one — but are visually hidden, and
             * the card takes the full width rather than half of it.
             */
            const carded = stage.artworkIncludesType === true
            return (
            <li
              key={stage.number}
              className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12"
            >
              <div
                className={cn(
                  'border-t border-earth/12 py-10 lg:py-0',
                  carded ? 'lg:py-16' : 'lg:grid lg:grid-cols-12 lg:gap-10',
                )}
              >
                {/*
                  The label column sticks while its image scrolls past it.
                  `h-fit` keeps the sticky box the height of its content, which
                  is what lets the next stage push it out of the way.
                */}
                {/*
                  When the card carries the type, this column is ONLY `sr-only`.
                  Keeping the layout classes alongside it does not work: sr-only
                  sets position:absolute, but `lg:sticky lg:py-24 lg:h-fit` win at
                  the lg breakpoint, so the hidden column stayed in flow and
                  reserved 192px of padding — a band of empty ground above every
                  carded stage.
                */}
                <div
                  className={
                    carded ? 'sr-only' : 'lg:col-span-5 lg:sticky lg:top-28 lg:h-fit lg:py-24'
                  }
                >
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

                <div
                  className={cn(
                    'mt-8 lg:mt-0',
                    carded
                      ? 'mx-auto max-w-[46rem]'
                      : 'lg:col-span-6 lg:col-start-7 lg:py-24',
                  )}
                >
                  <Picture
                    image={stage.image}
                    sizes={carded ? '(max-width: 1024px) 100vw, 46rem' : '(max-width: 1024px) 100vw, 46vw'}
                    /* A card is a composition — cropping it to a fixed ratio
                       clips its own margins. Let it keep its natural shape. */
                    aspect={carded ? undefined : '4 / 5'}
                    wrapperClassName="scene-wipe overflow-clip rounded-sm"
                    className={carded ? undefined : 'scene-zoom'}
                  />
                </div>
              </div>
              </li>
              )
            })}
        </ol>
      )}
    </section>
  )
}
