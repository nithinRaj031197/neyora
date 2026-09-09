'use client'

import { useActionState, useState } from 'react'
import { saveRecipe } from '@/lib/actions/recipes'
import { IDLE } from '@/lib/actions/state'
import { Alert } from '@/components/ui/Alert'
import { Field, FieldGroup, Input, Select, Textarea, Checkbox } from '@/components/ui/Form'
import { AdminPanel } from './AdminShell'
import { RichMarkdownEditor } from './RichMarkdownEditor'
import { IngredientsEditor } from './IngredientsEditor'
import { StepsEditor } from './StepsEditor'
import { NutritionEditor } from './NutritionEditor'
import { StringListEditor } from './StringListEditor'
import { ImageField } from './ImageField'
import { SlugField } from './SlugField'
import { PublishBar } from './PublishBar'
import { useActionToast } from './Toast'
import { PACK_SIZES, packSizeLabel } from '@/lib/utils/scale'
import type {
  ContentStatus,
  Ingredient,
  MediaRow,
  Nutrition,
  PackSize,
  RecipeCategoryRow,
  RecipeDifficulty,
  RecipeStep,
  RecipeTagRow,
} from '@/types/database'
import type { AdminRecipe } from '@/lib/content/admin'

/**
 * The recipe editor.
 *
 * Structured fields (ingredients, steps, nutrition, equipment) are held in
 * React state and submitted as JSON through hidden inputs; everything else is
 * a plain form control. The server re-validates the lot with the same Zod
 * schema, so the client is a convenience layer and never the gatekeeper.
 */
