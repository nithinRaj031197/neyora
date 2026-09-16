import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Icon } from '@/components/ui/Icon'
import { Display, Eyebrow } from './Display'
import { formatDuration } from '@/lib/utils/format'
import type { Category, FoodChapter, Recipe } from '@/types/content'

function imageAspect(recipe: Recipe, fallback: string): string {
  const width = recipe.cover?.width
  const height = recipe.cover?.height
  if (!width || !height) return fallback
  return `${width} / ${height}`
}

/**
 * Chapter 06 — food.
 *
 * The appetite chapter, and the one that most needs real photography. Set on
 * near-black so warm food reads hot against it.
 *
 * Recipes are laid out editorially, not as a 3-up card grid: the first takes
 * most of the viewport, the rest fall into an offset column. Metadata is set
 * small and quiet so the photograph and the title carry the moment.
 */
export function Food({
  food,
  recipes,
  categories,
}: {
  food: FoodChapter
  recipes: Recipe[]
  categories: Category[]
}) {
  const [lead, ...rest] = recipes
  const categoryName = (recipe: Recipe) =>
    categories.find((c) => c.slug === recipe.category)?.name

  return (
    <section
      aria-labelledby="food-heading"
      className="overflow-clip bg-ink py-(--spacing-section) text-ivory"
    >
      <div className="mx-auto w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
        <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            {food.eyebrow ? <Eyebrow invert>{food.eyebrow}</Eyebrow> : null}
            <Display id="food-heading" lines={food.lines} size="lg" invert className="mt-8" />
          </div>

          {food.body ? (
            <p className="scene-rise mt-8 max-w-[42ch] text-[1.0625rem] leading-relaxed text-ivory/65 lg:col-span-4 lg:col-start-9 lg:mt-0">
              {food.body}
            </p>
          ) : null}
        </div>
      </div>

      {lead ? (
        <>
          {/* The lead recipe runs close to full-bleed. */}
          <article className="mt-16 lg:mt-24">
            <Link href={`/recipes/${lead.slug}`} className="group hover-media block">
              <Picture
                image={lead.cover}
                sizes="100vw"
                aspect={imageAspect(lead, '16 / 9')}
                wrapperClassName="scene-wipe overflow-clip"
                className="scene-zoom transition-transform duration-700 ease-(--ease-out-soft)"
              />

              <div className="mx-auto mt-8 w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
                <div className="lg:grid lg:grid-cols-12 lg:items-end lg:gap-10">
                  <div className="lg:col-span-8">
                    <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] tracking-[0.2em] text-ivory/45 uppercase">
                      {categoryName(lead) ? <span className="text-leaf">{categoryName(lead)}</span> : null}
                      {lead.totalTimeMinutes > 0 ? <span>{formatDuration(lead.totalTimeMinutes)}</span> : null}
                      {lead.servings ? <span>Serves {lead.servings}</span> : null}
                    </p>
                    <h3 className="mt-4 font-display text-[clamp(1.75rem,5vw,4rem)] leading-[0.98] tracking-[-0.03em] text-ivory transition-colors group-hover:text-leaf">
                      {lead.title}
                    </h3>
                  </div>

                  {lead.excerpt ? (
                    <p className="mt-4 max-w-[46ch] text-[0.9375rem] leading-relaxed text-ivory/60 lg:col-span-4 lg:mt-0">
                      {lead.excerpt}
                    </p>
                  ) : null}
                </div>
              </div>
            </Link>
          </article>

          {/* The rest, offset so the column does not read as a grid row. */}
          {rest.length > 0 ? (
            <div className="mx-auto mt-20 w-full max-w-[88rem] px-5 sm:px-8 lg:mt-28 lg:px-12">
              <ul className="grid gap-16 lg:grid-cols-2 lg:gap-12">
                {rest.map((recipe, index) => (
                  <li key={recipe.slug} className={index % 2 === 1 ? 'lg:mt-24' : undefined}>
                    <article>
                      <Link href={`/recipes/${recipe.slug}`} className="group hover-media block">
                        <Picture
                          image={recipe.cover}
                          sizes="(max-width: 1024px) 100vw, 44vw"
                          aspect={imageAspect(recipe, '4 / 3')}
                          wrapperClassName="scene-wipe overflow-clip rounded-sm"
                          className="scene-zoom"
                        />
                        <p className="mt-5 flex flex-wrap items-center gap-x-4 text-[0.6875rem] tracking-[0.2em] text-ivory/45 uppercase">
                          {categoryName(recipe) ? (
                            <span className="text-leaf">{categoryName(recipe)}</span>
                          ) : null}
                          {recipe.totalTimeMinutes > 0 ? (
                            <span>{formatDuration(recipe.totalTimeMinutes)}</span>
                          ) : null}
                        </p>
                        <h3 className="mt-3 font-display text-[clamp(1.375rem,2.6vw,2.125rem)] leading-tight tracking-[-0.02em] text-ivory transition-colors group-hover:text-leaf">
                          {recipe.title}
                        </h3>
                        {recipe.excerpt ? (
                          <p className="mt-3 max-w-[44ch] text-[0.9375rem] leading-relaxed text-ivory/55">
                            {recipe.excerpt}
                          </p>
                        ) : null}
                      </Link>
                    </article>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}

      {food.ctaLabel && food.ctaHref ? (
        <div className="mx-auto mt-20 w-full max-w-[88rem] px-5 sm:px-8 lg:px-12">
          <Link
            href={food.ctaHref}
            className="scene-fade press cta-arrow inline-flex h-14 items-center gap-2.5 rounded-xs border border-ivory/35 px-7 text-[0.875rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:border-ivory hover:bg-ivory/10"
          >
            {food.ctaLabel}
            <Icon name="arrow-right" size={17} />
          </Link>
        </div>
      ) : null}
    </section>
  )
}
