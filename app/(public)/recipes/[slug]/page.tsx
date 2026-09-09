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
import { ViewTracker } from '@/components/public/ViewTracker'
import { getRecipeBySlug, getRelatedRecipes } from '@/lib/content/recipes'
import { getSiteSettings } from '@/lib/content/site'
import { buildMetadata } from '@/lib/seo/metadata'
import { breadcrumbJsonLd, recipeJsonLd } from '@/lib/seo/jsonld'
import { absoluteUrl } from '@/lib/env'
import { availablePacksFor } from '@/lib/utils/scale'

export const revalidate = 300

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const [settings, recipe] = await Promise.all([getSiteSettings(), getRecipeBySlug(slug)])

  if (!recipe) {
    return buildMetadata({
      title: 'Recipe not found',
      path: `/recipes/${slug}`,
      settings,
      noindex: true,
    })
  }

  return buildMetadata({
    title: recipe.seo_title || recipe.title,
    description: recipe.seo_description || recipe.excerpt,
    descriptionSource: recipe.body,
    path: `/recipes/${recipe.slug}`,
    canonicalOverride: recipe.canonical_url,
    // og_image_id lets an editor supply a 1200×630 crop; the cover is the
    // fallback so social previews are never empty.
    image: recipe.og ?? recipe.cover,
    noindex: recipe.noindex,
    type: 'article',
    publishedTime: recipe.published_at,
    modifiedTime: recipe.updated_at,
    settings,
  })
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const [settings, recipe] = await Promise.all([getSiteSettings(), getRecipeBySlug(slug)])

  if (!recipe) notFound()

  const related = await getRelatedRecipes(recipe, 3)

  const trail = [
    { name: 'Home', path: '/' },
    { name: 'Recipes', path: '/recipes' },
    ...(recipe.category
      ? [{ name: recipe.category.name, path: `/recipes/category/${recipe.category.slug}` }]
      : []),
    { name: recipe.title, path: `/recipes/${recipe.slug}` },
  ]

  const availablePacks = availablePacksFor({
    recommended: recipe.recommended_pack_size,
    isScalable: recipe.is_scalable,
    basePackGrams: recipe.base_pack_grams,
    variants: recipe.pack_variants,
  })

  const url = absoluteUrl(`/recipes/${recipe.slug}`)

  return (
    <>
      <ViewTracker event="recipe_view" props={{ recipe: recipe.slug }} />

      <RecipeHero
        recipe={recipe}
        cover={recipe.cover}
        category={recipe.category}
        tags={recipe.tags}
      />

      <Container size="wide" className="py-(--spacing-section-sm)">
        <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20">
          <div className="flex flex-col gap-16">
            {/*
              Two representations of the same recipe: the structured
              ingredient/step arrays (which also feed Recipe JSON-LD and the
              pack-size scaler), then the editorial Markdown body underneath.
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
              <ShareRow url={url} title={recipe.title} slug={recipe.slug} />
            </div>
          </div>

          <aside className="flex flex-col gap-12 lg:sticky lg:top-24 lg:self-start">
            <RecipeIngredientList
              ingredients={recipe.ingredients}
              basePackGrams={recipe.base_pack_grams}
              servings={recipe.servings}
              isScalable={recipe.is_scalable}
              recommendedPack={recipe.recommended_pack_size}
              availablePacks={availablePacks}
              variants={recipe.pack_variants}
              recipeSlug={recipe.slug}
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

            {recipe.nutrition?.per?.length ? <NutritionTable nutrition={recipe.nutrition} /> : null}

            {recipe.primary_product_id ? (
              <Card as="section" className="p-6">
                <p className="eyebrow">Made with</p>
                <p className="mt-3 text-[0.9375rem] leading-relaxed text-earth-soft">
                  This recipe was written for our fresh produce, picked the morning it ships.
                </p>
                <Link
                  href="/products"
                  className="mt-5 inline-flex h-10 items-center gap-2 rounded-xs border border-forest bg-forest px-4 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft"
                >
                  See the product
                  <Icon name="arrow-right" size={15} />
                </Link>
              </Card>
            ) : null}
          </aside>
        </div>
      </Container>

      {related.length > 0 ? (
        <Section tone="ivory-soft" containerSize="wide" ariaLabelledby="related-heading">
          <SectionHeader
            id="related-heading"
            eyebrow="Keep cooking"
            heading="More recipes"
          />
          <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-12">
            {related.map((item) => (
              <RecipeCard key={item.id} recipe={item} />
            ))}
          </div>
        </Section>
      ) : null}

      <JsonLd
        data={[
          breadcrumbJsonLd(trail),
          recipeJsonLd({
            recipe,
            cover: recipe.cover,
            category: recipe.category,
            tags: recipe.tags,
            settings,
          }),
        ]}
      />
    </>
  )
}
