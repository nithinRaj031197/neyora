/**
 * Pack-size scaling for recipe ingredients.
 *
 * Resolution order for a requested pack size:
 *   1. A hand-written variant from the recipe's frontmatter, if the author
 *      wrote one. Seasoning does not scale linearly, so a human override
 *      always wins.
 *   2. Arithmetic scaling of the base list, multiplying only the lines marked
 *      `scalable`. Unmeasured lines ("salt, to taste") pass through untouched.
 *   3. The base list as written.
 *
 * This is why `qty` is a number and `scalable` is a boolean in the content
 * model rather than quantities being written into prose: prose cannot be
 * multiplied.
 */
import type { Ingredient, PackSize, PackVariant } from '@/types/content'

export const PACK_SIZES: PackSize[] = ['150g', '200g', '250g', '500g', 'flexible']
export const QUICK_MUSHROOM_GRAMS = [100, 150, 200, 250, 500] as const
export const MIN_MUSHROOM_GRAMS = 25
export const MAX_MUSHROOM_GRAMS = 1000

const PACK_GRAMS: Record<Exclude<PackSize, 'flexible'>, number> = {
  '150g': 150,
  '200g': 200,
  '250g': 250,
  '500g': 500,
}

export function packSizeToGrams(pack: PackSize): number | null {
  return pack === 'flexible' ? null : PACK_GRAMS[pack]
}

export function packSizeLabel(pack: PackSize): string {
  return pack === 'flexible' ? 'Any pack size' : `${pack.replace('g', '')} g pack`
}

/** Rounds to something a cook can actually measure. */
function roundForKitchen(value: number): number {
  if (value >= 100) return Math.round(value / 5) * 5
  if (value >= 20) return Math.round(value)
  if (value >= 4) return Math.round(value * 2) / 2
  return Math.round(value * 4) / 4
}

export function scaleIngredients(ingredients: Ingredient[], factor: number): Ingredient[] {
  if (factor === 1) return ingredients
  return ingredients.map((ing) =>
    !ing.scalable || ing.qty === null ? ing : { ...ing, qty: roundForKitchen(ing.qty * factor) },
  )
}

export function sanitizeMushroomGrams(value: number, fallback = 100): number {
  if (!Number.isFinite(value)) return fallback
  return Math.min(MAX_MUSHROOM_GRAMS, Math.max(MIN_MUSHROOM_GRAMS, Math.round(value)))
}

export interface ResolvedIngredients {
  ingredients: Ingredient[]
  /** Where the list came from — the UI tells the reader which it is. */
  source: 'base' | 'variant' | 'scaled'
  factor: number
  servings: number | null
  note: string | null
}

export function resolveIngredientsForPack(args: {
  ingredients: Ingredient[]
  basePackGrams?: number
  servings?: number
  isScalable: boolean
  requestedPack: PackSize
  variants: PackVariant[]
}): ResolvedIngredients {
  const { ingredients, basePackGrams, servings, isScalable, requestedPack, variants } = args

  const variant = variants.find((v) => v.packSize === requestedPack)
  if (variant && variant.ingredients.length > 0) {
    return {
      ingredients: variant.ingredients,
      source: 'variant',
      factor: 1,
      servings: variant.servings ?? servings ?? null,
      note: variant.note ?? null,
    }
  }

  const targetGrams = packSizeToGrams(requestedPack)
  const canScale =
    isScalable &&
    targetGrams !== null &&
    basePackGrams !== undefined &&
    basePackGrams > 0 &&
    targetGrams !== basePackGrams

  if (!canScale) {
    return { ingredients, source: 'base', factor: 1, servings: servings ?? null, note: null }
  }

  const factor = targetGrams / basePackGrams
  return {
    ingredients: scaleIngredients(ingredients, factor),
    source: 'scaled',
    factor,
    servings: servings ? Math.max(1, Math.round(servings * factor)) : null,
    note: null,
  }
}

export function resolveIngredientsForGrams(args: {
  ingredients: Ingredient[]
  baseMushroomGrams?: number
  servings?: number
  isScalable: boolean
  selectedMushroomGrams: number
}): ResolvedIngredients & { selectedMushroomGrams: number; baseMushroomGrams: number } {
  const {
    ingredients,
    baseMushroomGrams = 100,
    servings,
    isScalable,
    selectedMushroomGrams,
  } = args

  const base = sanitizeMushroomGrams(baseMushroomGrams, 100)
  const selected = sanitizeMushroomGrams(selectedMushroomGrams, base)
  const canScale = isScalable && base > 0 && selected !== base
  const factor = selected / base

  if (!canScale) {
    return {
      ingredients,
      source: 'base',
      factor: 1,
      servings: servings ?? null,
      note: null,
      selectedMushroomGrams: selected,
      baseMushroomGrams: base,
    }
  }

  return {
    ingredients: scaleIngredients(ingredients, factor),
    source: 'scaled',
    factor,
    servings: servings ? Math.max(1, Math.round(servings * factor)) : null,
    note: null,
    selectedMushroomGrams: selected,
    baseMushroomGrams: base,
  }
}

/** Which pack sizes are worth offering: the base, plus any hand-written variant. */
export function availablePacksFor(args: {
  recommended: PackSize
  isScalable: boolean
  basePackGrams?: number
  variants: PackVariant[]
}): PackSize[] {
  const { recommended, isScalable, basePackGrams, variants } = args
  const set = new Set<PackSize>([recommended])
  for (const v of variants) set.add(v.packSize)
  if (isScalable && basePackGrams) {
    for (const p of PACK_SIZES) if (p !== 'flexible') set.add(p)
  }
  return PACK_SIZES.filter((p) => set.has(p))
}

/** Groups an ingredient list by its optional `group` label, order preserved. */
export function groupIngredients(
  ingredients: Ingredient[],
): { label: string; items: Ingredient[] }[] {
  const groups: { label: string; items: Ingredient[] }[] = []
  for (const ing of ingredients) {
    const label = ing.group?.trim() || ''
    const existing = groups.find((g) => g.label === label)
    if (existing) existing.items.push(ing)
    else groups.push({ label, items: [ing] })
  }
  return groups
}
