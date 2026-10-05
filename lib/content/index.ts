import 'server-only'

/**
 * The content API.
 *
 * Every page reads through these functions and none of them knows where the
 * content lives. That is the seam: swapping Markdown files for a database
 * later means rewriting this file, not the site.
 *
 * "Published" is decided here, in one place, exactly as a database view would:
 * `status: published` and, if a publish date is set, that date having passed.
 */
import { cache } from 'react'
import { loadMarkdownDir, loadYaml, once } from './loader'
import { readSettingsOverride } from '@/lib/settings/repository'
import { readHomepageOverride } from '@/lib/homepage/repository'
import {
  HOMEPAGE_SECTION_KEYS,
  type HomepageSectionKey,
} from '@/lib/homepage/schema'
import { readProductOverrides } from '@/lib/products/repository'
import {
  categoriesFileSchema,
  faqsFileSchema,
  homepageSchema,
  pageFrontmatterSchema,
  productFrontmatterSchema,
  recipeFrontmatterSchema,
  siteSchema,
  testimonialsFileSchema,
} from '@/lib/validation/content'
import type {
  Category,
  Faq,
  Homepage,
  Page,
  Product,
  Recipe,
  SiteSettings,
  SocialLink,
  Tag,
  Testimonial,
} from '@/types/content'

/**
 * Is this item visible to the public right now?
 *
 * One rule, applied to everything — the equivalent of the single
 * `is_publicly_visible()` function the database version used, so the
 * definition cannot drift between content types.
 */
function isPublished(item: { status: string; publishedAt?: string }): boolean {
  if (item.status !== 'published') return false
  if (!item.publishedAt) return true
  const when = new Date(item.publishedAt).getTime()
  return Number.isNaN(when) || when <= Date.now()
}

// ---------------------------------------------------------------------------
// Site settings and homepage
// ---------------------------------------------------------------------------

const loadSite = once((): SiteSettings => loadYaml('site.yml', siteSchema) as SiteSettings)

/** The file only — the defaults, before any admin override. */
export const getSiteSettingsFromFile = (): SiteSettings => loadSite()

/**
 * Site settings: the file, with any admin overrides laid on top.
 *
 * Async because the override lives in MongoDB. Every caller is a server
 * component or a server function, so this costs an `await` and nothing else —
 * and `cache()` collapses the dozen calls a single page makes into one read.
 *
 * `readSettingsOverride` never throws: if the database is down or was never
 * configured, this returns the file unchanged and the site carries on. The
 * whole point of keeping site.yml as the default is that ordering, contact
 * details and the footer survive a database outage.
 */
export const getSiteSettings = cache(async (): Promise<SiteSettings> => {
  const file = loadSite()
  const override = await readSettingsOverride()

  // Only defined keys override; an empty field in the admin form clears the
  // override and falls back to the file rather than blanking the site.
  const pick = <K extends keyof SiteSettings>(key: K, value: string | undefined) =>
    value === undefined ? file[key] : (value as SiteSettings[K])

  return {
    ...file,
    contactEmail: pick('contactEmail', override.contactEmail),
    contactPhone: pick('contactPhone', override.contactPhone),
    whatsappNumber: pick('whatsappNumber', override.whatsappNumber),
    whatsappMessage: pick('whatsappMessage', override.whatsappMessage),
    businessHours: pick('businessHours', override.businessHours),
    address: {
      ...file.address,
      line1: override.addressLine1 ?? file.address.line1,
      line2: override.addressLine2 ?? file.address.line2,
      city: override.addressCity ?? file.address.city,
      state: override.addressState ?? file.address.state,
      postalCode: override.addressPostalCode ?? file.address.postalCode,
      country: override.addressCountry ?? file.address.country,
    },
  }
})

export const getSocialLinks = cache(async (): Promise<SocialLink[]> => {
  const settings = await getSiteSettings()
  // A link with no URL would render as a dead link, so it is filtered here
  // rather than left for each component to remember.
  return settings.social.filter((link) => link.enabled && link.url.trim() !== '')
})

const loadHomepage = once((): Homepage => loadYaml('homepage.yml', homepageSchema) as Homepage)

export const getHomepage = cache((): Homepage => loadHomepage())

/**
 * Which homepage chapters are shown: the file, with any admin toggle on top.
 *
 * Separate from `getHomepage()` so that reading the content stays synchronous.
 * Only one caller — the homepage itself — needs the database, and making every
 * reader of the homepage content await a Mongo round trip to learn the brand
 * eyebrow would be the wrong trade.
 *
 * `readHomepageOverride` never throws: with no database, or before anyone has
 * saved, this is exactly what homepage.yml says.
 */
