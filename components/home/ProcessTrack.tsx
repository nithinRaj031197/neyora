'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'

/**
 * The journey as a process, not a pile.
 *
 * Four finished campaign posters stacked vertically read as four unrelated
 * pictures: the eye has no reason to connect them, and the sequence — which is
 * the entire point of the chapter — survives only as numbers painted inside
 * the artwork. Laid left to right under a numbered rail, the same four images
 * read as one movement from substrate to pan.
 *
 * TWO LAYOUTS, because one does not survive both ends of the range:
 *
 *   lg and up — all four side by side, a static process row. There is nothing
 *     to scroll, so there are no arrows and no "current" stage: the whole
 *     sequence is on screen and the rail simply labels it. An earlier version
 *     made this a scroller too, and it was quietly broken — with 3.2 of 4
 *     posters visible the track had ~300px of travel, so stages 03 and 04
 *     could never become current and the rail jumped 01 → 04.
 *
 *   below lg — a horizontal snap carousel, which is what a phone wants: one
 *     poster at a time, swipeable, the next one peeking past the edge.
 *
 * Native scroll throughout, never a pinned section that hijacks the wheel. It
 * stays swipeable, trackpad-scrollable and keyboard-reachable, and it cannot
 * trap anyone halfway through.
 *
 * The images are rendered on the server and passed in as `slides`, because
 * Picture is server-only: the browser never receives the filesystem work that
 * picks each source.
 */

export interface ProcessStage {
  number: string
  title: string
  description?: string
}

const CONTROL = cn(
  'press grid size-10 place-items-center rounded-full border border-earth/20 text-forest',
  'transition-colors duration-200 ease-(--ease-out-soft)',
  'hover:border-forest hover:bg-forest/5',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf',
  'disabled:pointer-events-none disabled:opacity-30',
)

