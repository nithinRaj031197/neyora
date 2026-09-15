import { Picture } from '@/components/ui/Picture'
import { Display, Eyebrow } from './Display'
import type { MushroomChapter } from '@/types/content'

/**
 * Chapter 03 — the mushroom itself.
 *
 * A luxury-campaign moment: one macro photograph, held nearly still, with
 * oversized type crossing it. The type drifts slowly against the image as the
 * chapter passes, which is the only movement here — the contrast with the
 * busier chapters either side is the point.
 */
export function Mushroom({ mushroom }: { mushroom: MushroomChapter }) {
  return (
    <section
      aria-labelledby="mushroom-heading"
      className="relative overflow-hidden bg-ink py-(--spacing-section) text-ivory"
    >
      <div className="relative mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:items-center lg:gap-8">
          {/* The type deliberately sits over the image's left edge on desktop. */}
          <div className="relative z-10 lg:col-span-5 lg:col-start-1">
            {mushroom.eyebrow ? <Eyebrow invert>{mushroom.eyebrow}</Eyebrow> : null}

            <Display
              id="mushroom-heading"
              lines={mushroom.lines}
              size="xl"
              invert
              className="scene-drift mt-8"
            />
          </div>

          <div className="relative mt-12 lg:col-span-8 lg:col-start-5 lg:mt-0">
            <Picture
              image={mushroom.image}
              sizes="(max-width: 1024px) 100vw, 66vw"
              wrapperClassName="scene-wipe overflow-hidden rounded-sm"
              className="scene-zoom"
            />
          </div>
        </div>

        {(mushroom.secondaryLines?.length ?? 0) > 0 || mushroom.body ? (
          <div className="relative z-10 mt-16 lg:-mt-24 lg:grid lg:grid-cols-12 lg:gap-8">
            {mushroom.secondaryLines && mushroom.secondaryLines.length > 0 ? (
              <Display
                as="p"
                lines={mushroom.secondaryLines}
                size="md"
                invert
                className="lg:col-span-5 lg:col-start-8"
              />
            ) : null}

            {mushroom.body ? (
              <p className="scene-rise mt-8 max-w-[46ch] text-[1.0625rem] leading-relaxed text-ivory/65 lg:col-span-4 lg:col-start-2 lg:row-start-1 lg:mt-0">
                {mushroom.body}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  )
}
