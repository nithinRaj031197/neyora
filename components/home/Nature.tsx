import { Picture } from '@/components/ui/Picture'
import { Display, Eyebrow } from './Display'
import type { NatureChapter, Nutrition } from '@/types/content'

/**
 * Chapter 02 — from nature.
 *
 * This chapter used to be four photographs, stacked with negative margins and
 * captioned "One cap", "One cluster", "One room", "One farm". It ran to three
 * and a half viewports and told a reader nothing they could act on. Someone
 * who has never cooked an oyster mushroom leaves that knowing only that we own
 * a camera.
 *
 * So the photography now supports prose instead of standing in for it: what
 * the thing is, what it tastes like, how it behaves in a pan, and what is in
 * it. The nutrition figures are read from the product rather than retyped
 * here, so there is one place to correct them when the lab report arrives.
 */
export function Nature({
  nature,
  nutrition,
}: {
  nature: NatureChapter
  /** Read from the featured product — never duplicated into homepage.yml. */
  nutrition?: Nutrition
}) {
  const [lead, ...rest] = nature.frames
  const facts = nature.facts ?? []

  return (
    <section
      aria-labelledby="nature-heading"
      className="relative overflow-clip bg-ivory py-(--spacing-section)"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        {nature.eyebrow ? <Eyebrow>{nature.eyebrow}</Eyebrow> : null}
        <Display id="nature-heading" lines={nature.lines} size="lg" className="mt-8" />

        {nature.body ? (
          <p className="scene-rise mt-10 max-w-[52ch] text-[1.0625rem] leading-relaxed text-earth-soft lg:mt-14 lg:text-[1.1875rem]">
            {nature.body}
          </p>
        ) : null}

        {/*
          The explainer. One tall photograph holds the left while the answers
          run down the right — the image is evidence for the text beside it,
          which is the whole point of the rebuild.
        */}
        {facts.length > 0 ? (
          <div className="mt-16 grid gap-10 lg:mt-24 lg:grid-cols-12 lg:gap-16">
            {lead ? (
              <figure className="scene-rise lg:col-span-5 lg:sticky lg:top-28 lg:h-fit">
                <Picture
                  image={lead.image}
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  aspect="4 / 5"
                  wrapperClassName="overflow-clip rounded-sm"
                  className="scene-zoom"
                />
                {lead.caption ? (
                  <figcaption className="mt-3 text-[0.8125rem] text-earth-muted">
                    {lead.caption}
                  </figcaption>
                ) : null}
              </figure>
            ) : null}

            <dl className="lg:col-span-7">
              {facts.map((fact, index) => (
                <div
                  key={fact.label}
                  className="scene-rise border-t border-beige py-7 first:border-t-0 first:pt-0 lg:py-9"
                >
                  <dt className="flex items-baseline gap-4">
                    <span className="font-mono text-[0.75rem] text-leaf">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span className="font-display text-(length:--text-display-sm) text-forest">
                      {fact.label}
                    </span>
                  </dt>
                  <dd className="mt-3 max-w-[58ch] pl-9 text-[1.0625rem] leading-relaxed text-earth-soft">
                    {fact.text}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ) : null}
      </div>

      {/*
        The figures, set as a band rather than a table. A table invites
        comparison with other products; this is simply what is in the food.
      */}
      {nutrition && nutrition.per.length > 0 ? (
        <div className="mt-20 border-y border-beige bg-ivory-soft py-10 lg:mt-28">
          <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
            {nutrition.basis ? (
              <p className="eyebrow scene-fade text-botanical">{nutrition.basis}</p>
            ) : null}
            <ul className="scene-rise mt-6 flex flex-wrap gap-x-12 gap-y-6">
              {nutrition.per.map((fact) => (
                <li key={fact.label}>
                  <span className="font-display text-(length:--text-display-sm) text-forest">
                    {fact.value}
                    {fact.unit ? (
                      <span className="ml-0.5 font-sans text-[0.875rem] text-earth-muted">
                        {fact.unit}
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-1 block text-[0.8125rem] text-earth-muted">
                    {fact.label}
                  </span>
                </li>
              ))}
            </ul>
            {/*
              Carried through from the product. Nutrition claims on food are
              regulated, and the honest caveat travels with the numbers.
            */}
            {nutrition.note ? (
              <p className="scene-fade mt-7 max-w-[64ch] text-[0.8125rem] leading-relaxed text-earth-muted">
                {nutrition.note}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* Whatever frames remain, shown wide — context after the explanation. */}
      {rest.length > 0 ? (
        <div className="mx-auto mt-16 w-full max-w-[88rem] px-5 sm:px-8 lg:mt-24 lg:px-12">
          {/* One remaining frame runs full width; two share the row. A lone
              half-width image beside empty space reads as a mistake. */}
          <div className={rest.length === 1 ? 'grid gap-8' : 'grid gap-8 sm:grid-cols-2'}>
            {rest.map((frame) => (
              <figure key={frame.image.src} className="scene-rise">
                <Picture
                  image={frame.image}
                  sizes={rest.length === 1 ? '(max-width: 1024px) 100vw, 80vw' : '(max-width: 640px) 100vw, 44vw'}
                  aspect="4 / 3"
                  wrapperClassName="scene-wipe overflow-clip rounded-sm"
                  className="scene-zoom"
                />
                {frame.caption ? (
                  <figcaption className="mt-3 text-[0.8125rem] text-earth-muted">
                    {frame.caption}
                  </figcaption>
                ) : null}
              </figure>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  )
}
