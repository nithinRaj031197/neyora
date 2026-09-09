'use client'

import { useMemo, useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/utils/cn'
import { formatQuantity } from '@/lib/utils/format'
import {
  groupIngredients,
  packSizeLabel,
  resolveIngredientsForPack,
} from '@/lib/utils/scale'
import type { Ingredient, PackSize, PackVariant } from '@/types/content'

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
  const [pack, setPack] = useState<PackSize>(recommendedPack)
  const [checked, setChecked] = useState<Set<number>>(new Set())

  const resolved = useMemo(
    () =>
      resolveIngredientsForPack({
        ingredients,
        basePackGrams,
        servings,
        isScalable,
        requestedPack: pack,
        variants,
      }),
    [ingredients, basePackGrams, servings, isScalable, pack, variants],
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

  const showSwitcher = availablePacks.length > 1

  function selectPack(next: PackSize) {
    setPack(next)
    // Ticks refer to the previous list's rows, so they must not carry over.
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

      {showSwitcher ? (
        <fieldset className="mt-6">
          <legend className="eyebrow">Scale for pack size</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {availablePacks.map((option) => {
              const active = option === pack
              const hasVariant = variants.some((v) => v.packSize === option)
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => selectPack(option)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex h-10 items-center gap-1.5 rounded-xs border px-3.5',
                    'text-[0.8125rem] font-medium tracking-[0.04em] uppercase transition-colors',
                    active
                      ? 'border-forest bg-forest text-ivory'
                      : 'border-beige text-earth-soft hover:border-forest/50 hover:text-forest',
                  )}
                >
                  {option === 'flexible' ? 'Any size' : option.replace('g', ' g')}
                  {hasVariant && !active ? (
                    <span
                      aria-hidden="true"
                      className="h-1.5 w-1.5 rounded-full bg-leaf"
                      title="Hand-written for this pack"
                    />
                  ) : null}
                </button>
              )
            })}
          </div>

          <p className="mt-3 text-[0.8125rem] leading-relaxed text-earth-muted">
            {resolved.source === 'variant' ? (
              <>
                <Icon name="check" size={13} className="mr-1 inline align-[-2px] text-botanical" />
                Written specifically for a {packSizeLabel(pack).toLowerCase()}.
              </>
            ) : resolved.source === 'scaled' ? (
              <>
                Scaled ×{resolved.factor.toFixed(2).replace(/\.00$/, '')} from the{' '}
                {basePackGrams} g version. Seasoning is a starting point — taste as you go.
              </>
            ) : (
              <>Quantities as written, for a {packSizeLabel(pack).toLowerCase()}.</>
            )}
          </p>
        </fieldset>
      ) : null}

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
                    <label className="flex cursor-pointer items-start gap-3 py-3">
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
                        className="mt-1 h-4 w-4 shrink-0 accent-botanical"
                      />
                      <span
                        className={cn(
                          'text-[1.0625rem] leading-snug transition-colors',
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
                        {ing.item}
                        {ing.note ? (
                          <span className="text-earth-muted">, {ing.note}</span>
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
    </section>
  )
}
