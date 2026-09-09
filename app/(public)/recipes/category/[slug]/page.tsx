import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { RecipeCard } from '@/components/public/RecipeCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { JsonLd } from '@/components/ui/JsonLd'
import { Pagination } from '@/components/ui/Pagination'
import { Picture } from '@/components/ui/Picture'
import { getMediaByIds, getSiteSettings } from '@/lib/content/site'
import { getRecipeCategoryBySlug, listRecipes } from '@/lib/content/recipes'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'

export const revalidate = 300

const PAGE_SIZE = 12

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [settings, category] = await Promise.all([
    getSiteSettings(),
    getRecipeCategoryBySlug(slug),
  ])

  if (!category) {
    return buildMetadata({
      title: 'Category not found',
      path: `/recipes/category/${slug}`,
      settings,
      noindex: true,
    })
  }

  return buildMetadata({
    title: category.seo_title || `${category.name} recipes`,
    description: category.seo_description || category.description,
    path: `/recipes/category/${category.slug}`,
    settings,
  })
}

export default async function RecipeCategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ page?: string }>
}) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  const category = await getRecipeCategoryBySlug(slug)
  if (!category) notFound()

  const page = Math.max(1, Number.parseInt(sp.page ?? '1', 10) || 1)
  const [{ recipes, total }, media] = await Promise.all([
    listRecipes({
      categorySlug: category.slug,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    getMediaByIds([category.image_id]),
  ])

  const image = category.image_id ? media.get(category.image_id) ?? null : null

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Recipes', path: '/recipes' },
    { name: category.name, path: `/recipes/category/${category.slug}` },
  ]

  return (
    <>
      <header className="border-b border-beige bg-ivory-soft">
        <Container size="wide" className="pt-10 pb-14 lg:pt-14">
          <Breadcrumbs trail={trail} />

          <div className="mt-9 grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-end lg:gap-16">
            <div>
              <p className="eyebrow">Recipe collection</p>
              <h1 className="mt-4 text-(length:--text-display-lg)">{category.name}</h1>
              {category.description ? (
                <p className="mt-6 max-w-[54ch] text-[1.125rem] leading-relaxed text-earth-soft">
                  {category.description}
                </p>
              ) : null}
            </div>

            {image ? (
              <Picture
                media={image}
                alt={image.alt ?? category.name}
                aspect="3 / 2"
                sizes="(max-width: 1024px) 100vw, 38vw"
                priority
                wrapperClassName="rounded-sm"
              />
            ) : null}
          </div>
        </Container>
      </header>

      <Container size="wide" className="py-(--spacing-section-sm)">
        {recipes.length === 0 ? (
          <EmptyState
            title="Nothing in this collection yet"
            description="We are still writing for it. Everything published so far is on the main recipes page."
            actionLabel="All recipes"
            actionHref="/recipes"
          />
        ) : (
          <>
            <p className="text-[0.875rem] text-earth-muted" role="status">
              {total} {total === 1 ? 'recipe' : 'recipes'}
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
              basePath={`/recipes/category/${category.slug}`}
            />
          </>
        )}
      </Container>

      <JsonLd data={breadcrumbJsonLd(trail)} />
    </>
  )
}
