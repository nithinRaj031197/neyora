'use client'

import { useMemo, useState } from 'react'
import { cn } from '@/lib/utils/cn'
import { IngredientShoppingHelper } from '@/components/public/IngredientShoppingHelper'
import { formatQuantity } from '@/lib/utils/format'
import { groupIngredients, scaleIngredients } from '@/lib/utils/scale'
import type { Ingredient, PackSize, PackVariant } from '@/types/content'

const QUICK_MUSHROOM_GRAMS = [100, 150, 200, 250, 500] as const
const MIN_MUSHROOM_GRAMS = 25
const MAX_MUSHROOM_GRAMS = 1000

function sanitizeMushroomGrams(value: number, fallback = 100): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(MAX_MUSHROOM_GRAMS, Math.max(MIN_MUSHROOM_GRAMS, Math.round(value)))
}

/**
 * Ingredient list with pack-size switching and tick-off.
 *
 * The pack switcher is the feature the schema was designed around: a
 * hand-tuned `recipe_pack_variants` row wins if the editor wrote one,
 * otherwise quantities are scaled arithmetically and only the lines flagged
 * `scalable` move. The list always says which of the two you are looking at,
 * because silently multiplying someone's chilli by 2.5 would be worse than
 * showing nothing.
 *
 * Ticking is local state only — nothing is stored, nothing is sent.
 */
