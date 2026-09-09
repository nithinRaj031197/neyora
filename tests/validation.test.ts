import { describe, expect, it } from 'vitest'
import { SLUG_PATTERN, slugify } from '@/lib/validation/common'
import {
  imageSchema,
  productFrontmatterSchema,
  recipeFrontmatterSchema,
  siteSchema,
} from '@/lib/validation/content'

/**
 * The content schemas are the guardrail that replaced the database's
 * constraints. These tests cover the rules that would otherwise let a broken
 * page reach production.
 */

/** A complete, valid recipe — the baseline each case perturbs. */
function validRecipe(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Garlic Butter Oyster Mushrooms',
    slug: 'garlic-butter-oyster-mushrooms',
    status: 'published',
    basePackGrams: 200,
    ingredients: [{ qty: 200, unit: 'g', item: 'oyster mushrooms' }],
    steps: [{ body: 'Heat the pan.' }],
    ...overrides,
  }
}

describe('slugify', () => {
  it('produces a url-safe slug', () => {
    expect(slugify('Garlic Butter Oyster Mushrooms')).toBe('garlic-butter-oyster-mushrooms')
  })

  it('collapses punctuation and repeated separators', () => {
    expect(slugify('Pepper  &  Salt --- Fry!!')).toBe('pepper-salt-fry')
  })

  it('strips accents rather than dropping the letter', () => {
    expect(slugify('Crème Brûlée')).toBe('creme-brulee')
  })

  it('never returns a leading or trailing hyphen', () => {
    expect(slugify('  --hello--  ')).toBe('hello')
  })

  it('always produces something the slug pattern accepts', () => {
    for (const input of ['Hello World', 'Crème Brûlée', 'a---b', '  spaced  ']) {
      expect(SLUG_PATTERN.test(slugify(input))).toBe(true)
    }
  })
})

describe('imageSchema', () => {
  const valid = { src: '/images/a.webp', alt: 'A description', width: 800, height: 600 }

  it('accepts a complete image', () => {
    expect(imageSchema.safeParse(valid).success).toBe(true)
  })

  // Alt text is an accessibility requirement, not a nicety. A missing one
  // should fail the build, exactly as a NOT NULL would have.
  it('rejects an image with no alt text', () => {
    expect(imageSchema.safeParse({ ...valid, alt: '' }).success).toBe(false)
  })

  // Without dimensions the browser cannot reserve space and the page shifts.
  it('rejects an image with no dimensions', () => {
    expect(imageSchema.safeParse({ ...valid, width: undefined }).success).toBe(false)
    expect(imageSchema.safeParse({ ...valid, height: 0 }).success).toBe(false)
  })

  it('rejects a path that is not relative to /public', () => {
    expect(imageSchema.safeParse({ ...valid, src: 'images/a.webp' }).success).toBe(false)
  })
})

