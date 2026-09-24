/**
 * Zod schemas for every content file.
 *
 * These are the guardrail that replaces a database's constraints. Content is
 * validated when it loads, so a malformed recipe fails the build with a
 * precise message rather than rendering a broken page — the same role the
 * CHECK constraints and NOT NULLs played before.
 *
 * They also double as the migration contract: when content moves to a
 * database, these shapes become the table columns.
 */
import { z } from 'zod'
import { SLUG_PATTERN } from './common'

const slug = z
  .string()
  .trim()
  .min(1)
  .max(120)
  .regex(SLUG_PATTERN, 'Use lowercase letters, numbers and single hyphens')

/**
 * An optional text field.
 *
 * `""` and `null` both mean "not set". Writing an empty string is the natural
 * way to leave a YAML key present but unused — rejecting it would make the
 * content files hostile to hand-editing, which is the whole point of them.
 */
const optionalString = z
  .union([z.string(), z.null()])
  .optional()
  .transform((value) => {
    const trimmed = typeof value === 'string' ? value.trim() : ''
    return trimmed === '' ? undefined : trimmed
  })

/**
 * An image path plus its dimensions.
 *
 * Width and height are required, not optional: without them the browser cannot
 * reserve space and the page shifts as images load. Alt text is required for
 * the same reason it is required in any CMS — a missing one is an
 * accessibility failure, not a cosmetic gap.
 */
export const imageSchema = z.strictObject({
  src: z.string().startsWith('/', 'Image paths are relative to /public, so they start with /'),
  alt: z.string().min(1, 'Every image needs alt text describing what is in it'),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  caption: optionalString,
})

export const seoSchema = z.object({
  title: z.string().max(120).optional(),
  description: z.string().max(320).optional(),
  canonicalUrl: z.string().url().optional(),
  ogImage: z.string().startsWith('/').optional(),
  noindex: z.boolean().optional(),
})

export const statusSchema = z.enum(['draft', 'published'])
export const packSizeSchema = z.enum(['150g', '200g', '250g', '500g', 'flexible'])
export const difficultySchema = z.enum(['easy', 'medium', 'hard'])
export const availabilitySchema = z.enum([
  'in_stock',
  'low_stock',
  'out_of_stock',
  'seasonal',
  'coming_soon',
])

/*
 * Strict on purpose. In YAML flow style, an unquoted value containing a comma
 * silently splits into a new key:
 *
 *   { item: garlic, note: peeled, crushed }   ->  note: "peeled", crushed: null
 *
 * With a permissive schema the stray key is dropped and half the note
 * disappears without a word. Strict turns it into a build error naming the
 * file and the key.
 */
export const ingredientSchema = z.strictObject({
  qty: z.number().nullable().default(null),
  unit: z.string().default(''),
  item: z.string().min(1, 'Name the ingredient'),
  note: optionalString,
  displayText: optionalString,
  shoppingQuery: optionalString,
  optional: z.boolean().default(false),
  // Defaults true: most ingredients scale. Authors opt out for seasoning.
  scalable: z.boolean().default(true),
  group: optionalString,
})

export const stepSchema = z.strictObject({
  title: optionalString,
  body: z.string().min(1, 'Describe the step'),
  durationMinutes: z.number().int().min(0).max(1440).nullable().optional(),
})

export const nutritionSchema = z.object({
  basis: optionalString,
  per: z
    .array(
      z.strictObject({
        label: z.string().min(1),
        // Coerced: YAML reads `3.3` as a number, and these are display strings.
        value: z.coerce.string().min(1),
        unit: z.string().optional(),
      }),
    )
    .default([]),
  note: optionalString,
})

export const packVariantSchema = z.object({
  packSize: packSizeSchema,
  packGrams: z.number().int().positive().optional(),
  servings: z.number().int().positive().optional(),
  note: optionalString,
  ingredients: z.array(ingredientSchema).min(1),
})

/** Frontmatter of a `content/recipes/*.md` file. */
export const recipeFrontmatterSchema = z
  .object({
    title: z.string().min(2),
    slug,
    excerpt: z.string().max(320).optional(),

    category: slug.optional(),
    tags: z.array(slug).default([]),

    cover: imageSchema.optional(),

    prepTimeMinutes: z.number().int().min(0).max(10_080).optional(),
    cookTimeMinutes: z.number().int().min(0).max(10_080).optional(),
    servings: z.number().int().positive().max(100).optional(),
    servingsLabel: optionalString,
    difficulty: difficultySchema.default('easy'),
    cuisine: optionalString,
    course: optionalString,

    recommendedPackSize: packSizeSchema.default('200g'),
    basePackGrams: z.number().int().positive().optional(),
    isScalable: z.boolean().default(true),
    packVariants: z.array(packVariantSchema).default([]),

    ingredients: z.array(ingredientSchema).default([]),
    steps: z.array(stepSchema).default([]),
    nutrition: nutritionSchema.optional(),
    equipment: z.array(z.string().min(1)).default([]),
    tips: optionalString,

    featured: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    status: statusSchema.default('draft'),
    publishedAt: optionalString,
    updatedAt: optionalString,
    seo: seoSchema.optional(),
    isDemo: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    // Automatic scaling needs to know what weight the list is written for.
    // Without it the switcher would silently show unscaled quantities.
    if (value.isScalable && value.ingredients.length > 0 && !value.basePackGrams) {
      ctx.addIssue({
        code: 'custom',
        path: ['basePackGrams'],
        message:
          'A scalable recipe needs basePackGrams — the weight its ingredient list is written for. Set it, or set isScalable: false.',
      })
    }
    // A published recipe with no method is almost certainly an unfinished draft.
    if (value.status === 'published' && value.steps.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['steps'],
        message: 'A published recipe needs at least one step.',
      })
    }
  })

