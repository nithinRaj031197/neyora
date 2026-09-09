import { describe, expect, it } from 'vitest'
import {
  articleJsonLd,
  breadcrumbJsonLd,
  faqJsonLd,
  organizationJsonLd,
  productJsonLd,
  recipeJsonLd,
  websiteJsonLd,
} from '@/lib/seo/jsonld'
import { buildMetadata } from '@/lib/seo/metadata'
import { FALLBACK_SETTINGS } from '@/lib/content/site'
import type {
  FaqRow,
  MediaRow,
  ProductRow,
  RecipeCategoryRow,
  RecipeRow,
  SiteSettingsRow,
  SocialLinkRow,
} from '@/types/database'

const SETTINGS: SiteSettingsRow = {
  ...FALLBACK_SETTINGS,
  brand_name: 'NEYORA',
  tagline: 'GROWN FOR LIFE.',
  organization_legal_name: 'NEYORA Naturals',
  contact_email: 'hello@neyora.com',
  contact_phone: '+91 00000 00000',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  default_seo_description: 'NEYORA grows fresh, natural food with care.',
}

const COVER: MediaRow = {
  id: 'm1',
  bucket: 'media',
  path: 'recipes/a-1600.webp',
  public_url: 'https://cdn.example/recipes/a-1600.webp',
  mime_type: 'image/webp',
  width: 1600,
  height: 1200,
  size_bytes: 120_000,
  alt: 'Garlic butter oyster mushrooms in a pan',
  title: 'Garlic butter',
  description: null,
  variants: [],
  folder: 'recipes',
  uploaded_by: null,
  is_demo: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
}

const RECIPE: RecipeRow = {
  id: 'r1',
  slug: 'garlic-butter-oyster-mushrooms',
  title: 'Garlic Butter Oyster Mushrooms',
  excerpt: 'The one to cook first.',
  body: '## Why this works\n\nA hot pan.',
  category_id: 'c1',
  cover_image_id: 'm1',
  og_image_id: null,
  prep_time_minutes: 5,
  cook_time_minutes: 10,
  total_time_minutes: 15,
  servings: 2,
  servings_label: 'as a side for 2',
  difficulty: 'easy',
  cuisine: 'Continental',
  course: 'Side',
  recommended_pack_size: '200g',
  base_pack_grams: 200,
  is_scalable: true,
  primary_product_id: null,
  ingredients: [
    { qty: 200, unit: 'g', item: 'oyster mushrooms', note: 'torn', scalable: true },
    { qty: 1.5, unit: 'tbsp', item: 'butter', scalable: true },
    { qty: null, unit: '', item: 'Salt', note: 'to taste', scalable: false },
  ],
  steps: [
    { title: 'Heat the pan', body: 'Until a drop of water skitters.', duration_minutes: 2 },
    { body: 'Sear in a single layer.' },
  ],
  nutrition: {
    basis: 'Per serving',
    per: [
      { label: 'Energy', value: '118', unit: 'kcal' },
      { label: 'Protein', value: '3.6', unit: 'g' },
    ],
  },
  equipment: ['Cast-iron pan'],
  tips: null,
  featured: true,
  sort_order: 1,
  seo_title: null,
  seo_description: null,
  canonical_url: null,
  noindex: false,
  status: 'published',
  published_at: '2026-05-01T00:00:00Z',
  scheduled_at: null,
  view_count: 12,
  created_by: null,
  updated_by: null,
  is_demo: false,
  created_at: '2026-05-01T00:00:00Z',
  updated_at: '2026-05-02T00:00:00Z',
  deleted_at: null,
}

const CATEGORY: RecipeCategoryRow = {
  id: 'c1',
  slug: 'quick',
  name: 'Under 15 Minutes',
  description: null,
  image_id: null,
  sort_order: 1,
  status: 'published',
  published_at: '2026-01-01T00:00:00Z',
  scheduled_at: null,
  is_demo: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
  seo_title: null,
  seo_description: null,
}