export const getHomepageVisibility = cache(
  async (): Promise<Record<HomepageSectionKey, boolean>> => {
    const home = loadHomepage()
    const override = await readHomepageOverride()

    return Object.fromEntries(
      HOMEPAGE_SECTION_KEYS.map((key) => [key, override[key] ?? home[key].enabled]),
    ) as Record<HomepageSectionKey, boolean>
  },
)

/**
 * Where the packaging QR code leads.
 *
 * `NEYORA_QR_DESTINATION` wins when set, which is what preserves the promise
 * the printed code makes: on Cloudflare it is a Worker variable, so the
 * destination can be changed from the dashboard in seconds — no redeploy, no
 * database, and no reprinting a single label.
 */
export async function getQrDestination(): Promise<string> {
  const override = process.env.NEYORA_QR_DESTINATION?.trim()
  if (override && override.startsWith('/') && !override.startsWith('//')) {
    return override
  }
  return (await getSiteSettings()).qr.destination
}

// ---------------------------------------------------------------------------
// Categories and tags
// ---------------------------------------------------------------------------

const loadCategories = once(() => loadYaml('categories.yml', categoriesFileSchema))

export const getRecipeCategories = cache((): Category[] =>
  (loadCategories().recipeCategories as Category[])
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder),
)

export const getProductCategories = cache((): Category[] =>
  (loadCategories().productCategories as Category[])
    .filter((c) => c.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder),
)

export const getRecipeTags = cache((): Tag[] => loadCategories().recipeTags as Tag[])

export const getRecipeCategoryBySlug = cache(
  (slug: string): Category | null => getRecipeCategories().find((c) => c.slug === slug) ?? null,
)

// ---------------------------------------------------------------------------
// Recipes
// ---------------------------------------------------------------------------

const loadRecipes = once((): Recipe[] =>
  loadMarkdownDir('recipes', recipeFrontmatterSchema).map((file) => ({
    ...file,
    // Derived, never authored, so the page and its structured data can never
    // disagree with the parts they are built from.
    totalTimeMinutes: (file.prepTimeMinutes ?? 0) + (file.cookTimeMinutes ?? 0),
  })) as Recipe[],
)

export const getAllRecipes = cache((): Recipe[] => loadRecipes())

export const getPublishedRecipes = cache((): Recipe[] =>
  loadRecipes()
    .filter(isPublished)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return (b.publishedAt ?? '').localeCompare(a.publishedAt ?? '')
    }),
)

export const getRecipeBySlug = cache(
  (slug: string): Recipe | null => getPublishedRecipes().find((r) => r.slug === slug) ?? null,
)

export interface RecipeQuery {
  category?: string
  tag?: string
  packSize?: string
  featuredOnly?: boolean
  search?: string
  excludeSlug?: string
  limit?: number
  offset?: number
}

export function queryRecipes(query: RecipeQuery = {}): { recipes: Recipe[]; total: number } {
  const { limit = 24, offset = 0 } = query

  let results = getPublishedRecipes()

  if (query.category) results = results.filter((r) => r.category === query.category)
  if (query.tag) results = results.filter((r) => r.tags.includes(query.tag!))
  if (query.packSize) results = results.filter((r) => r.recommendedPackSize === query.packSize)
  if (query.featuredOnly) results = results.filter((r) => r.featured)
  if (query.excludeSlug) results = results.filter((r) => r.slug !== query.excludeSlug)

  if (query.search?.trim()) {
    const term = query.search.trim().toLowerCase()
    results = results.filter(
      (r) =>
        r.title.toLowerCase().includes(term) ||
        (r.excerpt ?? '').toLowerCase().includes(term) ||
        r.tags.some((t) => t.includes(term)),
    )
  }

  return { recipes: results.slice(offset, offset + limit), total: results.length }
}

