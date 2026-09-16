import Link from 'next/link'
import { Picture } from '@/components/ui/Picture'
import { Container } from '@/components/ui/Container'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { formatDuration } from '@/lib/utils/format'
import type { Category, Recipe } from '@/types/content'

const DIFFICULTY_LABEL = { easy: 'Easy', medium: 'Some skill', hard: 'Challenging' } as const

/**
 * Recipe hero.
 *
 * The stat strip (prep / cook / serves / pack) is the first thing a cook looks
 * for, so it sits above the fold on every screen size rather than below the
 * photograph.
 */
export function RecipeHero({
  recipe,
  category,
}: {
  recipe: Recipe
  category: Category | null
}) {
  const stats = [
    { label: 'Prep', value: formatDuration(recipe.prepTimeMinutes), icon: 'clock' as const },
    { label: 'Cook', value: formatDuration(recipe.cookTimeMinutes), icon: 'flame' as const },
    {
      label: 'Serves',
      value: recipe.servings ? String(recipe.servings) : '—',
      icon: 'users' as const,
    },
    { label: 'Base', value: `${recipe.basePackGrams ?? 100} g`, icon: 'qr' as const },
  ]

  return (
    <header className="border-b border-beige bg-ivory-soft">
      <Container size="wide" className="pt-10 pb-0 lg:pt-14">
        <nav aria-label="Breadcrumb" className="mb-8">
          <ol className="flex flex-wrap items-center gap-1.5 text-[0.8125rem] text-earth-muted">
            <li>
              <Link href="/" className="transition-colors hover:text-forest">
                Home
              </Link>
            </li>
            <li aria-hidden="true">
              <Icon name="chevron-right" size={13} />
            </li>
            <li>
              <Link href="/recipes" className="transition-colors hover:text-forest">
                Recipes
              </Link>
            </li>
            {category ? (
              <>
                <li aria-hidden="true">
                  <Icon name="chevron-right" size={13} />
                </li>
                <li>
                  <Link
                    href={`/recipes/category/${category.slug}`}
                    className="transition-colors hover:text-forest"
                  >
                    {category.name}
                  </Link>
                </li>
              </>
            ) : null}
          </ol>
        </nav>

        <div className="grid min-w-0 items-end gap-10 lg:grid-cols-[1fr_1.15fr] lg:gap-16">
          <div className="min-w-0 pb-2 lg:pb-10">
            {category ? <p className="eyebrow">{category.name}</p> : null}
            <h1 className="mt-4 text-(length:--text-display-lg) break-words">
              {recipe.title}
            </h1>
            {recipe.excerpt ? (
              <p className="mt-6 max-w-[52ch] text-[1.125rem] leading-relaxed text-earth-soft">
                {recipe.excerpt}
              </p>
            ) : null}

            {recipe.tags.length > 0 ? (
              <ul className="mt-7 flex flex-wrap gap-2">
                {recipe.tags.map((tag) => (
                  <Badge key={tag} as="li" tone="leaf">
                    {tag.replace(/-/g, ' ')}
                  </Badge>
                ))}
                <Badge as="li" tone="outline">
                  {DIFFICULTY_LABEL[recipe.difficulty]}
                </Badge>
              </ul>
            ) : null}
          </div>

          <Picture
            image={recipe.cover}
            aspect="4 / 3"
            sizes="(max-width: 1024px) 100vw, 55vw"
            priority
            wrapperClassName="max-w-full rounded-t-sm"
          />
        </div>

        <dl className="grid min-w-0 grid-cols-2 border-t border-beige sm:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`min-w-0 flex items-center gap-3 px-1 py-5 sm:px-0 ${
                index < stats.length - 1 ? 'sm:border-r sm:border-beige' : ''
              } ${index < 2 ? 'border-b border-beige sm:border-b-0' : ''} ${
                index % 2 === 0 ? 'border-r border-beige sm:border-r' : ''
              }`}
            >
              <Icon name={stat.icon} size={18} className="text-leaf" />
              <div className="min-w-0">
                <dt className="font-sans text-[0.6875rem] font-medium tracking-[0.14em] text-earth-muted uppercase">
                  {stat.label}
                </dt>
                <dd className="mt-0.5 font-display text-[1.0625rem] text-forest">{stat.value}</dd>
              </div>
            </div>
          ))}
        </dl>
      </Container>
    </header>
  )
}