const PRODUCT: ProductRow = {
  id: 'p1',
  slug: 'fresh-oyster-mushrooms-200g',
  name: 'Fresh Oyster Mushrooms',
  short_description: 'Hand-picked the morning they ship.',
  description: 'Long copy.',
  category_id: null,
  variety: 'Pleurotus ostreatus',
  origin: 'Karnataka',
  weight_grams: 200,
  weight_label: '200 g',
  price: 120,
  mrp: 150,
  currency: 'INR',
  unit_label: 'pack',
  nutrition: {},
  highlights: [],
  storage_notes: null,
  shelf_life: '3–5 days',
  availability: 'in_stock',
  featured: true,
  sort_order: 1,
  seo_title: null,
  seo_description: null,
  canonical_url: null,
  og_image_id: null,
  status: 'published',
  published_at: '2026-01-01T00:00:00Z',
  scheduled_at: null,
  is_demo: false,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  deleted_at: null,
}

describe('recipeJsonLd', () => {
  const json = recipeJsonLd({
    recipe: RECIPE,
    cover: COVER,
    category: CATEGORY,
    tags: [
      { id: 't1', slug: 'vegetarian', name: 'Vegetarian', created_at: '', updated_at: '' },
      { id: 't2', slug: 'one-pan', name: 'One Pan', created_at: '', updated_at: '' },
    ],
    settings: SETTINGS,
  })

  it('declares itself a Recipe', () => {
    expect(json['@type']).toBe('Recipe')
    expect(json['@context']).toBe('https://schema.org')
  })

  it('uses ISO 8601 durations, as schema.org requires', () => {
    expect(json.prepTime).toBe('PT5M')
    expect(json.cookTime).toBe('PT10M')
    expect(json.totalTime).toBe('PT15M')
  })

  // Google needs flat ingredient strings, which is only possible because the
  // ingredients are stored structured rather than as prose.
  it('flattens ingredients into readable strings', () => {
    const ingredients = json.recipeIngredient as string[]
    expect(ingredients[0]).toBe('200 g oyster mushrooms (torn)')
    expect(ingredients[1]).toBe('1½ tbsp butter')
    expect(ingredients[2]).toBe('Salt (to taste)')
  })

  it('emits HowToStep objects with resolvable anchors', () => {
    const steps = json.recipeInstructions as { '@type': string; url: string; name: string }[]
    expect(steps).toHaveLength(2)
    expect(steps[0]?.['@type']).toBe('HowToStep')
    expect(steps[0]?.url).toContain('#step-1')
    expect(steps[0]?.name).toBe('Heat the pan')
    // A step with no title still needs a name.
    expect(steps[1]?.name).toBe('Step 2')
  })

  it('maps nutrition onto schema.org property names', () => {
    const nutrition = json.nutrition as Record<string, string>
    expect(nutrition.calories).toBe('118 kcal')
    expect(nutrition.proteinContent).toBe('3.6 g')
  })

  it('marks a vegetarian recipe with the matching diet', () => {
    expect(json.suitableForDiet).toBe('https://schema.org/VegetarianDiet')
  })

  it('lists tags as keywords', () => {
    expect(json.keywords).toBe('Vegetarian, One Pan')
  })

  it('uses an absolute image URL', () => {
    expect((json.image as string[])[0]).toMatch(/^https:\/\//)
  })

  // Fabricating a rating to win stars in search results is both a policy
  // violation and a lie about customers we do not have.
  it('never invents an aggregate rating', () => {
    expect(json.aggregateRating).toBeUndefined()
  })

  it('falls back to the body for a description when no excerpt exists', () => {
    const json2 = recipeJsonLd({
      recipe: { ...RECIPE, excerpt: null },
      cover: null,
      category: null,
      tags: [],
      settings: SETTINGS,
    })
    expect(json2.description).toContain('Why this works')
  })
})

describe('productJsonLd', () => {
  const json = productJsonLd({ product: PRODUCT, images: [COVER], settings: SETTINGS })

  it('declares an Offer with price, currency and availability', () => {
    const offer = json.offers as Record<string, unknown>
    expect(offer.price).toBe(120)
    expect(offer.priceCurrency).toBe('INR')
    expect(offer.availability).toBe('https://schema.org/InStock')
  })

  it('maps each availability state to the right schema.org URL', () => {
    const cases: [ProductRow['availability'], string][] = [
      ['low_stock', 'https://schema.org/LimitedAvailability'],
      ['out_of_stock', 'https://schema.org/OutOfStock'],
      ['coming_soon', 'https://schema.org/PreOrder'],
    ]
    for (const [availability, expected] of cases) {
      const result = productJsonLd({
        product: { ...PRODUCT, availability },
        images: [],
        settings: SETTINGS,
      })
      expect((result.offers as Record<string, unknown>).availability).toBe(expected)
    }
  })

  it('omits the Offer entirely when no price is published', () => {
    const result = productJsonLd({
      product: { ...PRODUCT, price: null },
      images: [],
      settings: SETTINGS,
    })
    expect(result.offers).toBeUndefined()
  })

  it('publishes the pack weight as a quantitative value', () => {
    expect(json.weight).toEqual({ '@type': 'QuantitativeValue', value: 200, unitCode: 'GRM' })
  })
})

describe('organizationJsonLd', () => {
  const socials: SocialLinkRow[] = [
    {
      id: 's1',
      platform: 'instagram',
      label: 'Instagram',
      url: 'https://instagram.com/neyora',
      handle: '@neyora',
      sort_order: 1,
      enabled: true,
      created_at: '',
      updated_at: '',
    },
    {
      id: 's2',
      platform: 'facebook',
      label: 'Facebook',
      url: '',
      handle: null,
      sort_order: 2,
      enabled: false,
      created_at: '',
      updated_at: '',
    },
  ]

  const json = organizationJsonLd(SETTINGS, socials, null)

  it('carries a stable @id other schemas can reference', () => {
    expect(json['@id']).toContain('#organization')
  })

  it('lists only enabled social profiles in sameAs', () => {
    expect(json.sameAs).toEqual(['https://instagram.com/neyora'])
  })

  it('includes a postal address when one is configured', () => {
    expect((json.address as Record<string, unknown>).addressLocality).toBe('Bengaluru')
  })

  it('omits the address entirely when nothing is configured', () => {
    const bare = organizationJsonLd(FALLBACK_SETTINGS, [], null)
    expect(bare.address).toBeUndefined()
  })
})

describe('websiteJsonLd', () => {
  it('references the organisation rather than repeating it', () => {
    const json = websiteJsonLd(SETTINGS)
    expect((json.publisher as Record<string, string>)['@id']).toContain('#organization')
  })
})

describe('breadcrumbJsonLd', () => {
  it('numbers positions from one and uses absolute URLs', () => {
    const json = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'Recipes', path: '/recipes' },
    ])
    const items = json.itemListElement as { position: number; item: string }[]
    expect(items[0]?.position).toBe(1)
    expect(items[1]?.position).toBe(2)
    expect(items[1]?.item).toBe('https://neyora.test/recipes')
  })
})

