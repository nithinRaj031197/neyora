import { describe, expect, it } from 'vitest'
import {
  availablePacksFor,
  groupIngredients,
  packSizeLabel,
  packSizeToGrams,
  resolveIngredientsForPack,
  resolveIngredientsForGrams,
  sanitizeMushroomGrams,
  scaleIngredients,
} from '@/lib/utils/scale'
import type { Ingredient, PackVariant } from '@/types/content'

const BASE: Ingredient[] = [
  { qty: 200, unit: 'g', item: 'oyster mushrooms', scalable: true },
  { qty: 1, unit: 'tbsp', item: 'butter', scalable: true },
  { qty: 3, unit: 'clove', item: 'garlic', scalable: true },
  { qty: null, unit: '', item: 'Salt', note: 'to taste', scalable: false },
  { qty: 0.5, unit: 'tsp', item: 'chilli flakes', scalable: false },
]

function variant(overrides: Partial<PackVariant> = {}): PackVariant {
  return {
    packSize: '500g',
    packGrams: 500,
    servings: 5,
    ingredients: [{ qty: 500, unit: 'g', item: 'oyster mushrooms', scalable: true }],
    note: 'Cook in two batches.',
    ...overrides,
  }
}

describe('packSizeToGrams', () => {
  it('maps each concrete pack to grams', () => {
    expect(packSizeToGrams('150g')).toBe(150)
    expect(packSizeToGrams('200g')).toBe(200)
    expect(packSizeToGrams('500g')).toBe(500)
  })

  it('returns null for "flexible", which has no fixed weight', () => {
    expect(packSizeToGrams('flexible')).toBeNull()
  })
})

describe('packSizeLabel', () => {
  it('reads naturally', () => {
    expect(packSizeLabel('200g')).toBe('200 g pack')
    expect(packSizeLabel('flexible')).toBe('Any pack size')
  })
})

describe('scaleIngredients', () => {
  it('is a no-op at factor 1 and preserves identity', () => {
    expect(scaleIngredients(BASE, 1)).toBe(BASE)
  })

  it('multiplies only the lines marked scalable', () => {
    const scaled = scaleIngredients(BASE, 2)
    expect(scaled[0]?.qty).toBe(400)
    expect(scaled[1]?.qty).toBe(2)
    expect(scaled[2]?.qty).toBe(6)
  })

  it('leaves unmeasured ingredients alone', () => {
    expect(scaleIngredients(BASE, 2)[3]?.qty).toBeNull()
  })

  // The whole reason `scalable` exists: doubling a recipe should not double
  // the chilli, and the editor is the one who decides that.
  it('does not touch a measured ingredient flagged not-scalable', () => {
    expect(scaleIngredients(BASE, 2)[4]?.qty).toBe(0.5)
  })

  it('rounds large quantities to something measurable', () => {
    const scaled = scaleIngredients([{ qty: 200, unit: 'g', item: 'x', scalable: true }], 1.23)
    // 246 -> nearest 5
    expect(scaled[0]?.qty).toBe(245)
  })

  it('rounds small quantities to quarters', () => {
    const scaled = scaleIngredients([{ qty: 1, unit: 'tsp', item: 'x', scalable: true }], 1.6)
    expect(scaled[0]?.qty).toBe(1.5)
  })

  it('never produces an unusable long decimal', () => {
    const scaled = scaleIngredients([{ qty: 3, unit: 'clove', item: 'garlic', scalable: true }], 1.37)
    expect(String(scaled[0]?.qty)).toMatch(/^\d+(\.\d)?$/)
  })
})

describe('resolveIngredientsForPack', () => {
  const args = {
    ingredients: BASE,
    basePackGrams: 200,
    servings: 2,
    isScalable: true,
    variants: [] as PackVariant[],
  }

  it('returns the base list unchanged for the base pack', () => {
    const result = resolveIngredientsForPack({ ...args, requestedPack: '200g' })
    expect(result.source).toBe('base')
    expect(result.factor).toBe(1)
    expect(result.ingredients).toEqual(BASE)
  })

  it('scales arithmetically when no hand-written variant exists', () => {
    const result = resolveIngredientsForPack({ ...args, requestedPack: '500g' })
    expect(result.source).toBe('scaled')
    expect(result.factor).toBe(2.5)
    expect(result.ingredients[0]?.qty).toBe(500)
    expect(result.servings).toBe(5)
  })

  // A human's judgement beats arithmetic every time.
  it('prefers a hand-written variant over scaling', () => {
    const result = resolveIngredientsForPack({
      ...args,
      requestedPack: '500g',
      variants: [variant()],
    })
    expect(result.source).toBe('variant')
    expect(result.ingredients).toHaveLength(1)
    expect(result.note).toBe('Cook in two batches.')
    expect(result.servings).toBe(5)
  })

  it('ignores a variant with an empty ingredient list', () => {
    const result = resolveIngredientsForPack({
      ...args,
      requestedPack: '500g',
      variants: [variant({ ingredients: [] })],
    })
    expect(result.source).toBe('scaled')
  })

  it('refuses to scale when the recipe says it cannot be scaled', () => {
    const result = resolveIngredientsForPack({
      ...args,
      isScalable: false,
      requestedPack: '500g',
    })
    expect(result.source).toBe('base')
    expect(result.ingredients).toEqual(BASE)
  })

  it('refuses to scale without a known base weight', () => {
    const result = resolveIngredientsForPack({
      ...args,
      basePackGrams: undefined,
      requestedPack: '500g',
    })
    expect(result.source).toBe('base')
  })

  it('cannot scale to "flexible", which has no target weight', () => {
    const result = resolveIngredientsForPack({ ...args, requestedPack: 'flexible' })
    expect(result.source).toBe('base')
  })

  it('scales down as well as up', () => {
    const result = resolveIngredientsForPack({ ...args, requestedPack: '150g' })
    expect(result.factor).toBe(0.75)
    expect(result.ingredients[0]?.qty).toBe(150)
    expect(result.servings).toBe(2)
  })
})