export function RecipeForm({
  recipe,
  categories,
  tags,
  cover,
}: {
  recipe: AdminRecipe | null
  categories: RecipeCategoryRow[]
  tags: RecipeTagRow[]
  cover: MediaRow | null
}) {
  const [state, formAction] = useActionState(saveRecipe, IDLE)
  useActionToast(state)

  const [title, setTitle] = useState(recipe?.title ?? '')
  const [status, setStatus] = useState<ContentStatus>(recipe?.status ?? 'draft')
  const [scheduledAt, setScheduledAt] = useState(recipe?.scheduled_at ?? null)
  const [ingredients, setIngredients] = useState<Ingredient[]>(recipe?.ingredients ?? [])
  const [steps, setSteps] = useState<RecipeStep[]>(recipe?.steps ?? [])
  const [nutrition, setNutrition] = useState<Nutrition>(
    recipe?.nutrition ?? { basis: '', per: [], note: '' },
  )
  const [equipment, setEquipment] = useState<string[]>(recipe?.equipment ?? [])
  const [selectedTags, setSelectedTags] = useState<string[]>(recipe?.tag_ids ?? [])
  const [pack, setPack] = useState<PackSize>(recipe?.recommended_pack_size ?? '200g')

  const error = (field: string) => state.errors?.[field]

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      {recipe ? <input type="hidden" name="id" value={recipe.id} /> : null}

      {state.status === 'error' && state.message ? (
        <Alert tone="danger" title="Not saved">
          {state.message}
        </Alert>
      ) : null}

      <AdminPanel title="The basics">
        <div className="flex flex-col gap-5">
          <Field label="Title" htmlFor="title" required error={error('title')}>
            <Input
              id="title"
              name="title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              required
              autoFocus={!recipe}
              invalid={Boolean(error('title'))}
              placeholder="Garlic Butter Oyster Mushrooms"
            />
          </Field>

          <SlugField
            title={title}
            defaultValue={recipe?.slug ?? ''}
            error={error('slug')}
            prefix="/recipes/"
            locked={Boolean(recipe)}
          />

          <Field
            label="Excerpt"
            htmlFor="excerpt"
            hint="One or two sentences. Shown on recipe cards and used as the meta description when no SEO description is set."
            error={error('excerpt')}
          >
            <Textarea
              id="excerpt"
              name="excerpt"
              rows={2}
              defaultValue={recipe?.excerpt ?? ''}
              maxLength={320}
              invalid={Boolean(error('excerpt'))}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" htmlFor="category_id" error={error('category_id')}>
              <Select id="category_id" name="category_id" defaultValue={recipe?.category_id ?? ''}>
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                    {category.status !== 'published' ? ' (unpublished)' : ''}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Difficulty" htmlFor="difficulty">
              <Select
                id="difficulty"
                name="difficulty"
                defaultValue={(recipe?.difficulty ?? 'easy') satisfies RecipeDifficulty}
              >
                <option value="easy">Easy</option>
                <option value="medium">Some skill</option>
                <option value="hard">Challenging</option>
              </Select>
            </Field>
          </div>

          <ImageField
            name="cover_image_id"
            label="Cover image"
            hint="Landscape works best — it is used on cards, the recipe hero and social previews."
            defaultMedia={cover}
            folder="recipes"
          />
        </div>
      </AdminPanel>

      <AdminPanel
        title="Timings and yield"
        description="Total time is calculated from prep plus cook, and feeds the recipe's structured data."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Prep (minutes)" htmlFor="prep_time_minutes" error={error('prep_time_minutes')}>
            <Input
              id="prep_time_minutes"
              name="prep_time_minutes"
              type="number"
              min="0"
              defaultValue={recipe?.prep_time_minutes ?? ''}
              invalid={Boolean(error('prep_time_minutes'))}
            />
          </Field>
          <Field label="Cook (minutes)" htmlFor="cook_time_minutes" error={error('cook_time_minutes')}>
            <Input
              id="cook_time_minutes"
              name="cook_time_minutes"
              type="number"
              min="0"
              defaultValue={recipe?.cook_time_minutes ?? ''}
              invalid={Boolean(error('cook_time_minutes'))}
            />
          </Field>
          <Field label="Servings" htmlFor="servings" error={error('servings')}>
            <Input
              id="servings"
              name="servings"
              type="number"
              min="1"
              defaultValue={recipe?.servings ?? ''}
              invalid={Boolean(error('servings'))}
            />
          </Field>
          <Field
            label="Servings label"
            htmlFor="servings_label"
            hint="e.g. “as a side for 2”"
          >
            <Input
              id="servings_label"
              name="servings_label"
              defaultValue={recipe?.servings_label ?? ''}
            />
          </Field>
          <Field label="Cuisine" htmlFor="cuisine">
            <Input id="cuisine" name="cuisine" defaultValue={recipe?.cuisine ?? ''} placeholder="South Indian" />
          </Field>
          <Field label="Course" htmlFor="course">
            <Input id="course" name="course" defaultValue={recipe?.course ?? ''} placeholder="Side" />
          </Field>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Pack size"
        description="Which pack this recipe is written for. If it can be scaled, quantities marked “scale with pack size” are multiplied automatically for other packs — and you can override any pack with a hand-written list after saving."
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Recommended pack" htmlFor="recommended_pack_size">
            <Select
              id="recommended_pack_size"
              name="recommended_pack_size"
              value={pack}
              onChange={(event) => setPack(event.target.value as PackSize)}
            >
              {PACK_SIZES.map((option) => (
                <option key={option} value={option}>
                  {packSizeLabel(option)}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Base pack weight (grams)"
            htmlFor="base_pack_grams"
            hint="The weight the ingredient list below is written for. Required for automatic scaling."
            error={error('base_pack_grams')}
          >
            <Input
              id="base_pack_grams"
              name="base_pack_grams"
              type="number"
              min="1"
              defaultValue={recipe?.base_pack_grams ?? (pack === 'flexible' ? '' : pack.replace('g', ''))}
              invalid={Boolean(error('base_pack_grams'))}
            />
          </Field>

          <div className="sm:col-span-2">
            <Checkbox
              name="is_scalable"
              label="Allow automatic scaling to other pack sizes"
              hint="Turn off for recipes where the quantities genuinely do not scale — a batter, or anything depending on pan size."
              defaultChecked={recipe?.is_scalable ?? true}
            />
          </div>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Ingredients"
        description="Quantities are numbers, so they can be scaled and read by search engines. Leave the quantity blank for anything measured by taste."
      >
        <IngredientsEditor name="ingredients" value={ingredients} onChange={setIngredients} />
      </AdminPanel>

      <AdminPanel
        title="Method"
        description="Numbered steps shown on the recipe page. These also become the structured HowTo steps that search engines read."
      >
        <StepsEditor name="steps" value={steps} onChange={setSteps} />
      </AdminPanel>

      <AdminPanel
        title="Notes and story"
        description="The editorial part of the recipe — why it works, what to watch out for, what to serve it with. Written in Markdown."
      >
        <RichMarkdownEditor
          name="body"
          label="Recipe notes"
          hint="Headings, bold, italics, lists, links, tables, quotes and images are all supported."
          defaultValue={recipe?.body ?? ''}
          rows={20}
        />
      </AdminPanel>

      <AdminPanel title="Extras">
        <div className="flex flex-col gap-6">
          <StringListEditor
            name="equipment"
            value={equipment}
            onChange={setEquipment}
            label="Equipment"
            hint="Anything the cook needs that is not an ingredient."
            placeholder="Cast-iron pan"
            addLabel="Add equipment"
          />

          <Field
            label="Worth knowing"
            htmlFor="tips"
            hint="A short highlighted note at the end of the recipe. One or two sentences works best."
          >
            <Textarea id="tips" name="tips" rows={3} defaultValue={recipe?.tips ?? ''} />
          </Field>

          <FieldGroup legend="Tags" description="Used for filtering on the recipes page.">
            <div className="flex flex-wrap gap-2">
              {tags.length === 0 ? (
                <p className="text-[0.8125rem] text-earth-muted">
                  No tags yet — create some in Admin → Categories.
                </p>
              ) : null}
              {tags.map((tag) => {
                const checked = selectedTags.includes(tag.id)
                return (
                  <label
                    key={tag.id}
                    className={`inline-flex cursor-pointer items-center gap-2 rounded-xs border px-3 py-2 text-[0.8125rem] transition-colors ${
                      checked
                        ? 'border-botanical bg-leaf/15 text-forest'
                        : 'border-beige text-earth-soft hover:border-forest/40'
                    }`}
                  >
                    <input
                      type="checkbox"
                      name="tag_ids"
                      value={tag.id}
                      checked={checked}
                      onChange={(event) =>
                        setSelectedTags((prev) =>
                          event.target.checked
                            ? [...prev, tag.id]
                            : prev.filter((id) => id !== tag.id),
                        )
                      }
                      className="h-3.5 w-3.5 accent-botanical"
                    />
                    {tag.name}
                  </label>
                )
              })}
            </div>
          </FieldGroup>
        </div>
      </AdminPanel>

      <AdminPanel
        title="Nutrition"
        description="Optional. Appears as a table on the recipe page and in its structured data."
      >
        <NutritionEditor name="nutrition" value={nutrition} onChange={setNutrition} />
      </AdminPanel>

      <AdminPanel
        title="Search and social"
        description="Leave these blank and the title and excerpt are used instead — which is usually the right answer."
      >
        <div className="flex flex-col gap-5">
          <Field
            label="SEO title"
            htmlFor="seo_title"
            hint="Around 60 characters shows fully in search results."
            error={error('seo_title')}
          >
            <Input
              id="seo_title"
              name="seo_title"
              defaultValue={recipe?.seo_title ?? ''}
              maxLength={120}
              invalid={Boolean(error('seo_title'))}
            />
          </Field>

          <Field
            label="SEO description"
            htmlFor="seo_description"
            hint="Around 155 characters. Write it for a person deciding whether to click."
            error={error('seo_description')}
          >
            <Textarea
              id="seo_description"
              name="seo_description"
              rows={2}
              defaultValue={recipe?.seo_description ?? ''}
              maxLength={320}
              invalid={Boolean(error('seo_description'))}
            />
          </Field>

          <Field
            label="Canonical URL"
            htmlFor="canonical_url"
            hint="Only if this recipe was published elsewhere first. Leave blank otherwise."
            error={error('canonical_url')}
          >
            <Input
              id="canonical_url"
              name="canonical_url"
              type="url"
              defaultValue={recipe?.canonical_url ?? ''}
              invalid={Boolean(error('canonical_url'))}
            />
          </Field>

          <ImageField
            name="og_image_id"
            label="Social sharing image"
            hint="Used for WhatsApp, Facebook and X previews. A 1200 × 630 crop is ideal; the cover image is used if this is empty."
            defaultMedia={null}
            folder="social"
            aspect="1200 / 630"
          />

          <div className="flex flex-col gap-3">
            <Checkbox
              name="featured"
              label="Feature this recipe"
              hint="Featured recipes appear first on the recipes page and on the homepage."
              defaultChecked={recipe?.featured ?? false}
            />
            <Checkbox
              name="noindex"
              label="Hide from search engines"
              hint="Keeps the recipe out of Google and out of the sitemap. It stays reachable by direct link."
              defaultChecked={recipe?.noindex ?? false}
            />
          </div>

          <Field
            label="Sort order"
            htmlFor="sort_order"
            hint="Lower numbers appear first among featured recipes. Leave at 0 unless you are arranging a collection."
          >
            <Input
              id="sort_order"
              name="sort_order"
              type="number"
              defaultValue={recipe?.sort_order ?? 0}
              className="max-w-32"
            />
          </Field>
        </div>
      </AdminPanel>

      <PublishBar
        status={status}
        onStatusChange={setStatus}
        scheduledAt={scheduledAt}
        onScheduledAtChange={(value) => setScheduledAt(value || null)}
        scheduleError={error('scheduled_at')}
        previewHref={recipe ? `/admin/recipes/${recipe.id}/preview` : undefined}
        publicHref={recipe && recipe.status === 'published' ? `/recipes/${recipe.slug}` : undefined}
      />
    </form>
  )
}
