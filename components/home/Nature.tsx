import { Picture } from '@/components/ui/Picture'
import { Display, Eyebrow } from './Display'
import type { NatureChapter } from '@/types/content'

/**
 * Chapter 02 — from nature.
 *
 * The statement sits on warm ivory, and beneath it the camera pulls back:
 * one cap, one cluster, one room, one farm. The frames are staggered
 * vertically and each wipes open as it enters, so scrolling *is* the zoom-out
 * rather than something that merely accompanies it.
 */
export function Nature({ nature }: { nature: NatureChapter }) {
  return (
    <section
      aria-labelledby="nature-heading"
      className="relative overflow-hidden bg-ivory py-(--spacing-section)"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {nature.eyebrow ? <Eyebrow>{nature.eyebrow}</Eyebrow> : null}

        <Display id="nature-heading" lines={nature.lines} size="lg" className="mt-8" />

        {nature.body ? (
          <p className="scene-rise mt-10 max-w-[52ch] text-[1.0625rem] leading-relaxed text-earth-soft lg:mt-14 lg:text-[1.1875rem]">
            {nature.body}
          </p>
        ) : null}
      </div>

      {/*
        The sequence. Deliberately not a 4-up grid: each frame takes a
        different width and vertical offset so the eye travels down the page
        rather than scanning across a row.
      */}
      <ol className="mt-20 flex flex-col gap-16 lg:mt-28 lg:gap-0">
        {nature.frames.map((frame, index) => {
          // Alternating alignment, widening as the sequence progresses.
          const layouts = [
            'lg:w-[38%] lg:ml-[8%]',
            'lg:w-[52%] lg:ml-[42%] lg:-mt-24',
            'lg:w-[64%] lg:ml-[4%] lg:-mt-16',
            'lg:w-[88%] lg:ml-[10%] lg:-mt-8',
          ]
          return (
            <li
              key={frame.image.src}
              className={`px-5 sm:px-8 lg:px-0 ${layouts[index] ?? 'lg:w-[70%] lg:ml-[15%]'}`}
            >
              <figure>
                <Picture
                  image={frame.image}
                  sizes="(max-width: 1024px) 100vw, 60vw"
                  wrapperClassName="scene-wipe overflow-hidden rounded-sm"
                  className="scene-zoom"
                />
                {frame.caption ? (
                  <figcaption className="scene-fade mt-3 flex items-baseline gap-3 text-[0.75rem] tracking-[0.18em] text-earth-muted uppercase">
                    <span className="text-leaf">{String(index + 1).padStart(2, '0')}</span>
                    {frame.caption}
                  </figcaption>
                ) : null}
              </figure>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