/** Same category first, then anything else recent. Never the current recipe. */
export function getRelatedRecipes(recipe: Recipe, limit = 3): Recipe[] {
  const sameCategory = getPublishedRecipes().filter(
    (r) => r.slug !== recipe.slug && r.category && r.category === recipe.category,
  )
  if (sameCategory.length >= limit) return sameCategory.slice(0, limit)

  const chosen = new Set(sameCategory.map((r) => r.slug))
  const fill = getPublishedRecipes().filter((r) => r.slug !== recipe.slug && !chosen.has(r.slug))

  return [...sameCategory, ...fill].slice(0, limit)
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const loadProducts = once(
  (): Product[] => loadMarkdownDir('products', productFrontmatterSchema) as Product[],
)

/** The files only — the defaults, before any admin override. */
export const getPublishedProductsFromFiles = (): Product[] =>
  loadProducts()
    .filter(isPublished)
    .sort((a, b) => {
      if (a.featured !== b.featured) return a.featured ? -1 : 1
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
      return a.name.localeCompare(b.name)
    })

/**
 * Published products, with any admin overrides laid on top.
 *
 * Async because the overrides live in MongoDB. `readProductOverrides` never
 * throws, so a database outage serves the Markdown files unchanged — the shop
 * keeps working, it just stops reflecting the last edit. `cache()` collapses
 * the several calls a page makes into one read.
 *
 * Images are not overridable (see lib/products/schema.ts), so dimensions —
 * and therefore layout stability — always come from the file.
 */
export const getPublishedProducts = cache(async (): Promise<Product[]> => {
  const files = getPublishedProductsFromFiles()
  const overrides = await readProductOverrides()

  return files.map((product) => {
    const o = overrides[product.slug]
    if (!o) return product
    return {
      ...product,
      name: o.name ?? product.name,
      shortDescription: o.shortDescription ?? product.shortDescription,
      price: o.price ?? product.price,
      mrp: o.mrp ?? product.mrp,
      availability: o.availability ?? product.availability,
    }
  })
})

export const getProductBySlug = cache(
  async (slug: string): Promise<Product | null> =>
    (await getPublishedProducts()).find((p) => p.slug === slug) ?? null,
)

export async function queryProducts(
  options: { category?: string; limit?: number } = {},
): Promise<Product[]> {
  let results = await getPublishedProducts()
  if (options.category) results = results.filter((p) => p.category === options.category)
  return options.limit ? results.slice(0, options.limit) : results
}

// ---------------------------------------------------------------------------
// Pages, FAQs, testimonials
// ---------------------------------------------------------------------------

const loadPages = once((): Page[] => loadMarkdownDir('pages', pageFrontmatterSchema) as Page[])

export const getPageBySlug = cache((slug: string): Page | null => {
  const page = loadPages().find((p) => p.slug === slug)
  return page && isPublished(page) ? page : null
})

export const getAllPages = cache((): Page[] => loadPages().filter(isPublished))

export const getFaqs = cache((): Faq[] =>
  (loadYaml('faqs.yml', faqsFileSchema).faqs as Faq[])
    .filter((f) => f.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder),
)

/** Groups FAQs by category, preserving first-appearance order. */
export function groupFaqs(faqs: Faq[]): { category: string; items: Faq[] }[] {
  const groups: { category: string; items: Faq[] }[] = []
  for (const faq of faqs) {
    const existing = groups.find((g) => g.category === faq.category)
    if (existing) existing.items.push(faq)
    else groups.push({ category: faq.category, items: [faq] })
  }
  return groups
}

export const getTestimonials = cache((options: { featuredOnly?: boolean; limit?: number } = {}) => {
  let results = (loadYaml('testimonials.yml', testimonialsFileSchema).testimonials as Testimonial[])
    .filter((t) => t.status === 'published')
    .sort((a, b) => a.sortOrder - b.sortOrder)

  if (options.featuredOnly) results = results.filter((t) => t.featured)
  return options.limit ? results.slice(0, options.limit) : results
})

// ---------------------------------------------------------------------------
// Derived helpers
// ---------------------------------------------------------------------------

export interface WhatsAppLink {
  href: string
  display: string
}

/** Returns null when no number is set, so callers hide the button entirely. */
export async function whatsappLink(messageOverride?: string): Promise<WhatsAppLink | null> {
  const settings = await getSiteSettings()
  const digits = settings.whatsappNumber?.replace(/\D/g, '')
  if (!digits) return null

  const text = messageOverride ?? settings.whatsappMessage ?? ''
  return {
    href: `https://wa.me/${digits}${text ? `?text=${encodeURIComponent(text)}` : ''}`,
    display: `+${digits}`,
  }
}

export async function formattedAddress(): Promise<string[]> {
  const { address } = await getSiteSettings()
  return [
    address.line1,
    address.line2,
    [address.city, address.state].filter(Boolean).join(', ') || undefined,
    [address.postalCode, address.country].filter(Boolean).join(', ') || undefined,
  ].filter((line): line is string => Boolean(line?.trim()))
}

export function availabilityLabel(status: Product['availability']): string {
  return {
    in_stock: 'In season',
    low_stock: 'Limited availability',
    out_of_stock: 'Currently unavailable',
    seasonal: 'Seasonal',
    coming_soon: 'Coming soon',
  }[status]
}
