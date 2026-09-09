import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { Container } from '@/components/ui/Container'
import { MarkdownRenderer } from '@/components/ui/MarkdownRenderer'
import { RecipeHero } from '@/components/public/RecipeHero'
import { RecipeIngredientList } from '@/components/public/RecipeIngredientList'
import { RecipeSteps } from '@/components/public/RecipeSteps'
import { NutritionTable } from '@/components/public/NutritionTable'
import { StatusBadge, isPublicationLive } from '@/components/ui/Badge'
import { Icon } from '@/components/ui/Icon'
import { requireAdmin } from '@/lib/auth/session'
import { getAdminRecipe } from '@/lib/content/admin'
import { createClient } from '@/lib/supabase/server'
import { availablePacksFor } from '@/lib/utils/scale'
import type { RecipeCategoryRow, RecipeTagRow } from '@/types/database'

/**
 * Draft preview.
 *
 * The public recipe route only ever serves published rows — that is enforced
 * by RLS, not by a query filter, so there is no "preview token" to leak. This
 * admin route renders the same public components against the admin query
 * instead, which is why an unpublished recipe can be reviewed exactly as it
 * will look without being visible to anyone else.
 */
export const metadata: Metadata = {
  title: 'Preview — NEYORA CMS',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

export default async function RecipePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireAdmin(`/admin/recipes/${id}/preview`)

  const recipe = await getAdminRecipe(id)
  if (!recipe) notFound()

  const supabase = await createClient()
  const [categoryRes, tagRes] = await Promise.all([
    recipe.category_id
      ? supabase.from('recipe_categories').select('*').eq('id', recipe.category_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('recipe_tag_map').select('recipe_tags(*)').eq('recipe_id', recipe.id),
  ])

  const tags = (tagRes.data ?? [])
    .map((row) => (row as { recipe_tags: RecipeTagRow | null }).recipe_tags)
    .filter((t): t is RecipeTagRow => Boolean(t))

  const availablePacks = availablePacksFor({
    recommended: recipe.recommended_pack_size,
    isScalable: recipe.is_scalable,
    basePackGrams: recipe.base_pack_grams,
    variants: recipe.pack_variants,
  })

  return (
    <div className="bg-ivory">
      {/* An unmistakable banner: a preview must never be confused with the
          live page, especially when someone screenshots it for approval. */}
      <div className="sticky top-0 z-50 flex flex-wrap items-center justify-between gap-3 bg-earth px-5 py-3 text-ivory">
        <div className="flex items-center gap-3">
          <Icon name="search" size={17} className="text-leaf" />
          <p className="text-[0.8125rem]">
            Preview — not visible to the public
          </p>
          <StatusBadge
            status={recipe.status}
            isLive={isPublicationLive(recipe.status, recipe.scheduled_at)}
          />
        </div>
        <Link
          href={`/admin/recipes/${recipe.id}`}
          className="inline-flex h-9 items-center gap-2 rounded-xs border border-ivory/30 px-3 text-[0.75rem] font-medium tracking-[0.06em] uppercase transition-colors hover:border-ivory/70"
        >
          Back to editing
        </Link>
      </div>

      <RecipeHero
        recipe={recipe}
        cover={recipe.cover}
        category={(categoryRes.data as RecipeCategoryRow | null) ?? null}
        tags={tags}
      />

      <Container size="wide" className="py-(--spacing-section-sm)">
        <div className="grid gap-16 lg:grid-cols-[1fr_minmax(0,22rem)] lg:gap-20">
          <div className="flex flex-col gap-16">
            <RecipeSteps steps={recipe.steps} />
            {recipe.body.trim() ? <MarkdownRenderer content={recipe.body} /> : null}
            {recipe.tips ? (
              <section className="border-l-2 border-leaf bg-ivory-soft py-6 pr-6 pl-6">
                <h2 className="font-sans text-[0.75rem] font-semibold tracking-[0.16em] text-botanical uppercase">
                  Worth knowing
                </h2>
                <p className="mt-3 max-w-[58ch] text-[1.0625rem] leading-relaxed">{recipe.tips}</p>
              </section>
            ) : null}
          </div>

          <aside className="flex flex-col gap-12">
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
            {recipe.nutrition?.per?.length ? <NutritionTable nutrition={recipe.nutrition} /> : null}
          </aside>
        </div>
      </Container>
    </div>
  )
}