describe('faqJsonLd', () => {
  it('converts Markdown answers to plain text', () => {
    const faqs: FaqRow[] = [
      {
        id: 'f1',
        question: 'How should I store them?',
        answer: 'Refrigerate at **2–4 °C**, see [storage](/storage).',
        category: 'Storage',
        sort_order: 1,
        status: 'published',
        published_at: null,
        scheduled_at: null,
        is_demo: false,
        created_at: '',
        updated_at: '',
        deleted_at: null,
      },
    ]
    const json = faqJsonLd(faqs)
    const entity = json.mainEntity as { acceptedAnswer: { text: string } }[]
    expect(entity[0]?.acceptedAnswer.text).toBe('Refrigerate at 2–4 °C, see storage.')
  })
})

describe('articleJsonLd', () => {
  it('sets both published and modified dates', () => {
    const json = articleJsonLd({
      title: 'Our Farm',
      description: 'How we grow.',
      path: '/farm',
      image: COVER,
      publishedAt: '2026-01-01T00:00:00Z',
      modifiedAt: '2026-02-01T00:00:00Z',
      settings: SETTINGS,
    })
    expect(json.datePublished).toBe('2026-01-01T00:00:00Z')
    expect(json.dateModified).toBe('2026-02-01T00:00:00Z')
    expect(json.url).toBe('https://neyora.test/farm')
  })
})

