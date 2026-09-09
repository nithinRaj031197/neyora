/**
 * The NEYORA content model.
 *
 * These shapes are the contract between the content files and the site. They
 * are deliberately the same shapes a database would store — every field maps
 * to one column — so moving to Postgres later is a loader swap, not a
 * redesign. Nothing in the components knows where content comes from.
 */

export type ContentStatus = 'draft' | 'published'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type PackSize = '150g' | '200g' | '250g' | '500g' | 'flexible'
export type Availability =
  | 'in_stock'
  | 'low_stock'
  | 'out_of_stock'
  | 'seasonal'
  | 'coming_soon'

/**
 * An image in /public.
 *
 * `width`/`height` are required rather than optional: without them the browser
 * cannot reserve space and the page shifts as images load, which is the single
 * most common cause of a poor Cumulative Layout Shift score.
 */
export interface Image {
  src: string
  alt: string
  width: number
  height: number
  caption?: string
}

export interface Ingredient {
  /**
   * Numeric, so quantities can be scaled. `null` means unmeasured —
   * "salt, to taste".
   */
  qty: number | null
  unit: string
  item: string
  note?: string
  /** False for anything measured by taste; those must not be multiplied. */
  scalable: boolean
  group?: string
}

export interface RecipeStep {
  title?: string
  body: string
  durationMinutes?: number | null
}

export interface NutritionFact {
  label: string
  value: string
  unit?: string
}

export interface Nutrition {
  basis?: string
  per: NutritionFact[]
  note?: string
}

/**
 * A hand-written ingredient list for a pack size other than the base.
 *
 * Exists because seasoning does not scale linearly: doubling a recipe should
 * not double the chilli, and 500 g will not fit one pan.
 */
export interface PackVariant {
  packSize: PackSize
  packGrams?: number
  servings?: number
  note?: string
  ingredients: Ingredient[]
}

export interface Seo {
  title?: string
  description?: string
  canonicalUrl?: string
  ogImage?: string
  noindex?: boolean
}

export interface Recipe {
  slug: string
  title: string
  excerpt?: string
  /** Markdown — the editorial voice. Rendered sanitised. */
  body: string

  category?: string
  tags: string[]

  cover?: Image

  prepTimeMinutes?: number
  cookTimeMinutes?: number
  /** Derived from prep + cook, never authored. */
  totalTimeMinutes: number
  servings?: number
  servingsLabel?: string
  difficulty: Difficulty
  cuisine?: string
  course?: string

  recommendedPackSize: PackSize
  basePackGrams?: number
  isScalable: boolean
  packVariants: PackVariant[]

  /**
   * Structured alongside the Markdown body on purpose: these feed Recipe
   * JSON-LD, the tick-off checklist and pack-size scaling. Prose cannot be
   * multiplied, and search engines cannot read it as instructions.
   */
  ingredients: Ingredient[]
  steps: RecipeStep[]
  nutrition?: Nutrition
  equipment: string[]
  tips?: string

  featured: boolean
  sortOrder: number
  status: ContentStatus
  publishedAt?: string
  updatedAt?: string
  seo?: Seo
  /** Seeded example content, replaceable. Surfaced as a badge in dev. */
  isDemo: boolean
}

export interface Product {
  slug: string
  name: string
  shortDescription?: string
  body: string

  category?: string
  variety?: string
  origin?: string

  weightGrams?: number
  weightLabel?: string
  price?: number
  mrp?: number
  currency: string
  unitLabel?: string

  images: Image[]
  nutrition?: Nutrition
  highlights: string[]
  storageNotes?: string
  shelfLife?: string
  availability: Availability

  featured: boolean
  sortOrder: number
  status: ContentStatus
  publishedAt?: string
  seo?: Seo
  isDemo: boolean
}

export interface Page {
  slug: string
  title: string
  eyebrow?: string
  subtitle?: string
  body: string
  hero?: Image
  sortOrder: number
  status: ContentStatus
  publishedAt?: string
  updatedAt?: string
  seo?: Seo
  isDemo: boolean
}

export interface Category {
  slug: string
  name: string
  description?: string
  image?: Image
  sortOrder: number
  status: ContentStatus
  seo?: Seo
}

export interface Tag {
  slug: string
  name: string
}

export interface Faq {
  question: string
  /** Markdown. */
  answer: string
  category: string
  sortOrder: number
  status: ContentStatus
}

export interface Testimonial {
  quote: string
  authorName: string
  authorRole?: string
  location?: string
  rating?: number
  featured: boolean
  sortOrder: number
  status: ContentStatus
}

export interface SocialLink {
  platform: string
  label: string
  url: string
  handle?: string
  enabled: boolean
}

export interface SiteSettings {
  brandName: string
  tagline: string
  brandDescription?: string

  contactEmail?: string
  contactPhone?: string
  /** Digits and country code only — wa.me rejects '+', spaces and dashes. */
  whatsappNumber?: string
  whatsappMessage?: string

  address: {
    line1?: string
    line2?: string
    city?: string
    state?: string
    postalCode?: string
    country?: string
    googleMapsUrl?: string
  }
  businessHours?: string

  footerTagline?: string
  footerNote?: string
  copyrightHolder?: string

  announcement?: {
    enabled: boolean
    text?: string
    href?: string
  }

  seo: {
    defaultTitle?: string
    defaultDescription?: string
    defaultOgImage?: string
    organizationLegalName?: string
  }

  /**
   * Where the QR code printed on packaging leads.
   *
   * Overridable at runtime by the NEYORA_QR_DESTINATION environment variable,
   * so the destination can be changed from the Cloudflare dashboard without a
   * redeploy — and without a database.
   */
  qr: {
    destination: string
    landingTitle?: string
    landingBody?: string
  }

  social: SocialLink[]
}

export interface Pillar {
  title: string
  description: string
}

export interface Homepage {
  hero: {
    eyebrow?: string
    headline: string
    subheadline?: string
    description?: string
    image?: Image
    ctaLabel?: string
    ctaHref?: string
    secondaryCtaLabel?: string
    secondaryCtaHref?: string
  }
  products: SectionCopy
  why: SectionCopy & { pillars: Pillar[] }
  farm: SectionCopy & { body?: string; image?: Image }
  recipes: SectionCopy
  community: SectionCopy
  social: SectionCopy & { handle?: string }
  finalCta: SectionCopy & { image?: Image }
  seo?: Seo
}

export interface SectionCopy {
  enabled: boolean
  eyebrow?: string
  heading?: string
  description?: string
  ctaLabel?: string
  ctaHref?: string
}
