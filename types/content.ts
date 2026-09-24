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
  displayText?: string
  shoppingQuery?: string
  optional?: boolean
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

/**
 * The homepage, modelled as nine visual chapters rather than a stack of
 * sections.
 *
 * Each chapter has its own composition, colour ground and scroll behaviour.
 * They are typed individually rather than sharing one generic "section" shape
 * because they are genuinely different — a four-stage sticky sequence and a
 * macro-photography moment have almost nothing in common.
 */
export interface Homepage {
  hero: HeroChapter
  nature: NatureChapter
  mushroom: MushroomChapter
  journey: JourneyChapter
  product: ProductChapter
  food: FoodChapter
  farm: FarmChapter
  quality: QualityChapter
  finalCta: FinalCtaChapter
  seo?: Seo
}

/** Shared by every chapter: a switch, and an optional eyebrow. */
interface ChapterBase {
  enabled: boolean
  eyebrow?: string
}

export interface HeroChapter extends ChapterBase {
  /** Set in the NEYORA wordmark. Normally the brand name. */
  headline: string
  tagline?: string
  description?: string
  image?: Image
  /** A portrait crop for phones — a different composition, not a resize. */
  imageMobile?: Image
  /**
   * True when the DESKTOP artwork already carries the logo and headline.
   *
   * A finished campaign banner has its type baked into the pixels, so drawing
   * the site's own wordmark over it produces two logos and two headlines. With
   * this set, the desktop hero shows only the artwork and the buttons; the
   * headline stays in the DOM for search engines and screen readers but is
   * visually hidden. Phones still get live type, because a banner laid out for
   * 16:9 is unreadable cropped to a 2:3 screen.
   */
  artworkIncludesType?: boolean
  ctaLabel?: string
  ctaHref?: string
  secondaryCtaLabel?: string
  secondaryCtaHref?: string
  /** Hint shown at the foot of the hero, e.g. "Scroll". */
  scrollHint?: string
}

/**
 * Chapter 2 — the statement, told across a sequence of images that widen from
 * a single cap out to the farm.
 */
export interface NatureChapter extends ChapterBase {
  /** Rendered as separate lines of oversized display type. */
  lines: string[]
  body?: string
  /**
   * What the mushroom actually is, in plain terms.
   *
   * This chapter used to be four photographs with two-word captions, which
   * looked considered and told a reader nothing. Someone who has never cooked
   * an oyster mushroom needs to know what it tastes like, how it behaves in a
   * pan and what it is worth eating — so the images now support prose rather
   * than standing in for it.
   */
  facts?: { label: string; text: string }[]
  /** Ordered close → wide. Each becomes one frame of the reveal. */
  frames: { image: Image; caption?: string }[]
}

/** Chapter 3 — macro photography, oversized type around it. */
export interface MushroomChapter extends ChapterBase {
  lines: string[]
  secondaryLines?: string[]
  body?: string
  image?: Image
}

/** Chapter 4 — grown → harvested → packed → at your table. */
export interface JourneyChapter extends ChapterBase {
  heading?: string
  stages: {
    number: string
    title: string
    description?: string
    image?: Image
    /**
     * True when the stage artwork is a finished campaign card that already
     * carries the number, the title and the description.
     *
     * Set per stage rather than per chapter so the cards can arrive one at a
     * time: a stage with a card shows only the card, a stage still on a
     * placeholder keeps its live text, and the chapter stays coherent
     * throughout. The words remain in the DOM either way — a card is a
     * picture, and a picture is not readable by a search engine.
     */
    artworkIncludesType?: boolean
  }[]
}

/** Chapter 5 — the product, large. Pulled from content/products by slug. */
export interface ProductChapter extends ChapterBase {
  heading?: string
  body?: string
  /** Which product to feature. Falls back to the first featured one. */
  productSlug?: string
  ctaLabel?: string
}

/** Chapter 6 — food, editorial, appetite-led. */
export interface FoodChapter extends ChapterBase {
  lines: string[]
  body?: string
  ctaLabel?: string
  ctaHref?: string
}

/** Chapter 7 — back to the farm. Quiet, honest, human. */
export interface FarmChapter extends ChapterBase {
  lines: string[]
  body?: string
  images: Image[]
  ctaLabel?: string
  ctaHref?: string
}

/** Chapter 8 — trust, told in single words. */
export interface QualityChapter extends ChapterBase {
  heading?: string
  body?: string
  /** One word each: CLEAN, CAREFUL, FRESH, TRACEABLE. */
  pillars: { word: string; description: string }[]
  ctaLabel?: string
  ctaHref?: string
}

/** Chapter 9 — the final frame. */
export interface FinalCtaChapter extends ChapterBase {
  lines: string[]
  body?: string
  image?: Image
  ctaLabel?: string
  ctaHref?: string
}

export interface Pillar {
  title: string
  description: string
}
