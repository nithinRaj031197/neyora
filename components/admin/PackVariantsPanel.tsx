'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { AdminPanel } from './AdminShell'
import { IngredientsEditor } from './IngredientsEditor'
import { ConfirmButton } from './ConfirmButton'
import { Alert } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Field, Input, Select, Textarea } from '@/components/ui/Form'
import { IDLE } from '@/lib/actions/state'
import { deleteRecipePackVariant, saveRecipePackVariant } from '@/lib/actions/recipes'
import { useActionToast } from './Toast'
import { PACK_SIZES, packSizeLabel, scaleIngredients } from '@/lib/utils/scale'
import { formatQuantity } from '@/lib/utils/format'
import type { Ingredient, PackSize, RecipePackVariantRow } from '@/types/database'

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center rounded-xs border border-forest bg-forest px-5 text-[0.8125rem] font-medium tracking-[0.06em] text-ivory uppercase transition-colors hover:bg-forest-soft disabled:pointer-events-none disabled:opacity-50"
    >
      {pending ? 'Saving…' : 'Save pack list'}
    </button>
  )
}

/**
 * Pack-size overrides.
 *
 * Automatic scaling is arithmetic, and cooking is not: doubling a recipe
 * rarely means doubling the chilli, and 500 g will not fit one pan. So the
 * editor can start from the scaled list, adjust it by hand, and save it as
 * the definitive version for that pack. The public page prefers a saved
 * variant over arithmetic every time.
 */
export function PackVariantsPanel({
  recipeId,
  basePackGrams,
  recommendedPack,
  baseIngredients,
  variants,
}: {
  recipeId: string
  basePackGrams: number | null
  recommendedPack: PackSize
  baseIngredients: Ingredient[]
  variants: RecipePackVariantRow[]
}) {
  const [state, formAction] = useActionState(saveRecipePackVariant, IDLE)
  useActionToast(state)

  const others = PACK_SIZES.filter((p) => p !== recommendedPack && p !== 'flexible')
  const [pack, setPack] = useState<PackSize>(others[0] ?? '500g')

  const existing = variants.find((v) => v.pack_size === pack)
  const targetGrams = pack === 'flexible' ? null : Number(pack.replace('g', ''))
  const factor =
    basePackGrams && targetGrams ? targetGrams / basePackGrams : 1

  const [ingredients, setIngredients] = useState<Ingredient[]>(
    existing?.ingredients ?? scaleIngredients(baseIngredients, factor),
  )

  function selectPack(next: PackSize) {
    setPack(next)
    const variant = variants.find((v) => v.pack_size === next)
    const nextGrams = next === 'flexible' ? null : Number(next.replace('g', ''))
    const nextFactor = basePackGrams && nextGrams ? nextGrams / basePackGrams : 1
    // Seed from the saved variant if there is one, otherwise from the scaled
    // base — so an editor is always adjusting something, never starting blank.
    setIngredients(variant?.ingredients ?? scaleIngredients(baseIngredients, nextFactor))
  }

  return (
    <AdminPanel
      title="Pack-size specific ingredients"
      description="Optional. Save a hand-written ingredient list for a particular pack when arithmetic scaling would give the wrong answer."
    >
      <div className="flex flex-col gap-6">
        {variants.length > 0 ? (
          <div>
            <p className="text-[0.6875rem] font-semibold tracking-[0.12em] text-earth-muted uppercase">
              Saved lists
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {variants.map((variant) => (
                <li key={variant.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => selectPack(variant.pack_size)}
                    className={`inline-flex h-9 items-center gap-2 rounded-xs border px-3 text-[0.8125rem] transition-colors ${
                      pack === variant.pack_size
                        ? 'border-forest bg-forest text-ivory'
                        : 'border-beige text-earth-soft hover:border-forest/50'
                    }`}
                  >
                    {packSizeLabel(variant.pack_size)}
                    <Badge tone={pack === variant.pack_size ? 'golden' : 'leaf'}>
                      {variant.ingredients.length}
                    </Badge>
                  </button>
                  <ConfirmButton
                    action={deleteRecipePackVariant}
                    hiddenFields={{ recipe_id: recipeId, pack_size: variant.pack_size }}
                    triggerLabel="Remove"
                    title={`Remove the ${packSizeLabel(variant.pack_size)} list?`}
                    description="The recipe will fall back to scaling the base ingredients arithmetically for this pack size."
                    confirmLabel="Remove list"
                    triggerClassName="inline-flex h-9 items-center rounded-xs px-2 text-[0.6875rem] font-medium tracking-[0.04em] text-earth-muted uppercase transition-colors hover:text-danger"
                  />
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {!basePackGrams ? (
          <Alert tone="warning" title="Set a base pack weight first">
            Automatic scaling needs to know what weight the main ingredient list is written for. Add
            it in the “Pack size” section above and save.
          </Alert>
        ) : null}

        {state.status === 'error' && state.message ? (
          <Alert tone="danger">{state.message}</Alert>
        ) : null}

        <form action={formAction} className="flex flex-col gap-5">
          <input type="hidden" name="recipe_id" value={recipeId} />

          <div className="grid gap-5 sm:grid-cols-3">
            <Field label="Pack size" htmlFor="variant_pack_size">
              <Select
                id="variant_pack_size"
                name="pack_size"
                value={pack}
                onChange={(event) => selectPack(event.target.value as PackSize)}
              >
                {PACK_SIZES.filter((p) => p !== recommendedPack).map((option) => (
                  <option key={option} value={option}>
                    {packSizeLabel(option)}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Pack weight (grams)" htmlFor="variant_pack_grams">
              <Input
                id="variant_pack_grams"
                name="pack_grams"
                type="number"
                min="1"
                defaultValue={existing?.pack_grams ?? targetGrams ?? ''}
                key={`grams-${pack}`}
              />
            </Field>

            <Field label="Servings" htmlFor="variant_servings">
              <Input
                id="variant_servings"
                name="servings"
                type="number"
                min="1"
                defaultValue={existing?.servings ?? ''}
                key={`servings-${pack}`}
              />
            </Field>
          </div>

          {basePackGrams && factor !== 1 ? (
            <p className="text-[0.8125rem] leading-relaxed text-earth-muted">
              Pre-filled by scaling the base list ×{formatQuantity(Math.round(factor * 100) / 100)}.
              Adjust anything that does not scale cleanly — seasoning, oil, batter — then save.
            </p>
          ) : null}

          <IngredientsEditor
            name="ingredients"
            value={ingredients}
            onChange={setIngredients}
            key={`ingredients-${pack}`}
          />

          <Field
            label="Note for this pack"
            htmlFor="variant_note"
            hint="Shown above the ingredient list when a reader picks this pack size. Good for things like “cook in two batches”."
          >
            <Textarea
              id="variant_note"
              name="note"
              rows={2}
              defaultValue={existing?.note ?? ''}
              key={`note-${pack}`}
            />
          </Field>

          <div className="flex justify-end">
            <Submit />
          </div>
        </form>
      </div>
    </AdminPanel>
  )
}
