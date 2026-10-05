import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Container } from '@/components/ui/Container'
import { Breadcrumbs } from '@/components/public/Breadcrumbs'
import { RecipeCard } from '@/components/public/RecipeCard'
import { EmptyState } from '@/components/ui/EmptyState'
import { JsonLd } from '@/components/ui/JsonLd'
import { Picture } from '@/components/ui/Picture'
import { getRecipeCategories, getRecipeCategoryBySlug, getSiteSettings, queryRecipes } from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd } from '@/lib/seo/jsonld'

export function generateStaticParams() {
  return getRecipeCategories().map((category) => ({ slug: category.slug }))
}

/*
 * `dynamicParams = true` for the same reason as the product route: a path that
 * is ever revalidated cannot be regenerated when this is false, and answers
 * `NoFallbackError` instead. Recipes are not revalidated today, but the cost of
 * the safe setting is nothing — known slugs are still prerendered, and an
 * unknown one reaches `notFound()`.
 */
export const dynamicParams = true

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const settings = await getSiteSettings()
  const category = getRecipeCategoryBySlug(slug)

  if (!category) {
    return buildMetadata({
      title: 'Category not found',
      path: `/recipes/category/${slug}`,
      settings,
      seo: { noindex: true },
    })
  }

  return buildMetadata({
    title: `${category.name} recipes`,
    description: category.description,
    path: `/recipes/category/${category.slug}`,
    image: category.image,
    seo: category.seo,
    settings,
  })
}

export default async function RecipeCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const category = getRecipeCategoryBySlug(slug)
  if (!category) notFound()

  const { recipes, total } = queryRecipes({ category: category.slug, limit: 100 })
  const categories = getRecipeCategories()

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

            {category.image ? (
              <Picture
                image={category.image}
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
                <RecipeCard
                  key={recipe.slug}
                  recipe={recipe}
                  category={categories.find((c) => c.slug === recipe.category) ?? null}
                  priority={index < 3}
                />
              ))}
            </div>
          </>
        )}
      </Container>

      <JsonLd data={breadcrumbJsonLd(trail)} />
    </>
  )
}
