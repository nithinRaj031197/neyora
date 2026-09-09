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
import { getPublishedRecipes, getRecipeCategories, getSiteSettings } from '@/lib/content'
import type { Category, Faq, Image, Page, Product, Recipe, SocialLink } from '@/types/content'

/**
 * Structured data is what makes a recipe eligible for Google's rich results.
 * These tests assert against the *real* content files, so a change to a recipe
 * that would break its markup is caught here.
 */
const SETTINGS = getSiteSettings()

const COVER: Image = {
  src: '/images/recipes/garlic-butter-oyster-mushrooms.svg',
  alt: 'Garlic butter oyster mushrooms in a pan',
  width: 1600,
  height: 1200,
}

function recipe(): Recipe {
  const found = getPublishedRecipes().find((r) => r.slug === 'garlic-butter-oyster-mushrooms')
  if (!found) throw new Error('The seeded garlic butter recipe is missing')
  return found
}

function category(): Category | null {
  return getRecipeCategories().find((c) => c.slug === recipe().category) ?? null
}

describe('recipeJsonLd', () => {
  const json = recipeJsonLd({ recipe: recipe(), category: category(), settings: SETTINGS })

  it('declares itself a Recipe', () => {
    expect(json['@type']).toBe('Recipe')
    expect(json['@context']).toBe('https://schema.org')
  })

  it('uses ISO 8601 durations, as schema.org requires', () => {
    expect(json.prepTime).toBe('PT5M')
    expect(json.cookTime).toBe('PT10M')
    expect(json.totalTime).toBe('PT15M')
  })

  /*
   * Google needs flat ingredient strings. That is only possible because the
   * ingredients are stored structured rather than written into prose.
   */
  it('flattens ingredients into readable strings', () => {
    const ingredients = json.recipeIngredient as string[]
    expect(ingredients[0]).toBe('200 g oyster mushrooms (torn into finger-width strips)')
    expect(ingredients).toContain('Salt (added at the end only)')
  })

  it('renders fractional quantities as fractions, not decimals', () => {
    const pepper = recipeJsonLd({
      recipe: getPublishedRecipes().find((r) => r.slug === 'pepper-oyster-mushroom-fry')!,
      category: null,
      settings: SETTINGS,
    })
    expect(pepper.recipeIngredient as string[]).toContain(
      '1½ tsp black peppercorns (coarsely crushed, freshly)',
    )
  })

  it('emits HowToStep objects with resolvable anchors', () => {
    const steps = json.recipeInstructions as { '@type': string; url: string; name: string }[]
    expect(steps.length).toBeGreaterThan(1)
    expect(steps[0]?.['@type']).toBe('HowToStep')
    expect(steps[0]?.url).toContain('#step-1')
    expect(steps[0]?.name).toBe('Clean gently')
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
    expect(json.keywords).toContain('vegetarian')
  })

  it('uses an absolute image URL', () => {
    expect((json.image as string[])[0]).toMatch(/^https?:\/\//)
  })

  // Fabricating a rating to win stars in search results is both a policy
  // violation and a lie about customers we do not have.
  it('never invents an aggregate rating', () => {
    expect(json.aggregateRating).toBeUndefined()
  })
})

describe('productJsonLd', () => {
  const product: Product = {
    slug: 'fresh-oyster-mushrooms-200g',
    name: 'Fresh Oyster Mushrooms',
    shortDescription: 'Hand-picked the morning they ship.',
    body: 'Long copy.',
    variety: 'Pleurotus ostreatus',
    weightGrams: 200,
    weightLabel: '200 g',
    price: 120,
    mrp: 150,
    currency: 'INR',
    images: [COVER],
    highlights: [],
    availability: 'in_stock',
    featured: true,
    sortOrder: 1,
    status: 'published',
    isDemo: true,
  }

  const json = productJsonLd({ product, settings: SETTINGS })

  it('declares an Offer with price, currency and availability', () => {
    const offer = json.offers as Record<string, unknown>
    expect(offer.price).toBe(120)
    expect(offer.priceCurrency).toBe('INR')
    expect(offer.availability).toBe('https://schema.org/InStock')
  })

  it('maps each availability state to the right schema.org URL', () => {
    const cases: [Product['availability'], string][] = [
      ['low_stock', 'https://schema.org/LimitedAvailability'],
      ['out_of_stock', 'https://schema.org/OutOfStock'],
      ['coming_soon', 'https://schema.org/PreOrder'],
    ]
    for (const [availability, expected] of cases) {
      const result = productJsonLd({ product: { ...product, availability }, settings: SETTINGS })
      expect((result.offers as Record<string, unknown>).availability).toBe(expected)
    }
  })

  it('omits the Offer entirely when no price is published', () => {
    const result = productJsonLd({
      product: { ...product, price: undefined },
      settings: SETTINGS,
    })
    expect(result.offers).toBeUndefined()
  })

  it('publishes the pack weight as a quantitative value', () => {
    expect(json.weight).toEqual({ '@type': 'QuantitativeValue', value: 200, unitCode: 'GRM' })
  })
})

describe('organizationJsonLd', () => {
  const socials: SocialLink[] = [
    { platform: 'instagram', label: 'Instagram', url: 'https://instagram.com/neyora', enabled: true },
    { platform: 'facebook', label: 'Facebook', url: '', enabled: false },
  ]

  const json = organizationJsonLd(SETTINGS, socials)

  it('carries a stable @id other schemas can reference', () => {
    expect(json['@id']).toContain('#organization')
  })

  it('lists only enabled social profiles in sameAs', () => {
    expect(json.sameAs).toEqual(['https://instagram.com/neyora'])
  })

  it('includes a postal address when one is configured', () => {
    expect((json.address as Record<string, unknown>).addressLocality).toBe('Bengaluru')
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
    const faqs: Faq[] = [
      {
        question: 'How should I store them?',
        answer: 'Refrigerate at **2–4 °C**, see [storage](/storage).',
        category: 'Storage',
        sortOrder: 1,
        status: 'published',
      },
    ]
    const entity = faqJsonLd(faqs).mainEntity as { acceptedAnswer: { text: string } }[]
    expect(entity[0]?.acceptedAnswer.text).toBe('Refrigerate at 2–4 °C, see storage.')
  })
})

describe('articleJsonLd', () => {
  it('sets both published and modified dates', () => {
    const page: Page = {
      slug: 'farm',
      title: 'Our Farm',
      body: 'How we grow.',
      hero: COVER,
      sortOrder: 1,
      status: 'published',
      publishedAt: '2026-01-01',
      updatedAt: '2026-02-01',
      isDemo: true,
    }
    const json = articleJsonLd({ page, settings: SETTINGS, path: '/farm' })
    expect(json.datePublished).toBe('2026-01-01')
    expect(json.dateModified).toBe('2026-02-01')
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
    expect(meta.description).toBe(SETTINGS.seo.defaultDescription)
  })

  it('lets a page override the title, description and canonical', () => {
    const meta = buildMetadata({
      title: 'Ignored',
      path: '/recipes/a',
      seo: {
        title: 'Chosen title',
        description: 'Chosen description',
        canonicalUrl: 'https://elsewhere.example/a',
      },
      settings: SETTINGS,
    })
    expect(meta.title).toBe('Chosen title')
    expect(meta.description).toBe('Chosen description')
    expect(meta.alternates?.canonical).toBe('https://elsewhere.example/a')
  })

  it('emits noindex for a hidden page', () => {
    const meta = buildMetadata({
      title: 'Hidden',
      path: '/x',
      settings: SETTINGS,
      seo: { noindex: true },
    })
    expect(meta.robots).toMatchObject({ index: false, follow: false })
  })

  it('makes a site-relative image URL absolute for Open Graph', () => {
    const meta = buildMetadata({ title: 'Recipe', path: '/r', image: COVER, settings: SETTINGS })
    const images = meta.openGraph?.images as { url: string }[]
    expect(images[0]?.url).toBe(`https://neyora.test${COVER.src}`)
  })

  it('caps the description so Google does not truncate it mid-word', () => {
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
      publishedTime: '2026-01-01',
      modifiedTime: '2026-02-01',
      settings: SETTINGS,
    })
    expect(meta.openGraph).toMatchObject({
      type: 'article',
      publishedTime: '2026-01-01',
      modifiedTime: '2026-02-01',
    })
  })
})