describe('recipeFrontmatterSchema', () => {
  it('accepts a complete recipe', () => {
    expect(recipeFrontmatterSchema.safeParse(validRecipe()).success).toBe(true)
  })

  it('requires a title and a valid slug', () => {
    expect(recipeFrontmatterSchema.safeParse(validRecipe({ title: '' })).success).toBe(false)
    expect(recipeFrontmatterSchema.safeParse(validRecipe({ slug: 'Not A Slug' })).success).toBe(false)
  })

  it('defaults ingredient scalability to true', () => {
    const parsed = recipeFrontmatterSchema.parse(validRecipe())
    expect(parsed.ingredients[0]?.scalable).toBe(true)
  })

  it('allows an unmeasured ingredient', () => {
    const parsed = recipeFrontmatterSchema.parse(
      validRecipe({
        ingredients: [{ qty: null, unit: '', item: 'Salt', note: 'to taste', scalable: false }],
      }),
    )
    expect(parsed.ingredients[0]?.qty).toBeNull()
  })

  it('requires every ingredient to be named', () => {
    expect(
      recipeFrontmatterSchema.safeParse(validRecipe({ ingredients: [{ qty: 1, item: '' }] })).success,
    ).toBe(false)
  })

  /*
   * Without basePackGrams the pack-size switcher would silently show
   * unscaled quantities — worse than not offering it at all.
   */
  it('rejects a scalable recipe with no base pack weight', () => {
    const result = recipeFrontmatterSchema.safeParse(
      validRecipe({ basePackGrams: undefined, isScalable: true }),
    )
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.path).toContain('basePackGrams')
    }
  })

  it('allows no base pack weight when scaling is switched off', () => {
    expect(
      recipeFrontmatterSchema.safeParse(
        validRecipe({ basePackGrams: undefined, isScalable: false }),
      ).success,
    ).toBe(true)
  })

  // A published recipe with no method is an unfinished draft.
  it('rejects a published recipe with no steps', () => {
    expect(recipeFrontmatterSchema.safeParse(validRecipe({ steps: [] })).success).toBe(false)
  })

  it('allows a draft with no steps', () => {
    expect(
      recipeFrontmatterSchema.safeParse(validRecipe({ steps: [], status: 'draft' })).success,
    ).toBe(true)
  })

  it('rejects an unknown pack size', () => {
    expect(
      recipeFrontmatterSchema.safeParse(validRecipe({ recommendedPackSize: '999g' })).success,
    ).toBe(false)
  })

  it('coerces numeric nutrition values to display strings', () => {
    const parsed = recipeFrontmatterSchema.parse(
      validRecipe({ nutrition: { per: [{ label: 'Protein', value: 3.3, unit: 'g' }] } }),
    )
    expect(parsed.nutrition?.per[0]?.value).toBe('3.3')
  })
})

describe('productFrontmatterSchema', () => {
  const base = {
    name: 'Fresh Oyster Mushrooms',
    slug: 'fresh-oyster-mushrooms-200g',
    status: 'published',
    images: [{ src: '/images/a.webp', alt: 'A pack', width: 800, height: 800 }],
  }

  it('accepts a complete product', () => {
    expect(productFrontmatterSchema.safeParse(base).success).toBe(true)
  })

  it('upper-cases the currency code', () => {
    expect(productFrontmatterSchema.parse({ ...base, currency: 'inr' }).currency).toBe('INR')
  })

  // An MRP below the selling price is always a typo, never a real discount.
  it('catches an MRP below the selling price', () => {
    const result = productFrontmatterSchema.safeParse({ ...base, price: 150, mrp: 120 })
    expect(result.success).toBe(false)
    if (!result.success) expect(result.error.issues[0]?.path).toContain('mrp')
  })

  it('accepts an MRP above the selling price', () => {
    expect(productFrontmatterSchema.safeParse({ ...base, price: 120, mrp: 150 }).success).toBe(true)
  })

  it('rejects a published product with no photograph', () => {
    expect(productFrontmatterSchema.safeParse({ ...base, images: [] }).success).toBe(false)
  })
})

describe('siteSchema', () => {
  const base = { brandName: 'NEYORA' }

  it('accepts a minimal site file', () => {
    expect(siteSchema.safeParse(base).success).toBe(true)
  })

  it('defaults the QR destination rather than leaving it empty', () => {
    expect(siteSchema.parse(base).qr.destination).toBe('/recipes')
  })

  it('accepts a WhatsApp number of bare digits', () => {
    expect(siteSchema.parse({ ...base, whatsappNumber: '919876543210' }).whatsappNumber).toBe(
      '919876543210',
    )
  })

  // wa.me rejects '+', spaces and dashes, so they must never reach the link.
  it.each(['+91 98765 43210', '91-98765-43210', '91987654abc'])(
    'rejects the WhatsApp number %j',
    (whatsappNumber) => {
      expect(siteSchema.safeParse({ ...base, whatsappNumber }).success).toBe(false)
    },
  )

  /*
   * The QR destination is printed onto physical packaging. If it could point
   * off-site it would be an open redirector nobody can recall.
   */
  it.each(['//evil.example.com', 'https://evil.example.com', 'recipes', '/\\evil.example.com'])(
    'rejects the QR destination %j',
    (destination) => {
      expect(siteSchema.safeParse({ ...base, qr: { destination } }).success).toBe(false)
    },
  )

  it('accepts a same-origin QR destination', () => {
    expect(
      siteSchema.parse({ ...base, qr: { destination: '/recipes/garlic-butter' } }).qr.destination,
    ).toBe('/recipes/garlic-butter')
  })
})