describe('buildMetadata', () => {
  it('appends the brand name and sets a canonical URL', () => {
    const meta = buildMetadata({
      title: 'Recipes',
      description: 'Simple ways to cook.',
      path: '/recipes',
      settings: SETTINGS,
    })
    expect(meta.title).toBe('Recipes — NEYORA')
    expect(meta.alternates?.canonical).toBe('https://neyora.test/recipes')
  })

  it('does not append the brand when the title already contains it', () => {
    const meta = buildMetadata({ title: 'NEYORA — Fresh Food', path: '/', settings: SETTINGS })
    expect(meta.title).toBe('NEYORA — Fresh Food')
  })

  it('derives a description from Markdown when none is given', () => {
    const meta = buildMetadata({
      title: 'Farm',
      descriptionSource: '## Substrate\n\nWe grow on **pasteurised** paddy straw.',
      path: '/farm',
      settings: SETTINGS,
    })
    expect(meta.description).toBe('Substrate We grow on pasteurised paddy straw.')
  })

  it('falls back to the site default description', () => {
    const meta = buildMetadata({ title: 'Something', path: '/x', settings: SETTINGS })
    expect(meta.description).toBe('NEYORA grows fresh, natural food with care.')
  })

  it('honours a canonical override', () => {
    const meta = buildMetadata({
      title: 'Recipe',
      path: '/recipes/a',
      canonicalOverride: 'https://elsewhere.example/a',
      settings: SETTINGS,
    })
    expect(meta.alternates?.canonical).toBe('https://elsewhere.example/a')
  })

  it('emits noindex for a hidden page', () => {
    const meta = buildMetadata({ title: 'Hidden', path: '/x', settings: SETTINGS, noindex: true })
    expect(meta.robots).toMatchObject({ index: false, follow: false })
  })

  it('uses a large image card only when there is an image', () => {
    // Next's Twitter metadata type is a union; `card` is only present on some
    // members, so read it through a narrow view of the object.
    const card = (meta: { twitter?: unknown }) =>
      (meta.twitter as { card?: string } | undefined)?.card

    expect(
      card(buildMetadata({ title: 'Recipe', path: '/r', image: COVER, settings: SETTINGS })),
    ).toBe('summary_large_image')

    expect(card(buildMetadata({ title: 'Recipe', path: '/r', settings: SETTINGS }))).toBe('summary')
  })

  it('makes a site-relative image URL absolute for Open Graph', () => {
    const meta = buildMetadata({
      title: 'Recipe',
      path: '/r',
      image: { ...COVER, public_url: '/images/hero.svg', variants: [] },
      settings: SETTINGS,
    })
    const images = meta.openGraph?.images as { url: string }[]
    expect(images[0]?.url).toBe('https://neyora.test/images/hero.svg')
  })

  it('caps the description length so it is not truncated mid-word by Google', () => {
    const meta = buildMetadata({
      title: 'X',
      description: 'word '.repeat(200),
      path: '/x',
      settings: SETTINGS,
    })
    expect((meta.description ?? '').length).toBeLessThanOrEqual(300)
  })

  it('sets article timestamps when the type is article', () => {
    const meta = buildMetadata({
      title: 'Farm',
      path: '/farm',
      type: 'article',
      publishedTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-02-01T00:00:00Z',
      settings: SETTINGS,
    })
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-01-01T00:00:00Z',
      modifiedTime: '2026-02-01T00:00:00Z',
    })
  })
})