export function ProcessTrack({
  stages,
  slides,
  label,
}: {
  stages: ProcessStage[]
  slides: ReactNode[]
  /** Names the scrollable region for assistive technology. */
  label: string
}) {
  const trackRef = useRef<HTMLOListElement>(null)
  const [active, setActive] = useState(0)
  const [atEnd, setAtEnd] = useState(false)
  /** False until the carousel is actually scrollable, i.e. below lg. */
  const [scrollable, setScrollable] = useState(false)

  const last = stages.length - 1

  /*
   * Where the viewer asked to be, which is not where the track has got to yet.
   * A smooth scroll takes a few hundred milliseconds, and during it `active`
   * still reads the card being left behind — so two quick taps on "next" would
   * both compute "the one after this" and land on the same stage. Intent is
   * tracked separately, and measurement leaves it alone while a programmatic
   * scroll is still running.
   */
  const targetRef = useRef(0)
  const settleAtRef = useRef(0)

  /**
   * Which stage is the viewer on?
   *
   * Measured from live rects rather than `scrollLeft / cardWidth`, because the
   * card width is a viewport unit that changes at every breakpoint and the gap
   * is a rem — arithmetic on either goes wrong on the first resize. The answer
   * is: whichever card sits nearest the track's left edge.
   */
  const measure = useCallback(() => {
    const track = trackRef.current
    if (!track) return

    const maxScroll = track.scrollWidth - track.clientWidth
    setScrollable(maxScroll > 4)

    const left = track.getBoundingClientRect().left
    let best = 0
    let bestDistance = Number.POSITIVE_INFINITY

    Array.from(track.children).forEach((child, index) => {
      const distance = Math.abs(child.getBoundingClientRect().left - left)
      if (distance < bestDistance) {
        bestDistance = distance
        best = index
      }
    })

    // 2px of slack: sub-pixel scroll widths mean the end is rarely exact.
    const end = maxScroll > 4 && track.scrollLeft >= maxScroll - 2
    /*
     * The final card ends flush against the right edge — by construction it
     * can never reach the left one. Without this, scrolling to the very end
     * leaves the rail pointing at the second-to-last stage for ever.
     */
    if (end) best = last

    setActive(best)
    setAtEnd(end)
    if (Date.now() >= settleAtRef.current) targetRef.current = best
  }, [last])

  useEffect(() => {
    const track = trackRef.current
    if (!track) return

    let frame = 0
    const onScroll = () => {
      // One measurement per frame. A snap scroll fires dozens of events, and
      // every one of them would otherwise read layout.
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        measure()
      })
    }

    measure()
    track.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => {
      if (frame) cancelAnimationFrame(frame)
      track.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [measure])

  const goTo = useCallback((index: number) => {
    const target = trackRef.current?.children[index]
    if (!target) return

    targetRef.current = index

    // `block: 'nearest'` is what stops a horizontal move from also yanking the
    // page vertically. Smooth scrolling is motion, so it is opt-in.
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    settleAtRef.current = Date.now() + (reduced ? 0 : 700)
    target.scrollIntoView({
      behavior: reduced ? 'auto' : 'smooth',
      inline: 'start',
      block: 'nearest',
    })
  }, [])

  const step = useCallback(
    (delta: number) => goTo(Math.min(last, Math.max(0, targetRef.current + delta))),
    [goTo, last],
  )

  return (
    <div className="mt-12 lg:mt-16">
      {/*
        The rail — the explicit sequence. Each poster paints its own number,
        but the rail is what makes four pictures legible as four steps before
        the viewer has read any of them.
      */}
      <nav
        aria-label={scrollable ? `${label} — jump to a stage` : label}
        className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12"
      >
        <ol className="relative flex items-start justify-between gap-2">
          {/* The connecting line, and the part of it already travelled. */}
          <li
            aria-hidden="true"
            className="pointer-events-none absolute top-[0.4375rem] right-0 left-0 h-px bg-earth/15"
          >
            <span
              className="block h-px origin-left bg-forest transition-transform duration-700 ease-(--ease-out-soft) motion-reduce:transition-none"
              /* Nothing to travel through when the whole row is on screen, so
                 the line is simply complete. */
              style={{ transform: `scaleX(${!scrollable || last === 0 ? 1 : active / last})` }}
            />
          </li>

          {stages.map((stage, index) => {
            // With the whole row visible there is no "where you are", so every
            // marker reads as part of one finished sequence.
            const current = scrollable && index === active
            const filled = !scrollable || index <= active

            const marker = (
              <>
                <span
                  aria-hidden="true"
                  className={cn(
                    'block size-[0.875rem] shrink-0 rounded-full border-2',
                    'transition-colors duration-500 ease-(--ease-out-soft) motion-reduce:transition-none',
                    'group-focus-visible:outline-2 group-focus-visible:outline-offset-3 group-focus-visible:outline-leaf',
                    current
                      ? 'border-forest bg-forest'
                      : filled
                        ? 'border-forest bg-forest/35'
                        : 'border-earth/25 bg-beige-soft group-hover:border-forest/60',
                  )}
                />
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      'font-display text-[0.9375rem] leading-none transition-colors duration-300',
                      current || !scrollable ? 'text-forest' : 'text-earth-muted',
                    )}
                  >
                    {stage.number}
                  </span>
                  {/*
                    A signpost, not the copy — the poster carries the sentence.
                    Hidden on the narrowest screens, where four labels would
                    wrap into four paragraphs.
                  */}
                  <span
                    className={cn(
                      'mt-1.5 hidden truncate text-[0.6875rem] tracking-[0.12em] uppercase transition-colors duration-300 sm:block',
                      current || !scrollable ? 'text-forest' : 'text-earth-muted/70',
                    )}
                  >
                    {stage.title}
                  </span>
                </span>
              </>
            )

            return (
              <li key={stage.number} className="relative z-10 min-w-0 flex-1">
                {/*
                  A button only while there is somewhere to go. Offering a
                  control that cannot move anything is worse than offering
                  none — it reads as broken.
                */}
                {scrollable ? (
                  <button
                    type="button"
                    onClick={() => goTo(index)}
                    aria-current={current ? 'step' : undefined}
                    className="group flex w-full flex-col items-start gap-2.5 text-left focus-visible:outline-none"
                  >
                    {marker}
                  </button>
                ) : (
                  <div className="group flex w-full flex-col items-start gap-2.5">{marker}</div>
                )}
              </li>
            )
          })}
        </ol>
      </nav>

      {/*
        The track. A scroller below lg, a plain four-up row above it — where
        the posters all fit, so there is nothing to scroll and nothing to
        snap. Full-bleed while scrolling, so the next stage peeks past the
        right edge: the clearest signal available that this is a sequence and
        there is more of it.
      */}
      <ol
        ref={trackRef}
        tabIndex={scrollable ? 0 : undefined}
        aria-label={label}
        className={cn(
          'process-track mt-8 flex gap-4 overflow-x-auto overscroll-x-contain snap-x snap-mandatory',
          'lg:mt-10 lg:grid lg:grid-cols-4 lg:gap-6 lg:overflow-visible lg:snap-none',
          // The scroll padding must match the inline padding, or a snapped card
          // lands flush against the viewport edge instead of in the gutter.
          'scroll-px-5 px-5 pb-2 sm:scroll-px-8 sm:px-8 lg:px-12 lg:pb-0',
          'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-leaf',
          'mx-auto w-full max-w-[88rem]',
        )}
      >
        {stages.map((stage, index) => (
          <li
            key={stage.number}
            className={cn(
              /*
               * Wide enough that only two posters fit a tablet. At 20rem three
               * fit, which leaves the track barely longer than its viewport —
               * and then the third stage can never reach the left edge, so the
               * rail skipped from 02 straight to 04 on reaching the end.
               */
              'w-[82vw] shrink-0 snap-start sm:w-[26rem] lg:w-auto lg:shrink',
              'transition-[opacity,transform] duration-500 ease-(--ease-out-soft)',
              'motion-reduce:transform-none motion-reduce:transition-none',
              /*
               * While scrolling, the stage you are on is whole and the others
               * step back a little — deliberately slight, because dimming hard
               * would grey out most of the chapter to mark a position the rail
               * already marks. Never on the four-up row, where every stage is
               * equally present. Opacity and transform only, so neither can
               * reflow the track.
               */
              scrollable && index !== active
                ? 'scale-[0.98] opacity-80 lg:scale-100 lg:opacity-100'
                : 'opacity-100',
            )}
          >
            <figure className="overflow-clip rounded-sm border border-earth/10 bg-ivory">
              {slides[index]}
              {/*
                The poster paints the number, title and sentence into its own
                pixels, so showing them again would say everything twice. They
                stay in the DOM because neither a search engine nor a screen
                reader can read a picture.
              */}
              <figcaption className="sr-only">
                Stage {stage.number}, {stage.title}.{' '}
                {stage.description ? stage.description : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ol>

      {/*
        Position and controls, for the scrolling layout only. A trackpad and a
        thumb can already move the track; a mouse with only a vertical wheel
        cannot — the arrows are for that reader.
      */}
      {scrollable ? (
        <div className="mx-auto mt-6 flex w-full max-w-[88rem] items-center justify-between gap-4 px-5 sm:px-8">
          <p aria-live="polite" className="text-[0.8125rem] text-earth-muted">
            <span className="sr-only">Showing stage </span>
            {stages[active]?.number} of {stages[last]?.number}
            <span className="hidden sm:inline"> · {stages[active]?.title}</span>
          </p>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={active === 0}
              aria-label="Previous stage"
              className={CONTROL}
            >
              <Icon name="chevron-right" size={18} className="rotate-180" />
            </button>
            <button
              type="button"
              onClick={() => step(1)}
              disabled={atEnd}
              aria-label="Next stage"
              className={CONTROL}
            >
              <Icon name="chevron-right" size={18} />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