describe('resolveIngredientsForGrams', () => {
  const ingredients: Ingredient[] = [
    { qty: 100, unit: 'g', item: 'oyster mushrooms', scalable: true },
    { qty: 12, unit: 'g', item: 'butter', scalable: true },
    { qty: 6, unit: 'g', item: 'garlic', scalable: true },
    { qty: null, unit: '', item: 'Salt', note: 'to taste', scalable: false },
    { qty: 0.5, unit: 'tsp', item: 'chilli flakes', scalable: false },
  ]

  it.each([
    [100, 100, 12, 6, 'base'],
    [150, 150, 18, 9, 'scaled'],
    [200, 200, 24, 12, 'scaled'],
    [250, 250, 30, 15, 'scaled'],
    [500, 500, 60, 30, 'scaled'],
  ] as const)('scales cleanly for %i g mushrooms', (grams, mushrooms, butter, garlic, source) => {
    const result = resolveIngredientsForGrams({
      ingredients,
      baseMushroomGrams: 100,
      servings: 1,
      isScalable: true,
      selectedMushroomGrams: grams,
    })

    expect(result.source).toBe(source)
    expect(result.ingredients[0]?.qty).toBe(mushrooms)
    expect(result.ingredients[1]?.qty).toBe(butter)
    expect(result.ingredients[2]?.qty).toBe(garlic)
    expect(result.ingredients[3]?.qty).toBeNull()
    expect(result.ingredients[4]?.qty).toBe(0.5)
  })

  it('supports a custom gram amount without ugly floating point output', () => {
    const result = resolveIngredientsForGrams({
      ingredients,
      baseMushroomGrams: 100,
      servings: 1,
      isScalable: true,
      selectedMushroomGrams: 333,
    })

    expect(result.ingredients[0]?.qty).toBe(335)
    expect(result.ingredients[1]?.qty).toBe(40)
    expect(result.ingredients[2]?.qty).toBe(20)
    expect(String(result.ingredients[2]?.qty)).not.toContain('333333')
  })

  it('sanitizes unusable quantities to safe bounds', () => {
    expect(sanitizeMushroomGrams(Number.NaN, 100)).toBe(100)
    expect(sanitizeMushroomGrams(-10, 100)).toBe(25)
    expect(sanitizeMushroomGrams(5000, 100)).toBe(1000)
  })

  it('does not scale when the recipe is marked non-scalable', () => {
    const result = resolveIngredientsForGrams({
      ingredients,
      baseMushroomGrams: 100,
      servings: 1,
      isScalable: false,
      selectedMushroomGrams: 250,
    })

    expect(result.source).toBe('base')
    expect(result.ingredients).toEqual(ingredients)
    expect(result.factor).toBe(1)
  })
})

describe('availablePacksFor', () => {
  it('offers only the recommended pack when scaling is off', () => {
    expect(
      availablePacksFor({
        recommended: '200g',
        isScalable: false,
        basePackGrams: 200,
        variants: [],
      }),
    ).toEqual(['200g'])
  })

  it('offers every concrete pack when scaling is on', () => {
    expect(
      availablePacksFor({
        recommended: '200g',
        isScalable: true,
        basePackGrams: 200,
        variants: [],
      }),
    ).toEqual(['150g', '200g', '250g', '500g'])
  })

  it('includes a hand-written variant even when scaling is off', () => {
    expect(
      availablePacksFor({
        recommended: '200g',
        isScalable: false,
        basePackGrams: 200,
        variants: [variant()],
      }),
    ).toEqual(['200g', '500g'])
  })

  it('returns packs in a stable, ascending order', () => {
    const packs = availablePacksFor({
      recommended: '500g',
      isScalable: true,
      basePackGrams: 500,
      variants: [],
    })
    expect(packs).toEqual(['150g', '200g', '250g', '500g'])
  })
})

describe('groupIngredients', () => {
  it('keeps ungrouped items in one unlabelled group', () => {
    const groups = groupIngredients(BASE)
    expect(groups).toHaveLength(1)
    expect(groups[0]?.label).toBe('')
  })

  it('splits by group label, preserving first-appearance order', () => {
    const groups = groupIngredients([
      { qty: 1, unit: '', item: 'a', scalable: true, group: 'For the pan' },
      { qty: 1, unit: '', item: 'b', scalable: true, group: 'For the batter' },
      { qty: 1, unit: '', item: 'c', scalable: true, group: 'For the pan' },
    ])
    expect(groups.map((g) => g.label)).toEqual(['For the pan', 'For the batter'])
    expect(groups[0]?.items).toHaveLength(2)
  })

  it('treats a whitespace-only group as ungrouped', () => {
    const groups = groupIngredients([{ qty: 1, unit: '', item: 'a', scalable: true, group: '  ' }])
    expect(groups[0]?.label).toBe('')
  })
})