export const productFrontmatterSchema = z
  .object({
    name: z.string().min(2),
    slug,
    shortDescription: z.string().max(320).optional(),

    category: slug.optional(),
    variety: optionalString,
    origin: optionalString,

    weightGrams: z.number().int().positive().optional(),
    weightLabel: optionalString,
    price: z.number().min(0).optional(),
    mrp: z.number().min(0).optional(),
    currency: z.string().length(3).toUpperCase().default('INR'),
    unitLabel: optionalString,

    images: z.array(imageSchema).default([]),
    nutrition: nutritionSchema.optional(),
    highlights: z.array(z.string().min(1)).default([]),
    storageNotes: optionalString,
    shelfLife: optionalString,
    availability: availabilitySchema.default('in_stock'),

    featured: z.boolean().default(false),
    sortOrder: z.number().int().default(0),
    status: statusSchema.default('draft'),
    publishedAt: optionalString,
    seo: seoSchema.optional(),
    isDemo: z.boolean().default(false),
  })
  .superRefine((value, ctx) => {
    // A "discount" where the MRP is below the price is always a typo.
    if (value.price !== undefined && value.mrp !== undefined && value.mrp < value.price) {
      ctx.addIssue({
        code: 'custom',
        path: ['mrp'],
        message: 'MRP is lower than the selling price. Swap the two values?',
      })
    }
    if (value.status === 'published' && value.images.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['images'],
        message: 'A published product needs at least one photograph.',
      })
    }
  })

export const pageFrontmatterSchema = z.object({
  title: z.string().min(1),
  slug,
  eyebrow: optionalString,
  subtitle: z.string().max(400).optional(),
  hero: imageSchema.optional(),
  sortOrder: z.number().int().default(0),
  status: statusSchema.default('published'),
  publishedAt: optionalString,
  updatedAt: optionalString,
  seo: seoSchema.optional(),
  isDemo: z.boolean().default(false),
})

export const categorySchema = z.object({
  slug,
  name: z.string().min(1),
  description: optionalString,
  image: imageSchema.optional(),
  sortOrder: z.number().int().default(0),
  status: statusSchema.default('published'),
  seo: seoSchema.optional(),
})

export const tagSchema = z.object({ slug, name: z.string().min(1) })

export const categoriesFileSchema = z.object({
  recipeCategories: z.array(categorySchema).default([]),
  productCategories: z.array(categorySchema).default([]),
  recipeTags: z.array(tagSchema).default([]),
})

export const faqsFileSchema = z.object({
  faqs: z
    .array(
      z.object({
        question: z.string().min(3),
        answer: z.string().min(1),
        category: z.string().min(1).default('General'),
        sortOrder: z.number().int().default(0),
        status: statusSchema.default('published'),
      }),
    )
    .default([]),
})

export const testimonialsFileSchema = z.object({
  testimonials: z
    .array(
      z.object({
        quote: z.string().min(3),
        authorName: z.string().min(1),
        authorRole: optionalString,
        location: optionalString,
        rating: z.number().int().min(1).max(5).optional(),
        featured: z.boolean().default(false),
        sortOrder: z.number().int().default(0),
        status: statusSchema.default('published'),
      }),
    )
    .default([]),
})

export const socialLinkSchema = z.object({
  platform: z.string().regex(/^[a-z0-9_]+$/),
  label: z.string().min(1),
  url: z.string().default(''),
  handle: optionalString,
  enabled: z.boolean().default(false),
})