export function RecipeIngredientList({
  ingredients,
  basePackGrams,
  servings,
  isScalable,
  recommendedPack,
  availablePacks,
  variants,
}: {
  ingredients: Ingredient[]
  basePackGrams?: number
  servings?: number
  isScalable: boolean
  recommendedPack: PackSize
  availablePacks: PackSize[]
  variants: PackVariant[]
}) {
  const baseMushroomGrams = basePackGrams ?? 100
  const [selectedGrams, setSelectedGrams] = useState(baseMushroomGrams)
  const [customValue, setCustomValue] = useState(String(baseMushroomGrams))
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const resolved = useMemo(
    () => {
      const selected = sanitizeMushroomGrams(selectedGrams, baseMushroomGrams)
      const canScale = isScalable && baseMushroomGrams > 0 && selected !== baseMushroomGrams
      const factor = selected / baseMushroomGrams

      if (!canScale) {
        return {
          ingredients,
          source: 'base' as const,
          factor: 1,
          servings: servings ?? null,
          note: null,
          selectedMushroomGrams: selected,
          baseMushroomGrams,
        }
      }

      return {
        ingredients: scaleIngredients(ingredients, factor),
        source: 'scaled' as const,
        factor,
        servings: servings ? Math.max(1, Math.round(servings * factor)) : null,
        note: null,
        selectedMushroomGrams: selected,
        baseMushroomGrams,
      }
    },
    [ingredients, baseMushroomGrams, servings, isScalable, selectedGrams],
  )

  /*
   * Groups carry each item's index within the *flat* list, assigned here
   * rather than by a counter mutated during render. The flat index is what the
   * tick-off state is keyed on, so it has to be stable and derived, not
   * accumulated as the JSX renders.
   */
  const groups = useMemo(() => {
    let cursor = 0
    return groupIngredients(resolved.ingredients).map((group) => ({
      label: group.label,
      items: group.items.map((item) => ({ item, index: cursor++ })),
    }))
  }, [resolved.ingredients])

  if (ingredients.length === 0) return null

  const hasFutureOverrides =
    availablePacks.length > 1 || variants.length > 0 || recommendedPack !== 'flexible'

  function selectGrams(next: number) {
    const grams = sanitizeMushroomGrams(next, baseMushroomGrams)
    setSelectedGrams(grams)
    setCustomValue(String(grams))
    setChecked(new Set())
  }

  return (
    <section aria-labelledby="ingredients-heading">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <h2 id="ingredients-heading" className="text-(length:--text-display-sm)">
          Ingredients
        </h2>
        {resolved.servings ? (
          <p className="text-[0.875rem] text-earth-muted">
            Serves {resolved.servings}
          </p>
        ) : null}
      </div>

      <fieldset className="mt-6">
        <legend className="eyebrow">How much mushroom are you cooking?</legend>
        <div className="mt-3 grid grid-cols-2 gap-2 min-[360px]:grid-cols-3 min-[520px]:grid-cols-5 lg:flex lg:flex-wrap">
          {QUICK_MUSHROOM_GRAMS.map((grams) => {
            const active = grams === selectedGrams
            return (
              <button
                key={grams}
                type="button"
                onClick={() => selectGrams(grams)}
                aria-pressed={active}
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-xs border px-2.5',
                  'text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors',
                  active
                    ? 'border-forest bg-forest text-ivory'
                    : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest',
                )}
              >
                {grams} g
              </button>
            )
          })}
        </div>

        <label className="mt-4 block">
          <span className="text-[0.8125rem] font-medium tracking-[0.08em] text-earth-muted uppercase">
            Custom grams
          </span>
          <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={MIN_MUSHROOM_GRAMS}
              max={MAX_MUSHROOM_GRAMS}
              step={25}
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              onBlur={() => selectGrams(Number(customValue))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
              }}
              className="h-12 min-w-0 rounded-xs border border-beige bg-ivory px-3 text-[1rem] text-forest focus:border-forest"
            />
            <button
              type="button"
              onClick={() => selectGrams(Number(customValue))}
              className="inline-flex h-12 items-center justify-center rounded-xs border border-forest/35 px-4 text-[0.8125rem] font-medium tracking-[0.04em] text-forest uppercase transition-colors hover:border-forest hover:bg-forest/5"
            >
              Update
            </button>
          </div>
        </label>

        <p className="mt-3 text-[0.8125rem] leading-relaxed text-earth-muted">
          {resolved.source === 'scaled' ? (
            <>
              Scaled ×{resolved.factor.toFixed(2).replace(/\.00$/, '')} from the{' '}
              {resolved.baseMushroomGrams} g recipe. Seasoning is a starting point — taste as you go.
            </>
          ) : (
            <>Quantities as written for {resolved.baseMushroomGrams} g oyster mushrooms.</>
          )}
          {hasFutureOverrides ? (
            <span className="mt-1 block">
              Pack-specific overrides can be added later without changing this calculator.
            </span>
          ) : null}
        </p>
      </fieldset>

      {resolved.note ? (
        <p className="mt-5 border-l-2 border-leaf py-1 pl-4 text-[0.9375rem] leading-relaxed text-earth-soft">
          {resolved.note}
        </p>
      ) : null}

      <div className="mt-7 flex flex-col gap-7">
        {groups.map((group) => (
          <div key={group.label || 'default'}>
            {group.label ? (
              <h3 className="font-sans text-[0.75rem] font-semibold tracking-[0.14em] text-earth-soft uppercase">
                {group.label}
              </h3>
            ) : null}
            <ul className={cn('flex flex-col', group.label && 'mt-3')}>
              {group.items.map(({ item: ing, index: i }) => {
                const isChecked = checked.has(i)
                return (
                  <li key={`${ing.item}-${i}`} className="border-b border-beige/70 last:border-b-0">
                    <label className="flex min-h-12 cursor-pointer items-start gap-3 py-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() =>
                          setChecked((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })
                        }
                        className="mt-1 h-5 w-5 shrink-0 accent-botanical"
                      />
                      <span
                        className={cn(
                          'text-[1.0625rem] leading-snug transition-colors sm:text-[1.125rem]',
                          isChecked ? 'text-earth-muted line-through' : 'text-earth',
                        )}
                      >
                        {ing.qty !== null ? (
                          <strong className="font-sans font-semibold text-forest">
                            {formatQuantity(ing.qty)}
                            {ing.unit ? ` ${ing.unit}` : ''}
                          </strong>
                        ) : null}
                        {ing.qty !== null ? ' ' : ''}
                        {ing.displayText ?? ing.item}
                        {ing.note ? (
                          <span className="text-earth-muted">, {ing.note}</span>
                        ) : null}
                        {ing.optional ? (
                          <span className="text-earth-muted"> (optional)</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <IngredientShoppingHelper ingredients={resolved.ingredients} />
      </div>
    </section>
  )
}
