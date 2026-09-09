import { describe, expect, it } from 'vitest'
import {
  checkbox,
  fieldErrors,
  hrefSchema,
  optionalInt,
  optionalText,
  relativePathSchema,
  slugify,
  slugSchema,
} from '@/lib/validation/common'
import {
  contactMessageSchema,
  productSchema,
  recipeSchema,
  redirectSchema,
  siteSettingsSchema,
} from '@/lib/validation/schemas'

/** A complete, valid recipe payload — the baseline each case perturbs. */
function validRecipe(overrides: Record<string, unknown> = {}) {
  return {
    title: 'Garlic Butter Oyster Mushrooms',
    slug: 'garlic-butter-oyster-mushrooms',
    body: '## Method\n\nCook them.',
    difficulty: 'easy',
    recommended_pack_size: '200g',
    status: 'published',
    scheduled_at: '',
    ingredients: [{ qty: 200, unit: 'g', item: 'oyster mushrooms', scalable: true }],
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

  it('caps length so a long title cannot overflow the column', () => {
    expect(slugify('a'.repeat(400)).length).toBeLessThanOrEqual(120)
  })
})

describe('slugSchema', () => {
  it.each(['recipes', 'garlic-butter', 'pack-200g', 'a1'])('accepts %s', (value) => {
    expect(slugSchema.safeParse(value).success).toBe(true)
  })

  it.each(['Recipes', 'has space', 'double--hyphen', '-leading', 'trailing-', 'has_underscore', ''])(
    'rejects %s',
    (value) => {
      expect(slugSchema.safeParse(value).success).toBe(false)
    },
  )
})

describe('form-field coercion', () => {
  it('turns an empty text field into null, not an empty string', () => {
    expect(optionalText().parse('')).toBeNull()
    expect(optionalText().parse('  ')).toBeNull()
    expect(optionalText().parse(' kept ')).toBe('kept')
  })

  it('turns an empty number field into null', () => {
    expect(optionalInt().parse('')).toBeNull()
    expect(optionalInt().parse('12')).toBe(12)
  })

  it('rejects a non-numeric number field', () => {
    expect(optionalInt().safeParse('abc').success).toBe(false)
  })

  it('enforces numeric bounds', () => {
    expect(optionalInt({ min: 1 }).safeParse('0').success).toBe(false)
    expect(optionalInt({ max: 5 }).safeParse('6').success).toBe(false)
  })

  it('reads an unchecked checkbox as false', () => {
    expect(checkbox.parse(undefined)).toBe(false)
    expect(checkbox.parse('on')).toBe(true)
    expect(checkbox.parse('true')).toBe(true)
  })
})

describe('hrefSchema', () => {
  it('accepts internal paths, https URLs and mailto', () => {
    expect(hrefSchema.parse('/products')).toBe('/products')
    expect(hrefSchema.parse('https://example.com')).toBe('https://example.com')
    expect(hrefSchema.parse('mailto:hi@example.com')).toBe('mailto:hi@example.com')
  })

  // The important cases: an admin-authored href is rendered straight into a
  // link, so a script or data URL here would be an injection vector.
  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'JavaScript:alert(1)', 'vbscript:x'])(
    'rejects %s',
    (value) => {
      expect(hrefSchema.safeParse(value).success).toBe(false)
    },
  )

  it('rejects plain http, so links cannot be downgraded', () => {
    expect(hrefSchema.safeParse('http://example.com').success).toBe(false)
  })
})

describe('relativePathSchema', () => {
  it('accepts a same-origin path', () => {
    expect(relativePathSchema.parse('/recipes')).toBe('/recipes')
  })

  it('accepts a nested path with a query string', () => {
    expect(relativePathSchema.parse('/recipes/category/quick?sort=new')).toBe(
      '/recipes/category/quick?sort=new',
    )
  })

  // This is what stops the packaging QR becoming an open redirector.
  it.each([
    '//evil.example.com',
    'https://evil.example.com',
    'evil.example.com',
    '',
    '/\\evil.example.com',
    '/recipes\nLocation: https://evil.example.com',
  ])('rejects %j', (value) => {
    expect(relativePathSchema.safeParse(value).success).toBe(false)
  })
})