export const siteSchema = z.object({
  brandName: z.string().min(1),
  tagline: z.string().default(''),
  brandDescription: optionalString,

  contactEmail: optionalString,
  contactPhone: optionalString,
  whatsappNumber: z
    .string()
    .regex(/^\d{8,15}$/, 'Digits only including the country code, e.g. 919876543210')
    .optional(),
  whatsappMessage: optionalString,

  address: z
    .object({
      line1: optionalString,
      line2: optionalString,
      city: optionalString,
      state: optionalString,
      postalCode: optionalString,
      country: optionalString,
      googleMapsUrl: z.string().url().optional(),
    })
    .prefault({}),
  businessHours: optionalString,

  footerTagline: optionalString,
  footerNote: optionalString,
  copyrightHolder: optionalString,

  announcement: z
    .object({
      enabled: z.boolean().default(false),
      text: optionalString,
      href: optionalString,
    })
    .prefault({ enabled: false }),

  seo: z
    .object({
      defaultTitle: optionalString,
      defaultDescription: optionalString,
      defaultOgImage: z.string().startsWith('/').optional(),
      organizationLegalName: optionalString,
    })
    .prefault({}),

  qr: z
    .object({
      // Same-origin only. A QR that could point off-site is an open
      // redirector printed onto physical packaging.
      destination: z
        .string()
        .startsWith('/', 'Must be a path on this site')
        .refine((v) => !v.startsWith('//') && !v.startsWith('/\\'), {
          message: 'That would send visitors to another website',
        })
        .default('/recipes'),
      landingTitle: optionalString,
      landingBody: optionalString,
    })
    .prefault({ destination: '/recipes' }),

  social: z.array(socialLinkSchema).default([]),
})

/**
 * The homepage is nine typed chapters, not a list of generic sections.
 *
 * Each is validated separately so a missing image or an empty line array
 * fails the build naming the chapter, rather than rendering a composition
 * with a hole in it.
 */
const chapterBase = {
  enabled: z.boolean().default(true),
  eyebrow: optionalString,
}

/** Oversized display type, one array entry per rendered line. */
const displayLines = z.array(z.string().min(1)).min(1)

export const homepageSchema = z.object({
  hero: z.object({
    ...chapterBase,
    headline: z.string().min(1),
    tagline: optionalString,
    description: optionalString,
    image: imageSchema.optional(),
    // A portrait crop for phones. Optional: without it the desktop image is
    // used everywhere, cropped by object-fit.
    imageMobile: imageSchema.optional(),
    // True when the desktop artwork already carries the logo and headline, so
    // the site must not draw its own on top. See types/content.ts.
    artworkIncludesType: z.boolean().optional(),
    ctaLabel: optionalString,
    ctaHref: optionalString,
    secondaryCtaLabel: optionalString,
    secondaryCtaHref: optionalString,
    scrollHint: optionalString,
  }),

  nature: z.object({
    ...chapterBase,
    lines: displayLines,
    body: optionalString,
    // Plain-language notes on the mushroom itself. Capped at six: past that a
    // reader skims instead of reading, and the section becomes a spec sheet.
    facts: z
      .array(z.object({ label: z.string().trim().min(1), text: z.string().trim().min(1) }))
      .max(6)
      .optional(),
    /*
     * Ordered close → wide. Two is the minimum for the reveal to read as a
     * progression rather than a single image that happens to move.
     */
    frames: z
      .array(z.object({ image: imageSchema, caption: optionalString }))
      .min(2, 'The nature sequence needs at least two frames to read as a progression'),
  }),

  mushroom: z.object({
    ...chapterBase,
    lines: displayLines,
    secondaryLines: z.array(z.string().min(1)).default([]),
    body: optionalString,
    image: imageSchema.optional(),
  }),

  journey: z.object({
    ...chapterBase,
    heading: optionalString,
    stages: z
      .array(
        z.object({
          number: z.string().min(1),
          title: z.string().min(1),
          description: optionalString,
          image: imageSchema.optional(),
          // See types/content.ts — set per stage, not per chapter.
          artworkIncludesType: z.boolean().optional(),
        }),
      )
      .min(2),
  }),

  product: z.object({
    ...chapterBase,
    heading: optionalString,
    body: optionalString,
    productSlug: slug.optional(),
    ctaLabel: optionalString,
  }),

  food: z.object({
    ...chapterBase,
    lines: displayLines,
    body: optionalString,
    ctaLabel: optionalString,
    ctaHref: optionalString,
  }),

  farm: z.object({
    ...chapterBase,
    lines: displayLines,
    body: optionalString,
    images: z.array(imageSchema).default([]),
    ctaLabel: optionalString,
    ctaHref: optionalString,
  }),

  quality: z.object({
    ...chapterBase,
    heading: optionalString,
    body: optionalString,
    pillars: z
      .array(
        z.object({
          // One word. The composition sets these very large, and two words
          // break the line in a way that looks like a mistake.
          word: z.string().min(1).max(14, 'Keep a quality pillar to a single short word'),
          description: z.string().min(1),
        }),
      )
      .default([]),
    ctaLabel: optionalString,
    ctaHref: optionalString,
  }),

  finalCta: z.object({
    ...chapterBase,
    lines: displayLines,
    body: optionalString,
    image: imageSchema.optional(),
    ctaLabel: optionalString,
    ctaHref: optionalString,
  }),

  seo: seoSchema.optional(),
})
