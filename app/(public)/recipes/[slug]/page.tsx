import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Container } from '@/components/ui/Container'
import { Section, SectionHeader } from '@/components/ui/Section'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { JsonLd } from '@/components/ui/JsonLd'
import { Icon } from '@/components/ui/Icon'
import { Card } from '@/components/ui/Card'
import { RecipeHero } from '@/components/public/RecipeHero'
import { RecipeIngredientList } from '@/components/public/RecipeIngredientList'
import { RecipeSteps } from '@/components/public/RecipeSteps'
import { RecipeCard } from '@/components/public/RecipeCard'
import { ShareRow } from '@/components/public/ShareRow'
import { NutritionTable } from '@/components/public/NutritionTable'
import {
  getPublishedRecipes,
  getRecipeBySlug,
  getRecipeCategories,
  getRelatedRecipes,
  getSiteSettings,
} from '@/lib/content'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd, recipeJsonLd } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/env'
import { availablePacksFor } from '@/lib/utils/scale'

/**
 * Content is known at build time, so every recipe is prerendered as static
 * HTML. `dynamicParams: false` makes an unknown slug a 404 rather than an
 * attempted render.
 */
export function generateStaticParams() {
  return getPublishedRecipes().map((recipe) => ({ slug: recipe.slug }))
}

export const dynamicParams = false

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const settings = getSiteSettings()
  const recipe = getRecipeBySlug(slug)

  if (!recipe) {
    return buildMetadata({
      title: 'Recipe not found',
      path: `/recipes/${slug}`,
      settings,
      seo: { noindex: true },
    })
  }

  return buildMetadata({
    title: recipe.title,
    description: recipe.excerpt,
    descriptionSource: recipe.body,
    path: `/recipes/${recipe.slug}`,
    image: recipe.cover,
    seo: recipe.seo,
    type: 'article',
    publishedTime: recipe.publishedAt,
    modifiedTime: recipe.updatedAt ?? recipe.publishedAt,
    settings,
  })
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const settings = getSiteSettings()
  const recipe = getRecipeBySlug(slug)

  if (!recipe) notFound()

  const categories = getRecipeCategories()
  const category = categories.find((c) => c.slug === recipe.category) ?? null
  const related = getRelatedRecipes(recipe, 3)

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Recipes', path: '/recipes' },
    ...(category ? [{ name: category.name, path: `/recipes/category/${category.slug}` }] : []),
    { name: recipe.title, path: `/recipes/${recipe.slug}` },
  ]

  const availablePacks = availablePacksFor({
    recommended: recipe.recommendedPackSize,
    isScalable: recipe.isScalable,
    basePackGrams: recipe.basePackGrams,
    variants: recipe.packVariants,
  })

  return (
    <>
      <RecipeHero recipe={recipe} category={category} />

      <Container size="wide" className="py-(--spacing-section-sm)">
        <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20">
          <div className="flex flex-col gap-16">
            {/*
              Two representations of the same recipe: the structured steps
              (which also feed Recipe JSON-LD and the pack-size scaler), then
              the editorial Markdown body underneath.
            */}
            <RecipeSteps steps={recipe.steps} />

            {recipe.body.trim() ? (
              <section aria-labelledby="notes-heading">
                <h2 id="notes-heading" className="sr-only">
                  Recipe notes
                </h2>
                <MarkdownRenderer content={recipe.body} />
              </section>
            ) : null}

            {recipe.tips ? (
              <section
                aria-labelledby="tips-heading"
                className="border-l-2 border-leaf bg-ivory-soft py-6 pr-6 pl-6"
              >
                <h2
                  id="tips-heading"
                  className="font-sans text-[0.75rem] font-semibold tracking-[0.16em] text-botanical uppercase"
                >
                  Worth knowing
                </h2>
                <p className="mt-3 max-w-[58ch] text-[1.0625rem] leading-relaxed text-earth">
                  {recipe.tips}
                </p>
              </section>
            ) : null}

            <div className="border-t border-beige pt-8">
              <ShareRow url={absoluteUrl(`/recipes/${recipe.slug}`)} title={recipe.title} />
            </div>
          </div>

          <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
            <RecipeIngredientList
              ingredients={recipe.ingredients}
              basePackGrams={recipe.basePackGrams}
              servings={recipe.servings}
              isScalable={recipe.isScalable}
              recommendedPack={recipe.recommendedPackSize}
              availablePacks={availablePacks}
              variants={recipe.packVariants}
            />

            {recipe.equipment.length > 0 ? (
              <section aria-labelledby="equipment-heading">
                <h2 id="equipment-heading" className="font-display text-xl text-forest">
                  Equipment
                </h2>
                <ul className="mt-4 flex flex-col gap-2.5">
                  {recipe.equipment.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-[0.9375rem]">
                      <Icon name="check" size={15} className="mt-1 text-leaf" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}

            {recipe.nutrition?.per.length ? <NutritionTable nutrition={recipe.nutrition} /> : null}

            <Card as="section" className="p-6">
              <p className="eyebrow">Made with</p>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-earth-soft">
                This recipe was written for our fresh produce, picked the morning it ships.
              </p>
              <Link
                href="/products"
                className="mt-5 inline-flex h-10 w-fit items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
              >
                See our products
                <Icon name="arrow-right" size={15} />
              </Link>
            </Card>
          </aside>
        </div>
      </Container>

      {related.length > 0 ? (
        <Section tone="ivory-soft" containerSize="wide" ariaLabelledby="related-heading">
          <SectionHeader id="related-heading" eyebrow="Keep cooking" heading="More recipes" />
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {related.map((item) => (
              <RecipeCard
                key={item.slug}
                recipe={item}
                category={categories.find((c) => c.slug === item.category) ?? null}
              />
            ))}
          </div>
        </Section>
      ) : null}

      <JsonLd
        data={[breadcrumbJsonLd(trail), recipeJsonLd({ recipe, category, settings })]}
      />
    </>
  )
}
