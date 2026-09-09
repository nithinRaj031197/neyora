import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { RecipeCard } from '@/components/public/RecipeCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { JsonLd } from '@/components/ui/JsonLd'
import { RecipeFilters } from '@/components/public/RecipeFilters'
import { Pagination } from '@/components/ui/Pagination'
import { getRecipeCategories, getRecipeTags, listRecipes } from '@/lib/content/recipes'
import { getSiteSettings } from '@/lib/content/site'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'
import { packSizeSchema } from '@/lib/validation/common'

export const revalidate = 300

const PAGE_SIZE = 12

const TRAIL = [
  { name: 'Home', path: '/' },
  { name: 'Recipes', path: '/recipes' },
]

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  return buildMetadata({
    title: 'Recipes',
    description:
      'Simple, well-tested ways to cook fresh oyster mushrooms while they are at their best. Most take under twenty minutes.',
    path: '/recipes',
    settings,
  })
}

export default async function RecipesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; pack?: string; q?: string; page?: string }>
}) {
  const sp = await searchParams

  // Validate the pack filter rather than trusting the query string — an
  // invalid enum value would otherwise make Postgres error on the request.
  const packResult = packSizeSchema.safeParse(sp.pack)
  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)

  const [{ recipes, total }, categories, tags] = await Promise.all([
    listRecipes({
      tagSlug: sp.tag,
      packSize: packResult.success ? packResult.data : undefined,
      search: sp.q,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getRecipeCategories(),
    getRecipeTags(),
  ])

  const hasFilters = Boolean(sp.tag || sp.pack || sp.q)

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-14 lg:pt-14">
          <Breadcrumbs trail={TRAIL} />
          <p className="eyebrow mt-9">From the kitchen</p>
          <h1 className="mt-4 max-w-[22ch] text-(length:--text-display-lg)">
            What to cook tonight
          </h1>
          <p className="mt-6 max-w-[58ch] text-[1.125rem] leading-relaxed text-earth-soft">
            Every recipe here is written for a specific pack size and tested more than once. Most
            are done in under twenty minutes.
          </p>
        </Container>
      </header>

      {categories.length > 0 ? (
        <div className="border-b border-beige bg-ivory">
          <Container size="wide" className="py-5">
            <nav aria-label="Recipe categories">
              <ul className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                  <li key={cat.id}>
                    <Link
                      href={`/recipes/category/${cat.slug}`}
                      className="inline-flex h-9 items-center rounded-xs border border-beige px-3.5 text-[0.8125rem] font-medium tracking-[0.04em] text-earth-soft uppercase transition-colors hover:border-forest/50 hover:text-forest"
                    >
                      {cat.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </Container>
        </div>
      ) : null}

      <Container size="wide" className="py-(--spacing-section-sm)">
        <RecipeFilters
          tags={tags}
          activeTag={sp.tag ?? null}
          activePack={packResult.success ? packResult.data : null}
          query={sp.q ?? ''}
          basePath="/recipes"
        />

        {recipes.length === 0 ? (
          <div className="mt-12">
            <EmptyState
              title={hasFilters ? 'No recipes match that' : 'Recipes are on their way'}
              description={
                hasFilters
                  ? 'Try removing a filter, or browse everything we have written so far.'
                  : 'We are writing and testing the first batch. Check back shortly.'
              }
              actionLabel={hasFilters ? 'Clear filters' : undefined}
              actionHref={hasFilters ? '/recipes' : undefined}
            />
          </div>
        ) : (
          <>
            <p className="mt-10 text-[0.875rem] text-earth-muted" role="status">
              {total} {total === 1 ? 'recipe' : 'recipes'}
              {hasFilters ? ' matching your filters' : ''}
            </p>

            <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-14">
              {recipes.map((recipe, index) => (
                <RecipeCard key={recipe.id} recipe={recipe} priority={index < 3} />
              ))}
            </div>

            <Pagination
              page={page}
              pageSize={PAGE_SIZE}
              total={total}
              basePath="/recipes"
              params={{ tag: sp.tag, pack: sp.pack, q: sp.q }}
            />
          </>
        )}
      </Container>

      <JsonLd data={breadcrumbJsonLd(TRAIL)} />
    </>
  )
}
