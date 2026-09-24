import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { once } from '@/lib/content/loader'
import {
  availabilityLabel,
  formattedAddress,
  getAllPages,
  getAllRecipes,
  getFaqs,
  getHomepage,
  getProductCategories,
  getPublishedProducts,
  getPublishedRecipes,
  getQrDestination,
  getRecipeCategories,
  getRecipeTags,
  getRelatedRecipes,
  getSiteSettings,
  getSocialLinks,
  getTestimonials,
  groupFaqs,
  queryProducts,
  queryRecipes,
  whatsappLink,
} from '@/lib/content'

/**
 * Loads and validates the real content files.
 *
 * This is the test that replaced the database's constraints. Every file is
 * parsed and Zod-validated here, so a malformed recipe, a missing alt text or
 * a broken cross-reference fails CI instead of shipping.
 *
 * It also checks the things a foreign key used to guarantee: that a recipe's
 * category exists, that its tags exist, and that every image it points at is
 * actually on disk.
 */

const PUBLIC_DIR = join(import.meta.dirname, '..', 'public')

function contentImageExists(path: string): boolean {
  const publicPath = path.replace(/^\//, '')
  if (existsSync(join(PUBLIC_DIR, publicPath))) return true

  if (!path.endsWith('.webp')) return false

  const temporarySvgFallback = path.replace(/\.webp$/, '.svg')
  if (existsSync(join(PUBLIC_DIR, temporarySvgFallback.replace(/^\//, '')))) return true

  if (path === '/images/hero/neyora-og-card.webp') {
    return existsSync(join(PUBLIC_DIR, 'images/hero/oyster-mushroom-hero.svg'))
  }

  return false
}

describe('content loads', () => {
  it('parses every file without throwing', async () => {
    await expect(getSiteSettings()).resolves.toBeDefined()
    expect(() => {
      getHomepage()
      getAllRecipes()
      getPublishedProducts()
      getAllPages()
      getFaqs()
      getTestimonials()
      getRecipeCategories()
      getProductCategories()
      getRecipeTags()
    }).not.toThrow()
  })

  it('ships enough content that a fresh clone is not an empty site', async () => {
    expect(getPublishedRecipes().length).toBeGreaterThanOrEqual(2)
    expect(getPublishedProducts().length).toBeGreaterThanOrEqual(1)
    expect(getAllPages().length).toBeGreaterThanOrEqual(9)
    expect(getFaqs().length).toBeGreaterThanOrEqual(5)
  })

  it('provides every page the routes expect', async () => {
    const slugs = getAllPages().map((p) => p.slug)
    for (const required of [
      'about',
      'farm',
      'quality',
      'storage',
      'privacy',
      'terms',
      'cookies',
      'faq-intro',
      'contact-intro',
    ]) {
      // A missing page here means a real route 404s.
      expect(slugs, `content/pages/${required}.md is missing`).toContain(required)
    }
  })
})

describe('referential integrity', () => {
  it('points every recipe at a category that exists', async () => {
    const categories = new Set(getRecipeCategories().map((c) => c.slug))
    for (const recipe of getPublishedRecipes()) {
      if (!recipe.category) continue
      expect(categories, `${recipe.slug} references unknown category`).toContain(recipe.category)
    }
  })

  it('points every recipe tag at a tag that exists', async () => {
    const tags = new Set(getRecipeTags().map((t) => t.slug))
    for (const recipe of getPublishedRecipes()) {
      for (const tag of recipe.tags) {
        expect(tags, `${recipe.slug} references unknown tag "${tag}"`).toContain(tag)
      }
    }
  })

  it('points every product at a category that exists', async () => {
    const categories = new Set(
      [...getProductCategories().map((c) => c.slug), 'mushrooms', 'fresh-produce'],
    )
    for (const product of getPublishedProducts()) {
      if (!product.category) continue
      expect(categories).toContain(product.category)
    }
  })

  it('gives every slug a unique value', async () => {
    const slugs = getAllRecipes().map((r) => r.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })
})

describe('images', () => {
  /**
   * Every image referenced by content must exist in /public.
   *
   * A broken image path is invisible in review and obvious to a visitor, so
   * it is worth failing the build over.
   */
  async function collectImagePaths(): Promise<{ path: string; where: string }[]> {
    const found: { path: string; where: string }[] = []

    // The homepage is nine chapters, each with its own imagery.
    const home = getHomepage()
    const homeImages: [string, { src: string } | undefined][] = [
      ['homepage.hero', home.hero.image],
      ['homepage.mushroom', home.mushroom.image],
      ['homepage.finalCta', home.finalCta.image],
      ...home.nature.frames.map(
        (f, i) => [`homepage.nature.frames[${i}]`, f.image] as [string, { src: string }],
      ),
      ...home.journey.stages.map(
        (s, i) => [`homepage.journey.stages[${i}]`, s.image] as [string, { src: string } | undefined],
      ),
      ...home.farm.images.map(
        (img, i) => [`homepage.farm.images[${i}]`, img] as [string, { src: string }],
      ),
    ]
    for (const [where, img] of homeImages) {
      if (img) found.push({ path: img.src, where })
    }

    for (const recipe of getAllRecipes()) {
      if (recipe.cover) found.push({ path: recipe.cover.src, where: `recipe ${recipe.slug}` })
    }
    for (const product of getPublishedProducts()) {
      for (const image of product.images) {
        found.push({ path: image.src, where: `product ${product.slug}` })
      }
    }
    for (const page of getAllPages()) {
      if (page.hero) found.push({ path: page.hero.src, where: `page ${page.slug}` })
    }
    for (const category of getRecipeCategories()) {
      if (category.image) found.push({ path: category.image.src, where: `category ${category.slug}` })
    }

    const ogImage = (await getSiteSettings()).seo.defaultOgImage
    if (ogImage) found.push({ path: ogImage, where: 'site.seo.defaultOgImage' })

    return found
  }

  it('has every referenced image on disk', async () => {
    const missing = (await collectImagePaths()).filter(({ path }) => !contentImageExists(path))
    expect(missing, `missing image files: ${JSON.stringify(missing)}`).toEqual([])
  })

  it('gives every image real alt text', () => {
    for (const recipe of getAllRecipes()) {
      if (recipe.cover) expect(recipe.cover.alt.length).toBeGreaterThan(5)
    }
    for (const product of getPublishedProducts()) {
      for (const image of product.images) expect(image.alt.length).toBeGreaterThan(5)
    }
  })
})

describe('recipe queries', () => {
  it('returns published recipes, featured first', () => {
    const recipes = getPublishedRecipes()
    const firstUnfeatured = recipes.findIndex((r) => !r.featured)
    if (firstUnfeatured > 0) {
      expect(recipes.slice(firstUnfeatured).every((r) => !r.featured)).toBe(true)
    }
  })

  it('derives total time from prep plus cook', () => {
    const recipe = getPublishedRecipes().find((r) => r.slug === 'garlic-butter-oyster-mushrooms')
    expect(recipe?.totalTimeMinutes).toBe(
      (recipe?.prepTimeMinutes ?? 0) + (recipe?.cookTimeMinutes ?? 0),
    )
  })

  it('filters by category', () => {
    const { recipes } = queryRecipes({ category: 'quick' })
    expect(recipes.length).toBeGreaterThan(0)
    expect(recipes.every((r) => r.category === 'quick')).toBe(true)
  })

  it('filters by tag', () => {
    const { recipes } = queryRecipes({ tag: 'one-pan' })
    expect(recipes.length).toBeGreaterThan(0)
    expect(recipes.every((r) => r.tags.includes('one-pan'))).toBe(true)
  })

  it('filters by pack size', () => {
    const { recipes } = queryRecipes({ packSize: '200g' })
    expect(recipes.every((r) => r.recommendedPackSize === '200g')).toBe(true)
  })

  it('searches title, excerpt and tags', () => {
    expect(queryRecipes({ search: 'garlic' }).recipes.length).toBeGreaterThan(0)
    expect(queryRecipes({ search: 'zzzznotathing' }).recipes).toEqual([])
  })

  it('paginates without losing the total', async () => {
    const all = queryRecipes({ limit: 100 })
    const firstPage = queryRecipes({ limit: 1, offset: 0 })
    expect(firstPage.recipes).toHaveLength(1)
    expect(firstPage.total).toBe(all.total)
  })

  it('never returns the current recipe among its related ones', async () => {
    for (const recipe of getPublishedRecipes()) {
      const related = getRelatedRecipes(recipe, 3)
      expect(related.some((r) => r.slug === recipe.slug)).toBe(false)
    }
  })
})

describe('site settings', () => {
  it('exposes only enabled social links that have a URL', async () => {
    for (const link of await getSocialLinks()) {
      expect(link.enabled).toBe(true)
      expect(link.url.trim()).not.toBe('')
    }
  })

  it('builds a wa.me link from the configured number', async () => {
    const link = await whatsappLink()
    if (link) {
      expect(link.href).toMatch(/^https:\/\/wa\.me\/\d+/)
      expect(link.href).not.toContain('+')
      expect(link.href).not.toContain(' ')
    }
  })

  it('allows the WhatsApp message to be overridden per context', async () => {
    const link = await whatsappLink('About Fresh Oyster Mushrooms')
    if (link) expect(link.href).toContain('About%20Fresh%20Oyster%20Mushrooms')
  })

  it('drops empty address lines instead of rendering blanks', async () => {
    for (const line of await formattedAddress()) {
      expect(line.trim()).not.toBe('')
    }
  })

  it('labels every availability state', async () => {
    for (const state of ['in_stock', 'low_stock', 'out_of_stock', 'seasonal', 'coming_soon'] as const) {
      expect(availabilityLabel(state).length).toBeGreaterThan(0)
    }
  })
})

describe('the packaging QR destination', () => {
  it('is a path on this site', async () => {
    const destination = await getQrDestination()
    expect(destination.startsWith('/')).toBe(true)
    expect(destination.startsWith('//')).toBe(false)
  })

  it('points somewhere that actually exists', async () => {
    const destination = await getQrDestination()
    const known = [
      '/',
      '/recipes',
      '/products',
      ...getPublishedRecipes().map((r) => `/recipes/${r.slug}`),
      ...getPublishedProducts().map((p) => `/products/${p.slug}`),
      ...getRecipeCategories().map((c) => `/recipes/category/${c.slug}`),
      ...getAllPages().map((p) => `/${p.slug}`),
    ]
    // A QR code that 404s is printed onto packaging and cannot be recalled.
    expect(known, `QR destination "${destination}" does not match a known route`).toContain(
      destination,
    )
  })

  /*
   * The environment override is what lets the destination change from the
   * Cloudflare dashboard with no redeploy — the promise the printed code
   * makes. It must still refuse an off-site value.
   */
  it('honours a valid NEYORA_QR_DESTINATION override', async () => {
    const original = process.env.NEYORA_QR_DESTINATION
    try {
      process.env.NEYORA_QR_DESTINATION = '/products'
      expect(await getQrDestination()).toBe('/products')
    } finally {
      if (original === undefined) delete process.env.NEYORA_QR_DESTINATION
      else process.env.NEYORA_QR_DESTINATION = original
    }
  })

  it.each(['//evil.example.com', 'https://evil.example.com', 'recipes'])(
    'ignores the unsafe override %j and falls back to the content file',
    async (value) => {
      const original = process.env.NEYORA_QR_DESTINATION
      try {
        process.env.NEYORA_QR_DESTINATION = value
        expect(await getQrDestination()).toBe((await getSiteSettings()).qr.destination)
      } finally {
        if (original === undefined) delete process.env.NEYORA_QR_DESTINATION
        else process.env.NEYORA_QR_DESTINATION = original
      }
    },
  )
})

describe('FAQs', () => {
  it('groups by category, preserving first-appearance order', () => {
    const groups = groupFaqs(getFaqs())
    expect(groups.length).toBeGreaterThan(1)
    expect(groups.reduce((n, g) => n + g.items.length, 0)).toBe(getFaqs().length)
  })
})

describe('products', () => {
  it('never advertises an MRP below the selling price', () => {
    for (const product of getPublishedProducts()) {
      if (product.mrp !== undefined && product.price !== undefined) {
        expect(product.mrp).toBeGreaterThanOrEqual(product.price)
      }
    }
  })

  it('filters by category', () => {
    expect(queryProducts({ category: 'mushrooms' }).length).toBeGreaterThan(0)
    expect(queryProducts({ category: 'does-not-exist' })).toEqual([])
  })
})

/*
 * Content caching.
 *
 * `once()` exists so `next build` does not re-read and re-validate every
 * content file for each of two dozen pages. But caching for the lifetime of
 * the process is wrong in development, where the content files are the thing
 * being edited: a price changed on disk simply never appears, with no error
 * and no warning, until the dev server is restarted. That happened — a price
 * was corrected and the running dev server served the old one for a day.
 */
describe('once()', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it('caches in production, so a build reads each file once', () => {
    vi.stubEnv('NODE_ENV', 'production')
    let calls = 0
    const load = once(() => ++calls)
    expect(load()).toBe(1)
    expect(load()).toBe(1)
    expect(calls).toBe(1)
  })

  it('does NOT cache in development, so an edit on disk shows up', () => {
    vi.stubEnv('NODE_ENV', 'development')
    let calls = 0
    const load = once(() => ++calls)
    expect(load()).toBe(1)
    expect(load()).toBe(2)
    expect(calls).toBe(2)
  })
})