describe('recipeSchema', () => {
  it('accepts a complete recipe', () => {
    expect(recipeSchema.safeParse(validRecipe()).success).toBe(true)
  })

  it('requires a title', () => {
    const result = recipeSchema.safeParse(validRecipe({ title: '' }))
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).title).toBeTruthy()
  })

  it('rejects "scheduled" with no date — the mistake that hides content forever', () => {
    const result = recipeSchema.safeParse(
      validRecipe({ status: 'scheduled', scheduled_at: '' }),
    )
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).scheduled_at).toBeTruthy()
  })

  it('accepts "scheduled" with a date', () => {
    const result = recipeSchema.safeParse(
      validRecipe({ status: 'scheduled', scheduled_at: '2027-01-01T09:00' }),
    )
    expect(result.success).toBe(true)
  })

  it('defaults ingredient scalability to true', () => {
    const result = recipeSchema.parse(
      validRecipe({ ingredients: [{ qty: 1, unit: 'tbsp', item: 'butter' }] }),
    )
    expect(result.ingredients[0]?.scalable).toBe(true)
  })

  it('allows an unmeasured ingredient', () => {
    const result = recipeSchema.parse(
      validRecipe({
        ingredients: [{ qty: null, unit: '', item: 'Salt', note: 'to taste', scalable: false }],
      }),
    )
    expect(result.ingredients[0]?.qty).toBeNull()
  })

  it('requires each ingredient to be named', () => {
    const result = recipeSchema.safeParse(
      validRecipe({ ingredients: [{ qty: 1, unit: 'g', item: '' }] }),
    )
    expect(result.success).toBe(false)
  })

  it('rejects an invalid pack size', () => {
    expect(recipeSchema.safeParse(validRecipe({ recommended_pack_size: '999g' })).success).toBe(
      false,
    )
  })
})

describe('productSchema', () => {
  const base = {
    name: 'Fresh Oyster Mushrooms',
    slug: 'fresh-oyster-mushrooms',
    description: 'Grown well.',
    availability: 'in_stock',
    status: 'published',
    scheduled_at: '',
    currency: 'inr',
  }

  it('upper-cases the currency code', () => {
    expect(productSchema.parse(base).currency).toBe('INR')
  })

  it('catches an MRP below the selling price — always a typo', () => {
    const result = productSchema.safeParse({ ...base, price: '150', mrp: '120' })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).mrp).toBeTruthy()
  })

  it('accepts an MRP above the selling price', () => {
    expect(productSchema.safeParse({ ...base, price: '120', mrp: '150' }).success).toBe(true)
  })

  it('accepts no price at all', () => {
    const result = productSchema.safeParse({ ...base, price: '', mrp: '' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.price).toBeNull()
  })
})

describe('redirectSchema', () => {
  const base = {
    source: 'go',
    destination: '/recipes',
    http_status: '302',
    enabled: 'on',
  }

  it('accepts the packaging QR redirect', () => {
    expect(redirectSchema.safeParse(base).success).toBe(true)
  })

  it('refuses an external destination', () => {
    expect(
      redirectSchema.safeParse({ ...base, destination: 'https://evil.example.com' }).success,
    ).toBe(false)
  })

  // A 301 is cached by browsers indefinitely, which would defeat the entire
  // point of a re-pointable QR code.
  it('refuses a 301 on the main pack QR', () => {
    const result = redirectSchema.safeParse({ ...base, http_status: '301' })
    expect(result.success).toBe(false)
    if (!result.success) expect(fieldErrors(result.error).http_status).toContain('cached')
  })

  it('allows a 301 on a non-packaging redirect', () => {
    expect(
      redirectSchema.safeParse({ ...base, source: 'legacy-page', http_status: '301' }).success,
    ).toBe(true)
  })

  it('accepts a namespaced source', () => {
    expect(redirectSchema.safeParse({ ...base, source: 'go/200g' }).success).toBe(true)
  })

  it.each(['Go', 'go space', 'go/', '/go', 'go..2'])('rejects source %s', (source) => {
    expect(redirectSchema.safeParse({ ...base, source }).success).toBe(false)
  })
})

describe('siteSettingsSchema', () => {
  const base = { brand_name: 'NEYORA', tagline: 'GROWN FOR LIFE.', announcement_enabled: '' }

  it('normalises a WhatsApp number to bare digits', () => {
    const result = siteSettingsSchema.parse({ ...base, whatsapp_number: '+91 98765 43210' })
    expect(result.whatsapp_number).toBe('919876543210')
  })

  it('rejects a WhatsApp number containing letters', () => {
    expect(
      siteSettingsSchema.safeParse({ ...base, whatsapp_number: '91987654abc' }).success,
    ).toBe(false)
  })

  it('treats an empty WhatsApp number as null rather than an empty string', () => {
    expect(siteSettingsSchema.parse({ ...base, whatsapp_number: '' }).whatsapp_number).toBeNull()
  })
})

describe('contactMessageSchema', () => {
  const base = {
    name: 'Anita',
    email: 'anita@example.com',
    message: 'I would like to order two packs this week please.',
  }

  it('accepts a genuine enquiry', () => {
    expect(contactMessageSchema.safeParse(base).success).toBe(true)
  })

  it('rejects a message that is too short to answer', () => {
    expect(contactMessageSchema.safeParse({ ...base, message: 'hi' }).success).toBe(false)
  })

  it.each(['not-an-email', 'missing@tld', '@example.com', 'a b@example.com'])(
    'rejects the address %s',
    (email) => {
      expect(contactMessageSchema.safeParse({ ...base, email }).success).toBe(false)
    },
  )

  it('exposes the honeypot field so the action can detect a bot', () => {
    const result = contactMessageSchema.parse({ ...base, website: 'http://spam.example' })
    expect(result.website).toBe('http://spam.example')
  })
})
